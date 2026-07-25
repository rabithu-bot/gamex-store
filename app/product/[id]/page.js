import { notFound } from "next/navigation";
import { ShieldCheck, Zap, Headset } from "lucide-react";
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
  const similarListings = await getSimilarListings(listing);
  const hasDiscount = listing.originalPrice && listing.originalPrice > listing.price;
  const discountPercent = hasDiscount
    ? Math.round((1 - listing.price / listing.originalPrice) * 100)
    : 0;

  return (
    <>
      <SiteHeader />
      <main className="container product-page-main">
        <div className="product-layout">
          <div>
            <ImageGallery images={images} alt={listing.title} />
          </div>
          <div className="product-info">
            <span className="badge">{listing.category}</span>
            <h1>{listing.title}</h1>
            <div className="price-row">
              {hasDiscount && (
                <span className="price-original">₹{listing.originalPrice.toLocaleString("en-IN")}</span>
              )}
              <span className="price" style={{ fontSize: "1.5rem" }}>
                ₹{listing.price.toLocaleString("en-IN")}
              </span>
              {hasDiscount && <span className="price-discount-badge">{discountPercent}% OFF</span>}
            </div>
            <p className="muted product-description">{listing.description}</p>

            <div className="buy-bar">
              <div className="buy-bar-mobile-price">
                <span className="muted">Price</span>
                <span className="buy-bar-price-value">
                  {hasDiscount && (
                    <span className="price-original price-original-sm">
                      ₹{listing.originalPrice.toLocaleString("en-IN")}
                    </span>
                  )}
                  <strong className="price">₹{listing.price.toLocaleString("en-IN")}</strong>
                </span>
              </div>
              {listing.status === "available" ? (
                <BuyForm listingId={listing.id} listingTitle={listing.title} />
              ) : (
                <p className="status-pill sold" style={{ marginTop: "1rem" }}>
                  Sold
                </p>
              )}
            </div>

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
            <div className="listing-grid">
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
