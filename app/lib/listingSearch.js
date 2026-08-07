import { prisma } from "@/app/lib/prisma";

const MAX_RESULTS = 5;

// Real, live-stock listing search — this is the ONLY source the budget-
// pitch feature is allowed to describe to a customer. Never invent a
// price or ID that isn't actually returned here.
export async function findListingsNearBudget(amount) {
  const listings = await prisma.listing.findMany({
    where: { status: "available" },
    select: {
      id: true,
      title: true,
      price: true,
      category: true,
      tier: true,
      level: true,
      gameUid: true,
      rareItems: true,
    },
    orderBy: { price: "asc" },
  });
  if (listings.length === 0) return [];

  // Prefer anything genuinely close to what they asked for...
  const tolerance = Math.max(100, amount * 0.25);
  const inRange = listings.filter((l) => Math.abs(l.price - amount) <= tolerance);
  const pool = inRange.length > 0 ? inRange : listings;

  // ...then, within that pool, closest price first — a real salesman leads
  // with the best match, not just whatever's cheapest.
  return [...pool].sort((a, b) => Math.abs(a.price - amount) - Math.abs(b.price - amount)).slice(0, MAX_RESULTS);
}
