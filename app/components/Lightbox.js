"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const SWIPE_THRESHOLD = 28;
const FALLBACK_IMAGE = "/window.svg";
const MIN_SCALE = 1;
const MAX_SCALE = 4;
// Anything this close to 1 snaps back to exactly 1 (and re-centers) —
// without it, a pinch that ends barely-zoomed-in left the image subtly
// (and pointlessly) larger than its resting size forever.
const SNAP_BACK_THRESHOLD = 1.05;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function distanceBetween(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

// images/index/onNavigate are optional — callers with just a single image
// (chat attachments, payment proof) pass `src` alone and get the plain
// single-image viewer; the product gallery passes the full set to unlock
// swipe/arrow navigation while zoomed.
export default function Lightbox({ src, alt, onClose, images, index, onNavigate }) {
  const gallery = images && images.length > 0 ? images : null;
  const canNavigate = Boolean(gallery && gallery.length > 1);
  const activeSrc = gallery ? gallery[index] : src;
  const atFirst = !gallery || index <= 0;
  const atLast = !gallery || index >= gallery.length - 1;
  const touchStartX = useRef(null);
  // No fallback existed before — a broken URL zoomed-into full screen just
  // showed a bare broken-image icon over the backdrop with nothing to
  // click past it. Keyed by src so navigating to a different (working)
  // photo isn't permanently affected by an earlier one failing.
  const [brokenSrc, setBrokenSrc] = useState(null);

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [isGesturing, setIsGesturing] = useState(false); // suppresses the snap-back transition during an active drag/pinch
  // Mutable gesture bookkeeping — doesn't need to be state, nothing here
  // is ever read during render.
  const gesture = useRef({ pinchStartDist: null, pinchStartScale: 1, panOrigin: null });
  const mouseDrag = useRef(null);

  const zoomed = scale > 1;

  // A given index is a different photo, not a continuation of the last —
  // never carry zoom/pan across a navigation.
  useEffect(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, [activeSrc]);

  // Strict boundaries — no wraparound. Clamped rather than modulo, and a
  // no-op past either end instead of silently jumping to the other side.
  function goTo(rawIndex) {
    if (!canNavigate) return;
    const clamped = clamp(rawIndex, 0, gallery.length - 1);
    if (clamped === index) return;
    onNavigate(clamped);
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
    if (e.touches.length === 2) {
      gesture.current.pinchStartDist = distanceBetween(e.touches);
      gesture.current.pinchStartScale = scale;
      setIsGesturing(true);
    } else if (e.touches.length === 1) {
      if (zoomed) {
        gesture.current.panOrigin = {
          x: e.touches[0].clientX,
          y: e.touches[0].clientY,
          translateX: translate.x,
          translateY: translate.y,
        };
        setIsGesturing(true);
      } else {
        touchStartX.current = e.touches[0].clientX;
      }
    }
  }

  function handleTouchMove(e) {
    if (e.touches.length === 2 && gesture.current.pinchStartDist) {
      e.preventDefault();
      const dist = distanceBetween(e.touches);
      const next = clamp(
        gesture.current.pinchStartScale * (dist / gesture.current.pinchStartDist),
        MIN_SCALE,
        MAX_SCALE
      );
      setScale(next);
    } else if (e.touches.length === 1 && gesture.current.panOrigin) {
      e.preventDefault();
      const { x, y, translateX, translateY } = gesture.current.panOrigin;
      setTranslate({
        x: translateX + (e.touches[0].clientX - x) / scale,
        y: translateY + (e.touches[0].clientY - y) / scale,
      });
    }
  }

  function handleTouchEnd(e) {
    setIsGesturing(false);
    const wasPinchOrPan = gesture.current.pinchStartDist || gesture.current.panOrigin;
    gesture.current.pinchStartDist = null;
    gesture.current.panOrigin = null;
    if (wasPinchOrPan) {
      if (scale < SNAP_BACK_THRESHOLD) {
        setScale(1);
        setTranslate({ x: 0, y: 0 });
      }
      return;
    }

    // Swipe-to-navigate — only meaningful at rest; zoomed-in swipes pan
    // instead (handled above), so this never fires while zoomed.
    if (touchStartX.current === null || !canNavigate) return;
    const delta = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (delta > SWIPE_THRESHOLD) goTo(index - 1);
    else if (delta < -SWIPE_THRESHOLD) goTo(index + 1);
  }

  // Desktop equivalent of pinch — scroll to zoom, centered on wherever the
  // wheel happens rather than jumping to zoom-then-recenter.
  function handleWheel(e) {
    e.preventDefault();
    e.stopPropagation();
    setScale((prev) => {
      const next = clamp(prev * (1 - e.deltaY * 0.0015), MIN_SCALE, MAX_SCALE);
      if (next <= SNAP_BACK_THRESHOLD) {
        setTranslate({ x: 0, y: 0 });
        return 1;
      }
      return next;
    });
  }

  function handleMouseDown(e) {
    if (!zoomed) return;
    e.stopPropagation();
    mouseDrag.current = { x: e.clientX, y: e.clientY, translateX: translate.x, translateY: translate.y };
  }

  function handleMouseMove(e) {
    if (!mouseDrag.current) return;
    const { x, y, translateX, translateY } = mouseDrag.current;
    setTranslate({
      x: translateX + (e.clientX - x) / scale,
      y: translateY + (e.clientY - y) / scale,
    });
  }

  function stopMouseDrag() {
    mouseDrag.current = null;
  }

  // Double-click/tap to toggle zoom — the fast path for anyone not
  // pinching or scrolling.
  function handleDoubleClick(e) {
    e.stopPropagation();
    if (zoomed) {
      setScale(1);
      setTranslate({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  }

  if (!activeSrc) return null;

  return createPortal(
    <div
      className="lightbox-backdrop"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseMove={handleMouseMove}
      onMouseUp={stopMouseDrag}
      onMouseLeave={stopMouseDrag}
    >
      <button type="button" className="lightbox-close" aria-label="Close" onClick={onClose}>
        <X size={20} />
      </button>
      {canNavigate && !atFirst && (
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
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={activeSrc}
        className="lightbox-image"
        src={brokenSrc === activeSrc ? FALLBACK_IMAGE : activeSrc}
        alt={alt || ""}
        style={{
          transform: `scale(${scale}) translate(${translate.x}px, ${translate.y}px)`,
          transition: isGesturing ? "none" : "transform 0.2s ease",
          cursor: zoomed ? "grab" : "zoom-in",
        }}
        onClick={(e) => e.stopPropagation()}
        onError={() => setBrokenSrc(activeSrc)}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onDoubleClick={handleDoubleClick}
        draggable={false}
      />
      {canNavigate && !atLast && (
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
      )}
      {canNavigate && (
        <span className="gallery-counter">
          {index + 1} / {gallery.length}
        </span>
      )}
    </div>,
    document.body
  );
}
