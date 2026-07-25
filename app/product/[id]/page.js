import { notFound } from "next/navigation";
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

  return (
    <>
      <SiteHeader />
      <main className="container product-page-main">
        <div className="product-layout">
          <div>
            <ImageGallery images={images} alt={listing.title} />
          </div>
          <div>
            <span className="badge">{listing.category}</span>
            <h1 style={{ marginTop: "0.6rem" }}>{listing.title}</h1>
            <p className="price" style={{ fontSize: "1.5rem", margin: "0.6rem 0" }}>
              ₹{listing.price.toLocaleString("en-IN")}
            </p>
            <p className="muted" style={{ whiteSpace: "pre-wrap" }}>
              {listing.description}
            </p>

            <div className="buy-bar">
              <div className="buy-bar-mobile-price">
                <span className="muted">Price</span>
                <strong className="price">₹{listing.price.toLocaleString("en-IN")}</strong>
              </div>
              {listing.status === "available" ? (
                <BuyForm listingId={listing.id} listingTitle={listing.title} />
              ) : (
                <p className="status-pill sold" style={{ marginTop: "1rem" }}>
                  Sold
                </p>
              )}
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
