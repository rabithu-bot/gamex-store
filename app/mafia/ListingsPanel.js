"use client";

import { useEffect, useState, useCallback } from "react";

const emptyForm = {
  title: "",
  description: "",
  price: "",
  originalPrice: "",
  category: "",
  gameUid: "",
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
    fetchListings();
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

  async function handleDelete(id) {
    if (!confirm("Delete this listing? This cannot be undone.")) return;
    await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
    fetchListings();
  }

  return (
    <div>
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
      {!listings && <p className="muted">Loading...</p>}
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
                <div className="muted">Account ID: {listing.accountId}</div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn secondary" onClick={() => startEdit(listing)}>
                  Edit
                </button>
                <button className="btn danger" onClick={() => handleDelete(listing.id)}>
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
