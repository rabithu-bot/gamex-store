import { ShieldCheck, ImageOff } from "lucide-react";
import { prisma } from "@/app/lib/prisma";
import SiteHeader from "@/app/components/SiteHeader";
import ProofGallery from "./ProofGallery";
import ProofsBackButton from "./ProofsBackButton";

export const dynamic = "force-dynamic";

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
