"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { X, ShieldCheck, Loader2, Zap, QrCode, ImageUp, KeyRound } from "lucide-react";

// Same three stages OrderSteps shows once a real order exists — previewed
// here, before the buyer has even entered their name, so someone who has
// never bought a game account online before can see the whole journey
// (and that a human verifies the payment, not an instant/automatic
// charge) before committing to anything.
const HOW_IT_WORKS = [
  { icon: QrCode, label: "Scan & pay via UPI" },
  { icon: ImageUp, label: "Upload payment screenshot" },
  { icon: KeyRound, label: "Get account instantly" },
];

export default function BuyForm({ listingId, listingTitle, listingPrice }) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!modalOpen) return;
    function onKeyDown(e) {
      // Same guard the backdrop click and close button already have — an
      // order POST is in flight, so letting the modal vanish here would
      // leave the buyer on the product page until the redirect fires out
      // of nowhere a moment later.
      if (e.key === "Escape" && !loading) setModalOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [modalOpen, loading]);

  async function handleStart() {
    setError("");
    setChecking(true);
    try {
      const res = await fetch("/api/orders/mine", { cache: "no-store" });
      if (res.ok) {
        const mine = await res.json();
        const existing = mine.find(
          (o) => o.listingId === listingId && o.status !== "declined" && o.status !== "expired"
        );
        if (existing) {
          router.push(`/order/${existing.id}`);
          return;
        }
      }
      setChecking(false);
      setModalOpen(true);
    } catch {
      setError("Network error, please try again.");
      setChecking(false);
    }
  }

  async function handleConfirmBuy(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listingId, buyerName: name.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      router.push(`/order/${data.id}`);
    } catch {
      setError("Network error, please try again.");
      setLoading(false);
    }
  }

  return (
    <div style={{ marginTop: "1.25rem" }}>
      {error && !modalOpen && <p className="error-text">{error}</p>}
      <div className="buy-cta-row">
        <button className="btn-buy-now" onClick={handleStart} disabled={checking}>
          {checking ? (
            <>
              <Loader2 size={18} className="icon-spin" />
              <span>Checking availability...</span>
            </>
          ) : (
            <>
              <Zap size={18} fill="currentColor" />
              <span>Buy Now</span>
            </>
          )}
        </button>
      </div>

      {modalOpen &&
        createPortal(
          <div
            className="checkout-modal-backdrop"
            onClick={() => !loading && setModalOpen(false)}
          >
            <div className="checkout-modal" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="checkout-modal-close"
                aria-label="Close"
                onClick={() => setModalOpen(false)}
                disabled={loading}
              >
                <X size={16} />
              </button>

              <div className="checkout-modal-header">
                <span className="checkout-modal-listing-title">{listingTitle}</span>
                <span className="checkout-modal-price">₹{listingPrice.toLocaleString("en-IN")}</span>
                <span className="checkout-verified-badge">
                  <ShieldCheck size={12} />
                  Verified Stock
                </span>
              </div>

              <div className="checkout-how-it-works">
                {HOW_IT_WORKS.map(({ icon: Icon, label }, i) => (
                  <div key={label} className="checkout-how-it-works-step">
                    {i > 0 && <div className="checkout-how-it-works-line" />}
                    <span className="checkout-how-it-works-icon">
                      <Icon size={16} />
                    </span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleConfirmBuy}>
                <div className="form-field">
                  <label htmlFor="buyer-name">Full Name</label>
                  <input
                    id="buyer-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    autoFocus
                    required
                  />
                </div>
                {error && <p className="error-text">{error}</p>}
                <button
                  className="btn checkout-modal-cta"
                  type="submit"
                  disabled={loading || !name.trim()}
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="icon-spin" />
                      Placing order...
                    </>
                  ) : (
                    "Scan & Pay via QR Code"
                  )}
                </button>
                <p className="checkout-modal-trust">
                  <ShieldCheck size={14} /> Secure SSL Encrypted Checkout • Instant Credentials Transfer
                </p>
              </form>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
