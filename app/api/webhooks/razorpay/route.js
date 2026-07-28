import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { verifyWebhookSignature } from "@/app/lib/razorpay";
import { confirmOrder } from "@/app/lib/orderConfirm";

// The sole authoritative source that flips an order to "confirmed" via
// Razorpay — the client-side checkout callback is only ever used to
// redirect the buyer sooner, never to confirm anything itself. Signature
// must be checked against the *raw* body bytes, before any JSON parsing.
export async function POST(request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let event;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (event.event === "payment.captured") {
    const payment = event.payload?.payment?.entity;
    const razorpayOrderId = payment?.order_id;
    const razorpayPaymentId = payment?.id;

    if (razorpayOrderId && razorpayPaymentId) {
      const order = await prisma.order.findUnique({ where: { razorpayOrderId } });
      // Silently acknowledge unknown/already-confirmed orders — Razorpay
      // retries webhook delivery on anything but a 2xx, and this same
      // event can legitimately arrive more than once.
      if (order && order.status !== "confirmed") {
        await confirmOrder(order.id);
        await prisma.order.update({
          where: { id: order.id },
          data: { razorpayPaymentId },
        });
      }
    }
  }

  return NextResponse.json({ ok: true });
}
