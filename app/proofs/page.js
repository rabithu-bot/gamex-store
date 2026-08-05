import { ShieldCheck, ImageOff, BadgeCheck } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import { SITE_URL } from "@/app/lib/siteUrl";
import SiteHeader from "@/app/components/SiteHeader";
import ProofGallery from "./ProofGallery";
import ProofsBackButton from "./ProofsBackButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Delivery Proofs - GameX Store",
  description:
    "Real payment confirmations and account deliveries from GameX Store customers — proof of safe, verified transactions.",
  alternates: { canonical: `${SITE_URL}/proofs` },
  openGraph: {
    title: "Delivery Proofs - GameX Store",
    description:
      "Real payment confirmations and account deliveries from GameX Store customers — proof of safe, verified transactions.",
    url: `${SITE_URL}/proofs`,
  },
};

export default async function ProofsPage() {
  const proofs = await prisma.proofImage.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      <SiteHeader />
      <main className="container">
        <ProofsBackButton />

        <div className="proofs-hero">
          <span className="proofs-hero-eyebrow">
            <ShieldCheck size={14} />
            Verified Delivery Records
          </span>
          <h1>Real Proof, Every Delivery</h1>
          <p className="muted">
            Unedited screenshots straight from completed orders — every payment confirmation
            and account handover we&apos;ve sent, exactly as the customer received it.
          </p>

          {proofs.length > 0 && (
            <div className="proofs-stat-row">
              <div className="proofs-stat">
                <strong>{proofs.length}+</strong>
                <span>Verified Deliveries</span>
              </div>
              <div className="proofs-stat">
                <strong>100%</strong>
                <span>Unedited Screenshots</span>
              </div>
              <div className="proofs-stat">
                <BadgeCheck size={18} />
                <span>Manually Reviewed</span>
              </div>
            </div>
          )}
        </div>

        {proofs.length === 0 ? (
          <div className="empty-state">
            <div className="icon">
              <ImageOff size={22} />
            </div>
            <strong>No proof uploaded yet</strong>
            <p className="muted" style={{ marginTop: "0.3rem" }}>
              Check back soon.
            </p>
          </div>
        ) : (
          <ProofGallery
            proofs={proofs.map((p) => ({
              url: p.url,
              proofDate: p.proofDate ? p.proofDate.toISOString() : null,
            }))}
          />
        )}
      </main>
    </>
  );
}
