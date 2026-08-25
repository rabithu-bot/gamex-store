import { notFound } from "next/navigation";
import { ShieldCheck, Zap, Headset, Star, Server, Gem } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import { SITE_URL } from "@/app/lib/siteUrl";
import SiteHeader from "@/app/components/SiteHeader";
import ListingCard from "@/app/components/ListingCard";
import BuyForm from "./BuyForm";
import ImageGallery from "./ImageGallery";

export const dynamic = "force-dynamic";

const SIMILAR_LIMIT = 8;

// Without this, every product page would inherit the homepage's title/
// description/canonical from the root layout — Google would then treat every
// listing as a duplicate of the homepage instead of indexing it individually.
export async function generateMetadata({ params }) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id: Number(id) } });
  if (!listing) return {};

  const title = `${listing.title} - GameX Store`;
  const description =
    listing.description?.slice(0, 155) ||
    `Buy ${listing.title} safely — 100% verified Free Fire ID, secure UPI payment, instant delivery. ₹${listing.price} only.`;
  const url = `${SITE_URL}/product/${listing.id}`;
  const images = JSON.parse(listing.images || "[]");

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      images: images[0] ? [{ url: images[0] }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images[0] ? [images[0]] : undefined,
    },
  };
}

// Real Product/Offer schema for this exact listing — name, price, image,
// and availability all pulled straight from the same record the page
// itself renders. Deliberately no aggregateRating/review block: there is
// no review system behind this data, and Google treats invented rating
// markup as structured-data spam (can cost the whole site rich-result
// eligibility). Add it for real once there's an actual review feature.
function buildProductJsonLd(listing, images) {
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: listing.title,
    description: listing.description || `${listing.title} — verified Free Fire ID.`,
    image: images.length ? images : undefined,
    category: listing.category,
    sku: String(listing.id),
    offers: {
      "@type": "Offer",
      url: `${SITE_URL}/product/${listing.id}`,
      priceCurrency: "INR",
      price: listing.price,
      availability:
        listing.status === "available" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
      itemCondition: "https://schema.org/UsedCondition",
    },
  };
}

async function getSimilarListings(listing) {
  const sameCategory = await prisma.listing.findMany({
    where: { status: "available", category: listing.category, id: { not: listing.id } },
    orderBy: { price: "asc" },
    take: SIMILAR_LIMIT,
  });

  if (sameCategory.length >= SIMILAR_LIMIT) return sameCategory;

  const fallback = await prisma.listing.findMany({
    where: {
      status: "available",
      id: { notIn: [listing.id, ...sameCategory.map((l) => l.id)] },
    },
    orderBy: { price: "asc" },
    take: SIMILAR_LIMIT - sameCategory.length,
  });

  return [...sameCategory, ...fallback];
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id: Number(id) } });

  // Drafts (e.g. from the Instagram import pipeline, pending admin review)
  // aren't ready to sell yet — treat them the same as a missing listing
  // rather than exposing an unreviewed price/description/Buy Now button.
  if (!listing || listing.status === "draft") notFound();

  const images = JSON.parse(listing.images || "[]");
  const rareItems = JSON.parse(listing.rareItems || "[]");
  const similarListings = await getSimilarListings(listing);
  const hasDiscount = listing.originalPrice && listing.originalPrice > listing.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - listing.price / listing.originalPrice) * 100)
    : 0;
  const isSold = listing.status !== "available";

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProductJsonLd(listing, images)) }}
      />
      <SiteHeader />
      <main className="container product-page-main">
        <div className="product-layout">
          <div>
            <ImageGallery images={images} alt={`${listing.title} - GameX Store`} />
          </div>
          <div className="product-info">
            <div className="product-badge-row">
              <span className="badge">{listing.category}</span>
              {listing.tier && <span className="badge badge-tier">{listing.tier}</span>}
            </div>
            <h1>{listing.title}</h1>
            {listing.gameUid && (
              <span className="product-uid-highlight">
                UID <span className="product-uid-highlight-value">{listing.gameUid}</span>
              </span>
            )}
            <div className="price-row">
              {hasDiscount && (
                <span className="price-original">₹{listing.originalPrice.toLocaleString("en-IN")}</span>
              )}
              <span
                className={`price${isSold ? " price-sold" : ""}`}
                style={{ fontSize: "1.5rem" }}
              >
                ₹{listing.price.toLocaleString("en-IN")}
              </span>
              {hasDiscount && <span className="price-discount-badge">{discountPercent}% OFF</span>}
            </div>
            {(listing.level || listing.server) && (
              <div className="stat-box-row">
                {listing.level && (
                  <div className="stat-box">
                    <Star size={16} />
                    <div>
                      <span className="muted">Level</span>
                      <strong>{listing.level}</strong>
                    </div>
                  </div>
                )}
                {listing.server && (
                  <div className="stat-box">
                    <Server size={16} />
                    <div>
                      <span className="muted">Server</span>
                      <strong>{listing.server}</strong>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="verified-transaction-bar">
              <ShieldCheck size={16} />
              Verified &amp; Secure Transaction
            </div>

            <div className="buy-bar">
              <div className="buy-bar-mobile-price">
                <span className="muted">Price</span>
                <span className="buy-bar-price-value">
                  {hasDiscount && (
                    <span className="price-original price-original-sm">
                      ₹{listing.originalPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                  <strong className={`price${isSold ? " price-sold" : ""}`}>
                    ₹{listing.price.toLocaleString("en-IN")}
                  </strong>
                </span>
              </div>
              {listing.status === "available" ? (
                <BuyForm listingId={listing.id} listingTitle={listing.title} listingPrice={listing.price} />
              ) : (
                <button type="button" className="btn sold-out-cta" style={{ marginTop: "1.25rem" }} disabled>
                  SOLD OUT
                </button>
              )}
            </div>

            {rareItems.length > 0 && (
              <div className="product-section product-section-rare">
                <h3 className="product-section-heading heading-rare">
                  <Gem size={15} />
                  Rare Items Included
                </h3>
                <div className="rare-items-row">
                  {rareItems.map((item) => (
                    <span key={item} className="rare-item-tag">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="trust-badges">
              <div className="trust-badge">
                <ShieldCheck size={18} />
                <span>100% Verified Account</span>
              </div>
              <div className="trust-badge">
                <Zap size={18} />
                <span>Instant Delivery, Safe Transfer</span>
              </div>
              <div className="trust-badge">
                <Headset size={18} />
                <span>24/7 Support</span>
              </div>
            </div>
          </div>
        </div>

        {similarListings.length > 0 && (
          <section style={{ marginTop: "3rem" }}>
            <h2>Similar Accounts</h2>
            <p className="muted">Other accounts you might be interested in.</p>
            <div className="listing-grid" style={{ marginBottom: "3rem" }}>
              {similarListings.map((similar) => (
                <ListingCard key={similar.id} listing={similar} />
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
