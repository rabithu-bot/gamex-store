"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ZoomIn } from "lucide-react";
import Lightbox from "@/app/components/Lightbox";

const SWIPE_THRESHOLD = 28;

const PRELOAD_RADIUS = 2; // preload this many slides on each side of the active one

export default function ImageGallery({ images, alt }) {
  const gallery = useMemo(() => (images.length > 0 ? images : ["/window.svg"]), [images]);
  const [active, setActive] = useState(0);
  const [direction, setDirection] = useState(1);
  const [zoomed, setZoomed] = useState(false);
  const [mainLoaded, setMainLoaded] = useState(false);
  // Tracks which gallery URLs have failed to load (by src) so a single
  // broken S3 object degrades to a clear placeholder instead of leaving
  // the loading skeleton spinning forever — there was no onError handler
  // here at all before, so any failed load (deleted object, network
  // hiccup, bad URL) got stuck on the skeleton with no way out.
  const [brokenSrcs, setBrokenSrcs] = useState(() => new Set());
  const thumbRefs = useRef([]);
  const touchStartX = useRef(null);
  const preloadedRef = useRef(new Set());
  const skipNextThumbScroll = useRef(true);


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

  function markBroken(src) {
    setMainLoaded(true); // stop the skeleton — a placeholder is a resolved state, not a loading one
    setBrokenSrcs((prev) => (prev.has(src) ? prev : new Set(prev).add(src)));
  }

  // Keeps the active thumbnail scrolled into view in its own strip when the
  // user actually navigates (arrows/thumbnail click/swipe). useEffect also
  // fires once on mount, though, and scrollIntoView isn't scoped to just the
  // thumbnail strip's own scrolling — on a short viewport it was dragging the
  // whole page down to bring thumbnail 0 into view before the visitor had
  // done anything, hiding the main photo the instant the page opened. Skip
  // the very first run so this only ever fires from real navigation.
  useEffect(() => {
    if (skipNextThumbScroll.current) {
      skipNextThumbScroll.current = false;
      return;
    }
    thumbRefs.current[active]?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [active]);

  // Explicit, instant (not CSS smooth-scroll) reset to the top on every
  // fresh mount of this page — a hard guarantee the gallery always opens
  // showing the main photo first, independent of the fix above.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  // Resets the skeleton for the slide we just switched to — the main image
  // is served at full original resolution (unoptimized, no Next.js resizing)
  // so on a slow connection it's worth covering with a placeholder rather
  // than a blank box while it loads in.
  useEffect(() => {
    setMainLoaded(false);
  }, [active]);

  // Warms the browser cache for the next/previous couple of slides so
  // stepping through the gallery feels instant instead of waiting on a
  // fresh full-res fetch each time — a plain background fetch, no rendering involved.
  useEffect(() => {
    if (typeof window === "undefined" || gallery.length <= 1) return;
    const offsets = Array.from({ length: PRELOAD_RADIUS }, (_, i) => i + 1).flatMap((n) => [n, -n]);
    for (const offset of offsets) {
      const idx = ((active + offset) % gallery.length + gallery.length) % gallery.length;
      const url = gallery[idx];
      if (preloadedRef.current.has(url)) continue;
      preloadedRef.current.add(url);
      const img = new Image();
      img.src = url;
    }
  }, [active, gallery]);

  return (
    <div>
      <div
        className="gallery-main-wrap"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onClick={() => setZoomed(true)}
      >
        {!mainLoaded && <div className="gallery-main-skeleton skeleton" aria-hidden="true" />}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active}
          className={`gallery-main ${direction === 1 ? "gallery-slide-next" : "gallery-slide-prev"}`}
          src={brokenSrcs.has(gallery[active]) ? "/window.svg" : gallery[active]}
          alt={alt}
          loading={active === 0 ? "eager" : "lazy"}
          onLoad={() => setMainLoaded(true)}
          onError={() => markBroken(gallery[active])}
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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brokenSrcs.has(src) ? "/window.svg" : src}
                alt={`${alt} thumbnail ${i + 1}`}
                className="gallery-thumb-img"
                loading="lazy"
                onError={() => markBroken(src)}
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
