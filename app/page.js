import { ShieldCheck, Lock, Zap, PackageOpen } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import SiteHeader from "@/app/components/SiteHeader";
import ListingCard from "@/app/components/ListingCard";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <SiteHeader />
      <main className="container">
        <h2>Available Accounts</h2>
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

        <div className="listing-grid">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>

        <section className="hero" style={{ marginTop: "3rem" }}>
          <span className="eyebrow">Trusted Seller</span>
          <h1>
            Grow &amp; Trust With <span className="accent-text">GAMEX STORE</span>
          </h1>
          <p>
            Buy verified gaming accounts directly from the owner — pay securely on this
            site and get your account instantly after confirmation.
          </p>
        </section>

        <div className="feature-tiles">
          <div className="feature-tile">
            <div className="icon">
              <ShieldCheck size={20} />
            </div>
            <strong>Verified Accounts</strong>
            <p>Every listing is owned and checked by the seller.</p>
          </div>
          <div className="feature-tile">
            <div className="icon">
              <Lock size={20} />
            </div>
            <strong>Pay Securely On-Site</strong>
            <p>Scan the UPI QR here, no off-platform chats needed.</p>
          </div>
          <div className="feature-tile">
            <div className="icon">
              <Zap size={20} />
            </div>
            <strong>Fast Manual Delivery</strong>
            <p>Credentials are released right here once payment is confirmed.</p>
          </div>
        </div>
      </main>
    </>
  );
}
