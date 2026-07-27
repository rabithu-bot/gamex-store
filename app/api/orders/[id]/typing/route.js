import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";

// Pinged (debounced client-side) while the buyer has text in the support
// chat input. Admin's UI treats buyerTypingAt as stale after a few seconds
// so this doesn't need its own "stopped typing" signal.
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

  await prisma.order.update({ where: { id: orderId }, data: { buyerTypingAt: new Date() } });

  return NextResponse.json({ ok: true });
}
