"use client";

import { useEffect, useRef } from "react";

export default function MessageUnsendMenu({ x, y, onUnsend, onClose }) {
  const menuRef = useRef(null);

  useEffect(() => {
    function handlePointerDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) onClose();
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div ref={menuRef} className="dm-context-popover" style={{ left: x, top: y }}>
      <button type="button" className="dm-context-popover-unsend" onClick={onUnsend}>
        Unsend
      </button>
      <button type="button" className="dm-context-popover-cancel" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
