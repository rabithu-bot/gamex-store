"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import SiteHeader from "@/app/components/SiteHeader";
import CopyButton from "@/app/components/CopyButton";
import { useToast } from "@/app/components/Toast";
import OrderSteps from "./OrderSteps";
import AccessDeniedNotice from "./AccessDeniedNotice";
import FacebookLogo from "./FacebookLogo";
import UpiPayButtons from "./UpiPayButtons";

// pending_verification is deliberately excluded here — that status now has
// its own dedicated /order/[id]/confirming page (see the redirect effect
// below), so this page never needs to render a body for it.
const PAYMENT_STEP_STATUSES = ["pending", "declined"];
const POLL_INTERVAL_MS = 1500;

function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function OrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const [order, setOrder] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [qrUrl, setQrUrl] = useState("/upi-qr.jpg");
  const [upiDetails, setUpiDetails] = useState(null);
  const [now, setNow] = useState(() => Date.now());
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/orders/${id}`, { cache: "no-store" });
    if (res.ok) {
      setOrder(await res.json());
    } else if (res.status === 403) {
      setAccessDenied(true);
    }
  }, [id]);

  useEffect(() => {
    fetchOrder();
    const interval = setInterval(fetchOrder, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchOrder]);

  // Verification-in-progress now lives on its own page so the buyer isn't
  // stuck watching a spinner inline — hand off as soon as we see the status
  // flip, whether that's from this page's own submit or a later poll tick.
  useEffect(() => {
    if (order?.status === "pending_verification") {
      router.push(`/order/${id}/confirming`);
    }
  }, [order?.status, id, router]);

  // Declined also gets its own full page, but unlike confirming there's a
  // real path back to THIS page while still "declined" (the notice page's
  // own "Upload Real Screenshot" button) — a naive redirect-on-status effect
  // would bounce the buyer straight back to the notice in an infinite loop.
  // sessionStorage remembers "already shown" per order so it only fires once
  // per decline, and clears again once the status moves on (e.g. a fresh
  // resubmission goes to pending_verification), so a second decline still
  // gets its own fresh notice.
  useEffect(() => {
    if (!order?.status || !id) return;
    const key = `gamex-decline-seen-${id}`;
    if (order.status === "declined") {
      if (sessionStorage.getItem(key) !== "1") {
        sessionStorage.setItem(key, "1");
        router.push(`/order/${id}/declined`);
      }
    } else {
      sessionStorage.removeItem(key);
    }
  }, [order?.status, id, router]);

  useEffect(() => {
    fetch("/api/settings/payment-qr", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => data.url && setQrUrl(data.url))
      .catch(() => {});
    fetch("/api/settings/upi-details", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => setUpiDetails(data))
      .catch(() => {});
  }, []);

  // Ticks down locally so the buyer sees 00:00 the instant the window closes,
  // instead of waiting up to 4s for the next poll to confirm the server-side
  // expiry sweep already caught it.
  const msRemaining =
    order?.status === "pending" && order?.expiresAt
      ? new Date(order.expiresAt).getTime() - now
      : null;
  const isExpired = order?.status === "expired" || (msRemaining !== null && msRemaining <= 0);

  async function handleSubmitProof(e) {
    e.preventDefault();
    setSubmitError("");
    if (!screenshot || screenshot.size === 0) {
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
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      const data = await res.json();
      setSubmitError(data.error || "Something went wrong");
      return;
    }
    setScreenshot(null);
    toast("Payment screenshot submitted");
    fetchOrder();
  }

  if (accessDenied) {
    return (
      <>
        <SiteHeader />
        <main className="container" style={{ maxWidth: 560 }}>
          <AccessDeniedNotice />
        </main>
      </>
    );
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

        {isExpired && (
          <div className="panel expired-notice">
            <h3>Session Expired</h3>
            <p className="muted">Please restart checkout if you wish to purchase.</p>
            <Link href="/" className="btn" style={{ marginTop: "0.75rem", display: "inline-flex" }}>
              Browse listings
            </Link>
          </div>
        )}

        {!isExpired && PAYMENT_STEP_STATUSES.includes(order.status) && (
          <div className="checkout-panel">
            <h3>1. Pay via UPI</h3>
            {order.status === "pending" && msRemaining !== null && (
              <p className="checkout-countdown">
                ⏱️ Time remaining to attach proof: <strong>{formatCountdown(msRemaining)}</strong>
              </p>
            )}
            <p className="muted" style={{ textAlign: "center", margin: "0.5rem 0" }}>
              Scan this QR with any UPI app, then enter the amount below yourself.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrUrl}
              alt="UPI payment QR code"
              style={{ width: 220, margin: "0.5rem auto", display: "block", borderRadius: 12 }}
            />
            <div className="payable-badge-row">
              <span className="payable-badge">
                <span>Total Payable</span>
                <span>₹{order.listing.price.toLocaleString("en-IN")}</span>
              </span>
            </div>

            <UpiPayButtons
              upiId={upiDetails?.upiId}
              payeeName={upiDetails?.payeeName}
              amount={order.listing.price}
              orderId={order.id}
            />

            <h3 style={{ marginTop: "1.5rem" }}>2. Confirm your payment</h3>
            <form onSubmit={handleSubmitProof}>
              {order.status === "declined" && (
                <p className="error-text" style={{ marginBottom: "0.75rem" }}>
                  Your previous screenshot couldn&apos;t be verified — please attach a new one to
                  try again.
                </p>
              )}
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
          </div>
        )}

        {order.status === "confirmed" && order.account && (
          <div className="credentials-box">
            <p className="credentials-heading">
              <FacebookLogo size={20} />
              <span>
                <strong>Payment confirmed!</strong> Here are your Facebook account details:
              </span>
            </p>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
              <span style={{ minWidth: 0, wordBreak: "break-all" }}>
                Account ID: <span className="credentials-value">{order.account.accountId}</span>
              </span>
              <CopyButton value={order.account.accountId} label="Copy" />
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem", marginTop: "0.4rem" }}>
              <span style={{ minWidth: 0, wordBreak: "break-all" }}>
                Password: <span className="credentials-value">{order.account.accountPassword}</span>
              </span>
              <CopyButton value={order.account.accountPassword} label="Copy" />
            </div>
          </div>
        )}

        {order.status === "confirmed" && (
          <div className="panel" style={{ textAlign: "center" }}>
            <Link href={`/order/${order.id}/support`} className="btn secondary">
              <MessageCircle size={16} />
              Contact Support
            </Link>
          </div>
        )}
      </main>
    </>
  );
}
