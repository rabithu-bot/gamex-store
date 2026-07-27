import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";

// Called by the buyer's client whenever the support thread is actually on
// screen — marks every admin-sent message as read so the admin side can
// show a "seen" tick, the way a real chat app would.
export async function POST(request, { params }) {
  const { id } = await params;
  const orderId = id;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!(await assertOrderAccess(orderId, order))) {
    return NextResponse.json(
      { error: "Access denied", code: "UNRECOGNIZED_DEVICE" },
      { status: 403 }
    );
  }

  await prisma.message.updateMany({
    where: { orderId, sender: "admin", readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
