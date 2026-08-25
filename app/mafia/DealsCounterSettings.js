"use client";

import { useEffect, useState, useCallback } from "react";
import { RotateCcw } from "lucide-react";

// Moved out of SettingsPanel.js (which now only holds the Payment QR
// form) into its own dedicated settings page/route.
export default function DealsCounterSettings() {
  const [autoDeals, setAutoDeals] = useState(0);
  const [manualDeals, setManualDeals] = useState(null);
  const [dealsInput, setDealsInput] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchBaseline = useCallback(async () => {
    const res = await fetch("/api/admin/settings/manual-deals-baseline", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setAutoDeals(data.auto);
    setManualDeals(data.manual);
    setDealsInput(data.manual === null ? "" : String(data.manual));
  }, []);

  useEffect(() => {
    fetchBaseline();
  }, [fetchBaseline]);

  async function save(rawValue) {
    setError("");
    setSaved(false);
    setSubmitting(true);

    const res = await fetch("/api/admin/settings/manual-deals-baseline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value: rawValue.trim() === "" ? null : Number(rawValue.trim()) }),
    });
    const data = await res.json().catch(() => ({}));
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error || "Something went wrong");
      return;
    }
    setManualDeals(data.manual);
    setAutoDeals(data.auto);
    setDealsInput(data.manual === null ? "" : String(data.manual));
    setSaved(true);
  }

  function handleSubmit(e) {
    e.preventDefault();
    save(dealsInput);
  }

  function handleClear() {
    save("");
  }

  const effective = manualDeals !== null ? manualDeals : autoDeals;

  return (
    <div>
      <div className="deals-counter-stats">
        <div className="deals-stat-card">
          <span className="deals-stat-label">Auto-tracked (real orders)</span>
          <span className="deals-stat-value">{autoDeals}</span>
        </div>
        <div className="deals-stat-card deals-stat-card-live">
          <span className="deals-stat-label">Live on storefront ticker</span>
          <span className="deals-stat-value">
            {effective}
            <small>{manualDeals !== null ? "override" : "auto"}</small>
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="panel">
        <p className="muted">
          The storefront ticker shows this as "{effective}+ TOTAL DEALS COMPLETED." This site can
          only auto-count orders placed through its own checkout — right now that's{" "}
          <strong>{autoDeals}</strong>. If you sold accounts before this website existed (e.g. over
          Instagram DMs) and want the public figure to reflect your real total history, enter that
          true total below. Only enter a number you can actually stand behind — this is shown to
          real buyers as a factual claim, not a marketing flourish. Leave it blank to just show the
          real auto-tracked count.
        </p>

        <div className="form-field" style={{ marginTop: "1rem", maxWidth: 280 }}>
          <label>Manual total (blank = use auto count)</label>
          <input
            type="number"
            min="0"
            step="1"
            placeholder={String(autoDeals)}
            value={dealsInput}
            onChange={(e) => {
              setDealsInput(e.target.value);
              setSaved(false);
            }}
          />
        </div>

        {error && <p className="error-text">{error}</p>}
        {saved && !error && <p className="muted">Saved — ticker now shows {effective}.</p>}

        <div className="deals-counter-actions">
          <button className="btn btn-lg" type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save Counter Baseline"}
          </button>
          {manualDeals !== null && (
            <button type="button" className="btn secondary" disabled={submitting} onClick={handleClear}>
              <RotateCcw size={15} />
              Clear override
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
