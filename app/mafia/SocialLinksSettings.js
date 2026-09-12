"use client";

import { useEffect, useState } from "react";

const FIELDS = [
  { key: "instagram", label: "Instagram URL", placeholder: "https://instagram.com/yourpage" },
  { key: "telegram", label: "Telegram URL", placeholder: "https://t.me/yourusername" },
  { key: "whatsapp", label: "WhatsApp URL", placeholder: "https://wa.me/91XXXXXXXXXX" },
  { key: "telegramChannel", label: "Telegram Channel URL", placeholder: "https://t.me/yourchannel" },
];

const EMPTY = { instagram: "", telegram: "", whatsapp: "", telegramChannel: "" };

export default function SocialLinksSettings() {
  const [values, setValues] = useState(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings/social-links")
      .then((res) => res.json())
      .then((data) => setValues((v) => ({ ...v, ...data })))
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/social-links", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        return;
      }
      setValues((v) => ({ ...v, ...data }));
      setSaved(true);
    } catch {
      setError("Network error — please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="panel">
      <h3>Social Links</h3>
      <p className="muted" style={{ marginTop: "0.3rem" }}>
        Shown as buttons in the storefront footer. Leave any field blank to hide that button
        entirely instead of showing a dead link.
      </p>
      <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        {FIELDS.map(({ key, label, placeholder }) => (
          <div className="form-field" key={key}>
            <label htmlFor={`social-${key}`}>{label}</label>
            <input
              id={`social-${key}`}
              type="url"
              value={values[key] || ""}
              onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
              placeholder={placeholder}
            />
          </div>
        ))}
        {error && <p className="error-text">{error}</p>}
        {saved && !error && (
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Saved.
          </p>
        )}
        <button className="btn" type="submit" disabled={saving || !loaded}>
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
