"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Trash2 } from "lucide-react";

const MAX_QUICK_REPLIES = 20;

export default function QuickRepliesSettings() {
  const [replies, setReplies] = useState(null);
  const [newKeyword, setNewKeyword] = useState("");
  const [newText, setNewText] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchReplies = useCallback(async () => {
    const res = await fetch("/api/admin/quick-replies", { cache: "no-store" });
    if (res.ok) setReplies(await res.json());
  }, []);

  useEffect(() => {
    fetchReplies();
  }, [fetchReplies]);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newText.trim() || !newKeyword.trim() || (replies && replies.length >= MAX_QUICK_REPLIES) || saving) return;
    setError("");
    setSaving(true);
    const res = await fetch("/api/admin/quick-replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: newText.trim(), keyword: newKeyword.trim() }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Couldn't save that reply");
      return;
    }
    setNewKeyword("");
    setNewText("");
    fetchReplies();
  }

  async function handleDelete(id) {
    await fetch(`/api/admin/quick-replies/${id}`, { method: "DELETE" });
    fetchReplies();
  }

  return (
    <div className="panel">
      <h3>Saved Replies</h3>
      <p className="muted" style={{ marginTop: "0.3rem" }}>
        Instagram-style saved replies — set a keyword for each one, and its suggestion only shows
        up while you're typing that exact keyword in the message box, not any random matching word.
      </p>

      {!replies ? (
        <div className="panel-skeleton-list">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="skeleton panel-skeleton-row" style={{ height: 36 }} />
          ))}
        </div>
      ) : (
        <>
          <div className="quick-reply-settings-list">
            {replies.length === 0 && (
              <p className="muted" style={{ padding: "0.6rem 0" }}>
                No saved replies yet — add one below.
              </p>
            )}
            {replies.map((r) => (
              <div key={r.id} className="quick-reply-item">
                {r.keyword && <span className="quick-reply-keyword">{r.keyword}</span>}
                <span className="quick-reply-text">{r.text}</span>
                <button
                  type="button"
                  className="quick-reply-delete"
                  aria-label="Delete saved reply"
                  onClick={() => handleDelete(r.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>

          {error && <p className="error-text">{error}</p>}

          {replies.length < MAX_QUICK_REPLIES ? (
            <form onSubmit={handleAdd} className="quick-reply-add" style={{ marginTop: "0.75rem" }}>
              <input
                type="text"
                placeholder="keyword"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="quick-reply-keyword-input"
                maxLength={20}
              />
              <input
                type="text"
                placeholder="Save a new quick reply..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
              <button type="submit" className="btn secondary" disabled={saving || !newText.trim() || !newKeyword.trim()}>
                <Plus size={14} />
              </button>
            </form>
          ) : (
            <p className="muted quick-reply-limit">Limit reached ({MAX_QUICK_REPLIES}) — delete one to add another.</p>
          )}
        </>
      )}
    </div>
  );
}
