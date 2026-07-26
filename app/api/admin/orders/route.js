import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { expireStaleOrders } from "@/app/lib/orderExpiry";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  await expireStaleOrders();
  const orders = await prisma.order.findMany({
    orderBy: { createdAt: "desc" },
    include: { listing: true, messages: { orderBy: { createdAt: "asc" } } },
  });
  return NextResponse.json(orders);
}
