import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { shouldWritePresence } from "@/app/lib/presenceThrottle";

export async function GET(_request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      buyerName: true,
      listingTitle: true,
      tag: true,
      buyerTypingAt: true,
      buyerLastSeenAt: true,
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

  if (!order) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Piggybacks on the admin's own 1.5s poll (ChatThread's useVisiblePolling)
  // rather than a dedicated ping endpoint — mirrors the buyer-side route's
  // buyerLastSeenAt heartbeat so the buyer's support chat can show an
  // "online" indicator for support too. Throttled so this doesn't become a
  // row write every 1.5s for as long as a thread sits open.
  if (shouldWritePresence(`admin:${id}`)) {
    await prisma.order.update({ where: { id }, data: { adminLastSeenAt: new Date() } });
  }

  return NextResponse.json(order);
}
