import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getOrCreateSessionId } from "@/app/lib/customerSession";
import { expireStaleOrders } from "@/app/lib/orderExpiry";
import { createOrder } from "@/app/lib/orderIds";
import { generateAccessToken, hashAccessToken, setOrderAccessCookie } from "@/app/lib/orderAccessToken";

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
    // Rotate the token on every hit rather than special-casing "was the
    // cookie already there" — cheap, idempotent from the buyer's
    // perspective (same device, same request), and defends against the
    // token cookie's oldest-entry eviction having dropped this order's
    // token since it was first issued. Re-authenticating here is safe
    // because it's already gated on a match against gamex_session_id.
    const token = generateAccessToken();
    await prisma.order.update({
      where: { id: existing.id },
      data: { accessTokenHash: hashAccessToken(token) },
    });
    await setOrderAccessCookie(existing.id, token);
    return NextResponse.json({ id: existing.id });
  }

  const listing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!listing || listing.status !== "available") {
    return NextResponse.json(
      { error: "This listing is no longer available" },
      { status: 404 }
    );
  }

  const token = generateAccessToken();
  const order = await createOrder({
    listingId,
    buyerName,
    listingTitle: listing.title,
    listingPrice: listing.price,
    accountId: listing.accountId,
    accountPassword: listing.accountPassword,
    sessionId,
    accessTokenHash: hashAccessToken(token),
  });
  await setOrderAccessCookie(order.id, token);

  return NextResponse.json({ id: order.id });
}
