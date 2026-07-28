"use client";

import { useEffect, useState, useCallback } from "react";
import QuickRepliesSettings from "./QuickRepliesSettings";

export default function SettingsPanel() {
  const [qrUrl, setQrUrl] = useState(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchQr = useCallback(async () => {
    const res = await fetch("/api/settings/payment-qr", { cache: "no-store" });
    if (res.ok) setQrUrl((await res.json()).url);
  }, []);

  useEffect(() => {
    fetchQr();
  }, [fetchQr]);

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

      <QuickRepliesSettings />
    </div>
  );
}
