import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

export async function POST(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const orderId = id;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Declining doesn't touch the listing — it stays available, since a failed
  // verification means nothing was actually sold.
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "declined" },
  });

  return NextResponse.json({ ok: true });
}
