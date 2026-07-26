import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getOrCreateSessionId } from "@/app/lib/customerSession";
import { expireStaleOrders } from "@/app/lib/orderExpiry";

export async function POST(request) {
  const body = await request.json();
  const listingId = Number(body.listingId);
  const buyerName = String(body.buyerName || "").trim();

  if (!listingId) {
    return NextResponse.json({ error: "listingId is required" }, { status: 400 });
  }
  if (!buyerName) {
    return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
  }

  await expireStaleOrders();
  const sessionId = await getOrCreateSessionId();

  // Idempotent: a buyer re-clicking "Buy Now" for something they already
  // checked out on this device should land back on that same order instead
  // of spawning a duplicate one — unless that attempt already died (declined
  // or timed out), in which case a fresh order is exactly what they want.
  const existing = await prisma.order.findFirst({
    where: { sessionId, listingId, status: { notIn: ["declined", "expired"] } },
    orderBy: { createdAt: "desc" },
  });
  if (existing) {
    return NextResponse.json({ id: existing.id });
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "available") {
    return NextResponse.json(
      { error: "This listing is no longer available" },
      { status: 404 }
    );
  }

  const order = await prisma.order.create({
    data: {
      listingId,
      buyerName,
      listingTitle: listing.title,
      listingPrice: listing.price,
      accountId: listing.accountId,
      accountPassword: listing.accountPassword,
      sessionId,
    },
  });

  return NextResponse.json({ id: order.id });
}
