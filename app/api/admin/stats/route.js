import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { getLifetimeOrderCount } from "@/app/lib/lifetimeOrderCount";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [revenue, available, sold, ordersWithLastMessage, totalOrdersAllTime] = await Promise.all([
    prisma.order.aggregate({ where: { status: "confirmed" }, _sum: { listingPrice: true } }),
    prisma.listing.count({ where: { status: "available" } }),
    prisma.listing.count({ where: { status: "sold" } }),
    prisma.order.findMany({
      where: { messages: { some: {} } },
      select: { messages: { orderBy: { createdAt: "desc" }, take: 1, select: { sender: true, readAt: true } } },
    }),
    getLifetimeOrderCount(),
  ]);
  const unreadConvos = ordersWithLastMessage.filter(
    (o) => o.messages[0]?.sender === "buyer" && !o.messages[0]?.readAt
  ).length;

  return NextResponse.json({
    revenue: revenue._sum.listingPrice || 0,
    available,
    sold,
    unreadConvos,
    totalOrdersAllTime,
  });
}
