"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle, ImageUp, ShieldCheck } from "lucide-react";
import SiteHeader from "@/app/components/SiteHeader";
import CopyButton from "@/app/components/CopyButton";
import EnableNotifications from "@/app/components/EnableNotifications";
import { useToast } from "@/app/components/Toast";
import OrderSteps from "./OrderSteps";
import AccessDeniedNotice from "./AccessDeniedNotice";
import OrderNotFoundNotice from "./OrderNotFoundNotice";
import FacebookLogo from "./FacebookLogo";
import { useOrderPoll } from "./useOrderPoll";

// pending_verification is deliberately excluded here — that status now has
// its own dedicated /order/[id]/confirming page (see the redirect effect
// below), so this page never needs to render a body for it.
//
// "expired" is included too — the 5-minute window is a backend-only
// safeguard now (see orderExpiry.js), with no visible countdown and no
// blocking "session expired" screen. A buyer who's just a little slow
// still sees the exact same payment form and can submit seamlessly;
// /api/orders/[id]/submit-proof accepts it from this status too.
const PAYMENT_STEP_STATUSES = ["pending", "declined", "expired"];

export default function OrderPage() {
  const { id } = useParams();
  const router = useRouter();
  const toast = useToast();
  const { order, accessDenied, setAccessDenied, notFound, refetch: fetchOrder } = useOrderPoll(id);
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreviewUrl, setScreenshotPreviewUrl] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  // Deliberately starts null, not the bundled default QR — this is a real
  // payment destination, so the buyer must never see *any* QR, right or
  // wrong, until the server has actually confirmed which one is current.
  // Renders a skeleton in its place until then (see the payment step below).
  const [qrUrl, setQrUrl] = useState(null);

  useEffect(() => {
    if (!screenshot) {
      setScreenshotPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(screenshot);
    setScreenshotPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [screenshot]);

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

  // Retries on failure instead of silently giving up — a dropped request
  // here used to leave qrUrl unset with no second attempt, so a flaky
  // connection could strand the buyer on the skeleton with no way to pay.
  // Only falls back to the bundled default QR after every retry is
  // exhausted, and only as a last resort (see qrUrl's initializer above).
  useEffect(() => {
    let cancelled = false;
    let attempt = 0;

    async function loadQr() {
      attempt += 1;
      try {
        const res = await fetch("/api/settings/payment-qr", { cache: "no-store" });
        const data = await res.json();
        if (!cancelled && data.url) setQrUrl(data.url);
        return;
      } catch {
        // fall through to retry/give-up below
      }
      if (cancelled) return;
      if (attempt < 4) {
        setTimeout(loadQr, attempt * 1500);
      } else {
        setQrUrl("/upi-qr.jpg");
      }
    }

    loadQr();
    return () => {
      cancelled = true;
    };
  }, []);

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

    // Wrapped because this upload happens right after the buyer has
    // switched to their UPI app and back — a dropped mobile connection is
    // genuinely likely here, and an unhandled rejection used to leave the
    // button stuck on "Submitting..." forever with no way back but a
    // reload (and re-picking the screenshot).
    let res;
    try {
      res = await fetch(`/api/orders/${id}/submit-proof`, {
        method: "POST",
        body: formData,
      });
    } catch {
      setSubmitting(false);
      setSubmitError("Network error, please try again.");
      return;
    }
    setSubmitting(false);
    if (!res.ok) {
      if (res.status === 403) {
        setAccessDenied(true);
        return;
      }
      const data = await res.json().catch(() => ({}));
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

  if (notFound) {
    return (
      <>
        <SiteHeader />
        <main className="container" style={{ maxWidth: 560 }}>
          <OrderNotFoundNotice />
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
        <p className="order-summary-price">₹{order.listing.price.toLocaleString("en-IN")}</p>

        <OrderSteps status={order.status} hasProof={order.proofSubmitted} />

        {PAYMENT_STEP_STATUSES.includes(order.status) && (
          <div className="checkout-panel">
            <h3>1. Pay via UPI</h3>
            <div className="payable-badge-row">
              <span className="payable-badge">
                <span>Total Payable</span>
                <span>₹{order.listing.price.toLocaleString("en-IN")}</span>
              </span>
            </div>
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="UPI payment QR code"
                style={{ width: 220, height: "auto", margin: "0.5rem auto", display: "block", borderRadius: 12 }}
              />
            ) : (
              <div
                className="skeleton"
                style={{ width: 220, height: 220, margin: "0.5rem auto", borderRadius: 12 }}
                aria-hidden="true"
              />
            )}

            <h3 style={{ marginTop: "1.5rem" }}>2. Confirm your payment</h3>
            <form onSubmit={handleSubmitProof}>
              {order.status === "declined" && (
                <p className="error-text" style={{ marginBottom: "0.75rem" }}>
                  Your previous screenshot couldn&apos;t be verified — please attach a new one
                  to try again.
                </p>
              )}
              <div className="form-field">
                <label htmlFor="screenshot">Payment screenshot</label>
                <input
                  id="screenshot"
                  type="file"
                  accept="image/*"
                  required
                  className="file-upload-input"
                  onChange={(e) => setScreenshot(e.target.files?.[0] || null)}
                />
                <label
                  htmlFor="screenshot"
                  className={`file-upload-dropzone checkout-screenshot-dropzone${screenshot ? " has-file" : ""}`}
                >
                  {screenshot ? (
                    <>
                      <img
                        src={screenshotPreviewUrl}
                        alt="Selected screenshot preview"
                        className="file-upload-preview"
                      />
                      <span className="file-upload-text">
                        <strong>{screenshot.name}</strong>
                        <span className="muted">Tap to change</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <ImageUp size={26} />
                      <span className="file-upload-text">
                        <strong>Upload payment screenshot</strong>
                        <span className="muted">PNG or JPG, tap to browse</span>
                      </span>
                    </>
                  )}
                </label>
              </div>
              {submitError && <p className="error-text">{submitError}</p>}
              <button className="payment-submit-cta" type="submit" disabled={submitting}>
                {submitting ? "Submitting..." : "I've paid"}
              </button>
            </form>
          </div>
        )}

        {order.status === "confirmed" && order.account && (
          <div className="credentials-box">
            <div className="credentials-header">
              <span className="credentials-icon-badge">
                <FacebookLogo size={30} />
              </span>
              <div className="credentials-header-text">
                <strong>Payment Confirmed</strong>
                <span className="muted">Your Facebook account is ready below</span>
              </div>
              <span className="credentials-verified-badge">
                <ShieldCheck size={13} />
                Verified
              </span>
            </div>

            <div className="credential-field">
              <span className="credential-field-label">Account ID</span>
              <div className="credential-field-row">
                <span className="credentials-value">{order.account.accountId}</span>
                <CopyButton value={order.account.accountId} label="Copy" />
              </div>
            </div>

            <div className="credential-field">
              <span className="credential-field-label">Password</span>
              <div className="credential-field-row">
                <span className="credentials-value">{order.account.accountPassword}</span>
                <CopyButton value={order.account.accountPassword} label="Copy" />
              </div>
            </div>
          </div>
        )}

        <div className="panel support-cta-panel">
          <Link href={`/order/${order.id}/support`} className="btn secondary support-cta-btn">
            <MessageCircle size={18} />
            Contact Support
          </Link>
          {/* No visible control — this just triggers the browser's native
              permission prompt and subscribes silently once granted. */}
          <EnableNotifications apiPath={`/api/orders/${order.id}/push/subscribe`} />
        </div>
      </main>
    </>
  );
}
