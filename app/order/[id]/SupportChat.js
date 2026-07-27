"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Paperclip, X, BadgeCheck } from "lucide-react";
import Lightbox from "@/app/components/Lightbox";

export default function SupportChat({ orderId, messages, buyerName, onSend, onSaveName }) {
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);
  const [supportName, setSupportName] = useState("Support");
  const fileInputRef = useRef(null);

  useEffect(() => {
    fetch("/api/settings/support-name")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => data?.name && setSupportName(data.name));
  }, []);

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
          {messages.map((m) => (
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
              {m.attachmentPath && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.attachmentPath}
                  alt="Attachment"
                  className="chat-attachment"
                  onClick={() => setZoomSrc(m.attachmentPath)}
                />
              )}
              {m.body && <p>{m.body}</p>}
            </div>
          ))}
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
          onChange={(e) => setText(e.target.value)}
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
