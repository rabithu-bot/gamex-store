"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { findMyOrderForListing, saveMyOrder } from "@/app/lib/myOrders";

export default function BuyForm({ listingId, listingTitle }) {
  const router = useRouter();
  const [askingName, setAskingName] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleStart() {
    setError("");
    setLoading(true);
    try {
      const existing = findMyOrderForListing(listingId);
      if (existing) {
        const existingRes = await fetch(`/api/orders/${existing.id}`, { cache: "no-store" });
        if (existingRes.ok) {
          const existingOrder = await existingRes.json();
          if (existingOrder.status !== "rejected") {
            router.push(`/order/${existing.id}`);
            return;
          }
        }
      }
      setLoading(false);
      setAskingName(true);
    } catch {
      setError("Network error, please try again.");
      setLoading(false);
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
      saveMyOrder({ id: data.id, listingId, listingTitle });
      router.push(`/order/${data.id}`);
    } catch {
      setError("Network error, please try again.");
      setLoading(false);
    }
  }

  if (askingName) {
    return (
      <form onSubmit={handleConfirmBuy} className="panel" style={{ marginTop: "1.25rem" }}>
        <div className="form-field">
          <label htmlFor="buyer-name">What&apos;s your name?</label>
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
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button className="btn" type="submit" disabled={loading || !name.trim()}>
            {loading ? "Placing order..." : "Confirm & Buy"}
          </button>
          <button
            className="btn secondary"
            type="button"
            onClick={() => setAskingName(false)}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div style={{ marginTop: "1.25rem" }}>
      {error && <p className="error-text">{error}</p>}
      <button className="btn" onClick={handleStart} disabled={loading}>
        {loading ? "Loading..." : "Buy Now"}
      </button>
    </div>
  );
}
