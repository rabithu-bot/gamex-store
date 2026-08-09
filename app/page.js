import { PackageOpen } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import SiteHeader from "@/app/components/SiteHeader";
import ListingCard from "@/app/components/ListingCard";

export const dynamic = "force-dynamic";

// Groups the (already price-sorted) listings by category while preserving
// both the order categories first appear in and the price order within each
// — lets the homepage render a keyword-relevant "<h3>{category} Accounts</h3>"
// subheading per game instead of one flat grid.
//
// Grouped by a normalized key (trimmed, whitespace-collapsed, lowercased) so
// admin-entered variants of the same game — "FreeFire", "Free Fire", "free
// fire " — land in one section instead of silently fragmenting into several.
// The heading itself still displays the first-seen spelling as typed.
function groupByCategory(listings) {
  const groups = [];
  const indexByKey = new Map();
  for (const listing of listings) {
    const raw = (listing.category || "Other").trim();
    const key = raw.toLowerCase().replace(/\s+/g, " ");
    if (!indexByKey.has(key)) {
      indexByKey.set(key, groups.length);
      groups.push({ category: raw, items: [] });
    }
    groups[indexByKey.get(key)].items.push(listing);
  }
  return groups;
}

export default async function HomePage() {
  // Cheapest accounts surface first for buyers browsing the storefront.
  // Drafts (pending admin review) are deliberately excluded — "sold" stays
  // visible since buyers browsing still see it grayed out for trust/social
  // proof, but an unreviewed draft has no business being public yet.
  const listings = await prisma.listing.findMany({
    where: { status: { not: "draft" } },
    orderBy: { price: "asc" },
  });
  const categoryGroups = groupByCategory(listings);

  return (
    <>
      <SiteHeader />
      <main className="container">
        <h1>Available Gaming Accounts</h1>
        <p className="muted">Verified accounts, sold directly by the store owner.</p>

        {listings.length === 0 && (
          <div className="empty-state">
            <div className="icon">
              <PackageOpen size={22} />
            </div>
            <strong>No listings available right now</strong>
            <p className="muted" style={{ marginTop: "0.3rem" }}>
              Check back soon — new accounts are added regularly.
            </p>
          </div>
        )}

        {categoryGroups.map(({ category, items }, groupIndex) => (
          <section key={category} style={{ marginTop: "1.5rem" }}>
            <h3 style={{ marginBottom: "0.75rem" }}>{category} Accounts</h3>
            <div className="listing-grid">
              {items.map((listing, index) => (
                <ListingCard
                  key={listing.id}
                  listing={listing}
                  // Only the very first row of the very first category is
                  // reliably above the fold — that's the LCP candidate.
                  priority={groupIndex === 0 && index < 2}
                />
              ))}
            </div>
          </section>
        ))}
      </main>
    </>
  );
}
