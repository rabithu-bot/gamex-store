"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { MessageCircle, Paperclip, X, BadgeCheck, Mic, Square } from "lucide-react";
import Lightbox from "@/app/components/Lightbox";
import VoiceMessagePlayer from "@/app/components/VoiceMessagePlayer";
import ReactionPicker from "@/app/components/ReactionPicker";
import { pickSupportedRecordingMimeType, extensionForMime } from "@/app/lib/audioMime";
import { formatDayDivider, isNewDay, formatTime } from "@/app/lib/chatDate";

const TYPING_PING_INTERVAL_MS = 2000;
const LONG_PRESS_MS = 1000;
const LONG_PRESS_MOVE_CANCEL_PX = 10;

function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function SupportChat({ orderId, messages, buyerName, onSend, onSaveName, onReact, onEditMessage }) {
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [text, setText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [file, setFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState("");
  const [sending, setSending] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);
  const [supportName, setSupportName] = useState("Support");
  const [activeMenu, setActiveMenu] = useState(null); // { messageId, x, y }
  const fileInputRef = useRef(null);
  const lastTypingPingRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);

  // One object URL per recorded blob, revoked whenever it's replaced or the
  // component unmounts — recreating it on every render would both leak
  // memory and reset the player's playback state each time.
  const audioBlobUrl = useMemo(() => (audioBlob ? URL.createObjectURL(audioBlob) : null), [audioBlob]);
  useEffect(() => {
    return () => {
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, [audioBlobUrl]);

  // Releases the mic if the buyer navigates away mid-recording — without
  // this, leaving the page unmounts the component without ever reaching
  // recorder.onstop, and the browser's mic indicator stays lit.
  useEffect(() => () => mediaStreamRef.current?.getTracks().forEach((t) => t.stop()), []);
  useEffect(() => () => clearInterval(recordingIntervalRef.current), []);

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

  async function handleStartRecording() {
    setMicError("");
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setMicError("Microphone access is needed to record a voice message.");
      return;
    }
    mediaStreamRef.current = stream;
    try {
      const mimeType = pickSupportedRecordingMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordedChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
        const blob = new Blob(recordedChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        setAudioBlob(blob);
        mediaRecorderRef.current = null;
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setRecording(true);
      setRecordingSeconds(0);
      recordingIntervalRef.current = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
      setMicError("Your browser doesn't support voice recording.");
    }
  }

  function handleStopRecording() {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    } catch {
      // Already stopped/errored — the stream is still released via
      // mediaStreamRef in the unmount cleanup effect regardless.
    }
    clearInterval(recordingIntervalRef.current);
    setRecording(false);
  }

  function startEditMessage(message) {
    if (!message) return;
    setEditingMessageId(message.id);
    setText(message.body || "");
    setFile(null);
    setAudioBlob(null);
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setText("");
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (editingMessageId) {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      const idToEdit = editingMessageId;
      setEditingMessageId(null);
      setText("");
      setSending(true);
      await onEditMessage(idToEdit, trimmed);
      setSending(false);
      return;
    }

    const attachment = audioBlob
      ? new File([audioBlob], `voice-${Date.now()}.${extensionForMime(audioBlob.type)}`, {
          type: audioBlob.type || "audio/webm",
        })
      : file;
    if ((!text.trim() && !attachment) || sending) return;
    setSending(true);
    await onSend(text.trim(), attachment);
    setText("");
    setFile(null);
    setAudioBlob(null);
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
          {messages.map((m, i) => {
            const original = m.replyToId ? messages.find((msg) => msg.id === m.replyToId) : null;
            const showDayDivider = isNewDay(m.createdAt, messages[i - 1]?.createdAt);
            return (
              <Fragment key={m.id}>
              {showDayDivider && (
                <div className="chat-day-divider">
                  <span>{formatDayDivider(m.createdAt)}</span>
                </div>
              )}
              <div
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
                  m.attachmentPath &&
                  (m.attachmentPath.startsWith("blob:") ? (
                    // Optimistic send — a local object URL standing in until
                    // the real S3 URL comes back from the next poll tick.
                    // next/image can't optimize a blob: URL, so this one
                    // stays a plain <img> for its brief moment on screen.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={m.attachmentPath}
                      alt="Attachment"
                      className="chat-attachment"
                      onClick={() => setZoomSrc(m.attachmentPath)}
                    />
                  ) : (
                    <Image
                      src={m.attachmentPath}
                      alt="Attachment"
                      className="chat-attachment"
                      width={200}
                      height={200}
                      style={{ height: "auto" }}
                      sizes="200px"
                      onClick={() => setZoomSrc(m.attachmentPath)}
                    />
                  ))
                )}
                {/* Timestamp lives inside the same paragraph as the last
                    word so it floats into the bottom-right corner and wraps
                    with the text, instead of owning a separate full-width
                    row under the message. */}
                {m.body && (
                  <p>
                    {m.body}
                    <span className="chat-timestamp">
                      {m.editedAt && m.sender === "buyer" && <span className="chat-edited-label">edited</span>}
                      {formatTime(m.createdAt)}
                    </span>
                  </p>
                )}
                {!m.body && (
                  <span className="chat-timestamp chat-timestamp-standalone">{formatTime(m.createdAt)}</span>
                )}
                {m.reaction && <span className="dm-message-reaction">{m.reaction}</span>}
              </div>
              </Fragment>
            );
          })}
        </div>
      )}

      {editingMessageId && (
        <div className="chat-reply-preview">
          <div className="chat-reply-preview-bar" />
          <div className="chat-reply-preview-content">
            <span className="chat-reply-preview-label">Editing message</span>
          </div>
          <button type="button" onClick={cancelEdit} aria-label="Cancel edit">
            <X size={14} />
          </button>
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

      {audioBlob && !recording && (
        <div className="chat-attachment-preview">
          <VoiceMessagePlayer src={audioBlobUrl} />
          <button type="button" onClick={() => setAudioBlob(null)} aria-label="Discard voice message">
            <X size={14} />
          </button>
        </div>
      )}

      {micError && (
        <div className="chat-mic-error">
          {micError}
          <button type="button" onClick={() => setMicError("")} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {recording ? (
        <div className="chat-form chat-recording-dock">
          <span className="chat-recording-dot" />
          <span className="chat-recording-timer">{formatSeconds(recordingSeconds)}</span>
          <span className="muted" style={{ flex: 1 }}>
            Recording voice message...
          </span>
          <button
            type="button"
            className="chat-attach-btn"
            aria-label="Stop recording"
            onClick={handleStopRecording}
          >
            <Square size={15} fill="currentColor" />
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="chat-form">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => {
              setFile(e.target.files?.[0] || null);
              setAudioBlob(null);
            }}
          />
          {!editingMessageId && (
            <button
              type="button"
              className="chat-attach-btn"
              aria-label="Attach image"
              onClick={() => fileInputRef.current?.click()}
            >
              <Paperclip size={16} />
            </button>
          )}
          {!editingMessageId && !text.trim() && !file && !audioBlob && (
            <button
              type="button"
              className="chat-attach-btn"
              aria-label="Record voice message"
              onClick={handleStartRecording}
            >
              <Mic size={16} />
            </button>
          )}
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
          <button className="btn" type="submit" disabled={sending || (!text.trim() && !file && !audioBlob)}>
            Send
          </button>
        </form>
      )}

      {zoomSrc && <Lightbox src={zoomSrc} alt="Attachment" onClose={() => setZoomSrc(null)} />}

      {activeMenu && (
        <ReactionPicker
          x={activeMenu.x}
          y={activeMenu.y}
          currentReaction={messages.find((m) => m.id === activeMenu.messageId)?.reaction}
          canEdit={messages.find((m) => m.id === activeMenu.messageId)?.sender === "buyer"}
          onReact={(emoji) => {
            onReact(activeMenu.messageId, emoji);
            setActiveMenu(null);
          }}
          onCopy={() => {
            const target = messages.find((m) => m.id === activeMenu.messageId);
            if (target?.body) navigator.clipboard?.writeText(target.body);
            setActiveMenu(null);
          }}
          onEdit={() => {
            startEditMessage(messages.find((m) => m.id === activeMenu.messageId));
            setActiveMenu(null);
          }}
          onClose={() => setActiveMenu(null)}
        />
      )}
    </div>
  );
}
