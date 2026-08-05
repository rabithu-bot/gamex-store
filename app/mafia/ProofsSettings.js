"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Trash2, Upload } from "lucide-react";

const MAX_PROOFS = 150;

export default function ProofsSettings() {
  const [proofs, setProofs] = useState(null);
  const [files, setFiles] = useState([]);
  const [batchDate, setBatchDate] = useState("");
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total }
  const fileInputRef = useRef(null);

  const fetchProofs = useCallback(async () => {
    const res = await fetch("/api/admin/proofs", { cache: "no-store" });
    if (res.ok) setProofs(await res.json());
  }, []);

  useEffect(() => {
    fetchProofs();
  }, [fetchProofs]);

  async function handleUpload(e) {
    e.preventDefault();
    if (!files.length || uploading || (proofs && proofs.length >= MAX_PROOFS)) return;
    setError("");
    setUploading(true);
    setProgress({ done: 0, total: files.length });

    // Multi-select in the picker, but the API only takes one image per
    // request — upload sequentially so admin can pick a whole batch from
    // their gallery instead of repeating this form once per screenshot.
    for (let i = 0; i < files.length; i++) {
      const formData = new FormData();
      formData.set("image", files[i]);
      if (batchDate) formData.set("proofDate", batchDate);
      const res = await fetch("/api/admin/proofs", { method: "POST", body: formData });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(
          files.length > 1
            ? `Stopped after ${i} of ${files.length} — ${data.error || "upload failed"}`
            : data.error || "Couldn't upload that image"
        );
        break;
      }
      setProgress({ done: i + 1, total: files.length });
      fetchProofs();
    }

    setUploading(false);
    setProgress(null);
    setFiles([]);
    setBatchDate("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleDelete(id) {
    await fetch(`/api/admin/proofs/${id}`, { method: "DELETE" });
    fetchProofs();
  }

  return (
    <div className="panel">
      <h3>Proofs</h3>
      <p className="muted" style={{ marginTop: "0.3rem" }}>
        Screenshots shown to customers on the public Proof page (linked from the Buy Now button on
        every product) — past deliveries, payment confirmations, anything that builds trust.
      </p>

      {!proofs ? (
        <div className="panel-skeleton-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton panel-skeleton-row" style={{ height: 72 }} />
          ))}
        </div>
      ) : (
        <>
          {proofs.length === 0 ? (
            <p className="muted" style={{ padding: "0.6rem 0" }}>
              No proof images yet — upload one below.
            </p>
          ) : (
            <div className="proof-settings-grid">
              {proofs.map((p) => (
                <div key={p.id} className="proof-settings-thumb">
                  <Image src={p.url} alt="Proof" fill sizes="80px" />
                  <button
                    type="button"
                    className="btn danger proof-settings-delete"
                    aria-label="Delete proof image"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {error && <p className="error-text">{error}</p>}

          {proofs.length < MAX_PROOFS ? (
            <form onSubmit={handleUpload} style={{ marginTop: "0.75rem" }}>
              <div className="quick-reply-add">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                />
                <button type="submit" className="btn secondary" disabled={uploading || !files.length}>
                  {uploading && progress ? (
                    `${progress.done}/${progress.total}`
                  ) : files.length > 1 ? (
                    <>
                      <Upload size={14} />
                      {files.length}
                    </>
                  ) : (
                    <Upload size={14} />
                  )}
                </button>
              </div>
              <div className="form-field" style={{ marginTop: "0.5rem", marginBottom: 0 }}>
                <label htmlFor="proof-batch-date">
                  When did these happen? (optional — shown to customers; leave blank to hide the date)
                </label>
                <input
                  id="proof-batch-date"
                  type="date"
                  value={batchDate}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setBatchDate(e.target.value)}
                />
              </div>
            </form>
          ) : (
            <p className="muted quick-reply-limit">Limit reached ({MAX_PROOFS}) — delete one to add another.</p>
          )}
        </>
      )}
    </div>
  );
}
