"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

export default function AuroraBackground() {
  const pathname = usePathname();
  const rootRef = useRef(null);
  const tickingRef = useRef(false);

  useEffect(() => {
    function onScroll() {
      if (tickingRef.current) return;
      tickingRef.current = true;
      requestAnimationFrame(() => {
        const el = rootRef.current;
        if (el) {
          const max = document.documentElement.scrollHeight - window.innerHeight;
          const progress = max > 0 ? window.scrollY / max : 0;
          el.style.setProperty("--scroll-hue", `${progress * 70}deg`);
        }
        tickingRef.current = false;
      });
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname?.startsWith("/mafia")) return null;

  return (
    <div ref={rootRef} className="aurora-bg" aria-hidden="true">
      <span className="aurora-blob aurora-blob-1" />
      <span className="aurora-blob aurora-blob-2" />
      <span className="aurora-blob aurora-blob-3" />
      <span className="aurora-blob aurora-blob-4" />
      <div className="aurora-grain" />
    </div>
  );
}
