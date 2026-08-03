import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { confirmOrder } from "@/app/lib/orderConfirm";
import { verifyUroPayWebhookSignature } from "@/app/lib/uropay";

// UroPay calls this multiple times per order (see their /documentation):
// immediately (and UNVERIFIED) when the buyer submits a UTR, again when
// their companion Android app actually reads the bank's UPI-credit SMS, and
// again if the order escalates to manual review. Only the SMS-confirmed
// event (or a manual-review approval landing on COMPLETED) is trusted to
// release the account — treating the unverified UTR-submission event as
// "paid" would let anyone type in a fake reference number and get a free
// account.
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-uropay-signature");

  let event: any;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!verifyUroPayWebhookSignature(event, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const merchantOrderId: string | undefined = event?.merchantOrderId;
  if (!merchantOrderId) {
    // e.g. an SMS UroPay's companion app read but couldn't match to any order.
    return NextResponse.json({ ok: true });
  }

  const isConfirmedPayment =
    event.event === "companion.sms.data" ||
    (event.event === "order.status.changed" && event.orderStatus === "COMPLETED");

  if (!isConfirmedPayment) {
    return NextResponse.json({ ok: true });
  }

  const order = await prisma.order.findUnique({ where: { id: merchantOrderId } });
  // Silently acknowledge unknown/already-confirmed orders — UroPay fires
  // this more than once per order by design, and returning non-2xx here
  // just makes it retry and mark the delivery FAILED for no benefit.
  if (order && order.status !== "confirmed") {
    await confirmOrder(order.id);
    const referenceNumber: string | undefined = event.referenceNumber ?? event.submittedUTR;
    if (referenceNumber) {
      await prisma.order.update({
        where: { id: order.id },
        data: { uroPayPaymentId: referenceNumber },
      });
    }
  }

  return NextResponse.json({ ok: true });
}
