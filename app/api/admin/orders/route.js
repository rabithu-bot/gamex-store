import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { expireStaleOrders } from "@/app/lib/orderExpiry";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // expireStaleOrders() only ever touches OTHER rows (flips stale "pending"
  // ones to "expired") and is heavily throttled (see orderExpiry.js) — it
  // doesn't need to finish before the main read starts. This was the
  // biggest of three sequential DB round-trips this route made per
  // request (the other being the pushSubscription lookup below, which
  // does need the order ids first); running the independent one alongside
  // the main query instead of before it removes a full extra round-trip
  // from the hot path of a route every admin screen polls every 5s.
  const [, orders] = await Promise.all([
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
  ]);

  // One extra lightweight query rather than per-order round-trips — tells
  // the inbox whether each buyer's device actually has push notifications
  // subscribed, for the notification-status dot next to their name.
  const subscribedOrderIds = new Set(
    (
      await prisma.pushSubscription.findMany({
        where: { role: "buyer", orderId: { in: orders.map((o) => o.id) } },
        select: { orderId: true },
      })
    ).map((s) => s.orderId)
  );
  const withNotifyStatus = orders.map((o) => ({
    ...o,
    notificationsEnabled: subscribedOrderIds.has(o.id),
  }));

  return NextResponse.json(withNotifyStatus);
}
