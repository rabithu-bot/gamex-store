import { prisma } from "@/app/lib/prisma";

const MAX_RESULTS = 5;
const SELECT_FIELDS = {
  id: true,
  title: true,
  price: true,
  category: true,
  tier: true,
  level: true,
  gameUid: true,
  rareItems: true,
  images: true,
};

// Real, live-stock listing search — this is the ONLY source the budget-
// pitch feature is allowed to describe to a customer. Never invent a
// price or ID that isn't actually returned here.
export async function findListingsNearBudget(amount) {
  const listings = await prisma.listing.findMany({
    where: { status: "available" },
    select: SELECT_FIELDS,
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

// For a general "kya available hai" / "koi id hai kya" question with no
// specific budget mentioned — still real, live stock, just not price-
// filtered. Most recently listed first (closest thing to "what's fresh").
export async function findAvailableListings() {
  return prisma.listing.findMany({
    where: { status: "available" },
    select: SELECT_FIELDS,
    orderBy: { createdAt: "desc" },
    take: MAX_RESULTS,
  });
}

// The listing's own first product photo — real marketing material, safe to
// hand a browsing customer proof of what the ID looks like. Distinct from
// (and never a substitute for) the actual account login credentials, which
// stay gated behind a confirmed, paid order.
export function firstListingImage(listing) {
  try {
    const images = JSON.parse(listing?.images || "[]");
    return images[0] || null;
  } catch {
    return null;
  }
}
