"use client";

import { Fragment, useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Paperclip,
  X,
  Trash2,
  Send,
  Mic,
  Square,
  CornerUpLeft,
  Check,
  CheckCheck,
} from "lucide-react";
import Lightbox from "@/app/components/Lightbox";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import VoiceMessagePlayer from "@/app/components/VoiceMessagePlayer";
import MessageUnsendMenu from "@/app/mafia/MessageUnsendMenu";
import CustomerTagPicker from "@/app/mafia/CustomerTagPicker";
import { useVisiblePolling } from "@/app/lib/useVisiblePolling";
import { pickSupportedRecordingMimeType, extensionForMime } from "@/app/lib/audioMime";
import { formatDayDivider, isNewDay, formatTime } from "@/app/lib/chatDate";
import { isBuyerOnline } from "@/app/lib/onlineStatus";

const POLL_INTERVAL_MS = 1500;
const TYPING_PING_INTERVAL_MS = 2000;
const LONG_PRESS_MS = 1000;
const LONG_PRESS_MOVE_CANCEL_PX = 10;
const SWIPE_TRIGGER_PX = 50;
const SWIPE_MAX_PX = 72;
const TYPING_STALE_MS = 4000;

function initials(name) {
  return (name || "?").trim().slice(0, 2).toUpperCase();
}

