"use client";

import { memo, useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";

// Flips instantly on click instead of waiting for the PATCH round-trip
// (previously: click -> wait for the request -> wait for the parent's
// onChanged to finish a full list refetch -> only then does the switch
// visually move). Rolls back to the real status if the request fails.
// onChanged now just patches the parent's already-loaded data locally —
// no network call — since the background poll each panel already runs
// is what catches eventual inconsistencies, not this callback.
function ListingAvailabilityToggle({ listing, onChanged }) {
  const [status, setStatus] = useState(listing.status);
  const [busy, setBusy] = useState(false);
  const isAvailable = status === "available";

  // Stay in sync if the parent's own poll picks up a change made
  // elsewhere (another admin tab, the edit form, etc).
  useEffect(() => setStatus(listing.status), [listing.status]);

  async function handleToggle() {
    if (busy) return;
    const prevStatus = status;
    const nextStatus = isAvailable ? "sold" : "available";
    setStatus(nextStatus);
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/listings/${listing.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error("status update failed");
      onChanged?.(listing.id, nextStatus);
    } catch {
      setStatus(prevStatus);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className={`listing-toggle ${isAvailable ? "on" : "off"}`}
      onClick={handleToggle}
      disabled={busy}
      aria-pressed={isAvailable}
      aria-label={isAvailable ? "Mark as sold" : "Mark as available"}
    >
      <span className="listing-toggle-track">
        <span className="listing-toggle-thumb" />
      </span>
      <span className="listing-toggle-label">
        {isAvailable ? (
          <>
            <Eye size={14} /> Available
          </>
        ) : (
          <>
            <EyeOff size={14} /> Sold
          </>
        )}
      </span>
    </button>
  );
}

// Every OrdersPanel poll tick creates a brand new `orders` array (and new
// nested `listing` objects) even when nothing actually changed, so a plain
// memo()'s default reference-equality check would never skip a re-render —
// this custom comparator checks the two fields that actually affect what's
// rendered instead, so most poll ticks really do skip re-rendering rows
// whose listing didn't change.
export default memo(
  ListingAvailabilityToggle,
  (prev, next) => prev.listing.id === next.listing.id && prev.listing.status === next.listing.status
);
