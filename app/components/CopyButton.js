"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useToast } from "./Toast";

export default function CopyButton({ value, label = "Copy" }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast("Copied to clipboard");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast("Couldn't copy, please copy manually", { type: "error" });
    }
  }

  return (
    <button type="button" className="copy-btn" onClick={handleCopy}>
      {copied ? <Check size={14} /> : <Copy size={14} />}
      {label}
    </button>
  );
}
