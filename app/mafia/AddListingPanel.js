"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";

const emptyForm = {
  title: "",
  price: "",
  originalPrice: "",
  category: "",
  gameUid: "",
  tier: "",
  level: "",
  server: "",
  rareItems: "",
  accountId: "",
  accountPassword: "",
};

// Lives on its own settings page rather than the Listings page itself — that
// page is for managing what already exists; adding new inventory is a
// settings-level action, alongside Payment QR and Saved Replies. The
// Listings page picks up newly-added listings on its own poll, so this
// component doesn't need to coordinate a refresh with it directly.
export default function AddListingPanel() {
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Real thumbnail previews of what's actually selected — there was no
  // visual confirmation before beyond the bare browser file-input label,
  // so a selection that silently didn't register (or got cleared) was
  // invisible until the listing went live with no photos at all.
  const previewUrls = useMemo(() => images.map((file) => URL.createObjectURL(file)), [images]);
  useEffect(() => {
    return () => previewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [previewUrls]);

  function removeImage(index) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaved(false);

    // A listing with zero photos is exactly the bug this is fixing — a
    // Free Fire ID for sale with no screenshot has nothing to show a
    // buyer was ever real, and previously nothing stopped this from
    // going live silently. Blocked here, not just discouraged.
    if (images.length === 0) {
      setError("Add at least one screenshot before saving — a listing can't go live with no photos.");
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.set(key, value));
    images.forEach((file) => formData.append("images", file));

    const res = await fetch("/api/admin/listings", { method: "POST", body: formData });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    setForm(emptyForm);
    setImages([]);
    e.target.reset();
    setSaved(true);
  }

  return (
    <form onSubmit={handleCreate} className="panel">
      <div className="form-field">
        <label>Title</label>
        <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
      </div>
      <div className="field-grid-2">
        <div className="form-field">
          <label>Price (₹)</label>
          <input
            type="number"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
            required
          />
        </div>
        <div className="form-field">
          <label>Original Price (₹, optional)</label>
          <input
            type="number"
            value={form.originalPrice}
            onChange={(e) => setForm({ ...form, originalPrice: e.target.value })}
            placeholder="Shows struck through if higher than price"
          />
        </div>
      </div>
      <div className="form-field">
        <label>Category</label>
        <input
          value={form.category}
          onChange={(e) => setForm({ ...form, category: e.target.value })}
          placeholder="Free Fire / PUBG / ..."
          required
        />
      </div>
      <div className="form-field">
        <label>Game UID (optional)</label>
        <input
          value={form.gameUid}
          onChange={(e) => setForm({ ...form, gameUid: e.target.value })}
          placeholder="Public in-game ID shown to buyers, e.g. 2083601348"
        />
      </div>
      <div className="field-grid-2">
        <div className="form-field">
          <label>Tier badge (optional)</label>
          <input
            value={form.tier}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
            placeholder="Premium / Standard / ..."
          />
        </div>
        <div className="form-field">
          <label>Level (optional)</label>
          <input type="number" value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })} />
        </div>
      </div>
      <div className="form-field">
        <label>Server (optional)</label>
        <input
          value={form.server}
          onChange={(e) => setForm({ ...form, server: e.target.value })}
          placeholder="India / Asia / Global / ..."
        />
      </div>
      <div className="form-field">
        <label>Rare items included (optional)</label>
        <input
          value={form.rareItems}
          onChange={(e) => setForm({ ...form, rareItems: e.target.value })}
          placeholder="Comma-separated, e.g. 3 EVO MAX, PRIME 7, 1500 Diamonds Available"
        />
      </div>
      <div className="field-grid-2">
        <div className="form-field">
          <label>Account ID</label>
          <input
            value={form.accountId}
            onChange={(e) => setForm({ ...form, accountId: e.target.value })}
            required
          />
        </div>
        <div className="form-field">
          <label>Account Password</label>
          <input
            value={form.accountPassword}
            onChange={(e) => setForm({ ...form, accountPassword: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="form-field">
        <label>Images (at least 1 required)</label>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setImages(Array.from(e.target.files || []))}
        />
        {previewUrls.length > 0 && (
          <div className="listing-image-preview-row">
            {previewUrls.map((url, i) => (
              <div key={url} className="listing-image-preview-thumb">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt={`Selected screenshot ${i + 1}`} />
                <button
                  type="button"
                  aria-label={`Remove screenshot ${i + 1}`}
                  onClick={() => removeImage(i)}
                >
                  <X size={13} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
      {error && <p className="error-text">{error}</p>}
      {saved && !error && <p className="muted">Listing added — it&apos;ll show up on the Listings page shortly.</p>}
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Add listing"}
      </button>
    </form>
  );
}
