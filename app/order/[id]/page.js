"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import SiteHeader from "@/app/components/SiteHeader";
import CopyButton from "@/app/components/CopyButton";
import { useToast } from "@/app/components/Toast";
import { saveMyOrder } from "@/app/lib/myOrders";
import OrderSteps from "./OrderSteps";
import SupportChat from "./SupportChat";
import ConfirmingPayment from "./ConfirmingPayment";

export default function OrderPage() {
  const { id } = useParams();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pageUrl, setPageUrl] = useState("");

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
    if (res.ok) setOrder(await res.json());
  }, [id]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, 4000);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  useEffect(() => {
    if (order?.proofSubmitted) setSubmitted(true);
  }, [order?.proofSubmitted]);

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  // Bookmarks this order on this device — even if the buyer arrived here directly
  // (shared link, refresh) rather than through the Buy Now flow — so "My Orders"
  // can always find it again, no account/login needed.
  useEffect(() => {
    if (order?.id && order?.listing?.id) {
      saveMyOrder({ id: order.id, listingId: order.listing.id, listingTitle: order.listing.title });
    }
  }, [order?.id, order?.listing?.id, order?.listing?.title]);

  async function handleSubmitProof(e) {
    e.preventDefault();
    setSubmitError("");
    if (!screenshot) {
      setSubmitError("Please attach a payment screenshot.");
      return;
    }
    setSubmitting(true);
    const formData = new FormData();
    formData.set("screenshot", screenshot);

    const res = await fetch(`/api/orders/${id}/submit-proof`, {
      method: "POST",
      body: formData,
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setSubmitError(data.error || "Something went wrong");
      return;
    }
    setSubmitted(true);
    toast("Payment screenshot submitted");
    fetchOrder();
  }

  async function handleSendMessage(text, file) {
    const formData = new FormData();
    formData.set("body", text);
    if (file) formData.set("attachment", file);

    const res = await fetch(`/api/orders/${id}/messages`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) fetchOrder();
  }

  async function handleSaveName(name) {
    await fetch(`/api/orders/${id}/name`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerName: name }),
    });
    await fetchOrder();
  }

  if (!order) {
    return (
      <>
        <SiteHeader />
        <main className="container" style={{ maxWidth: 560 }}>
          <div className="order-skeleton">
            <div className="skeleton" style={{ height: 28, width: "40%" }} />
            <div className="skeleton" style={{ height: 16, width: "60%" }} />
            <div className="skeleton" style={{ height: 44, width: "50%", marginTop: 8 }} />
            <div className="skeleton" style={{ height: 220, marginTop: 24, borderRadius: 16 }} />
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="container" style={{ maxWidth: 560 }}>
        <h1>Order #{order.id}</h1>
        <p className="muted">{order.listing.title}</p>
        <p className="price">₹{order.listing.price.toLocaleString("en-IN")}</p>

        <OrderSteps status={order.status} hasProof={order.proofSubmitted} />

        <div className="order-save-note">
          <span className="muted">
            Bookmark this page or copy the link below — you can always find this order again
            from <strong>My Orders</strong> on this device, even if you close the tab.
          </span>
          {pageUrl && <CopyButton value={pageUrl} label="Copy order link" />}
        </div>

        {order.status === "pending" && (
          <div className="panel">
            <h3>1. Pay via UPI</h3>
            <p className="muted" style={{ textAlign: "center", margin: "0.5rem 0" }}>
              Scan this QR with any UPI app, then enter the amount below yourself.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/upi-qr.jpg"
              alt="UPI payment QR code"
              style={{ width: 220, margin: "0.5rem auto", display: "block", borderRadius: 12 }}
            />
            <p style={{ textAlign: "center", marginTop: "0.6rem" }}>
              Amount to pay: <strong className="price">₹{order.listing.price.toLocaleString("en-IN")}</strong>
            </p>

            <h3 style={{ marginTop: "1.5rem" }}>2. Confirm your payment</h3>
            {submitted ? (
              <ConfirmingPayment />
            ) : (
              <form onSubmit={handleSubmitProof}>
                <div className="form-field">
                  <label htmlFor="screenshot">Payment screenshot</label>
                  <input
                    id="screenshot"
                    type="file"
                    accept="image/*"
                    required
                    onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                  />
                </div>
                {submitError && <p className="error-text">{submitError}</p>}
                <button className="btn" type="submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "I've paid"}
                </button>
              </form>
            )}
          </div>
        )}

        {order.status === "confirmed" && order.account && (
          <div className="credentials-box">
            <p style={{ marginBottom: "0.6rem" }}>
              <strong>Payment confirmed!</strong> Here are your account details:
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <span style={{ minWidth: 0, wordBreak: "break-all" }}>Account ID: {order.account.accountId}</span>
              <CopyButton value={order.account.accountId} label="Copy" />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.4rem" }}>
              <span style={{ minWidth: 0, wordBreak: "break-all" }}>Password: {order.account.accountPassword}</span>
              <CopyButton value={order.account.accountPassword} label="Copy" />
            </div>
          </div>
        )}

        {order.status === "confirmed" && (
          <SupportChat
            orderId={order.id}
            messages={order.messages}
            buyerName={order.buyerName}
            onSend={handleSendMessage}
            onSaveName={handleSaveName}
          />
        )}
      </main>
    </>
  );
}
