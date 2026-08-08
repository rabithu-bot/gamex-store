"use client";

import { useEffect, useState } from "react";
import { Eye, Image as ImageIcon, Mic } from "lucide-react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

export default function AiLearningSettings() {
  const [stats, setStats] = useState(null);
  const [confirmOn, setConfirmOn] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/admin/ai-learning");
    if (res.ok) setStats(await res.json());
  }

  useEffect(() => {
    load();
  }, []);

  async function toggle(enabled) {
    setBusy(true);
    setError("");
    const res = await fetch("/api/admin/ai-learning/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) {
      setError(data.error || "Couldn't update this");
      return;
    }
    setStats(data);
  }

  if (!stats) {
    return (
      <div className="panel">
        <p className="muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <Eye size={17} />
        Shadow Learning Mode
      </h3>
      <p className="muted" style={{ marginTop: "0.3rem" }}>
        The AI only observes right now — every real reply you send gets logged as a learning
        example. It won&apos;t message a customer on its own until Reply Patterns Learned reaches
        100% and you turn it on.
      </p>

      <div style={{ marginTop: "1.25rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", marginBottom: "0.4rem" }}>
          <span>Learning progress</span>
          <span style={{ fontWeight: 700 }}>{stats.progress}%</span>
        </div>
        <div className="ai-learning-bar-track">
          <div className="ai-learning-bar-fill" style={{ width: `${Math.min(100, stats.progress)}%` }} />
        </div>
      </div>

      <div className="stats-bar" style={{ marginTop: "1rem" }}>
        <div className="stat-card">
          <div className="stat-icon notify">
            <Eye size={16} />
          </div>
          <div>
            <span className="stat-value">
              {stats.observations}/{stats.targetObservations}
            </span>
            <span className="stat-label">Reply Patterns Learned</span>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1.25rem", borderTop: "1px solid var(--border)", paddingTop: "1rem" }}>
        <strong style={{ fontSize: "0.9rem" }}>Media &amp; Voice Insights Capture</strong>
        <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.15rem" }}>
          Doesn&apos;t count toward the gate above — just what&apos;s being picked up from your
          images and voice notes as you reply.
        </p>
        <div className="stats-bar" style={{ marginTop: "0.75rem" }}>
          <div className="stat-card">
            <div className="stat-icon available">
              <ImageIcon size={16} />
            </div>
            <div>
              <span className="stat-value">{stats.imagesLogged}</span>
              <span className="stat-label">Images Logged for Learning</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon messages">
              <Mic size={16} />
            </div>
            <div>
              <span className="stat-value">{stats.voiceNotesAnalyzed}</span>
              <span className="stat-label">Voice Notes Analyzed</span>
            </div>
          </div>
        </div>
      </div>

      {error && <p className="error-text" style={{ marginTop: "0.75rem" }}>{error}</p>}

      <div
        style={{
          marginTop: "1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderTop: "1px solid var(--border)",
          paddingTop: "1rem",
        }}
      >
        <div>
          <strong>AI Auto-Reply</strong>
          <p className="muted" style={{ fontSize: "0.8rem", marginTop: "0.15rem" }}>
            {stats.enabled
              ? "Live — the AI is replying to customers on its own."
              : stats.readyToEnable
                ? "Ready. Turn on when you want the AI live."
                : "Locked until Reply Patterns Learned reaches 100%."}
          </p>
        </div>
        <button
          type="button"
          className={`ai-toggle-switch ${stats.enabled ? "on" : ""}`}
          disabled={busy || (!stats.enabled && !stats.readyToEnable)}
          aria-label={stats.enabled ? "Turn off AI auto-reply" : "Turn on AI auto-reply"}
          onClick={() => (stats.enabled ? toggle(false) : setConfirmOn(true))}
        >
          <span className="ai-toggle-thumb" />
        </button>
      </div>

      {confirmOn && (
        <ConfirmDialog
          title="Turn on AI auto-reply?"
          message="The AI will start replying to customers on its own, right now."
          confirmLabel="Turn On"
          danger={false}
          onConfirm={() => {
            setConfirmOn(false);
            toggle(true);
          }}
          onCancel={() => setConfirmOn(false)}
        />
      )}
    </div>
  );
}
