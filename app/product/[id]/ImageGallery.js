"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import Lightbox from "@/app/components/Lightbox";

export default function ImageGallery({ images, alt }) {
  const gallery = images.length > 0 ? images : ["/window.svg"];
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const thumbRefs = useRef([]);

  function goTo(rawIndex, dir) {
    const newIndex = ((rawIndex % gallery.length) + gallery.length) % gallery.length;
    setDirection(dir ?? (newIndex > active ? 1 : -1));
    setActive(newIndex);
  }

  useEffect(() => {
    thumbRefs.current[active]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [active]);

  return (
    <div>
      <div className="gallery-main-wrap">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active}
          className={`gallery-main gallery-zoomable ${direction === 1 ? "gallery-slide-next" : "gallery-slide-prev"}`}
          src={gallery[active]}
          alt={alt}
          onClick={() => setZoomed(true)}
        />
        <div className="gallery-zoom-hint" aria-hidden="true">
          <ZoomIn size={14} />
          Click to zoom
        </div>
        {gallery.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-nav prev"
              aria-label="Previous photo"
              onClick={() => goTo(active - 1, -1)}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="gallery-nav next"
              aria-label="Next photo"
              onClick={() => goTo(active + 1, 1)}
            >
              <ChevronRight size={20} />
            </button>
            <span className="gallery-counter">
              {active + 1} / {gallery.length}
            </span>
          </>
        )}
      </div>
      {gallery.length > 1 && (
        <div className="gallery-thumbs">
          {gallery.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              ref={(el) => (thumbRefs.current[i] = el)}
              src={src}
              alt={`${alt} thumbnail ${i + 1}`}
              className={`gallery-thumb ${i === active ? "active" : ""}`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>
      )}
      {zoomed && (
        <Lightbox src={gallery[active]} alt={alt} onClose={() => setZoomed(false)} />
      )}
    </div>
  );
}
