"use client";

import { useState } from "react";
import { Bookmark, Plus, Trash2, X } from "lucide-react";

const MAX_QUICK_REPLIES = 20;

export default function QuickRepliesMenu({ replies, onAdd, onDelete, onPick }) {
  const [open, setOpen] = useState(false);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);

  async function handleAdd(e) {
    e.preventDefault();
    if (!newText.trim() || replies.length >= MAX_QUICK_REPLIES || saving) return;
    setSaving(true);
    await onAdd(newText.trim());
    setNewText("");
    setSaving(false);
  }

  return (
    <div className="quick-replies-wrap">
      <button
        type="button"
        className="chat-attach-btn"
        aria-label="Saved replies"
        onClick={() => setOpen((o) => !o)}
      >
        <Bookmark size={16} />
      </button>
      {open && (
        <div className="quick-replies-popover">
          <div className="quick-replies-popover-header">
            <strong>Saved Replies</strong>
            <span className="muted">
              {replies.length}/{MAX_QUICK_REPLIES}
            </span>
            <button type="button" className="quick-replies-close" onClick={() => setOpen(false)} aria-label="Close">
              <X size={14} />
            </button>
          </div>
          <div className="quick-replies-list">
            {replies.length === 0 && (
              <p className="muted" style={{ padding: "0.6rem 0" }}>
                No saved replies yet — add one below.
              </p>
            )}
            {replies.map((r) => (
              <div key={r.id} className="quick-reply-item">
                <button
                  type="button"
                  className="quick-reply-text"
                  onClick={() => {
                    onPick(r.text);
                    setOpen(false);
                  }}
                >
                  {r.text}
                </button>
                <button
                  type="button"
                  className="quick-reply-delete"
                  aria-label="Delete saved reply"
                  onClick={() => onDelete(r.id)}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
          {replies.length < MAX_QUICK_REPLIES ? (
            <form onSubmit={handleAdd} className="quick-reply-add">
              <input
                type="text"
                placeholder="Save a new quick reply..."
                value={newText}
                onChange={(e) => setNewText(e.target.value)}
              />
              <button type="submit" className="btn secondary" disabled={saving || !newText.trim()}>
                <Plus size={14} />
              </button>
            </form>
          ) : (
            <p className="muted quick-reply-limit">Limit reached — delete one to add another.</p>
          )}
        </div>
      )}
    </div>
  );
}
