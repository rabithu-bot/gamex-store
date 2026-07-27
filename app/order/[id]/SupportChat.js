"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Paperclip, X, BadgeCheck } from "lucide-react";
import Lightbox from "@/app/components/Lightbox";

const TYPING_PING_INTERVAL_MS = 2000;

export default function SupportChat({ orderId, messages, buyerName, onSend, onSaveName }) {
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);
  const [supportName, setSupportName] = useState("Support");
  const fileInputRef = useRef(null);
  const lastTypingPingRef = useRef(0);

  useEffect(() => {
    fetch("/api/settings/support-name")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.name && setSupportName(data.name));
  }, []);

  // This component only mounts once the buyer has actually opened Contact
  // Support, so "rendered with something unread" already means "viewing" —
  // marks admin's messages read so the admin side can show a "seen" tick.
  useEffect(() => {
    if (messages.some((m) => m.sender === "admin" && !m.readAt)) {
      fetch(`/api/orders/${orderId}/read`, { method: "POST" }).catch(() => {});
    }
  }, [orderId, messages]);

  function pingTyping() {
    const now = Date.now();
    if (now - lastTypingPingRef.current < TYPING_PING_INTERVAL_MS) return;
    lastTypingPingRef.current = now;
    fetch(`/api/orders/${orderId}/typing`, { method: "POST" }).catch(() => {});
  }

  function quotePreview(message) {
    if (!message) return null;
    if (message.attachmentType === "audio") return "🎤 Voice message";
    if (message.attachmentPath && !message.body) return "📷 Photo";
    return message.body;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if ((!text.trim() && !file) || sending) return;
    setSending(true);
    await onSend(text.trim(), file);
    setText("");
    setFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSending(false);
  }

  async function handleSaveName(e) {
    e.preventDefault();
    if (!nameInput.trim() || savingName) return;
    setSavingName(true);
    await onSaveName(nameInput.trim());
    setSavingName(false);
  }

  if (!buyerName) {
    return (
      <div className="panel">
        <h3 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          <MessageCircle size={18} />
          Contact Support
        </h3>
        <p className="muted">What&apos;s your name? We&apos;ll use it to address you in chat.</p>
        <form onSubmit={handleSaveName} style={{ display: "flex", gap: "0.5rem", marginTop: "0.6rem" }}>
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            autoFocus
            style={{ flex: 1 }}
          />
          <button className="btn" type="submit" disabled={savingName || !nameInput.trim()}>
            {savingName ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="panel">
      <h3 style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
        <MessageCircle size={18} />
        Contact Support
      </h3>
      <p className="muted">Regarding Order #{orderId}</p>

      {messages.length > 0 && (
        <div className="chat-thread">
          {messages.map((m) => {
            const original = m.replyToId ? messages.find((msg) => msg.id === m.replyToId) : null;
            return (
              <div key={m.id} className={`chat-bubble ${m.sender}`}>
                <span className="chat-sender">
                  {m.sender === "admin" ? (
                    <>
                      {supportName} <BadgeCheck size={13} className="verified-badge" />
                    </>
                  ) : (
                    "You"
                  )}
                </span>
                {original && (
                  <div className="chat-quote-block">
                    <span className="chat-quote-sender">
                      {original.sender === "admin" ? supportName : "You"}
                    </span>
                    <span className="chat-quote-text">{quotePreview(original)}</span>
                  </div>
                )}
                {m.attachmentPath && m.attachmentType === "audio" ? (
                  // eslint-disable-next-line jsx-a11y/media-has-caption
                  <audio controls src={m.attachmentPath} className="chat-audio-attachment" />
                ) : (
                  m.attachmentPath && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.attachmentPath}
                      alt="Attachment"
                      className="chat-attachment"
                      onClick={() => setZoomSrc(m.attachmentPath)}
                    />
                  )
                )}
                {m.body && <p>{m.body}</p>}
              </div>
            );
          })}
        </div>
      )}

      {file && (
        <div className="chat-attachment-preview">
          <span className="muted">{file.name}</span>
          <button type="button" onClick={() => { setFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
            <X size={14} />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="chat-form">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button
          type="button"
          className="chat-attach-btn"
          aria-label="Attach image"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip size={16} />
        </button>
        <input
          type="text"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            pingTyping();
          }}
          placeholder="Type your message..."
          autoFocus
        />
        <button className="btn" type="submit" disabled={sending || (!text.trim() && !file)}>
          Send
        </button>
      </form>

      {zoomSrc && <Lightbox src={zoomSrc} alt="Attachment" onClose={() => setZoomSrc(null)} />}
    </div>
  );
}
