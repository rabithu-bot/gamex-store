"use client";

import { useState } from "react";
import Lightbox from "@/app/components/Lightbox";

export default function ProofGallery({ images }) {
  const [index, setIndex] = useState(null);

  return (
    <>
      <div className="proof-gallery-grid">
        {images.map((url, i) => (
          <button
            key={url}
            type="button"
            className="proof-gallery-thumb"
            onClick={() => setIndex(i)}
            aria-label="View proof image"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Delivery Proof ${i + 1} - GameX Store`} loading="lazy" />
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