function formatSeconds(total) {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const MAX_SUGGESTIONS = 5;

export default function ChatThread({ orderId }) {
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyFile, setReplyFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState("");
  const [sending, setSending] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);
  const [quickReplies, setQuickReplies] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // { messageId, x, y }
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [swipeState, setSwipeState] = useState(null); // { id, offset }
  const [now, setNow] = useState(() => Date.now());
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const bottomRef = useRef(null);
  const lastTypingPingRef = useRef(0);
  const longPressTimerRef = useRef(null);
  const longPressStartRef = useRef(null);
  const swipeStartRef = useRef(null);
  const lastPointerTypeRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recordingIntervalRef = useRef(null);
  const createdObjectUrlsRef = useRef(new Set());

  const fetchOrder = useCallback(async () => {
    const res = await fetch(`/api/admin/orders/${orderId}`, { cache: "no-store" });
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (!res.ok) return;
    setOrder(await res.json());
  }, [orderId]);

  const fetchQuickReplies = useCallback(async () => {
    const res = await fetch("/api/admin/quick-replies", { cache: "no-store" });
    if (res.ok) setQuickReplies(await res.json());
  }, []);

  useVisiblePolling(fetchOrder, POLL_INTERVAL_MS);

  useEffect(() => {
    fetchQuickReplies();
  }, [fetchQuickReplies]);

  // This screen only mounts once the admin has actually opened the
  // conversation — mirrors the buyer's own /read call so the messages list
  // can show "unread" based on whether the admin has viewed the buyer's
  // messages, not just whether the admin has replied yet.
  useEffect(() => {
    if (order?.messages.some((m) => m.sender === "buyer" && !m.readAt)) {
      fetch(`/api/admin/orders/${orderId}/read`, { method: "POST" }).catch(() => {});
    }
  }, [orderId, order?.messages]);

  // Drives the typing indicator's staleness check between poll ticks — the
  // order data itself only refreshes every 1.5s, but "is this still recent
  // enough to count as typing" needs to keep re-evaluating every second.
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => () => clearTimeout(longPressTimerRef.current), []);
  useEffect(() => () => clearInterval(recordingIntervalRef.current), []);

  // Guards against leaving the mic "on" (the browser's recording indicator
  // stays lit) if the admin navigates away mid-recording — the client-side
  // route change unmounts this component without ever reaching
  // recorder.onstop, which is otherwise the only place the stream's tracks
  // get stopped.
  useEffect(
    () => () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  // Instagram/WhatsApp-style auto-growing composer — runs on every text
  // change (typing, a quick-reply suggestion filling it in, or clearing
  // after send) rather than just on keystrokes.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [replyText]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [order?.messages?.length]);

  // One object URL per recorded blob, revoked whenever it's replaced or the
  // component unmounts — recreating it on every render would both leak
  // memory and reset the player's playback state each time.
  const audioBlobUrl = useMemo(() => (audioBlob ? URL.createObjectURL(audioBlob) : null), [audioBlob]);
  useEffect(() => {
    return () => {
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, [audioBlobUrl]);

  const isBuyerTyping = useMemo(() => {
    if (!order?.buyerTypingAt) return false;
    return now - new Date(order.buyerTypingAt).getTime() < TYPING_STALE_MS;
  }, [order?.buyerTypingAt, now]);

  const buyerOnline = useMemo(
    () => isBuyerOnline(order?.buyerLastSeenAt, now),
    [order?.buyerLastSeenAt, now]
  );

  // Instagram-style: matches only the specific saved keyword for the word
  // currently being typed, not any substring of the reply's full body.
  const suggestions = useMemo(() => {
    if (!showSuggestions) return [];
    const words = replyText.trim().toLowerCase().split(/\s+/);
    const q = words[words.length - 1] || "";
    // Only match within the first 7 letters of the keyword being typed —
    // once you're past that, it's clearly not a shortcut anymore.
    if (!q || q.length > 7) return [];
    return quickReplies
      .filter((r) => r.keyword && r.keyword.toLowerCase().startsWith(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [replyText, quickReplies, showSuggestions]);

  // Drives the mic <-> send morph on the composer's trailing button — mic
  // while there's nothing to send yet, send the moment there's text or an
  // attachment queued up.
  const hasComposerContent = Boolean(replyText.trim() || replyFile || audioBlob);

  function startEditMessage(message) {
    if (!message) return;
    setEditingMessageId(message.id);
    setReplyText(message.body || "");
    setReplyFile(null);
    setAudioBlob(null);
    setReplyTarget(null);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setReplyText("");
  }

  async function handleReply(e) {
    e?.preventDefault();
    const trimmed = replyText.trim();
    if (!order || sending) return;

    if (editingMessageId) {
      if (!trimmed) return;
      const idToEdit = editingMessageId;
      setOrder((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === idToEdit ? { ...m, body: trimmed, editedAt: new Date().toISOString() } : m
              ),
            }
          : prev
      );
      setEditingMessageId(null);
      setReplyText("");
      setSending(true);
      await fetch(`/api/admin/orders/${order.id}/messages/${idToEdit}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      await fetchOrder();
      setSending(false);
      return;
    }

    if (!trimmed && !replyFile && !audioBlob) return;

    const formData = new FormData();
    formData.set("body", trimmed);
    let optimisticAttachmentPath = null;
    let optimisticAttachmentType = null;
    if (audioBlob) {
      const ext = extensionForMime(audioBlob.type);
      formData.set("attachment", audioBlob, `voice-${Date.now()}.${ext}`);
      optimisticAttachmentPath = URL.createObjectURL(audioBlob);
      optimisticAttachmentType = "audio";
    } else if (replyFile) {
      formData.set("attachment", replyFile);
      optimisticAttachmentPath = URL.createObjectURL(replyFile);
      optimisticAttachmentType = "image";
    }
    if (optimisticAttachmentPath) createdObjectUrlsRef.current.add(optimisticAttachmentPath);
    const replyToId = replyTarget?.id ?? null;
    if (replyToId) formData.set("replyToId", String(replyToId));

    // Optimistic insert — the bubble appears and the composer clears
    // instantly instead of waiting on the round trip + a full refetch. The
    // next poll tick swaps this placeholder out for the real row (it never
    // sticks around since fetchOrder() replaces the whole messages array).
    setOrder((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: -Date.now(),
                sender: "admin",
                body: trimmed,
                attachmentPath: optimisticAttachmentPath,
                attachmentType: optimisticAttachmentType,
                replyToId,
                readAt: null,
                createdAt: new Date().toISOString(),
              },
            ],
          }
        : prev
    );
    setReplyText("");
    setReplyFile(null);
    setAudioBlob(null);
    setReplyTarget(null);
    setShowSuggestions(false);
    if (fileInputRef.current) fileInputRef.current.value = "";

    setSending(true);
    await fetch(`/api/admin/orders/${order.id}/messages`, { method: "POST", body: formData });
    await fetchOrder();
    setSending(false);
  }

  async function handleDeleteMessage(messageId) {
    if (!order) return;
    // Optimistic: drop it from the local list immediately so unsending feels
    // instant, then let the next poll tick reconcile with the server. If the
    // request fails, worst case the message reappears a few seconds later —
    // never a phantom deletion, so no rollback bookkeeping is needed.
    setOrder((prev) => (prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== messageId) } : prev));
    await fetch(`/api/admin/orders/${order.id}/messages/${messageId}`, { method: "DELETE" });
    fetchOrder();
  }

  async function handleReact(messageId, emoji) {
    if (!order) return;
    const current = order.messages.find((m) => m.id === messageId)?.reaction;
    const next = current === emoji ? null : emoji; // tapping the same emoji again clears it
    setOrder((prev) =>
      prev
        ? { ...prev, messages: prev.messages.map((m) => (m.id === messageId ? { ...m, reaction: next } : m)) }
        : prev
    );
    await fetch(`/api/admin/orders/${order.id}/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction: next }),
    });
    fetchOrder();
  }

  function pingTyping() {
    const now = Date.now();
    if (now - lastTypingPingRef.current < TYPING_PING_INTERVAL_MS) return;
    lastTypingPingRef.current = now;
    fetch(`/api/admin/orders/${orderId}/typing`, { method: "POST" }).catch(() => {});
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function openMenuAt(messageId, clientX, clientY) {
    const estimatedWidth = 160;
    const estimatedHeight = 96;
    const x = Math.max(8, Math.min(clientX, window.innerWidth - estimatedWidth - 8));
    const y = Math.max(8, Math.min(clientY, window.innerHeight - estimatedHeight - 8));
    setActiveMenu({ messageId, x, y });
  }

  function startReply(message) {
    setReplyTarget(message);
  }

  function handleBubblePointerDown(e, message) {
    lastPointerTypeRef.current = e.pointerType;
    if (e.pointerType === "mouse") return; // desktop uses right-click (menu) + the hover reply icon instead
    swipeStartRef.current = { x: e.clientX, y: e.clientY, id: message.id };
    longPressStartRef.current = { x: e.clientX, y: e.clientY };
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      openMenuAt(message.id, e.clientX, e.clientY);
      swipeStartRef.current = null;
      setSwipeState(null);
    }, LONG_PRESS_MS);
  }

  function handleBubblePointerMove(e) {
    if (longPressTimerRef.current && longPressStartRef.current) {
      const dx0 = e.clientX - longPressStartRef.current.x;
      const dy0 = e.clientY - longPressStartRef.current.y;
      if (Math.hypot(dx0, dy0) > LONG_PRESS_MOVE_CANCEL_PX) clearLongPressTimer();
    }
    if (!swipeStartRef.current) return;
    const dx = e.clientX - swipeStartRef.current.x;
    const dy = e.clientY - swipeStartRef.current.y;
    if (dx <= 4 || Math.abs(dy) > Math.abs(dx)) {
      setSwipeState(null);
      return;
    }
    setSwipeState({ id: swipeStartRef.current.id, offset: Math.min(dx, SWIPE_MAX_PX) });
  }

  function handleBubblePointerEnd(message) {
    clearLongPressTimer();
    setSwipeState((prev) => {
      if (prev && prev.id === message.id && prev.offset >= SWIPE_TRIGGER_PX) {
        startReply(message);
      }
      return null;
    });
    swipeStartRef.current = null;
  }

  function handleBubbleContextMenu(e, messageId) {
    e.preventDefault();
    // A genuine desktop right-click reports button 2; a touch device's own
    // native long-press-triggers-contextmenu behavior reports button 0 — we
    // want to ignore that second case since our pointer-based timer above
    // already handles touch long-press.
    if (e.button === 2 || lastPointerTypeRef.current === "mouse") {
      openMenuAt(messageId, e.clientX, e.clientY);
    }
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
      setReplyFile(null);
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

  function handleDeleteConversation() {
    if (!order) return;
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteConversation() {
    if (!order) return;
    await fetch(`/api/admin/orders/${order.id}/messages`, { method: "DELETE" });
    window.location.href = "/mafia/messages";
  }

  if (notFound) {
    return (
      <div className="admin-chat-page">
        <div className="admin-chat-header">
          <Link href="/mafia/messages" className="admin-chat-back">
            <ArrowLeft size={18} />
            Back
          </Link>
        </div>
        <p className="muted" style={{ padding: "1rem" }}>
          Conversation not found.
        </p>
      </div>
    );
  }

  if (!order) return <div className="admin-chat-page" />;

  const customerName = order.buyerName || "Buyer";

  function quotePreview(message) {
    if (!message) return null;
    if (message.attachmentType === "audio") return "🎤 Voice message";
    if (message.attachmentPath && !message.body) return "📷 Photo";
    return message.body;
  }

  return (
    <div className="admin-chat-page">
      <div className="admin-chat-header">
        <Link href="/mafia/messages" className="admin-chat-back">
          <ArrowLeft size={18} />
          Back
        </Link>
        <span className="dm-avatar-wrap">
          <span className="dm-avatar">{initials(customerName)}</span>
          {buyerOnline && <span className="dm-online-dot" role="img" aria-label="Online now" />}
        </span>
        <div className="admin-chat-header-info">
          <strong>{customerName}</strong>
          {buyerOnline ? (
            <span className="chat-online-text">Online</span>
          ) : (
            <span className="muted">
              {order.listingTitle} • Order #{order.id}
            </span>
          )}
        </div>
        <CustomerTagPicker
          orderId={order.id}
          tag={order.tag}
          onChanged={(tag) => setOrder((prev) => (prev ? { ...prev, tag } : prev))}
        />
        <button
          type="button"
          className="dm-delete-conversation"
          aria-label="Delete conversation"
          onClick={handleDeleteConversation}
        >
          <Trash2 size={16} />
        </button>
      </div>

      <div className="admin-chat-body">
        {order.messages.length === 0 && (
          <p className="muted" style={{ textAlign: "center" }}>
            No messages yet.
          </p>
        )}
        {order.messages.map((m, i) => {
          const original = m.replyToId ? order.messages.find((msg) => msg.id === m.replyToId) : null;
          const dragging = swipeState?.id === m.id;
          const showDayDivider = isNewDay(m.createdAt, order.messages[i - 1]?.createdAt);
          return (
            <Fragment key={m.id}>
            {showDayDivider && (
              <div className="chat-day-divider">
                <span>{formatDayDivider(m.createdAt)}</span>
              </div>
            )}
            <div className={`admin-chat-bubble-row ${m.sender === "admin" ? "sent" : "received"}`}>
              {!dragging && (
                <button
                  type="button"
                  className="chat-reply-hover-btn"
                  aria-label="Reply"
                  onClick={() => startReply(m)}
                >
                  <CornerUpLeft size={14} />
                </button>
              )}
              <div
                className={`admin-chat-bubble ${m.sender === "admin" ? "sent" : "received"}`}
                style={{
                  transform: dragging ? `translateX(${swipeState.offset}px)` : undefined,
                  transition: dragging ? "none" : undefined,
                }}
                onPointerDown={(e) => handleBubblePointerDown(e, m)}
                onPointerMove={handleBubblePointerMove}
                onPointerUp={() => handleBubblePointerEnd(m)}
                onPointerLeave={() => handleBubblePointerEnd(m)}
                onPointerCancel={() => handleBubblePointerEnd(m)}
                onContextMenu={(e) => handleBubbleContextMenu(e, m.id)}
              >
                {original && (
                  <div className="chat-quote-block">
                    <span className="chat-quote-sender">{original.sender === "admin" ? "You" : customerName}</span>
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
                    <span className="admin-chat-timestamp">
                      {/* Admin's own edits stay silent — only surface the "edited"
                          label when the buyer edited their own message. */}
                      {m.editedAt && m.sender === "buyer" && <span className="chat-edited-label">edited</span>}
                      {formatTime(m.createdAt)}
                      {m.sender === "admin" && (
                        <span className={`chat-read-tick${m.readAt ? " seen" : ""}`} title={m.readAt ? "Seen" : "Sent"}>
                          {m.readAt ? <CheckCheck size={13} /> : <Check size={13} />}
                        </span>
                      )}
                    </span>
                  </p>
                )}
                {!m.body && (
                  <span className="admin-chat-timestamp admin-chat-timestamp-standalone">
                    {formatTime(m.createdAt)}
                    {m.sender === "admin" && (
                      <span className={`chat-read-tick${m.readAt ? " seen" : ""}`} title={m.readAt ? "Seen" : "Sent"}>
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
        {isBuyerTyping && (
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

      {replyTarget && (
        <div className="chat-reply-preview">
          <div className="chat-reply-preview-bar" />
          <div className="chat-reply-preview-content">
            <span className="chat-reply-preview-label">
              Replying to {replyTarget.sender === "admin" ? "yourself" : customerName}
            </span>
            <span className="chat-reply-preview-text">{quotePreview(replyTarget)}</span>
          </div>
          <button type="button" onClick={() => setReplyTarget(null)} aria-label="Cancel reply">
            <X size={14} />
          </button>
        </div>
      )}

      {replyFile && (
        <div className="chat-attachment-preview">
          <span className="muted">{replyFile.name}</span>
          <button
            type="button"
            onClick={() => {
              setReplyFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
          >
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

      <div className="chat-form-wrap">
        {micError && (
          <div className="chat-mic-error">
            {micError}
            <button type="button" onClick={() => setMicError("")} aria-label="Dismiss">
              <X size={14} />
            </button>
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="quick-reply-suggestions">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                className="quick-reply-suggestion"
                onClick={() => {
                  setReplyText(s.text);
                  setShowSuggestions(false);
                }}
              >
                {s.text}
              </button>
            ))}
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
          <form onSubmit={handleReply} className="admin-chat-dock">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                setReplyFile(e.target.files?.[0] || null);
                setAudioBlob(null);
              }}
            />
            <textarea
              ref={textareaRef}
              rows={1}
              className="admin-chat-input"
              value={replyText}
              onChange={(e) => {
                setReplyText(e.target.value);
                setShowSuggestions(true);
                pingTyping();
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
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
            {hasComposerContent || editingMessageId ? (
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
        <MessageUnsendMenu
          x={activeMenu.x}
          y={activeMenu.y}
          currentReaction={order.messages.find((m) => m.id === activeMenu.messageId)?.reaction}
          canEdit={order.messages.find((m) => m.id === activeMenu.messageId)?.sender === "admin"}
          onReact={(emoji) => {
            handleReact(activeMenu.messageId, emoji);
            setActiveMenu(null);
          }}
          onCopy={() => {
            const target = order.messages.find((m) => m.id === activeMenu.messageId);
            if (target?.body) navigator.clipboard?.writeText(target.body);
            setActiveMenu(null);
          }}
          onEdit={() => {
            startEditMessage(order.messages.find((m) => m.id === activeMenu.messageId));
            setActiveMenu(null);
          }}
          onUnsend={() => {
            handleDeleteMessage(activeMenu.messageId);
            setActiveMenu(null);
          }}
          onClose={() => setActiveMenu(null)}
        />
      )}

      {deleteConfirmOpen && (
        <ConfirmDialog
          title="Delete this conversation?"
          message="This cannot be undone — every message in this thread will be permanently deleted."
          confirmLabel="Delete"
          onConfirm={() => {
            setDeleteConfirmOpen(false);
            confirmDeleteConversation();
          }}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      )}
    </div>
  );
}
