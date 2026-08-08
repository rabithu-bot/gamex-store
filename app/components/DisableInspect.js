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
