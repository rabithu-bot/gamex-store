"use client";

import { useEffect, useState, useCallback } from "react";
import { Link2, X } from "lucide-react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

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

export default function ListingsPanel() {
  const [listings, setListings] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [images, setImages] = useState([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [igUrl, setIgUrl] = useState("");
  const [igLoading, setIgLoading] = useState(false);
  const [igError, setIgError] = useState("");
  const [importedImages, setImportedImages] = useState([]);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const fetchListings = useCallback(async () => {
    const res = await fetch("/api/admin/listings", { cache: "no-store" });
    if (res.ok) setListings(await res.json());
  }, []);

  useEffect(() => {
    fetchListings();
  }, [fetchListings]);

  async function handleCreate(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const formData = new FormData();
    Object.entries(form).forEach(([key, value]) => formData.set(key, value));
    images.forEach((file) => formData.append("images", file));
    formData.set("importedImages", JSON.stringify(importedImages));

    const res = await fetch("/api/admin/listings", { method: "POST", body: formData });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Something went wrong");
      return;
    }
    setForm(emptyForm);
    setImages([]);
    setImportedImages([]);
    e.target.reset();
    fetchListings();
  }

  async function handleImportFromInstagram() {
    if (!igUrl.trim() || igLoading) return;
    setIgLoading(true);
    setIgError("");
    try {
      const res = await fetch("/api/admin/instagram-fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: igUrl.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setIgError(data.error || "Couldn't fetch that link");
        return;
      }
      // Fills the form fields as a starting point only — whatever Instagram
      // didn't publicly expose (price, account details, tier, etc.) is left
      // for the admin to fill in manually, same as the rest of this form.
      setForm((prev) => ({
        ...prev,
        description: data.caption || prev.description,
        title: prev.title || data.title,
      }));
      if (data.imageUrl) setImportedImages((prev) => [...prev, data.imageUrl]);
      setIgUrl("");
    } finally {
      setIgLoading(false);
    }
  }

  function startEdit(listing) {
    setEditingId(listing.id);
    setEditForm({
      title: listing.title,
      description: listing.description,
      price: listing.price,
      originalPrice: listing.originalPrice || "",
      category: listing.category,
      gameUid: listing.gameUid || "",
      tier: listing.tier || "",
      level: listing.level || "",
      server: listing.server || "",
      rareItems: (listing.rareItems || []).join(", "),
      accountId: listing.accountId,
      accountPassword: listing.accountPassword,
      status: listing.status,
    });
  }

  async function handleUpdate(e, id) {
    e.preventDefault();
    const formData = new FormData();
    Object.entries(editForm).forEach(([key, value]) => formData.set(key, value));

    const res = await fetch(`/api/admin/listings/${id}`, { method: "PUT", body: formData });
    if (res.ok) {
      setEditingId(null);
      fetchListings();
    }
  }

  async function confirmDelete() {
    const id = deleteTargetId;
    setDeleteTargetId(null);
    await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
    fetchListings();
  }

  return (
    <div>
      <div className="panel">
        <h3>
          <Link2 size={16} style={{ verticalAlign: "-3px", marginRight: "0.4rem" }} />
          Import from Instagram
        </h3>
        <p className="muted" style={{ marginTop: "-0.25rem" }}>
          Paste one post link at a time — fills caption + a photo below. Anything Instagram
          doesn't publicly show (price, account details, etc.) still needs to be filled in manually.
        </p>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <input
            value={igUrl}
            onChange={(e) => setIgUrl(e.target.value)}
            placeholder="https://www.instagram.com/p/..."
            style={{ flex: 1 }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleImportFromInstagram();
              }
            }}
          />
          <button type="button" className="btn secondary" onClick={handleImportFromInstagram} disabled={igLoading}>
            {igLoading ? "Fetching..." : "Fetch"}
          </button>
        </div>
        {igError && <p className="error-text">{igError}</p>}
        {importedImages.length > 0 && (
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginTop: "0.75rem" }}>
            {importedImages.map((url, i) => (
              <div key={url} style={{ position: "relative" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={url}
                  alt="Imported from Instagram"
                  style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 8 }}
                  loading="lazy"
                />
                <button
                  type="button"
                  className="image-remove-btn"
                  onClick={() => setImportedImages((prev) => prev.filter((_, idx) => idx !== i))}
                  aria-label="Remove imported image"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleCreate} className="panel">
        <h3>Add a new listing</h3>
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
            <input
              type="number"
              value={form.level}
              onChange={(e) => setForm({ ...form, level: e.target.value })}
            />
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
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => setImages(Array.from(e.target.files || []))}
          />
        </div>
        {error && <p className="error-text">{error}</p>}
        <button className="btn" type="submit" disabled={submitting}>
          {submitting ? "Saving..." : "Add listing"}
        </button>
      </form>

      <h3 style={{ marginTop: "2rem" }}>Existing listings</h3>
      {!listings && (
        <div className="panel-skeleton-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton panel-skeleton-row" style={{ height: 96 }} />
          ))}
        </div>
      )}
      {listings && listings.length === 0 && <p className="muted">No listings yet.</p>}

      {listings?.map((listing) => (
        <div key={listing.id} className="panel">
          {editingId === listing.id ? (
            <form onSubmit={(e) => handleUpdate(e, listing.id)}>
              <div className="form-field">
                <label>Title</label>
                <input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div className="form-field">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </div>
              <div className="field-grid-2">
                <div className="form-field">
                  <label>Price (₹)</label>
                  <input
                    type="number"
                    value={editForm.price}
                    onChange={(e) => setEditForm({ ...editForm, price: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Original Price (₹, optional)</label>
                  <input
                    type="number"
                    value={editForm.originalPrice}
                    onChange={(e) => setEditForm({ ...editForm, originalPrice: e.target.value })}
                    placeholder="Blank = no discount shown"
                  />
                </div>
              </div>
              <div className="form-field">
                <label>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                >
                  <option value="available">available</option>
                  <option value="sold">sold</option>
                </select>
              </div>
              <div className="form-field">
                <label>Game UID (optional)</label>
                <input
                  value={editForm.gameUid}
                  onChange={(e) => setEditForm({ ...editForm, gameUid: e.target.value })}
                  placeholder="Public in-game ID shown to buyers"
                />
              </div>
              <div className="field-grid-2">
                <div className="form-field">
                  <label>Tier badge (optional)</label>
                  <input
                    value={editForm.tier}
                    onChange={(e) => setEditForm({ ...editForm, tier: e.target.value })}
                    placeholder="Premium / Standard / ..."
                  />
                </div>
                <div className="form-field">
                  <label>Level (optional)</label>
                  <input
                    type="number"
                    value={editForm.level}
                    onChange={(e) => setEditForm({ ...editForm, level: e.target.value })}
                  />
                </div>
              </div>
              <div className="form-field">
                <label>Server (optional)</label>
                <input
                  value={editForm.server}
                  onChange={(e) => setEditForm({ ...editForm, server: e.target.value })}
                  placeholder="India / Asia / Global / ..."
                />
              </div>
              <div className="form-field">
                <label>Rare items included (optional)</label>
                <input
                  value={editForm.rareItems}
                  onChange={(e) => setEditForm({ ...editForm, rareItems: e.target.value })}
                  placeholder="Comma-separated, e.g. 3 EVO MAX, PRIME 7"
                />
              </div>
              <div className="field-grid-2">
                <div className="form-field">
                  <label>Account ID</label>
                  <input
                    value={editForm.accountId}
                    onChange={(e) => setEditForm({ ...editForm, accountId: e.target.value })}
                  />
                </div>
                <div className="form-field">
                  <label>Account Password</label>
                  <input
                    value={editForm.accountPassword}
                    onChange={(e) => setEditForm({ ...editForm, accountPassword: e.target.value })}
                  />
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn" type="submit">Save</button>
                <button className="btn secondary" type="button" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
              <div>
                <strong>{listing.title}</strong>{" "}
                <span className={`status-pill ${listing.status}`}>{listing.status}</span>
                <div className="muted">
                  {listing.category} ·{" "}
                  {listing.originalPrice > listing.price && (
                    <span className="price-original">₹{listing.originalPrice.toLocaleString("en-IN")}</span>
                  )}{" "}
                  ₹{listing.price.toLocaleString("en-IN")}
                </div>
                {listing.gameUid && <div className="muted">Public Game UID: {listing.gameUid}</div>}
                {(listing.tier || listing.level || listing.server) && (
                  <div className="muted">
                    {[
                      listing.tier,
                      listing.level ? `Level ${listing.level}` : null,
                      listing.server,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </div>
                )}
                <div className="muted">Account ID: {listing.accountId}</div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn secondary" onClick={() => startEdit(listing)}>
                  Edit
                </button>
                <button className="btn danger" onClick={() => setDeleteTargetId(listing.id)}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {deleteTargetId !== null && (
        <ConfirmDialog
          title="Delete this listing?"
          message="This cannot be undone. Existing orders for this listing keep their own copy of its details."
          confirmLabel="Delete"
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTargetId(null)}
        />
      )}
    </div>
  );
}
