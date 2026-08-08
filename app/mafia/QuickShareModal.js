"use client";

import { useEffect, useState } from "react";
import { X, ShieldCheck, Tag } from "lucide-react";

// Lets the admin share a real, clickable link straight from chat — a
// specific listing's product page (dropped into the composer to send
// manually), or the full verified-proofs page (sent immediately, since
// every proof item points at the same real library rather than a single
// item) — instead of the customer being told "check the proofs page" with
// nothing to actually click.
export default function QuickShareModal({ onSelect, onClose }) {
  const [tab, setTab] = useState("listings"); // "listings" | "proofs"
  const [listings, setListings] = useState(null);
  const [proofs, setProofs] = useState(null);

  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    fetch("/api/admin/listings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setListings(data.filter((l) => l.status === "available")))
      .catch(() => setListings([]));
    fetch("/api/admin/proofs", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : []))
      .then(setProofs)
      .catch(() => setProofs([]));
  }, []);

  function pick(link, opts) {
    onSelect(link, opts);
    onClose();
  }

  const loading = tab === "listings" ? listings === null : proofs === null;
  const items = tab === "listings" ? listings : proofs;

  return (
    <div className="confirm-backdrop" onClick={onClose}>
      <div className="quick-share-box panel" onClick={(e) => e.stopPropagation()}>
        <div className="quick-share-header">
          <h3>Quick Share</h3>
          <button type="button" className="quick-share-close" aria-label="Close" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <div className="quick-share-tabs">
          <button
            type="button"
            className={`quick-share-tab ${tab === "listings" ? "active" : ""}`}
            onClick={() => setTab("listings")}
          >
            <Tag size={14} />
            Accounts
          </button>
          <button
            type="button"
            className={`quick-share-tab ${tab === "proofs" ? "active" : ""}`}
            onClick={() => setTab("proofs")}
          >
            <ShieldCheck size={14} />
            Proofs
          </button>
        </div>

        <div className="quick-share-list">
          {loading && <p className="muted">Loading...</p>}

          {!loading && items.length === 0 && (
            <p className="muted">{tab === "listings" ? "No available listings." : "No proofs uploaded yet."}</p>
          )}

          {!loading &&
            tab === "listings" &&
            items.map((listing) => (
              <button
                key={listing.id}
                type="button"
                className="quick-share-item"
                onClick={() => pick(`${window.location.origin}/product/${listing.id}`)}
              >
                <span className="quick-share-item-title">{listing.title}</span>
                <span className="quick-share-item-meta">₹{listing.price}</span>
              </button>
            ))}

          {!loading &&
            tab === "proofs" &&
            items.map((proof) => (
              <button
                key={proof.id}
                type="button"
                className="quick-share-item quick-share-item-proof"
                // Every proof click sends the same real, general proofs page
                // link (not a deep link to this one item) — the thumbnail is
                // just how the admin picks which delivery to reference in
                // conversation, the customer always lands on the full,
                // genuine library of every verified delivery.
                onClick={() => pick(`${window.location.origin}/proofs`, { send: true })}
              >
                {proof.type === "video" ? (
                  <video src={proof.url} className="quick-share-thumb" muted />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={proof.url} alt="Proof" className="quick-share-thumb" loading="lazy" />
                )}
                <span className="quick-share-item-meta">
                  {proof.type === "video" ? "Video proof" : "Screenshot"} #{proof.id}
                </span>
              </button>
            ))}
        </div>
      </div>
    </div>
  );
}
