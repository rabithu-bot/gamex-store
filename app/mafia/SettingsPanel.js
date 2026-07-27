"use client";

import { useEffect, useState, useCallback } from "react";

export default function SettingsPanel() {
  const [qrUrl, setQrUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [upiError, setUpiError] = useState("");
  const [upiSaved, setUpiSaved] = useState(false);
  const [upiSubmitting, setUpiSubmitting] = useState(false);

  const fetchQr = useCallback(async () => {
    const res = await fetch("/api/settings/payment-qr", { cache: "no-store" });
    if (res.ok) setQrUrl((await res.json()).url);
  }, []);

  const fetchUpiDetails = useCallback(async () => {
    const res = await fetch("/api/settings/upi-details", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      setUpiId(data.upiId || "");
      setPayeeName(data.payeeName || "");
    }
  }, []);

  useEffect(() => {
    fetchQr();
    fetchUpiDetails();
  }, [fetchQr, fetchUpiDetails]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);

  function handleFileChange(e) {
    setError("");
    setSaved(false);
    setFile(e.target.files?.[0] || null);
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) {
      setError("Please choose a QR image first.");
      return;
    }
    setError("");
    setSaved(false);
    setSubmitting(true);

    const formData = new FormData();
    formData.set("qr", file);

    const res = await fetch("/api/admin/settings/payment-qr", { method: "PATCH", body: formData });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    setFile(null);
    e.target.reset();
    setSaved(true);
    fetchQr();
  }

  async function handleSaveUpiDetails(e) {
    e.preventDefault();
    if (!upiId.trim() || !payeeName.trim()) {
      setUpiError("Please fill in both fields.");
      return;
    }
    setUpiError("");
    setUpiSaved(false);
    setUpiSubmitting(true);

    const res = await fetch("/api/admin/settings/upi-details", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ upiId: upiId.trim(), payeeName: payeeName.trim() }),
    });
    setUpiSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setUpiError(data.error || "Something went wrong");
      return;
    }
    setUpiSaved(true);
  }

  return (
    <div>
      <form onSubmit={handleSaveUpiDetails} className="panel">
        <h3>UPI Payment Details</h3>
        <p className="muted" style={{ marginTop: "0.3rem" }}>
          Powers the 1-tap GPay / PhonePe / Paytm buttons shown to buyers on mobile — leave these
          set to your real UPI ID so the app-open links actually go to your account.
        </p>

        <div className="field-grid-2" style={{ marginTop: "1rem" }}>
          <div className="form-field">
            <label htmlFor="upi-id">UPI ID</label>
            <input
              id="upi-id"
              value={upiId}
              onChange={(e) => {
                setUpiId(e.target.value);
                setUpiSaved(false);
              }}
              placeholder="yourname@okhdfcbank"
            />
          </div>
          <div className="form-field">
            <label htmlFor="upi-payee-name">Payee Name</label>
            <input
              id="upi-payee-name"
              value={payeeName}
              onChange={(e) => {
                setPayeeName(e.target.value);
                setUpiSaved(false);
              }}
              placeholder="Your Name"
            />
          </div>
        </div>

        {upiError && <p className="error-text">{upiError}</p>}
        {upiSaved && !upiError && <p className="muted">UPI details updated.</p>}

        <button className="btn" type="submit" disabled={upiSubmitting}>
          {upiSubmitting ? "Saving..." : "Save UPI details"}
        </button>
      </form>

      <form onSubmit={handleUpload} className="panel">
        <h3>UPI Payment QR</h3>
        <p className="muted" style={{ marginTop: "0.3rem" }}>
          This QR code is shown to every buyer on the order page during checkout. Upload a new
          image to replace it instantly across the whole site.
        </p>

        <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", marginTop: "1rem" }}>
          <div>
            <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.4rem" }}>
              {preview ? "New QR (preview)" : "Current QR"}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview || qrUrl || "/upi-qr.jpg"}
              alt="UPI payment QR code"
              style={{ width: 180, borderRadius: 12, border: "1px solid var(--border)" }}
            />
          </div>
        </div>

        <div className="form-field" style={{ marginTop: "1.25rem" }}>
          <label>Replace QR image</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>

        {error && <p className="error-text">{error}</p>}
        {saved && !error && <p className="muted">QR code updated — buyers will see it now.</p>}

        <button className="btn" type="submit" disabled={submitting || !file}>
          {submitting ? "Uploading..." : "Save QR code"}
        </button>
      </form>
    </div>
  );
}
