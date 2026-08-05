"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import Lightbox from "@/app/components/Lightbox";

function formatProofDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ProofGallery({ proofs }) {
  const [index, setIndex] = useState(null);
  const images = proofs.map((p) => p.url);

  return (
    <>
      <div className="proof-gallery-grid">
        {proofs.map((proof, i) => (
          <button
            key={proof.url}
            type="button"
            className="proof-gallery-thumb"
            onClick={() => setIndex(i)}
            aria-label="View proof image"
          >
            {/* Real screenshots at their natural aspect ratio, not stored
                dimensions — next/image needs one of those up front, so this
                stays a plain <img> (same documented exception as blob:
                previews elsewhere) rather than force-cropping proof text
                out of a fixed square. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proof.url}
              alt={`Delivery Proof ${i + 1} - GameX Store`}
              loading="lazy"
              decoding="async"
            />
            <span className="proof-verified-badge">
              <ShieldCheck size={12} />
              Verified
            </span>
            {/* Only shown when the admin set a real date for this batch —
                never falls back to upload time, which would misleadingly
                cluster every proof on whatever day it happened to be bulk
                -uploaded. */}
            {proof.proofDate && (
              <span className="proof-date-caption">{formatProofDate(proof.proofDate)}</span>
            )}
          </button>
        ))}
      </div>

      {index !== null && (
        <Lightbox
          images={images}
          index={index}
          alt="Delivery Proof - GameX Store"
          onNavigate={setIndex}
          onClose={() => setIndex(null)}
        />
      )}
    </>
  );
}
