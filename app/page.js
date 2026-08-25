import { PackageOpen } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import { SITE_URL } from "@/app/lib/siteUrl";
import { getEffectiveLifetimeDeals } from "@/app/lib/lifetimeOrderCount";
import SiteHeader from "@/app/components/SiteHeader";
import TickerBar from "@/app/components/TickerBar";
import ListingCard from "@/app/components/ListingCard";

export const dynamic = "force-dynamic";

// Real Product/Offer data for every listing actually shown on this page —
// deliberately no aggregateRating/review block (see app/layout.js for why:
// no genuine review data exists behind it, and Google treats fabricated
// rating markup as structured-data spam). Price and availability here are
// both true and already visible on the page itself, which is exactly what
// Google's guidelines want structured data to be: a machine-readable
// mirror of real on-page content, not an addition to it.
function buildProductListJsonLd(listings) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: listings.map((listing, index) => {
      let images = [];
      try {
        images = JSON.parse(listing.images || "[]");
      } catch {
        images = [];
      }
      return {
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Product",
          name: listing.title,
          image: images[0] ? [images[0]] : undefined,
          category: listing.category,
          url: `${SITE_URL}/product/${listing.id}`,
          offers: {
            "@type": "Offer",
            priceCurrency: "INR",
            price: listing.price,
            availability:
              listing.status === "available"
                ? "https://schema.org/InStock"
                : "https://schema.org/SoldOut",
            url: `${SITE_URL}/product/${listing.id}`,
          },
        },
      };
    }),
  };
}

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
  const [listings, dealsCompleted] = await Promise.all([
    prisma.listing.findMany({
      where: { status: { not: "draft" } },
      orderBy: { price: "asc" },
    }),
    // Real total — the admin's own manually-attested figure (set in
    // /mafia/settings for pre-website/offline history this site's order
    // table can't see) when they've saved one, otherwise the real
    // auto-tracked on-site count. Static until that setting changes; never
    // a formula that grows on its own with elapsed time.
    getEffectiveLifetimeDeals(),
  ]);
  const categoryGroups = groupByCategory(listings);

  return (
    <>
      {listings.length > 0 && (
        <script
          type="application/ld+json"
          // Real data only — same listings array the page itself renders.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductListJsonLd(listings)) }}
        />
      )}
      <TickerBar dealsCompleted={dealsCompleted} />
      <SiteHeader />
      <main className="container">
        <h1>Buy Free Fire ID - Verified FF Accounts For Sale</h1>
        <p className="muted">
          Max Level IDs, Evo &amp; Cobra gun accounts — verified, instant delivery, sold directly by the store owner.
        </p>

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
