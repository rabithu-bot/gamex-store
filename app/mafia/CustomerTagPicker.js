"use client";

import { useEffect, useRef, useState } from "react";
import { Tag, X } from "lucide-react";
import { CUSTOMER_TAGS, getCustomerTag } from "@/app/lib/customerTags";

export default function CustomerTagPicker({ orderId, tag, onChanged }) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef(null);
  const current = getCustomerTag(tag);

  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e) {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) setOpen(false);
    }
    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  async function setTag(nextTag) {
    setOpen(false);
    onChanged(nextTag);
    await fetch(`/api/admin/orders/${orderId}/tag`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tag: nextTag }),
    });
  }

  return (
    <div className="customer-tag-picker" ref={popoverRef}>
      <button
        type="button"
        className="customer-tag-trigger"
        data-tag={tag || undefined}
        style={
          current
            ? { "--tag-color": current.color, "--tag-bg": current.bg, "--tag-border": current.border }
            : undefined
        }
        onClick={() => setOpen((v) => !v)}
      >
        <Tag size={13} />
        {current ? current.label : "Tag"}
      </button>

      {open && (
        <div className="customer-tag-popover">
          {CUSTOMER_TAGS.map((t) => (
            <button
              key={t.key}
              type="button"
              className="customer-tag-option"
              style={{ "--tag-color": t.color }}
              onClick={() => setTag(t.key)}
            >
              <span className="customer-tag-dot" />
              {t.label}
            </button>
          ))}
          {current && (
            <button type="button" className="customer-tag-option customer-tag-remove" onClick={() => setTag(null)}>
              <X size={13} />
              Remove tag
            </button>
          )}
        </div>
      )}
    </div>
  );
}
