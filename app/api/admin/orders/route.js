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
    select: {
      id: true,
      buyerName: true,
      listingTitle: true,
      listingPrice: true,
      screenshotPath: true,
      status: true,
      tag: true,
      buyerLastSeenAt: true,
      listing: { select: { id: true, status: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { sender: true, body: true, attachmentPath: true, createdAt: true, readAt: true },
      },
    },
  });
  return NextResponse.json(orders);
}
