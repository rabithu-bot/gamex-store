import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

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
  return NextResponse.json(order);
}
