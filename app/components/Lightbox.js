"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const SWIPE_THRESHOLD = 28;

// images/index/onNavigate are optional — callers with just a single image
// (chat attachments, payment proof) pass `src` alone and get the plain
// single-image viewer; the product gallery passes the full set to unlock
// swipe/arrow navigation while zoomed.
export default function Lightbox({ src, alt, onClose, images, index, onNavigate }) {
  const gallery = images && images.length > 0 ? images : null;
  const canNavigate = Boolean(gallery && gallery.length > 1);
  const activeSrc = gallery ? gallery[index] : src;
  const touchStartX = useRef(null);

  function goTo(rawIndex) {
    if (!canNavigate) return;
    const wrapped = ((rawIndex % gallery.length) + gallery.length) % gallery.length;
    onNavigate(wrapped);
  }

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowLeft") goTo(index - 1);
      else if (e.key === "ArrowRight") goTo(index + 1);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null || !canNavigate) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > SWIPE_THRESHOLD) goTo(index - 1);
    else if (delta < -SWIPE_THRESHOLD) goTo(index + 1);
  }

  if (!activeSrc) return null;

  return createPortal(
    <div
      className="lightbox-backdrop"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button type="button" className="lightbox-close" aria-label="Close" onClick={onClose}>
        <X size={20} />
      </button>
      {canNavigate && (
        <button
          type="button"
          className="gallery-nav prev"
          aria-label="Previous photo"
          onClick={(e) => {
            e.stopPropagation();
            goTo(index - 1);
          }}
        >
          <ChevronLeft size={22} />
        </button>
      )}
      {activeSrc.startsWith("blob:") ? (
        // A caller (e.g. the chat threads) can pass through an optimistic
        // local object URL — next/image can't optimize that, so it falls
        // back to a plain <img> for this one case.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={activeSrc}
          className="lightbox-image"
          src={activeSrc}
          alt={alt || ""}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        // Real dimensions are unknown ahead of time (arbitrary uploaded
        // screenshots/photos) — width/height below are nominal, and the
        // inline auto override hands sizing back to .lightbox-image's
        // max-width/max-height/object-fit, same as the plain <img> did.
        <Image
          key={activeSrc}
          className="lightbox-image"
          src={activeSrc}
          alt={alt || ""}
          width={900}
          height={900}
          style={{ width: "auto", height: "auto" }}
          sizes="(max-width: 900px) 90vw, 900px"
          unoptimized
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {canNavigate && (
        <>
          <button
            type="button"
            className="gallery-nav next"
            aria-label="Next photo"
            onClick={(e) => {
              e.stopPropagation();
              goTo(index + 1);
            }}
          >
            <ChevronRight size={22} />
          </button>
          <span className="gallery-counter">
            {index + 1} / {gallery.length}
          </span>
        </>
      )}
    </div>,
    document.body
  );
}
