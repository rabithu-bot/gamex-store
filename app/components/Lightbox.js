"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export default function Lightbox({ src, alt, onClose }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!src) return null;

  return (
    <div className="lightbox-backdrop" onClick={onClose}>
      <button type="button" className="lightbox-close" aria-label="Close" onClick={onClose}>
        <X size={20} />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        className="lightbox-image"
        src={src}
        alt={alt || ""}
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
