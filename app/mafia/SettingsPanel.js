"use client";

import { useEffect, useState, useCallback } from "react";

export default function SettingsPanel() {
  const [qrUrl, setQrUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [autoDeals, setAutoDeals] = useState(0);
  const [manualDeals, setManualDeals] = useState(null);
  const [dealsInput, setDealsInput] = useState("");
  const [dealsError, setDealsError] = useState("");
  const [dealsSaved, setDealsSaved] = useState(false);
  const [dealsSubmitting, setDealsSubmitting] = useState(false);

  const fetchQr = useCallback(async () => {
    const res = await fetch("/api/settings/payment-qr", { cache: "no-store" });
    if (res.ok) setQrUrl((await res.json()).url);
  }, []);

  const fetchDealsBaseline = useCallback(async () => {
    const res = await fetch("/api/admin/settings/manual-deals-baseline", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setAutoDeals(data.auto);
    setManualDeals(data.manual);
    setDealsInput(data.manual === null ? "" : String(data.manual));
  }, []);

  useEffect(() => {
    fetchQr();
    fetchDealsBaseline();
  }, [fetchQr, fetchDealsBaseline]);

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

  async function saveDealsBaseline(rawValue) {
    setDealsError("");
    setDealsSaved(false);
    setDealsSubmitting(true);

    const res = await fetch("/api/admin/settings/manual-deals-baseline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: rawValue.trim() === "" ? null : Number(rawValue.trim()) }),
    });
    const data = await res.json().catch(() => ({}));
    setDealsSubmitting(false);
    if (!res.ok) {
      setDealsError(data.error || "Something went wrong");
      return;
    }
    setManualDeals(data.manual);
    setAutoDeals(data.auto);
    setDealsInput(data.manual === null ? "" : String(data.manual));
    setDealsSaved(true);
  }

  function handleSaveDealsBaseline(e) {
    e.preventDefault();
    saveDealsBaseline(dealsInput);
  }

  function handleClearDealsBaseline() {
    saveDealsBaseline("");
  }

  const effectiveDeals = manualDeals !== null ? manualDeals : autoDeals;

  return (
    <div>
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

      <form onSubmit={handleSaveDealsBaseline} className="panel" style={{ marginTop: "1rem" }}>
        <h3>Lifetime Deals Counter</h3>
        <p className="muted" style={{ marginTop: "0.3rem" }}>
          The storefront ticker shows a "Verified Deals Completed" figure. This site can only
          auto-count orders placed through its own checkout — right now that's{" "}
          <strong>{autoDeals}</strong>. If you sold accounts before this website existed (e.g. over
          Instagram DMs) and want the public figure to reflect your real total history, enter that
          true total below. Only enter a number you can actually stand behind — this is shown to
          real buyers as a factual claim, not a marketing flourish. Leave it blank to just show the
          real auto-tracked count.
        </p>

        <div className="form-field" style={{ marginTop: "1rem", maxWidth: 240 }}>
          <label>Manual total (blank = use auto count)</label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder={String(autoDeals)}
            value={dealsInput}
            onChange={(e) => {
              setDealsInput(e.target.value);
              setDealsSaved(false);
            }}
          />
        </div>

        {dealsError && <p className="error-text">{dealsError}</p>}
        {dealsSaved && !dealsError && <p className="muted">Saved — ticker will show {effectiveDeals}.</p>}

        <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.5rem" }}>
          Currently showing on the storefront: <strong>{effectiveDeals}</strong>
          {manualDeals !== null ? " (manual override)" : " (auto-tracked)"}
        </p>

        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.75rem" }}>
          <button className="btn" type="submit" disabled={dealsSubmitting}>
            {dealsSubmitting ? "Saving..." : "Save"}
          </button>
          {manualDeals !== null && (
            <button
              type="button"
              className="btn secondary"
              disabled={dealsSubmitting}
              onClick={handleClearDealsBaseline}
            >
              Clear override
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
