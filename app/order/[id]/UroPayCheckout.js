"use client";

import { useState } from "react";

// Real UroPay flow (per their /documentation): generate a QR + UPI deep
// link, buyer pays with any UPI app, buyer types the UPI reference number
// (UTR) back in here, and we relay it to UroPay. That does NOT confirm the
// order by itself — confirmation only happens once UroPay's webhook reports
// the SMS-confirmed payment (see app/api/webhooks/uropay/route.ts), so this
// ends in a "waiting to be confirmed" state rather than an immediate
// success — the order page's own polling picks up the flip to "confirmed"
// once that webhook lands.
export default function UroPayCheckout({ orderId, onAccessDenied }) {
  const [payment, setPayment] = useState(null); // { qrCode, upiString, amountInRupees }
  const [generating, setGenerating] = useState(false);
  const [utr, setUtr] = useState("");
  const [submittingUtr, setSubmittingUtr] = useState(false);
  const [utrSubmitted, setUtrSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleGenerate() {
    setError("");
    setGenerating(true);
    const res = await fetch("/api/create-uropay-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    setGenerating(false);

    if (!res.ok) {
      if (res.status === 403) {
        onAccessDenied?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong, please try again.");
      return;
    }

    setPayment(await res.json());
  }

  async function handleSubmitUtr(e) {
    e.preventDefault();
    if (!utr.trim() || submittingUtr) return;
    setError("");
    setSubmittingUtr(true);
    const res = await fetch(`/api/orders/${orderId}/uropay-submit-utr`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referenceNumber: utr.trim() }),
    });
    setSubmittingUtr(false);

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't submit that reference number, please try again.");
      return;
    }
    setUtrSubmitted(true);
  }

  if (!payment) {
    return (
      <>
        <button type="button" className="btn" onClick={handleGenerate} disabled={generating}>
          {generating ? "Loading..." : "Pay Now — Instant"}
        </button>
        {error && <p className="error-text">{error}</p>}
      </>
    );
  }

  return (
    <div style={{ textAlign: "center" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={payment.qrCode}
        alt="UroPay UPI QR code"
        style={{ width: 220, margin: "0.5rem auto", display: "block", borderRadius: 12 }}
      />
      {payment.upiString && (
        <a href={payment.upiString} className="btn secondary" style={{ marginBottom: "1rem" }}>
          Open in UPI app
        </a>
      )}

      {utrSubmitted ? (
        <p className="muted" style={{ marginTop: "0.75rem" }}>
          Reference number submitted — confirming your payment, just a moment...
        </p>
      ) : (
        <form onSubmit={handleSubmitUtr} style={{ marginTop: "1rem" }}>
          <div className="form-field">
            <label htmlFor="uropay-utr">UPI reference number (UTR)</label>
            <input
              id="uropay-utr"
              type="text"
              value={utr}
              onChange={(e) => setUtr(e.target.value)}
              placeholder="e.g. 430686551035"
              required
            />
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn" type="submit" disabled={submittingUtr || !utr.trim()}>
            {submittingUtr ? "Submitting..." : "I've paid"}
          </button>
        </form>
      )}
    </div>
  );
}
