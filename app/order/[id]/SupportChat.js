"use client";

import { useEffect, useRef, useState } from "react";
import { MessageCircle, Paperclip, X, BadgeCheck } from "lucide-react";
import Lightbox from "@/app/components/Lightbox";
import VoiceMessagePlayer from "@/app/components/VoiceMessagePlayer";
import ReactionPicker from "@/app/components/ReactionPicker";

const TYPING_PING_INTERVAL_MS = 2000;
const LONG_PRESS_MS = 2000;
const LONG_PRESS_MOVE_CANCEL_PX = 10;

export default function SupportChat({ orderId, messages, buyerName, onSend, onSaveName, onReact }) {
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);
  const [supportName, setSupportName] = useState("Support");
  const [activeMenu, setActiveMenu] = useState(null); // { messageId, x, y }
  const fileInputRef = useRef(null);
  const lastTypingPingRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef(null);

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

  useEffect(() => () => clearTimeout(longPressTimerRef.current), []);

  function pingTyping() {
    const now = Date.now();
    if (now - lastTypingPingRef.current < TYPING_PING_INTERVAL_MS) return;
    lastTypingPingRef.current = now;
    fetch(`/api/orders/${orderId}/typing`, { method: "POST" }).catch(() => {});
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function openMenuAt(messageId, clientX, clientY) {
    const estimatedWidth = 160;
    const estimatedHeight = 70;
    const x = Math.max(8, Math.min(clientX, window.innerWidth - estimatedWidth - 8));
    const y = Math.max(8, Math.min(clientY, window.innerHeight - estimatedHeight - 8));
    setActiveMenu({ messageId, x, y });
  }

  function handleBubblePointerDown(e, messageId) {
    longPressStartRef.current = { x: e.clientX, y: e.clientY };
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      openMenuAt(messageId, e.clientX, e.clientY);
    }, LONG_PRESS_MS);
  }

  function handleBubblePointerMove(e) {
    if (!longPressTimerRef.current || !longPressStartRef.current) return;
    const dx = e.clientX - longPressStartRef.current.x;
    const dy = e.clientY - longPressStartRef.current.y;
    if (Math.hypot(dx, dy) > LONG_PRESS_MOVE_CANCEL_PX) clearLongPressTimer();
  }

  function handleBubbleContextMenu(e, messageId) {
    e.preventDefault();
    openMenuAt(messageId, e.clientX, e.clientY);
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
              <div
                key={m.id}
                className={`chat-bubble ${m.sender}`}
                onPointerDown={(e) => handleBubblePointerDown(e, m.id)}
                onPointerMove={handleBubblePointerMove}
                onPointerUp={clearLongPressTimer}
                onPointerLeave={clearLongPressTimer}
                onPointerCancel={clearLongPressTimer}
                onContextMenu={(e) => handleBubbleContextMenu(e, m.id)}
              >
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
                  <VoiceMessagePlayer src={m.attachmentPath} />
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
                {m.reaction && <span className="dm-message-reaction">{m.reaction}</span>}
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

      {activeMenu && (
        <ReactionPicker
          x={activeMenu.x}
          y={activeMenu.y}
          currentReaction={messages.find((m) => m.id === activeMenu.messageId)?.reaction}
          onReact={(emoji) => {
            onReact(activeMenu.messageId, emoji);
            setActiveMenu(null);
          }}
          onClose={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
}
