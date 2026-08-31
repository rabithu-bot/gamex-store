"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, KeyRound, User } from "lucide-react";
import { useToast } from "@/app/components/Toast";

export default function AdminLoginPage() {
  const router = useRouter();
  const showToast = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const submittingRef = useRef(false);

  // Reading window.location.search directly (rather than useSearchParams)
  // so this page can stay statically prerendered — useSearchParams forces
  // a page into fully dynamic/client rendering unless wrapped in Suspense,
  // which isn't worth it for a one-time mount check.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("expired") !== "1") return;
    showToast("Session Expired (24h Limit). Please login again.", { type: "error" });
    // getAdminSessionStatus() only reads the stale cookie's timestamp, it
    // never clears it (Server Components can't write cookies) — this is
    // the actual cleanup, through the one place that's allowed to.
    fetch("/api/admin/logout", { method: "POST" }).catch(() => {});
    router.replace("/mafia/login");
  }, [router, showToast]);

  async function handleSubmit(e) {
    e.preventDefault();
    // Some mobile keyboards fire two submit events for a single Enter tap —
    // the `loading` state alone doesn't catch that since both events can
    // land before the first setState commit. A synchronous ref does.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setError("");
    setLoading(true);
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (!res.ok) {
      submittingRef.current = false;
      const data = await res.json();
      setError(data.error || "Access denied");
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    router.push("/mafia");
    router.refresh();
  }

  return (
    <main className="vault-page admin-light">
      <div className="vault-glow" aria-hidden="true" />
      <div className={`vault-card ${shake ? "vault-shake" : ""}`}>
        <div className="vault-icon">
          <ShieldCheck size={26} strokeWidth={2.2} />
        </div>
        <span className="vault-eyebrow">Restricted Access</span>
        <h1 className="vault-title">Vault Control</h1>
        <p className="vault-subtitle">Authorized personnel only. Every attempt is logged.</p>

        <form onSubmit={handleSubmit} className="vault-form">
          <div className="form-field">
            <label htmlFor="username">Operator ID</label>
            <div className="vault-input">
              <User size={16} className="vault-input-icon" />
              <input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                autoFocus
              />
            </div>
          </div>
          <div className="form-field">
            <label htmlFor="password">Passkey</label>
            <div className="vault-input">
              <KeyRound size={16} className="vault-input-icon" />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
          </div>
          {error && <p className="error-text">{error}</p>}
          <button className="btn vault-submit" type="submit" disabled={loading}>
            {loading ? "Verifying..." : "Unlock"}
          </button>
        </form>

        <div className="vault-status">
          <span className="vault-status-dot" />
          Secure session &middot; encrypted channel
        </div>
      </div>
    </main>
  );
}
