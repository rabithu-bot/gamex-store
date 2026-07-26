import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

export async function POST(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const orderId = Number(id);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Confirming releases the credentials to the buyer, so the listing must stop
  // showing as available to everyone else in the same beat — the admin can still
  // flip it back with the listing-visibility control afterward if needed (e.g.
  // relisting more stock under the same listing).
  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      data: { status: "confirmed", confirmedAt: new Date() },
    }),
    ...(order.listingId
      ? [prisma.listing.update({ where: { id: order.listingId }, data: { status: "sold" } })]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
