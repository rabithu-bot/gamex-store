import { ShieldCheck, ImageOff } from "lucide-react";
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
        <h1>
          <ShieldCheck size={22} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
          Proof
        </h1>
        <p className="muted">Real deliveries and payment confirmations from past customers.</p>

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
          <ProofGallery images={proofs.map((p) => p.url)} />
        )}
      </main>
    </>
  );
}
