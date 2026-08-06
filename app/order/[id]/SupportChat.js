"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldCheck,
  Paperclip,
  X,
  Mic,
  Square,
  Send,
  Check,
  CheckCheck,
  Video as VideoIcon,
  BellRing,
} from "lucide-react";
import Lightbox from "@/app/components/Lightbox";
import VoiceMessagePlayer from "@/app/components/VoiceMessagePlayer";
import ReactionPicker from "@/app/components/ReactionPicker";
import EnableNotifications from "@/app/components/EnableNotifications";
import { pickSupportedRecordingMimeType, extensionForMime } from "@/app/lib/audioMime";
import { formatDayDivider, isNewDay, formatTime } from "@/app/lib/chatDate";
import { isAdminOnline } from "@/app/lib/onlineStatus";
import { uploadVideoAttachment } from "@/app/lib/videoUpload";
import { subscribeToPush, hasActivePushSubscription, isPushSupported } from "@/app/lib/pushClient";

function isVideoFile(file) {
  return Boolean(file?.type?.startsWith("video/"));
}

const TYPING_PING_INTERVAL_MS = 2000;
const TYPING_STALE_MS = 4000;
const LONG_PRESS_MS = 1000;
const LONG_PRESS_MOVE_CANCEL_PX = 10;

function initials(name) {
  return (name || "?").trim().slice(0, 2).toUpperCase();
}

