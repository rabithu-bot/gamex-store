"use client";

import { useState, useCallback } from "react";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useVisiblePolling } from "@/app/lib/useVisiblePolling";

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
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  const fetchListings = useCallback(async () => {
    const res = await fetch("/api/admin/listings", { cache: "no-store" });
    if (res.ok) setListings(await res.json());
  }, []);

  useVisiblePolling(fetchListings, 5000);

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
