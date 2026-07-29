"use client";

import { useEffect } from "react";

// Styled replacement for window.confirm() — used for the admin panel's
// destructive actions (deleting a listing, deleting a whole conversation)
// so they match the rest of the UI instead of popping a native OS dialog.
export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Confirm",
  danger = true,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="confirm-backdrop" onClick={onCancel}>
      <div className="confirm-box panel" onClick={(e) => e.stopPropagation()}>
        {title && <h3>{title}</h3>}
        <p className="muted">{message}</p>
        <div className="confirm-actions">
          <button type="button" className="btn secondary" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" className={`btn${danger ? " danger" : ""}`} onClick={onConfirm} autoFocus>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
