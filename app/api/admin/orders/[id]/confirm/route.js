import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

export async function POST(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const orderId = Number(id);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Confirming payment no longer auto-marks the listing sold — the admin decides
  // separately (via the listing visibility control) when buyers should see it as sold.
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "confirmed", confirmedAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
