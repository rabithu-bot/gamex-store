"use client";

import { useState } from "react";
import Script from "next/script";

export default function RazorpayCheckoutButton({ orderId, buyerName, onPaymentSuccess, onAccessDenied }) {
  const [loading, setLoading] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [error, setError] = useState("");

  async function handlePay() {
    setError("");
    setLoading(true);
    const res = await fetch(`/api/orders/${orderId}/razorpay-order`, { method: "POST" });
    setLoading(false);

    if (!res.ok) {
      if (res.status === 403) {
        onAccessDenied?.();
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong, please try again.");
      return;
    }

    const data = await res.json();
    const rzp = new window.Razorpay({
      key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: data.currency,
      order_id: data.razorpayOrderId,
      name: "GAMEX STORE",
      description: "Gaming account purchase",
      prefill: buyerName ? { name: buyerName } : undefined,
      theme: { color: "#8b5cf6" },
      // The webhook is the only thing that actually confirms the order —
      // this handler just tells the buyer payment went through while the
      // page's own poll catches up to the real, server-confirmed status a
      // moment later.
      handler: function () {
        onPaymentSuccess?.();
      },
    });
    rzp.on("payment.failed", function () {
      setError("Payment failed or was cancelled. You can try again.");
    });
    rzp.open();
  }

  return (
    <>
      <Script src="https://checkout.razorpay.com/v1/checkout.js" onLoad={() => setScriptReady(true)} />
      <button type="button" className="btn" onClick={handlePay} disabled={loading || !scriptReady}>
        {loading ? "Loading..." : "Pay Now — Instant"}
      </button>
      {error && <p className="error-text">{error}</p>}
    </>
  );
}
