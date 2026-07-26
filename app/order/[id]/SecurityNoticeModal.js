"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { ShieldAlert, X } from "lucide-react";

export default function SecurityNoticeModal({ onClose }) {
  useEffect(() => {
    function onKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="checkout-modal-backdrop" onClick={onClose}>
      <div className="checkout-modal security-notice-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="checkout-modal-close" aria-label="Close" onClick={onClose}>
          <X size={16} />
        </button>

        <div className="security-notice-icon">
          <ShieldAlert size={22} />
        </div>
        <h3>Payment Verification Failed ❌</h3>
        <p className="muted">
          Your payment screenshot could not be verified (Invalid or Fake Screenshot). Please
          complete the real payment and upload a valid screenshot to receive your ID credentials.
        </p>
        <button type="button" className="btn security-notice-cta" onClick={onClose}>
          Upload Real Screenshot 🔄
        </button>
      </div>
    </div>,
    document.body
  );
}
