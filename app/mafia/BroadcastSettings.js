"use client";

import { useEffect, useState } from "react";
import { Send, BellRing } from "lucide-react";
import ConfirmDialog from "@/app/components/ConfirmDialog";

const TYPE_LABELS = {
  broadcast: "Broadcast",
  "admin-alert": "New message → Admin",
  "buyer-reply": "Reply → Buyer",
};

export default function BroadcastSettings() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [logs, setLogs] = useState(null);

  async function loadLogs() {
    const res = await fetch("/api/admin/push-log");
    if (res.ok) {
      const data = await res.json();
      setLogs(data.logs);
    }
  }

  useEffect(() => {
    loadLogs();
  }, []);

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !message.trim() || sending) return;
    setError("");
    setResult(null);
    setConfirmOpen(true);
  }

  async function handleConfirmSend() {
    setConfirmOpen(false);
    setSending(true);
    const res = await fetch("/api/admin/broadcast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: title.trim(),
        message: message.trim(),
        url: url.trim(),
        image: image.trim(),
      }),
    });
    const data = await res.json().catch(() => ({}));
    setSending(false);
    if (!res.ok) {
      setError(data.error || "Couldn't send the broadcast");
      return;
    }
    setResult(data);
    loadLogs();
  }

  return (
    <div className="panel">
      <h3>Broadcast Push Notification</h3>
      <p className="muted" style={{ marginTop: "0.3rem" }}>
        Sends a real push notification to every device that has notifications enabled — customers
        and admin alike. Use it for announcements, sales, or new stock. Tapping the notification
        opens the redirect URL below.
      </p>

      <form onSubmit={handleSubmit} style={{ marginTop: "1rem" }}>
        <div className="form-field">
          <label htmlFor="broadcast-title">Title</label>
          <input
            id="broadcast-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. New Free Fire accounts just dropped!"
            maxLength={65}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="broadcast-message">Message</label>
          <textarea
            id="broadcast-message"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="e.g. Fresh verified accounts added — check them out before they're gone."
            rows={3}
            maxLength={200}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="broadcast-url">Redirect URL</label>
          <input
            id="broadcast-url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="/  (defaults to the homepage)"
          />
        </div>
        <div className="form-field">
          <label htmlFor="broadcast-image">Image URL (optional)</label>
          <input
            id="broadcast-image"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://..."
          />
        </div>

        {error && <p className="error-text">{error}</p>}
        {result && (
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Sent to {result.sent} of {result.total} subscribers
            {result.failed > 0 ? ` (${result.failed} expired subscriptions were cleaned up)` : ""}.
          </p>
        )}

        <button className="btn" type="submit" disabled={sending || !title.trim() || !message.trim()}>
          <Send size={16} />
          {sending ? "Sending..." : "Send Broadcast"}
        </button>
      </form>

      {confirmOpen && (
        <ConfirmDialog
          title="Send this notification to everyone?"
          message="This immediately pushes a real notification to every subscribed device — there's no undo."
          confirmLabel="Send Broadcast"
          danger={false}
          onConfirm={handleConfirmSend}
          onCancel={() => setConfirmOpen(false)}
        />
      )}

      <div style={{ borderTop: "1px solid var(--border)", margin: "1.5rem 0 1rem" }} />

      <h3 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <BellRing size={17} />
        Notification Log
      </h3>
      <p className="muted" style={{ marginTop: "0.3rem", fontSize: "0.85rem" }}>
        Every push notification sent so far — broadcasts, new-message alerts to admin, and reply alerts to buyers.
      </p>

      {logs === null && <p className="muted">Loading...</p>}
      {logs && logs.length === 0 && <p className="muted">No push notifications have been sent yet.</p>}
      {logs && logs.length > 0 && (
        <table className="admin-table" style={{ marginTop: "0.75rem" }}>
          <thead>
            <tr>
              <th>Type</th>
              <th>Title</th>
              <th>Sent</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{TYPE_LABELS[log.type] || log.type}</td>
                <td>{log.title}</td>
                <td>
                  {log.sent}/{log.total}
                  {log.failed > 0 ? <span className="muted"> ({log.failed} failed)</span> : ""}
                </td>
                <td className="muted">{new Date(log.createdAt).toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
