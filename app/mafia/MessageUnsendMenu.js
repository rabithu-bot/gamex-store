"use client";

import { useEffect, useRef } from "react";
import { Copy, Pencil } from "lucide-react";
import { REACTION_EMOJIS } from "@/app/lib/reactions";

// Reactions live in this same long-press popover rather than their own
// gesture — the bubble already has a long-press (unsend) and a swipe
// (reply) claimed, and stacking a third custom gesture on the same touch
// target risks them fighting each other.
export default function MessageUnsendMenu({ x, y, currentReaction, canEdit, onReact, onEdit, onCopy, onUnsend, onClose }) {
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
      <div className="dm-context-popover-reactions">
        {REACTION_EMOJIS.map((emoji) => (
          <button
            key={emoji}
            type="button"
            className={`dm-context-popover-emoji${currentReaction === emoji ? " active" : ""}`}
            onClick={() => onReact(emoji)}
            aria-label={`React ${emoji}`}
          >
            {emoji}
          </button>
        ))}
      </div>
      <button type="button" className="dm-context-popover-action" onClick={onCopy}>
        <Copy size={14} />
        Copy
      </button>
      {canEdit && (
        <button type="button" className="dm-context-popover-action" onClick={onEdit}>
          <Pencil size={14} />
          Edit
        </button>
      )}
      <button type="button" className="dm-context-popover-unsend" onClick={onUnsend}>
        Unsend
      </button>
      <button type="button" className="dm-context-popover-cancel" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
