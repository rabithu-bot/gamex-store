"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ShieldCheck, Maximize, Minimize } from "lucide-react";
import Lightbox from "@/app/components/Lightbox";

function formatProofDate(iso) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// All proof videos share this single handler so that starting one always
// pauses every other proof video on the page — there's no shared player
// registry, just a direct DOM query scoped to this page's video elements.
function pauseOtherVideos(e) {
  document.querySelectorAll(".proof-gallery-video").forEach((v) => {
    if (v !== e.currentTarget && !v.paused) v.pause();
  });
}

function ProofBadges({ proofDate }) {
  return (
    <>
      <span className="proof-verified-badge">
        <ShieldCheck size={12} />
        Verified
      </span>
      {proofDate && <span className="proof-date-caption">{formatProofDate(proofDate)}</span>}
    </>
  );
}

// Stable per-video offset (not re-randomized on every render) so the
// watermark's float animation doesn't start at the exact same point on
// every video on the page — purely cosmetic, derived from the URL itself.
function seededDelay(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
  return -(hash % 16);
}

// Scoped to the public Proofs gallery only (never chat attachments or
// product listing media) — a lightly branded, always-moving watermark plus
// controlsList="nodownload" and a blocked right-click context menu, so
// screen-recording is the only real way to lift the footage, same as any
// other watermarked preview video online.
function ProofVideo({ url, onPlay }) {
  const delay = useMemo(() => seededDelay(url), [url]);
  const videoRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const container = videoRef.current?.closest(".proof-gallery-thumb");
    if (!container) return;
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === container);
    }
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  // The native fullscreen button fullscreens only the <video> element itself
  // — the watermark is a sibling <span>, not a video descendant, so it
  // vanished the instant someone zoomed in. Worse, on Android, letting the
  // bare <video> go fullscreen also triggers the browser's own "auto-rotate
  // to landscape" behavior for video-element fullscreen specifically, which
  // isn't wanted here (these are portrait recordings). controlsList
  // "nofullscreen" hides that native button (Chrome/Edge) so the button
  // below — which fullscreens the shared .proof-gallery-thumb container
  // directly — is the only path in, sidestepping both problems at once
  // instead of reacting after the fact with screen.orientation.lock.
  function handleFullscreenClick() {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    const container = videoRef.current?.closest(".proof-gallery-thumb");
    container?.requestFullscreen?.().catch(() => {});
  }

  return (
    <>
      <video
        ref={videoRef}
        // #t=0.001 (a Media Fragments time offset) makes the browser
        // decode and paint that first frame as the poster the moment
        // metadata loads, instead of a black box until the user hits
        // play — needs preload="metadata" below to actually fetch enough
        // of the file to do that.
        src={`${url}#t=0.001`}
        preload="metadata"
        playsInline
        controls
        controlsList="nodownload nofullscreen"
        onContextMenu={(e) => e.preventDefault()}
        className="proof-gallery-video"
        onPlay={onPlay}
      />
      <span className="proof-watermark" style={{ animationDelay: `${delay}s` }} aria-hidden="true">
        gamexstore.com
      </span>
      <button
        type="button"
        className="proof-video-fullscreen-btn"
        onClick={handleFullscreenClick}
        aria-label="Fullscreen"
      >
        {isFullscreen ? <Minimize size={14} /> : <Maximize size={14} />}
      </button>
    </>
  );
}

// There's no stored link between a given video and a given screenshot (they
// come from separate upload batches), so pairs are formed by recency rank —
// the newest video sits with the newest photo, and so on. Whichever list is
// longer contributes leftover items rendered as normal single cards.
function buildGalleryItems(proofs) {
  const videos = proofs.filter((p) => p.type === "video");
  const photos = proofs.filter((p) => p.type !== "video");
  const pairCount = Math.min(videos.length, photos.length);

  const items = [];
  for (let i = 0; i < pairCount; i++) {
    items.push({ kind: "pair", key: `pair-${videos[i].url}`, video: videos[i], photo: photos[i] });
  }
  for (let i = pairCount; i < videos.length; i++) {
    items.push({ kind: "single", key: videos[i].url, proof: videos[i] });
  }
  for (let i = pairCount; i < photos.length; i++) {
    items.push({ kind: "single", key: photos[i].url, proof: photos[i] });
  }
  return items;
}

function ProofPair({ video, photo, photoIndex, onZoomPhoto }) {
  const photoRef = useRef(null);
  const [photoHeight, setPhotoHeight] = useState(null);

  useEffect(() => {
    const el = photoRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect?.height;
      if (h) setPhotoHeight(h);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="proof-pair">
      <div
        id={`proof-${video.id}`}
        className="proof-gallery-thumb proof-gallery-thumb-video proof-pair-video-wrap"
        style={photoHeight ? { height: photoHeight } : undefined}
      >
        <ProofVideo url={video.url} onPlay={pauseOtherVideos} />
        <ProofBadges proofDate={video.proofDate} />
      </div>

      <button
        id={`proof-${photo.id}`}
        ref={photoRef}
        type="button"
        className="proof-gallery-thumb proof-pair-photo-wrap"
        onClick={onZoomPhoto}
        aria-label="View proof image"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo.url}
          alt={`Delivery Proof ${photoIndex + 1} - GameX Store`}
          loading="lazy"
          decoding="async"
        />
        <ProofBadges proofDate={photo.proofDate} />
      </button>
    </div>
  );
}

export default function ProofGallery({ proofs }) {
  const [index, setIndex] = useState(null);
  // Videos play inline with their own controls rather than opening the
  // (image-only) lightbox, so its navigable set is just the image proofs.
  const images = proofs.filter((p) => p.type !== "video").map((p) => p.url);
  const imageIndexByUrl = new Map(images.map((url, i) => [url, i]));

  const items = buildGalleryItems(proofs);

  return (
    <>
      <div className="proof-gallery-grid">
        {items.map((item) => {
          if (item.kind === "pair") {
            return (
              <ProofPair
                key={item.key}
                video={item.video}
                photo={item.photo}
                photoIndex={imageIndexByUrl.get(item.photo.url)}
                onZoomPhoto={() => setIndex(imageIndexByUrl.get(item.photo.url))}
              />
            );
          }

          const { proof } = item;
          if (proof.type === "video") {
            return (
              <div key={item.key} id={`proof-${proof.id}`} className="proof-gallery-thumb proof-gallery-thumb-video">
                <ProofVideo url={proof.url} onPlay={pauseOtherVideos} />
                <ProofBadges proofDate={proof.proofDate} />
              </div>
            );
          }

          const thisImageIndex = imageIndexByUrl.get(proof.url);
          return (
            <button
              key={item.key}
              id={`proof-${proof.id}`}
              type="button"
              className="proof-gallery-thumb"
              onClick={() => setIndex(thisImageIndex)}
              aria-label="View proof image"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proof.url}
                alt={`Delivery Proof ${thisImageIndex + 1} - GameX Store`}
                loading="lazy"
                decoding="async"
              />
              <ProofBadges proofDate={proof.proofDate} />
            </button>
          );
        })}
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
