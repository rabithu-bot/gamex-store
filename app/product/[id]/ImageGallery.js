"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import Lightbox from "@/app/components/Lightbox";

const SWIPE_THRESHOLD = 28;

export default function ImageGallery({ images, alt }) {
  const gallery = images.length > 0 ? images : ["/window.svg"];
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const thumbRefs = useRef([]);
  const touchStartX = useRef(null);

  function goTo(rawIndex, dir) {
    const newIndex = ((rawIndex % gallery.length) + gallery.length) % gallery.length;
    setDirection(dir ?? (newIndex > active ? 1 : -1));
    setActive(newIndex);
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null || gallery.length <= 1) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > SWIPE_THRESHOLD) goTo(active - 1, -1);
    else if (delta < -SWIPE_THRESHOLD) goTo(active + 1, 1);
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
      <div
        className="gallery-main-wrap"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setZoomed(true)}
      >
        <Image
          key={active}
          className={`gallery-main ${direction === 1 ? "gallery-slide-next" : "gallery-slide-prev"}`}
          src={gallery[active]}
          alt={alt}
          fill
          sizes="340px"
          priority={active === 0}
        />
        {/* Single zoom badge — bottom-left, inside the fixed-size box above. */}
        <div className="gallery-zoom-hint" aria-hidden="true">
          <ZoomIn size={14} />
          Tap to zoom
        </div>
        {gallery.length > 1 && (
          <>
            <button
              type="button"
              className="gallery-nav prev"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                goTo(active - 1, -1);
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              type="button"
              className="gallery-nav next"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                goTo(active + 1, 1);
              }}
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
            <button
              key={src}
              ref={(el) => (thumbRefs.current[i] = el)}
              type="button"
              className={`gallery-thumb-btn ${i === active ? "active" : ""}`}
              onClick={() => goTo(i)}
              aria-label={`View photo ${i + 1}`}
            >
              <Image
                src={src}
                alt={`${alt} thumbnail ${i + 1}`}
                className="gallery-thumb-img"
                fill
                sizes="64px"
              />
            </button>
          ))}
        </div>
      )}
      {zoomed && (
        <Lightbox
          images={gallery}
          index={active}
          alt={alt}
          onNavigate={(i) => goTo(i)}
          onClose={() => setZoomed(false)}
        />
      )}
    </div>
  );
}
