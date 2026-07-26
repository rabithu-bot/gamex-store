import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { getSessionId } from "@/app/lib/customerSession";
import { expireStaleOrders } from "@/app/lib/orderExpiry";

// Backs both the "My Orders" page and BuyForm's "did I already order this?"
// check — both just need this device's session-scoped order list, keyed off
// the gamex_session_id cookie instead of a client-side localStorage cache.
export async function GET() {
  const sessionId = await getSessionId();
  if (!sessionId) return NextResponse.json([]);

  await expireStaleOrders();

  const orders = await prisma.order.findMany({
    where: { sessionId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    orders.map((o) => ({
      id: o.id,
      listingId: o.listingId,
      status: o.status,
      listingTitle: o.listingTitle,
      listingPrice: o.listingPrice,
      createdAt: o.createdAt,
    }))
  );
}