function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Mirrors the admin's ChatThread.js — same full-screen DM layout, bubble
// styling, and read-tick/typing/online conventions, just with the buyer's
// own messages taking the "sent" (right-aligned) slot instead of the
// admin's, and none of the admin-only moderation tools (tag picker,
// delete-conversation, quick replies, unsend).
export default function SupportChat({
  orderId,
  listingTitle,
  messages,
  buyerName,
  adminTypingAt,
  adminLastSeenAt,
  onSend,
  onSaveName,
  onReact,
  onEditMessage,
}) {
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [text, setText] = useState("");
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [file, setFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [sending, setSending] = useState(false);
  const [notifyBanner, setNotifyBanner] = useState(null); // "prompt" | "blocked" | null
  const [zoomSrc, setZoomSrc] = useState(null);
  const [supportName, setSupportName] = useState("Support");
  const [activeMenu, setActiveMenu] = useState(null); // { messageId, x, y }
  const [now, setNow] = useState(() => Date.now());
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
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

  // Drives the typing indicator's staleness check between poll ticks — the
  // order data itself only refreshes every 1.5s, but "is this still recent
  // enough to count as typing" needs to keep re-evaluating every second.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  // Instagram/WhatsApp-style auto-growing composer, matching the admin's.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [text]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const isAdminTyping = useMemo(() => {
    if (!adminTypingAt) return false;
    return now - new Date(adminTypingAt).getTime() < TYPING_STALE_MS;
  }, [adminTypingAt, now]);

  const adminOnline = useMemo(() => isAdminOnline(adminLastSeenAt, now), [adminLastSeenAt, now]);

  function pingTyping() {
    const ts = Date.now();
    if (ts - lastTypingPingRef.current < TYPING_PING_INTERVAL_MS) return;
    lastTypingPingRef.current = ts;
    fetch(`/api/orders/${orderId}/typing`, { method: "POST" }).catch(() => {});
  }

  // Re-checked after every message send rather than just once on mount —
  // if the customer hasn't granted notifications yet (dismissed the first
  // auto-prompt, or explicitly blocked it), keep nudging them each time
  // they send something, since that's exactly the moment they'd most want
  // to know we can reply while they're gone. Stops the instant they're
  // actually subscribed and never comes back after that.
  async function checkAndPromptNotifications() {
    if (!isPushSupported()) return;
    if (await hasActivePushSubscription()) {
      setNotifyBanner(null);
      return;
    }
    if (Notification.permission === "denied") {
      setNotifyBanner("blocked");
      return;
    }
    const result = await subscribeToPush(`/api/orders/${orderId}/push/subscribe`);
    setNotifyBanner(result.ok ? null : result.reason === "denied" ? "blocked" : "prompt");
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
    if (message.attachmentType === "video" && !message.body) return "🎥 Video";
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
    setAttachmentError("");
    setSending(true);

    if (isVideoFile(attachment)) {
      const result = await uploadVideoAttachment(`/api/orders/${orderId}/messages/video-url`, attachment);
      if (!result.ok) {
        setAttachmentError(result.error);
        setSending(false);
        return;
      }
      await onSend(text.trim(), null, { file: attachment, publicUrl: result.publicUrl });
    } else {
      await onSend(text.trim(), attachment);
    }

    setText("");
    setFile(null);
    setAudioBlob(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setSending(false);
    checkAndPromptNotifications();
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
      <div className="admin-chat-page">
        <div className="admin-chat-header">
          <Link href={`/order/${orderId}`} className="admin-chat-back">
            <ArrowLeft size={18} />
            Back
          </Link>
          <span className="dm-avatar-wrap">
            <span className="dm-avatar">{initials(supportName)}</span>
          </span>
          <div className="admin-chat-header-info">
            <strong>{supportName}</strong>
            <span className="muted">
              {listingTitle} • Order #{orderId}
            </span>
          </div>
        </div>
        <div className="admin-chat-body" style={{ alignItems: "center", justifyContent: "center" }}>
          <div style={{ width: "100%", maxWidth: 320 }}>
            <p className="muted" style={{ textAlign: "center", marginBottom: "0.75rem" }}>
              What&apos;s your name? We&apos;ll use it to address you in chat.
            </p>
            <form onSubmit={handleSaveName} style={{ display: "flex", gap: "0.5rem" }}>
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
        </div>
      </div>
    );
  }

  return (
    <div className="admin-chat-page">
      <div className="admin-chat-header">
        <Link href={`/order/${orderId}`} className="admin-chat-back">
          <ArrowLeft size={18} />
          Back
        </Link>
        <span className="dm-avatar-wrap">
          <span className="dm-avatar">{initials(supportName)}</span>
          {adminOnline && <span className="dm-online-dot" role="img" aria-label="Online now" />}
        </span>
        <div className="admin-chat-header-info">
          <strong>{supportName}</strong>
          {adminOnline ? (
            <span className="chat-online-text">Online</span>
          ) : (
            <span className="muted">
              {listingTitle} • Order #{orderId}
            </span>
          )}
        </div>
        <span className="admin-chat-header-notify">
          <EnableNotifications apiPath={`/api/orders/${orderId}/push/subscribe`} />
        </span>
      </div>

      <div className="admin-chat-body">
        {messages.length === 0 && (
          <div className="chat-empty-state">
            <ShieldCheck size={26} />
            <strong>No messages yet</strong>
            <p className="muted">
              Send us a message below and our support team will get back to you shortly.
            </p>
          </div>
        )}
        {messages.map((m, i) => {
          const original = m.replyToId ? messages.find((msg) => msg.id === m.replyToId) : null;
          const showDayDivider = isNewDay(m.createdAt, messages[i - 1]?.createdAt);
          const mine = m.sender === "buyer"; // the buyer's own messages sit in the "sent" slot
          return (
            <Fragment key={m.id}>
              {showDayDivider && (
                <div className="chat-day-divider">
                  <span>{formatDayDivider(m.createdAt)}</span>
                </div>
              )}
              <div className={`admin-chat-bubble-row ${mine ? "sent" : "received"}`}>
                <div
                  className={`admin-chat-bubble ${mine ? "sent" : "received"}`}
                  onPointerDown={(e) => handleBubblePointerDown(e, m.id)}
                  onPointerMove={handleBubblePointerMove}
                  onPointerUp={clearLongPressTimer}
                  onPointerLeave={clearLongPressTimer}
                  onPointerCancel={clearLongPressTimer}
                  onContextMenu={(e) => handleBubbleContextMenu(e, m.id)}
                >
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
                  ) : m.attachmentPath && m.attachmentType === "video" ? (
                    <video src={m.attachmentPath} controls className="chat-attachment chat-attachment-video" />
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
                  {m.body && (
                    <p>
                      {m.body}
                      <span className="admin-chat-timestamp">
                        {m.editedAt && m.sender === "buyer" && <span className="chat-edited-label">edited</span>}
                        {formatTime(m.createdAt)}
                        {mine && (
                          <span
                            className={`chat-read-tick${m.readAt ? " seen" : ""}`}
                            title={m.readAt ? "Seen" : "Sent"}
                          >
                            {m.readAt ? <CheckCheck size={13} /> : <Check size={13} />}
                          </span>
                        )}
                      </span>
                    </p>
                  )}
                  {!m.body && (
                    <span className="admin-chat-timestamp admin-chat-timestamp-standalone">
                      {formatTime(m.createdAt)}
                      {mine && (
                        <span
                          className={`chat-read-tick${m.readAt ? " seen" : ""}`}
                          title={m.readAt ? "Seen" : "Sent"}
                        >
                          {m.readAt ? <CheckCheck size={13} /> : <Check size={13} />}
                        </span>
                      )}
                    </span>
                  )}
                  {m.reaction && <span className="dm-message-reaction">{m.reaction}</span>}
                </div>
              </div>
            </Fragment>
          );
        })}
        {isAdminTyping && (
          <div className="admin-chat-bubble-row received">
            <div className="admin-chat-bubble received chat-typing-bubble">
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
              <span className="chat-typing-dot" />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

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

      {attachmentError && (
        <div className="chat-mic-error">
          {attachmentError}
          <button type="button" onClick={() => setAttachmentError("")} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {file && (
        <div className="chat-attachment-preview">
          {isVideoFile(file) && <VideoIcon size={14} />}
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

      {notifyBanner && (
        <div className="chat-notify-nudge">
          <BellRing size={16} />
          <span>
            {notifyBanner === "blocked"
              ? "Notifications are blocked — enable them in your browser's site settings to get instant replies."
              : "Enable notifications to get instant replies, even if you close this tab."}
          </span>
          <button type="button" onClick={() => setNotifyBanner(null)} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      <div className="chat-form-wrap">
        {micError && (
          <div className="chat-mic-error">
            {micError}
            <button type="button" onClick={() => setMicError("")} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        {recording ? (
          <div className="admin-chat-dock chat-recording-dock">
            <span className="chat-recording-dot" />
            <span className="chat-recording-timer">{formatSeconds(recordingSeconds)}</span>
            <span className="muted" style={{ flex: 1 }}>
              Recording voice message...
            </span>
            <button
              type="button"
              className="admin-chat-send"
              aria-label="Stop recording"
              onClick={handleStopRecording}
            >
              <Square size={15} fill="currentColor" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="admin-chat-dock">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              style={{ display: "none" }}
              onChange={(e) => {
                const picked = e.target.files?.[0] || null;
                if (picked && isVideoFile(picked) && picked.size > 50 * 1024 * 1024) {
                  setAttachmentError("Video must be under 50MB.");
                  e.target.value = "";
                  return;
                }
                setAttachmentError("");
                setFile(picked);
                setAudioBlob(null);
              }}
            />
            <textarea
              ref={textareaRef}
              rows={1}
              className="admin-chat-input"
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                pingTyping();
              }}
              placeholder="Message..."
              enterKeyHint="enter"
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
            {text.trim() || file || audioBlob || editingMessageId ? (
              <button className="admin-chat-send" type="submit" disabled={sending} aria-label="Send">
                <Send size={16} />
              </button>
            ) : (
              <button
                type="button"
                className="admin-chat-send"
                aria-label="Record voice message"
                onClick={handleStartRecording}
              >
                <Mic size={16} />
              </button>
            )}
          </form>
        )}
      </div>

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
