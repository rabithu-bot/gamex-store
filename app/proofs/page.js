import { ShieldCheck, ImageOff, BadgeCheck } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import { SITE_URL } from "@/app/lib/siteUrl";
import SiteHeader from "@/app/components/SiteHeader";
import ProofGallery from "./ProofGallery";
import ProofsBackButton from "./ProofsBackButton";

export const dynamic = "force-dynamic";

// Title: 59 chars. Description: 131 chars — measured, not guessed, same
// as the homepage/product page rewrite, to stay under Google's practical
// snippet-truncation limits.
const PAGE_TITLE = "Free Fire Delivery Proof - Verified FF Buyers | GameX Store";
const PAGE_DESCRIPTION =
  "Real proof of Free Fire ID delivery — payment confirmations and instant account handovers from actual GameX Store buyers, unedited.";

// Dynamic (not a static `export const metadata`) so the social-preview
// image can be a REAL, current proof screenshot instead of the generic
// logo — an actual delivery screenshot is a much stronger trust signal
// when this link gets shared on WhatsApp, which is exactly how buyers
// actually pass this page around.
export async function generateMetadata() {
  const latestProof = await prisma.proofImage.findFirst({
    where: { type: "image" },
    orderBy: { createdAt: "desc" },
  });
  const ogImage = latestProof ? [{ url: latestProof.url }] : [{ url: "/icon.svg", width: 512, height: 512 }];

  return {
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    alternates: { canonical: `${SITE_URL}/proofs` },
    openGraph: {
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      url: `${SITE_URL}/proofs`,
      images: ogImage,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: PAGE_TITLE,
      description: PAGE_DESCRIPTION,
      images: ogImage.map((img) => img.url),
    },
  };
}

// Real ImageObject/VideoObject entries for the actual proofs shown on
// this page — contentUrl and uploadDate (when the admin actually set a
// real proofDate) are both genuine. Deliberately NOT a Review/
// AggregateRating block: these are delivery/payment screenshots, not
// written customer reviews with a rating — there's no reviewer name or
// star rating behind any of this data, so schema claiming otherwise
// would be exactly the fabricated-trust-signal spam Google's structured
// data guidelines penalize (see app/layout.js and the product page for
// the same reasoning).
function buildProofsJsonLd(proofs) {
  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
    url: `${SITE_URL}/proofs`,
    about: { "@type": "Thing", name: "Free Fire ID delivery and payment verification" },
    hasPart: proofs.slice(0, 50).map((proof, index) => ({
      "@type": proof.type === "video" ? "VideoObject" : "ImageObject",
      name: `Free Fire ID Delivery Proof #${index + 1}`,
      contentUrl: proof.url,
      ...(proof.proofDate ? { uploadDate: proof.proofDate.toISOString() } : {}),
    })),
  };
}

export default async function ProofsPage() {
  const proofs = await prisma.proofImage.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <>
      {proofs.length > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildProofsJsonLd(proofs)) }}
        />
      )}
      <SiteHeader />
      <main className="container">
        <ProofsBackButton />

        <div className="proofs-hero">
          <span className="proofs-hero-eyebrow">
            <ShieldCheck size={14} />
            Verified Free Fire ID Deliveries
          </span>
          <h1>Real Proof — Every Free Fire ID Delivered Instantly</h1>
          <p className="muted">
            Unedited screenshots and videos straight from real Free Fire ID orders — every payment
            confirmation and instant account handover we&apos;ve sent, exactly as the buyer received it.
          </p>

          {proofs.length > 0 && (
            <div className="proofs-stat-row">
              <div className="proofs-stat">
                <strong>{proofs.length}+</strong>
                <span>Verified FF ID Deliveries</span>
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
              id: p.id,
              url: p.url,
              type: p.type,
              proofDate: p.proofDate ? p.proofDate.toISOString() : null,
            }))}
          />
        )}
      </main>
    </>
  );
}
