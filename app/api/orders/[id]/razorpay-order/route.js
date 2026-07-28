import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";
import { getRazorpayClient, isRazorpayConfigured } from "@/app/lib/razorpay";

export async function POST(request, { params }) {
  if (!isRazorpayConfigured()) {
    return NextResponse.json({ error: "Instant checkout isn't available right now" }, { status: 503 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!(await assertOrderAccess(id, order))) {
    return NextResponse.json(
      { error: "Access denied", code: "UNRECOGNIZED_DEVICE" },
      { status: 403 }
    );
  }

  // "declined" is allowed back in here too, same as the screenshot flow —
  // a decline just means try paying again, not that the order is dead.
  if (order.status !== "pending" && order.status !== "declined") {
    return NextResponse.json({ error: "This order is not awaiting payment" }, { status: 400 });
  }

  const razorpay = getRazorpayClient();

  // Reuse an existing Razorpay order if the buyer re-opens checkout without
  // having paid yet, instead of creating a fresh one (and a fresh fee-free
  // record on Razorpay's side) every time they click Pay.
  if (order.razorpayOrderId) {
    return NextResponse.json({
      razorpayOrderId: order.razorpayOrderId,
      amount: order.listingPrice * 100,
      currency: "INR",
    });
  }

  const razorpayOrder = await razorpay.orders.create({
    amount: order.listingPrice * 100, // paise
    currency: "INR",
    receipt: order.id,
    notes: { orderId: order.id },
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { razorpayOrderId: razorpayOrder.id },
  });

  return NextResponse.json({
    razorpayOrderId: razorpayOrder.id,
    amount: razorpayOrder.amount,
    currency: razorpayOrder.currency,
  });
}
