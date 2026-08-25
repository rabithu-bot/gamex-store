"use client";

import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";

const FALLBACK_IMAGE = "/window.svg";

// listing.rareItems arrives as a raw JSON string from a direct Prisma
// query (homepage, product page's "similar listings") but as an
// already-parsed array from the admin API (which parses it server-side) —
// this card is used from both, so it has to tolerate either shape.
function parseRareItemsList(rareItems) {
  if (Array.isArray(rareItems)) return rareItems;
  if (typeof rareItems === "string") {
    try {
      const parsed = JSON.parse(rareItems);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

// Rarity badges are derived from REAL listing data (tier/level/rareItems,
// all admin-set fields already shown elsewhere on the card/product page) —
// never a random or decorative label. Priority order when more than one
// would match: rarest visual tier wins, so a card only ever shows one.
function getRarityBadge(listing) {
  const rareItems = parseRareItemsList(listing.rareItems).join(" ").toLowerCase();
  const hasCobra = rareItems.includes("cobra");
  const hasEvo = rareItems.includes("evo");
  const isPremiumTier = (listing.tier || "").toLowerCase() === "premium";
  const isHighLevel = Number(listing.level) >= 75;

  if (isPremiumTier || hasCobra) return { label: "MYTHIC", className: "rarity-badge-mythic" };
  if (hasEvo) return { label: "EVO GOD", className: "rarity-badge-evo" };
  if (isHighLevel) return { label: "GRANDMASTER", className: "rarity-badge-grandmaster" };
  return null;
}

// `priority` opts a card out of lazy-loading — the first row on the
// homepage is above the fold and holds the page's LCP element, so lazily
// loading it actively delays the metric it defines. Mirrors what
// ImageGallery already does for its first slide.
export default function ListingCard({ listing, priority = false }) {
  const images = JSON.parse(listing.images || "[]");
  // No onError fallback existed before — a broken/deleted S3 object just
  // showed the browser's bare broken-image icon with no recovery. Falls
  // back to the same placeholder used when a listing has no photos at all.
  const [imgSrc, setImgSrc] = useState(images[0] || FALLBACK_IMAGE);
  const hasDiscount = listing.originalPrice && listing.originalPrice > listing.price;
  const isSold = listing.status !== "available";
  const discountPercent = hasDiscount
    ? Math.round((1 - listing.price / listing.originalPrice) * 100)
    : 0;
  const rarity = getRarityBadge(listing);

  return (
    <Link href={`/product/${listing.id}`} className="card-link-wrap">
      <motion.div
        className="card tilt-card"
        whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
        style={{ transformPerspective: 1000 }}
      >
        {rarity && <span className={`rarity-badge ${rarity.className}`}>{rarity.label}</span>}
        <div className="card-image-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className={`card-image${isSold ? " card-image-sold" : ""}`}
            src={imgSrc}
            alt={`${listing.title} - GameX Store`}
            loading={priority ? "eager" : "lazy"}
            fetchPriority={priority ? "high" : undefined}
            decoding="async"
            onError={() => setImgSrc(FALLBACK_IMAGE)}
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
              <>
                <span className="price-original price-original-sm">
                  ₹{listing.originalPrice.toLocaleString("en-IN")}
                </span>
                <span className="price-discount-badge">{discountPercent}% OFF</span>
              </>
            )}
            <span className={`price${isSold ? " price-sold" : ""}`}>
              ₹{listing.price.toLocaleString("en-IN")}
            </span>
          </span>
        </div>
      </motion.div>
    </Link>
  );
}
