"use client";

import Link from "next/link";
import { useRef } from "react";

// `priority` opts a card out of lazy-loading — the first row on the
// homepage is above the fold and holds the page's LCP element, so lazily
// loading it actively delays the metric it defines. Mirrors what
// ImageGallery already does for its first slide.
export default function ListingCard({ listing, priority = false }) {
  const images = JSON.parse(listing.images || "[]");
  const innerRef = useRef(null);
  const glareRef = useRef(null);
  const hasDiscount = listing.originalPrice && listing.originalPrice > listing.price;
  const isSold = listing.status !== "available";

  function handleMouseMove(e) {
    const el = innerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    el.style.setProperty("--rx", `${(x - 0.5) * 14}deg`);
    el.style.setProperty("--ry", `${(0.5 - y) * 14}deg`);
    if (glareRef.current) {
      glareRef.current.style.setProperty("--glare-x", `${x * 100}%`);
      glareRef.current.style.setProperty("--glare-y", `${y * 100}%`);
      glareRef.current.style.setProperty("--glare-opacity", "1");
    }
  }

  function handleMouseLeave() {
    innerRef.current?.style.setProperty("--rx", "0deg");
    innerRef.current?.style.setProperty("--ry", "0deg");
    glareRef.current?.style.setProperty("--glare-opacity", "0");
  }

  return (
    <Link
      href={`/product/${listing.id}`}
      className="card tilt-card"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div ref={innerRef} className="tilt-card-inner">
        <div className="card-image-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={`card-image${isSold ? " card-image-sold" : ""}`}
            src={images[0] || "/window.svg"}
            alt={`${listing.title} - GameX Store`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
          />
          <span className="badge card-image-badge">{listing.category}</span>
          {isSold && <span className="sold-badge">Sold Out</span>}
        </div>
        <div className="card-body">
          <strong>{listing.title}</strong>
          {listing.gameUid && (
            <span className="card-uid">
              UID <span className="card-uid-value">{listing.gameUid}</span>
            </span>
          )}
          <span className="card-price-row">
            {hasDiscount && (
              <span className="price-original price-original-sm">
                ₹{listing.originalPrice.toLocaleString("en-IN")}
              </span>
            )}
            <span className={`price${isSold ? " price-sold" : ""}`}>
              ₹{listing.price.toLocaleString("en-IN")}
            </span>
          </span>
        </div>
        <div ref={glareRef} className="tilt-card-glare" />
      </div>
    </Link>
  );
}
