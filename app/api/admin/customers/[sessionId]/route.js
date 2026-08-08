import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

// The admin-facing "one conversation per person" view — merges every order
// a buyer (identified by their persistent gamex_session_id, see
// app/lib/customerSession.js) has ever placed into a single chronological
// thread, instead of the admin having to hop between separate per-order
// chats for the same customer. Deliberately additive: Message still
// belongs to a real Order exactly as before (nothing about ownership,
// AI shadow-learning, push subscriptions, or access tokens changes) — this
// route only merges the READ side for display.
export async function GET(_request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await params;

  const orders = await prisma.order.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      buyerName: true,
      listingTitle: true,
      listingPrice: true,
      status: true,
      tag: true,
      buyerTypingAt: true,
      buyerLastSeenAt: true,
      createdAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          sender: true,
          body: true,
          attachmentPath: true,
          attachmentType: true,
          replyToId: true,
          readAt: true,
          reaction: true,
          editedAt: true,
          createdAt: true,
        },
      },
    },
  });

  if (orders.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Every message keeps a record of which real order it belongs to
  // (needed for per-message edit/react/unsend calls, and for the "which
  // listing was this about" chip in the UI) even once merged into one list.
  const messages = orders
    .flatMap((o) => o.messages.map((m) => ({ ...m, orderId: o.id, listingTitle: o.listingTitle })))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const latestOf = (key) =>
    orders.reduce((latest, o) => (o[key] && (!latest || o[key] > latest) ? o[key] : latest), null);

  // Same heartbeat the single-order route does (drives the buyer's "Support
  // is typing/online" indicator) — touched for every order in the group
  // since the admin has now effectively seen all of this buyer's threads.
  await prisma.order.updateMany({ where: { sessionId }, data: { adminLastSeenAt: new Date() } });

  return NextResponse.json({
    sessionId,
    buyerName: orders[0].buyerName,
    buyerTypingAt: latestOf("buyerTypingAt"),
    buyerLastSeenAt: latestOf("buyerLastSeenAt"),
    orders: orders.map((o) => ({
      id: o.id,
      listingTitle: o.listingTitle,
      listingPrice: o.listingPrice,
      status: o.status,
      tag: o.tag,
      createdAt: o.createdAt,
    })),
    messages,
  });
}
