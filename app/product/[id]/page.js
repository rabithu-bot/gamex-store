import { notFound } from "next/navigation";
import { ShieldCheck, Zap, Headset, Star, Server, Hash, Gem } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import SiteHeader from "@/app/components/SiteHeader";
import ListingCard from "@/app/components/ListingCard";
import BuyForm from "./BuyForm";
import ImageGallery from "./ImageGallery";

export const dynamic = "force-dynamic";

const SIMILAR_LIMIT = 8;

async function getSimilarListings(listing) {
  const sameCategory = await prisma.listing.findMany({
    where: { status: "available", category: listing.category, id: { not: listing.id } },
    orderBy: { createdAt: "desc" },
    take: SIMILAR_LIMIT,
  });

  if (sameCategory.length >= SIMILAR_LIMIT) return sameCategory;

  const fallback = await prisma.listing.findMany({
    where: {
      status: "available",
      id: { notIn: [listing.id, ...sameCategory.map((l) => l.id)] },
    },
    orderBy: { createdAt: "desc" },
    take: SIMILAR_LIMIT - sameCategory.length,
  });

  return [...sameCategory, ...fallback];
}

export default async function ProductPage({ params }) {
  const { id } = await params;
  const listing = await prisma.listing.findUnique({ where: { id: Number(id) } });

  if (!listing) notFound();

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
      <SiteHeader />
      <main className="container product-page-main">
        <div className="product-layout">
          <div>
            <ImageGallery images={images} alt={listing.title} />
          </div>
          <div className="product-info">
            <div className="product-badge-row">
              <span className="badge">{listing.category}</span>
              {listing.tier && <span className="badge badge-tier">{listing.tier}</span>}
            </div>
            <h1>{listing.title}</h1>
            {listing.gameUid && (
              <span className="card-uid product-uid">
                UID <span className="card-uid-value">{listing.gameUid}</span>
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

            <div className="product-section">
              <h3 className="product-section-heading">
                <Hash size={15} />
                Description
              </h3>
              <p className="muted product-description">{listing.description}</p>
            </div>

            {rareItems.length > 0 && (
              <div className="product-section">
                <h3 className="product-section-heading">
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
