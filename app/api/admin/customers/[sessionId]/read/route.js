import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

// Admin-side counterpart to the per-order read route, but for the merged
// customer thread — marks every buyer message across ALL of this person's
// orders as read in one call, since opening the merged view means the
// admin has now seen all of it, not just whichever order happens to be
// "selected" for replying.
export async function POST(_request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { sessionId } = await params;

  const orderIds = (
    await prisma.order.findMany({ where: { sessionId }, select: { id: true } })
  ).map((o) => o.id);

  await prisma.message.updateMany({
    where: { orderId: { in: orderIds }, sender: "buyer", readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
