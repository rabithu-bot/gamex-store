import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { expireStaleOrders, ORDER_EXPIRY_MS } from "@/app/lib/orderExpiry";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";

export async function GET(request, { params }) {
  const { id } = await params;
  await expireStaleOrders();
  const order = await prisma.order.findUnique({
    where: { id },
    include: { listing: true, messages: { orderBy: { createdAt: "asc" } } },
  });

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!(await assertOrderAccess(id, order))) {
    return NextResponse.json(
      { error: "Access denied", code: "UNRECOGNIZED_DEVICE" },
      { status: 403 }
    );
  }

  const response = {
    id: order.id,
    status: order.status,
    buyerName: order.buyerName,
    createdAt: order.createdAt,
    expiresAt: new Date(order.createdAt.getTime() + ORDER_EXPIRY_MS),
    proofSubmitted: Boolean(order.screenshotPath),
    messages: order.messages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      attachmentPath: m.attachmentPath,
      attachmentType: m.attachmentType,
      replyToId: m.replyToId,
      readAt: m.readAt,
      createdAt: m.createdAt,
    })),
    listing: {
      id: order.listing?.id ?? null,
      title: order.listingTitle,
      price: order.listingPrice,
    },
  };

  if (order.status === "confirmed") {
    response.account = {
      accountId: order.accountId,
      accountPassword: order.accountPassword,
    };
  }

  return NextResponse.json(response);
}
