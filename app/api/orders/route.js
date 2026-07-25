import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

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
    },
  });

  return NextResponse.json({ id: order.id });
}
