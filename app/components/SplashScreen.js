"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const SESSION_KEY = "gamex-splash-shown";
const EXIT_AT_MS = 1500;
const DONE_AT_MS = 2000;

export default function SplashScreen() {
  const pathname = usePathname();
  const [phase, setPhase] = useState("hidden"); // hidden | enter | exit

  useEffect(() => {
    if (pathname?.startsWith("/mafia")) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY)) return;

    sessionStorage.setItem(SESSION_KEY, "1");

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    setPhase("enter");
    const exitTimer = setTimeout(() => setPhase("exit"), EXIT_AT_MS);
    const doneTimer = setTimeout(() => setPhase("hidden"), DONE_AT_MS);
    return () => {
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
    // Only ever check on first mount of a fresh session — not on every route change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === "hidden") return null;

  return (
    <div
      className={`splash-screen ${phase === "exit" ? "splash-exit" : ""}`}
      onClick={() => setPhase("exit")}
    >
      <div className="splash-content">
        <div className="splash-mark">GX</div>
        <div className="splash-wordmark">
          <span className="splash-word splash-word-1">GAMEX</span>
          <span className="splash-word splash-word-2">STORE</span>
        </div>
        <div className="splash-bar">
          <div className="splash-bar-fill" />
        </div>
      </div>
    </div>
  );
}
