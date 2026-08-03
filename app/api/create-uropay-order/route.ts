import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";
import { isUroPayConfigured, uroPayHeaders } from "@/app/lib/uropay";

const UROPAY_API_BASE_URL = process.env.UROPAY_API_BASE_URL || "https://api.uropay.me";

export async function POST(request: NextRequest) {
  if (!isUroPayConfigured()) {
    return NextResponse.json({ error: "Instant checkout isn't available right now" }, { status: 503 });
  }

  const { orderId } = await request.json().catch(() => ({}));
  if (!orderId) {
    return NextResponse.json({ error: "Missing orderId" }, { status: 400 });
  }

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!(await assertOrderAccess(orderId, order))) {
    return NextResponse.json({ error: "Access denied", code: "UNRECOGNIZED_DEVICE" }, { status: 403 });
  }

  // "declined" is allowed back in here too, same as the old flow — a
  // decline just means try paying again, not that the order is dead.
  if (order.status !== "pending" && order.status !== "declined") {
    return NextResponse.json({ error: "This order is not awaiting payment" }, { status: 400 });
  }

  let uroPayRes: Response;
  try {
    uroPayRes = await fetch(`${UROPAY_API_BASE_URL}/order/generate`, {
      method: "POST",
      headers: uroPayHeaders(),
      body: JSON.stringify({
        amount: order.listingPrice * 100, // UroPay wants paise, listingPrice is stored in rupees
        merchantOrderId: order.id,
        customerName: order.buyerName || "GameX Store Customer",
        // This checkout flow never collects a buyer email, but UroPay's API
        // requires one. Using a non-deliverable placeholder and disabling
        // their email trigger so they never actually attempt to send to it.
        customerEmail: `order-${order.id}@no-email.gamexstore.com`,
        emailTrigger: "DISABLED",
        transactionNote: `GameX Store order ${order.id}`,
      }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach payment provider" }, { status: 502 });
  }

  const body = await uroPayRes.json().catch(() => null);
  if (!uroPayRes.ok || body?.status !== "success") {
    return NextResponse.json({ error: body?.message || "Could not create payment order" }, { status: 502 });
  }

  const { uroPayOrderId, upiString, qrCode, amountInRupees } = body.data || {};
  if (!uroPayOrderId || !qrCode) {
    return NextResponse.json({ error: "Unexpected response from payment provider" }, { status: 502 });
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { uroPayOrderId },
  });

  return NextResponse.json({ uroPayOrderId, upiString, qrCode, amountInRupees });
}
