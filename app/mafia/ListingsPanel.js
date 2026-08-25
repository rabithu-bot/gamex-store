"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { X } from "lucide-react";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import { useVisiblePolling } from "@/app/lib/useVisiblePolling";
import { uploadListingImages } from "@/app/lib/listingImageUpload";

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

export default function ListingsPanel() {
  const [listings, setListings] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [deleteTargetId, setDeleteTargetId] = useState(null);
  const [deleteError, setDeleteError] = useState("");
  // Existing images this listing already has (removable), separate from
  // brand-new files being added — the edit form previously had no image
  // UI at all, so a listing that went live with none (or with a bad
  // photo) had no way to be fixed short of deleting and recreating it.
  const [existingImages, setExistingImages] = useState([]);
  const [newImages, setNewImages] = useState([]);
  const [editError, setEditError] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [editStatus, setEditStatus] = useState("");

  const newImagePreviewUrls = useMemo(() => newImages.map((file) => URL.createObjectURL(file)), [newImages]);
  useEffect(() => {
    return () => newImagePreviewUrls.forEach((url) => URL.revokeObjectURL(url));
  }, [newImagePreviewUrls]);

  const fetchListings = useCallback(async () => {
    const res = await fetch("/api/admin/listings", { cache: "no-store" });
    if (res.ok) setListings(await res.json());
  }, []);

  useVisiblePolling(fetchListings, 5000);

  function startEdit(listing) {
    setEditingId(listing.id);
    setEditForm({
      title: listing.title,
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
    setExistingImages(listing.images || []);
    setNewImages([]);
    setEditError("");
  }

  function removeExistingImage(url) {
    setExistingImages((prev) => prev.filter((u) => u !== url));
  }

  function removeNewImage(index) {
    setNewImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpdate(e, id) {
    e.preventDefault();
    setEditError("");

    if (existingImages.length + newImages.length === 0) {
      setEditError("A listing needs at least one screenshot — add one before saving.");
      return;
    }

    setEditSaving(true);
    try {
      // New files upload straight to S3 first (not proxied through this
      // request) — a real batch of many full-resolution screenshots would
      // otherwise blow past Vercel's 4.5MB serverless request-body cap and
      // get rejected before anything was saved. This was the actual bug
      // behind "Couldn't save changes" on real multi-image edits, not a
      // data-format mismatch between existing URLs and new files.
      let newImageUrls = [];
      if (newImages.length > 0) {
        setEditStatus(`Uploading ${newImages.length} image${newImages.length === 1 ? "" : "s"}...`);
        const uploadResult = await uploadListingImages(newImages);
        if (!uploadResult.ok) {
          setEditError(uploadResult.error);
          return;
        }
        newImageUrls = uploadResult.publicUrls;
      }

      setEditStatus("Saving changes...");
      const formData = new FormData();
      Object.entries(editForm).forEach(([key, value]) => formData.set(key, value));
      formData.set("keepImages", JSON.stringify(existingImages));
      formData.set("newImageUrls", JSON.stringify(newImageUrls));

      const res = await fetch(`/api/admin/listings/${id}`, { method: "PUT", body: formData });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setEditingId(null);
        fetchListings();
      } else {
        setEditError(data.error || `Couldn't save changes (HTTP ${res.status}).`);
      }
    } catch (err) {
      // Network failure or anything unexpected — always show something
      // real rather than leaving the form looking stuck.
      setEditError(err.message || "Network error — please check your connection and try again.");
    } finally {
      setEditSaving(false);
      setEditStatus("");
    }
  }

  async function confirmDelete() {
    const id = deleteTargetId;
    setDeleteTargetId(null);
    setDeleteError("");
    try {
      const res = await fetch(`/api/admin/listings/${id}`, { method: "DELETE" });
      // Previously the response was ignored entirely, so a failed delete
      // looked identical to a successful one — the row just reappeared on
      // the next refetch with no explanation.
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setDeleteError(data.error || "Couldn't delete that listing.");
      }
    } catch {
      setDeleteError("Couldn't delete that listing — check your connection.");
    }
    fetchListings();
  }

  return (
    <div>
      {deleteError && <p className="error-text">{deleteError}</p>}
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
                  <option value="draft">draft (not visible to buyers)</option>
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
              <div className="form-field">
                <label>Images (at least 1 required)</label>
                {(existingImages.length > 0 || newImagePreviewUrls.length > 0) && (
                  <div className="listing-image-preview-row">
                    {existingImages.map((url) => (
                      <div key={url} className="listing-image-preview-thumb existing">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt="Listing screenshot" />
                        <button type="button" aria-label="Remove this screenshot" onClick={() => removeExistingImage(url)}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                    {newImagePreviewUrls.map((url, i) => (
                      <div key={url} className="listing-image-preview-thumb">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={url} alt={`New screenshot ${i + 1}`} />
                        <button type="button" aria-label={`Remove new screenshot ${i + 1}`} onClick={() => removeNewImage(i)}>
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ marginTop: "0.6rem" }}
                  onChange={(e) => setNewImages((prev) => [...prev, ...Array.from(e.target.files || [])])}
                />
              </div>
              {editError && <p className="error-text">{editError}</p>}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="btn" type="submit" disabled={editSaving}>
                  {editSaving ? editStatus || "Saving..." : "Save"}
                </button>
                <button className="btn secondary" type="button" onClick={() => setEditingId(null)} disabled={editSaving}>
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
