"use client";

import { useState } from "react";

const emptyForm = {
  title: "",
  description: "",
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

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSaved(false);
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
      <div className="form-field">
        <label>Description</label>
        <textarea
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
        />
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
        <label>Images</label>
        <input type="file" accept="image/*" multiple onChange={(e) => setImages(Array.from(e.target.files || []))} />
      </div>
      {error && <p className="error-text">{error}</p>}
      {saved && !error && <p className="muted">Listing added — it&apos;ll show up on the Listings page shortly.</p>}
      <button className="btn" type="submit" disabled={submitting}>
        {submitting ? "Saving..." : "Add listing"}
      </button>
    </form>
  );
}
