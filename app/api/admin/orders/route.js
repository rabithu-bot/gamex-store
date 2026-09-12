import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { expireStaleOrders } from "@/app/lib/orderExpiry";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // All three queries here are independent of each other's results —
  // expireStaleOrders() only touches other rows, and the pushSubscription
  // lookup doesn't actually need to be scoped to this request's order ids
  // (it's a small table; fetching every buyer subscription directly is
  // cheap and removes the data dependency that used to force it to run
  // strictly after the main query). Running all three together instead of
  // 1-then-2-sequential removes a full extra round-trip from the hot path
  // of a route every admin screen polls every 5s and both Orders and
  // Messages panels use.
  const [, orders, subscribedRows] = await Promise.all([
    expireStaleOrders(),
    prisma.order.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        buyerName: true,
        listingTitle: true,
        listingPrice: true,
        screenshotPath: true,
        status: true,
        tag: true,
        // Lets the inbox group every order from the same device/buyer into
        // one conversation (see MessagesPanel.js) instead of one row per
        // purchase — null for pre-existing orders from before this cookie
        // existed, which just stay as their own standalone row.
        sessionId: true,
        buyerLastSeenAt: true,
        listing: { select: { id: true, status: true } },
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { sender: true, body: true, attachmentPath: true, createdAt: true, readAt: true },
        },
      },
    }),
    // Tells the inbox whether each buyer's device actually has push
    // notifications subscribed, for the notification-status dot next to
    // their name.
    prisma.pushSubscription.findMany({
      where: { role: "buyer", orderId: { not: null } },
      select: { orderId: true },
    }),
  ]);

  const subscribedOrderIds = new Set(subscribedRows.map((s) => s.orderId));
  const withNotifyStatus = orders.map((o) => ({
    ...o,
    notificationsEnabled: subscribedOrderIds.has(o.id),
  }));

  return NextResponse.json(withNotifyStatus);
}
