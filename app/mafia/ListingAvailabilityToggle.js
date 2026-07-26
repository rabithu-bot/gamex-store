"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export default function ListingAvailabilityToggle({ listing, onChanged }) {
  const [busy, setBusy] = useState(false);
  const isAvailable = listing.status === "available";

  async function handleToggle() {
    if (busy) return;
    setBusy(true);
    const nextStatus = isAvailable ? "sold" : "available";
    await fetch(`/api/admin/listings/${listing.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });
    await onChanged();
    setBusy(false);
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
