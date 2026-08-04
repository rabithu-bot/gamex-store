"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Trash2, Upload } from "lucide-react";

const MAX_PROOFS = 150;

export default function ProofsSettings() {
  const [proofs, setProofs] = useState(null);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
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
    if (!file || uploading || (proofs && proofs.length >= MAX_PROOFS)) return;
    setError("");
    setUploading(true);

    const formData = new FormData();
    formData.set("image", file);

    const res = await fetch("/api/admin/proofs", { method: "POST", body: formData });
    setUploading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't upload that image");
      return;
    }
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    fetchProofs();
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
            <form onSubmit={handleUpload} className="quick-reply-add" style={{ marginTop: "0.75rem" }}>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              <button type="submit" className="btn secondary" disabled={uploading || !file}>
                <Upload size={14} />
              </button>
            </form>
          ) : (
            <p className="muted quick-reply-limit">Limit reached ({MAX_PROOFS}) — delete one to add another.</p>
          )}
        </>
      )}
    </div>
  );
}
