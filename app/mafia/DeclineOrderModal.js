"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { DECLINE_REASONS } from "@/app/lib/declineReasons";

const NOTE_MAX_LENGTH = 300;

export default function DeclineOrderModal({ order, onClose, onDeclined }) {
  const [reason, setReason] = useState(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const modalRef = useRef(null);
  const triggerRef = useRef(null);

  // Focus trap: keep Tab/Shift+Tab cycling inside the dialog, restore focus
  // to whatever triggered it (the row's own Decline button) on close, so
  // keyboard users never get dropped back at the top of the page.
  useEffect(() => {
    triggerRef.current = document.activeElement;

    function getFocusable() {
      return Array.from(
        modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) || []
      ).filter((el) => !el.disabled);
    }
    getFocusable()[0]?.focus();

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const items = getFocusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      triggerRef.current?.focus?.();
    };
  }, [onClose]);

  async function handleConfirm() {
    if (!reason || submitting) return;
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/admin/orders/${order.id}/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ declineReason: reason, declineNote: note.trim() || null }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Something went wrong");
      return;
    }
    onDeclined();
  }

  return (
    <div className="checkout-modal-backdrop" onClick={onClose}>
      <div
        ref={modalRef}
        className="checkout-modal decline-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="decline-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="checkout-modal-close" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>

        <h3 id="decline-modal-title">Decline Order #{order.id}</h3>
        <p className="muted" style={{ marginBottom: "0.9rem" }}>
          Choose why this payment couldn&apos;t be verified — the customer will see this reason.
        </p>

        <div className="decline-reason-list" role="radiogroup" aria-label="Decline reason">
          {DECLINE_REASONS.map((r) => (
            <label key={r.key} className={`decline-reason-option ${reason === r.key ? "selected" : ""}`}>
              <input
                type="radio"
                name="decline-reason"
                value={r.key}
                checked={reason === r.key}
                onChange={() => setReason(r.key)}
              />
              <span>{r.label}</span>
            </label>
          ))}
        </div>

        <div className="form-field" style={{ marginTop: "1rem" }}>
          <label htmlFor="decline-note">Additional note to customer (optional)</label>
          <textarea
            id="decline-note"
            rows={3}
            maxLength={NOTE_MAX_LENGTH}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. We received ₹450 but the order total is ₹500."
          />
          <span className="muted decline-note-count">
            {note.length}/{NOTE_MAX_LENGTH}
          </span>
        </div>

        {error && <p className="error-text">{error}</p>}

        <div className="decline-modal-actions">
          <button type="button" className="btn secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </button>
          <button
            type="button"
            className="btn decline"
            onClick={handleConfirm}
            disabled={!reason || submitting}
          >
            {submitting ? "Declining..." : "Decline Order"}
          </button>
        </div>
      </div>
    </div>
  );
}
