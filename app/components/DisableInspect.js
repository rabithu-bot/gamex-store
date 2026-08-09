"use client";

import { useEffect } from "react";

const BLOCKED_KEY_COMBOS = [
  (e) => e.key === "F12",
  (e) => e.ctrlKey && e.shiftKey && (e.key === "I" || e.key === "i"),
  (e) => e.ctrlKey && e.shiftKey && (e.key === "C" || e.key === "c"),
  (e) => e.ctrlKey && (e.key === "U" || e.key === "u"),
];

export default function DisableInspect() {
  useEffect(() => {
    function blockContextMenu(e) {
      // Images are deliberately exempt. On mobile, long-pressing an image
      // fires contextmenu — that's how a customer saves the UPI QR code to
      // open it in their payment app, which is a required step in the only
      // checkout flow this site has. Blocking it there costs real sales,
      // and the image bytes are public URLs anyway, so there was nothing
      // to protect. Everything else still gets blocked.
      if (e.target instanceof Element && e.target.closest("img, video")) return;
      e.preventDefault();
    }
    function blockDevToolsKeys(e) {
      if (BLOCKED_KEY_COMBOS.some((matches) => matches(e))) {
        e.preventDefault();
      }
    }
    document.addEventListener("contextmenu", blockContextMenu);
    document.addEventListener("keydown", blockDevToolsKeys);
    return () => {
      document.removeEventListener("contextmenu", blockContextMenu);
      document.removeEventListener("keydown", blockDevToolsKeys);
    };
  }, []);

  return null;
}
