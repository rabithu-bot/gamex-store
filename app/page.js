import { PackageOpen } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import { SITE_URL } from "@/app/lib/siteUrl";
import SiteHeader from "@/app/components/SiteHeader";
import TickerBar from "@/app/components/TickerBar";
import HomeListings from "@/app/HomeListings";

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

export default async function HomePage() {
  // Cheapest accounts surface first for buyers browsing the storefront.
  // Drafts (pending admin review) are deliberately excluded — "sold" stays
  // visible since buyers browsing still see it grayed out for trust/social
  // proof, but an unreviewed draft has no business being public yet.
  const [listings, confirmedDeliveries] = await Promise.all([
    prisma.listing.findMany({
      where: { status: { not: "draft" } },
      orderBy: { price: "asc" },
    }),
    // The ticker's delivery count is this real number, never a placeholder
    // like "1,500+" — same standard as every other stat this store shows.
    prisma.order.count({ where: { status: "confirmed" } }),
  ]);

  return (
    <>
      {listings.length > 0 && (
        <script
          type="application/ld+json"
          // Real data only — same listings array the page itself renders.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductListJsonLd(listings)) }}
        />
      )}
      <TickerBar confirmedDeliveries={confirmedDeliveries} />
      <SiteHeader />
      <main className="container">
        <h1>Buy Free Fire ID - Verified FF Accounts For Sale</h1>
        <p className="muted">
          Max Level IDs, Evo &amp; Cobra gun accounts — verified, instant delivery, sold directly by the store owner.
        </p>

        {listings.length === 0 ? (
          <div className="empty-state">
            <div className="icon">
              <PackageOpen size={22} />
            </div>
            <strong>No listings available right now</strong>
            <p className="muted" style={{ marginTop: "0.3rem" }}>
              Check back soon — new accounts are added regularly.
            </p>
          </div>
        ) : (
          <HomeListings listings={listings} />
        )}
      </main>
    </>
  );
}
