"use client";

import { Fragment, useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
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
  Video as VideoIcon,
  Share2,
} from "lucide-react";
import Lightbox from "@/app/components/Lightbox";
import ConfirmDialog from "@/app/components/ConfirmDialog";
import VoiceMessagePlayer from "@/app/components/VoiceMessagePlayer";
import MessageUnsendMenu from "@/app/mafia/MessageUnsendMenu";
import CustomerTagPicker from "@/app/mafia/CustomerTagPicker";
import QuickShareModal from "@/app/mafia/QuickShareModal";
import { useVisiblePolling } from "@/app/lib/useVisiblePolling";
import { pickSupportedRecordingMimeType, extensionForMime } from "@/app/lib/audioMime";
import { formatDayDivider, isNewDay, formatTime } from "@/app/lib/chatDate";
import { isBuyerOnline } from "@/app/lib/onlineStatus";
import { uploadVideoAttachment } from "@/app/lib/videoUpload";
import { getCachedThread, setCachedThread } from "@/app/mafia/chatCache";

function isVideoFile(file) {
  return Boolean(file?.type?.startsWith("video/"));
}

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

// Same chat UI/interactions as the single-order ChatThread, but the data
// source is every order this buyer (by persistent session id) has ever
// placed, merged into one chronological thread — this is the admin-facing
// "one conversation per person" view (see the API route for why). Every
// message still belongs to a real order underneath (m.orderId); replying
// targets whichever order is currently "selected" (defaults to the most
// recent), and edit/react/unsend calls always use a message's own real
// order, never the selected one — nothing about ownership changes, this
// component just displays and composes across more than one order at once.
export default function CustomerChatThread({ sessionId }) {
  const cacheKey = `customer:${sessionId}`;
  // Renders whatever was last cached for this customer immediately on
  // mount (e.g. warmed by the inbox's background prefetch) instead of a
  // blank shell — fetchData below still runs right away to refresh it.
  const [data, setData] = useState(() => getCachedThread(cacheKey));
  const [notFound, setNotFound] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(
    () => getCachedThread(cacheKey)?.orders[0]?.id ?? null
  );
  const [replyText, setReplyText] = useState("");
  const [replyFile, setReplyFile] = useState(null);
  const [audioBlob, setAudioBlob] = useState(null);
  const [replyTarget, setReplyTarget] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null); // { id, orderId }
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [micError, setMicError] = useState("");
  const [attachmentError, setAttachmentError] = useState("");
  const [sending, setSending] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);
  const [quickReplies, setQuickReplies] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null); // { messageId, orderId, x, y }
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [swipeState, setSwipeState] = useState(null); // { id, offset }
  const [now, setNow] = useState(() => Date.now());
  const [quickShareOpen, setQuickShareOpen] = useState(false);
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

  const fetchData = useCallback(async () => {
    const res = await fetch(`/api/admin/customers/${sessionId}`, { cache: "no-store" });
    if (res.status === 404) {
      setNotFound(true);
      return;
    }
    if (!res.ok) return;
    const json = await res.json();
    setData(json);
    setCachedThread(cacheKey, json);
    // Keep whatever the admin already picked if it's still valid; otherwise
    // (first load, or that order somehow vanished) fall back to the most
    // recent one — orders are already sorted newest-first by the API.
    setSelectedOrderId((prev) => (prev && json.orders.some((o) => o.id === prev) ? prev : json.orders[0]?.id ?? null));
  }, [sessionId, cacheKey]);

  const fetchQuickReplies = useCallback(async () => {
    const res = await fetch("/api/admin/quick-replies", { cache: "no-store" });
    if (res.ok) setQuickReplies(await res.json());
  }, []);

  useVisiblePolling(fetchData, POLL_INTERVAL_MS);

  useEffect(() => {
    fetchQuickReplies();
  }, [fetchQuickReplies]);

  // Mirrors the buyer's own /read call, but across every order this person
  // has — opening the merged view means the admin has seen all of it.
  useEffect(() => {
    if (data?.messages.some((m) => m.sender === "buyer" && !m.readAt)) {
      fetch(`/api/admin/customers/${sessionId}/read`, { method: "POST" }).catch(() => {});
    }
  }, [sessionId, data?.messages]);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => () => clearTimeout(longPressTimerRef.current), []);
  useEffect(() => () => clearInterval(recordingIntervalRef.current), []);

  useEffect(
    () => () => {
      mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
      createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    },
    []
  );

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [replyText]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [data?.messages?.length]);

  const audioBlobUrl = useMemo(() => (audioBlob ? URL.createObjectURL(audioBlob) : null), [audioBlob]);
  useEffect(() => {
    return () => {
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, [audioBlobUrl]);

  const isBuyerTyping = useMemo(() => {
    if (!data?.buyerTypingAt) return false;
    return now - new Date(data.buyerTypingAt).getTime() < TYPING_STALE_MS;
  }, [data?.buyerTypingAt, now]);

  const buyerOnline = useMemo(() => isBuyerOnline(data?.buyerLastSeenAt, now), [data?.buyerLastSeenAt, now]);

  const suggestions = useMemo(() => {
    if (!showSuggestions) return [];
    const words = replyText.trim().toLowerCase().split(/\s+/);
    const q = words[words.length - 1] || "";
    if (!q || q.length > 7) return [];
    return quickReplies
      .filter((r) => r.keyword && r.keyword.toLowerCase().startsWith(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [replyText, quickReplies, showSuggestions]);

  const hasComposerContent = Boolean(replyText.trim() || replyFile || audioBlob);
  const selectedOrder = data?.orders.find((o) => o.id === selectedOrderId) || null;

  function startEditMessage(message) {
    if (!message || message.sender !== "admin") return;
    setEditingMessage({ id: message.id, orderId: message.orderId });
    setReplyText(message.body || "");
    setReplyFile(null);
    setAudioBlob(null);
    setReplyTarget(null);
    setShowSuggestions(false);
    textareaRef.current?.focus();
  }

  function cancelEdit() {
    setEditingMessage(null);
    setReplyText("");
  }

  async function handleReply(e) {
    e?.preventDefault();
    const trimmed = replyText.trim();
    if (!data || !selectedOrderId || sending) return;

    if (editingMessage) {
      if (!trimmed) return;
      const { id: idToEdit, orderId: editOrderId } = editingMessage;
      setData((prev) =>
        prev
          ? {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === idToEdit ? { ...m, body: trimmed, editedAt: new Date().toISOString() } : m
              ),
            }
          : prev
      );
      setEditingMessage(null);
      setReplyText("");
      setSending(true);
      await fetch(`/api/admin/orders/${editOrderId}/messages/${idToEdit}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: trimmed }),
      });
      await fetchData();
      setSending(false);
      return;
    }

    if (!trimmed && !replyFile && !audioBlob) return;

    setAttachmentError("");
    setSending(true);

    let uploadedVideoUrl = null;
    if (replyFile && isVideoFile(replyFile)) {
      const result = await uploadVideoAttachment(
        `/api/admin/orders/${selectedOrderId}/messages/video-url`,
        replyFile
      );
      if (!result.ok) {
        setAttachmentError(result.error);
        setSending(false);
        return;
      }
      uploadedVideoUrl = result.publicUrl;
    }

    const formData = new FormData();
    formData.set("body", trimmed);
    let optimisticAttachmentPath = null;
    let optimisticAttachmentType = null;
    if (audioBlob) {
      const ext = extensionForMime(audioBlob.type);
      formData.set("attachment", audioBlob, `voice-${Date.now()}.${ext}`);
      optimisticAttachmentPath = URL.createObjectURL(audioBlob);
      optimisticAttachmentType = "audio";
    } else if (uploadedVideoUrl) {
      formData.set("attachmentUrl", uploadedVideoUrl);
      formData.set("attachmentType", "video");
      optimisticAttachmentPath = URL.createObjectURL(replyFile);
      optimisticAttachmentType = "video";
    } else if (replyFile) {
      formData.set("attachment", replyFile);
      optimisticAttachmentPath = URL.createObjectURL(replyFile);
      optimisticAttachmentType = "image";
    }
    if (optimisticAttachmentPath) createdObjectUrlsRef.current.add(optimisticAttachmentPath);
    const replyToId = replyTarget?.id ?? null;
    if (replyToId) formData.set("replyToId", String(replyToId));

    setData((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: -Date.now(),
                orderId: selectedOrderId,
                listingTitle: selectedOrder?.listingTitle,
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

    // finally, not a bare await pair: if the network drops mid-send the
    // fetch rejects, and without this `sending` stayed true forever — the
    // Send button silently dead until a full page reload.
    try {
      await fetch(`/api/admin/orders/${selectedOrderId}/messages`, { method: "POST", body: formData });
      await fetchData();
    } catch {
      setAttachmentError("Couldn't send that — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  async function handleDeleteMessage(message) {
    if (!data) return;
    setData((prev) => (prev ? { ...prev, messages: prev.messages.filter((m) => m.id !== message.id) } : prev));
    await fetch(`/api/admin/orders/${message.orderId}/messages/${message.id}`, { method: "DELETE" });
    fetchData();
  }

  async function handleReact(message, emoji) {
    if (!data) return;
    const next = message.reaction === emoji ? null : emoji;
    setData((prev) =>
      prev
        ? { ...prev, messages: prev.messages.map((m) => (m.id === message.id ? { ...m, reaction: next } : m)) }
        : prev
    );
    await fetch(`/api/admin/orders/${message.orderId}/messages/${message.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction: next }),
    });
    fetchData();
  }

  function pingTyping() {
    if (!selectedOrderId) return;
    const nowTs = Date.now();
    if (nowTs - lastTypingPingRef.current < TYPING_PING_INTERVAL_MS) return;
    lastTypingPingRef.current = nowTs;
    fetch(`/api/admin/orders/${selectedOrderId}/typing`, { method: "POST" }).catch(() => {});
  }

  function clearLongPressTimer() {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function openMenuAt(message, clientX, clientY) {
    const estimatedWidth = 160;
    const estimatedHeight = 96;
    const x = Math.max(8, Math.min(clientX, window.innerWidth - estimatedWidth - 8));
    const y = Math.max(8, Math.min(clientY, window.innerHeight - estimatedHeight - 8));
    setActiveMenu({ messageId: message.id, orderId: message.orderId, x, y });
  }

  function startReply(message) {
    setReplyTarget(message);
    // Replying to a message from an older order switches the composer's
    // target to that order too — answering something about a specific
    // purchase should land back on that purchase, not whatever was most
    // recently selected.
    setSelectedOrderId(message.orderId);
  }

  function insertQuickShareLink(link) {
    setReplyText((prev) => (prev.trim() ? `${prev.trim()} ${link}` : link));
    textareaRef.current?.focus();
  }

  async function sendQuickShareLink(link) {
    if (!data || !selectedOrderId || sending) return;
    setSending(true);

    setData((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: -Date.now(),
                orderId: selectedOrderId,
                listingTitle: selectedOrder?.listingTitle,
                sender: "admin",
                body: link,
                attachmentPath: null,
                attachmentType: null,
                replyToId: null,
                readAt: null,
                createdAt: new Date().toISOString(),
              },
            ],
          }
        : prev
    );

    const formData = new FormData();
    formData.set("body", link);
    try {
      await fetch(`/api/admin/orders/${selectedOrderId}/messages`, { method: "POST", body: formData });
      await fetchData();
    } catch {
      setAttachmentError("Couldn't send that link — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  function handleQuickShareSelect(link, opts) {
    if (opts?.send) {
      sendQuickShareLink(link);
    } else {
      insertQuickShareLink(link);
    }
  }

  function handleBubblePointerDown(e, message) {
    lastPointerTypeRef.current = e.pointerType;
    if (e.pointerType === "mouse") return;
    swipeStartRef.current = { x: e.clientX, y: e.clientY, id: message.id };
    longPressStartRef.current = { x: e.clientX, y: e.clientY };
    clearLongPressTimer();
    longPressTimerRef.current = setTimeout(() => {
      openMenuAt(message, e.clientX, e.clientY);
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

  function handleBubbleContextMenu(e, message) {
    e.preventDefault();
    if (e.button === 2 || lastPointerTypeRef.current === "mouse") {
      openMenuAt(message, e.clientX, e.clientY);
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
      // Already stopped/errored — released via mediaStreamRef's unmount cleanup regardless.
    }
    clearInterval(recordingIntervalRef.current);
    setRecording(false);
  }

  function handleDeleteConversation() {
    if (!selectedOrderId) return;
    setDeleteConfirmOpen(true);
  }

  async function confirmDeleteConversation() {
    if (!selectedOrderId) return;
    // Close first: ConfirmDialog doesn't disable its own confirm button, so
    // leaving it open across the round trip allowed double-submits, and any
    // throw in here left it stuck open with no way to dismiss.
    setDeleteConfirmOpen(false);
    try {
      await fetch(`/api/admin/orders/${selectedOrderId}/messages`, { method: "DELETE" });
    } finally {
      fetchData();
    }
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

  if (!data) return <div className="admin-chat-page" />;

  const customerName = data.buyerName || "Buyer";
  const messages = data.messages;

  function quotePreview(message) {
    if (!message) return null;
    if (message.attachmentType === "audio") return "🎤 Voice message";
    if (message.attachmentType === "video" && !message.body) return "🎥 Video";
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
              {data.orders.length} order{data.orders.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
        {selectedOrder && (
          <CustomerTagPicker
            orderId={selectedOrder.id}
            tag={selectedOrder.tag}
            onChanged={(tag) =>
              setData((prev) =>
                prev
                  ? { ...prev, orders: prev.orders.map((o) => (o.id === selectedOrder.id ? { ...o, tag } : o)) }
                  : prev
              )
            }
          />
        )}
        <button
          type="button"
          className="dm-delete-conversation"
          aria-label="Delete conversation"
          onClick={handleDeleteConversation}
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Stationary metadata bar — a normal-flow sibling of .admin-chat-body
          (which owns the only overflow-y:auto in this layout), sitting
          between the header and the scrollable message list. It never
          scrolls, shifts, or overlaps messages no matter where the thread
          is scrolled to, and this text line is deliberately the ONLY thing
          in it — no pills, no buttons, nothing that could be mistaken for
          the old per-message inline chips (removed entirely; switching
          which order a reply targets now happens only by swiping/tapping
          reply on one of that order's own messages). */}
      <div className="customer-order-header">
        <span className="customer-order-header-label">
          Replying about: <strong>{selectedOrder?.listingTitle || "—"}</strong> | Order ID:{" "}
          <strong>{selectedOrderId || "—"}</strong>
        </span>
      </div>

      <div className="admin-chat-body">
        {messages.length === 0 && (
          <p className="muted" style={{ textAlign: "center" }}>
            No messages yet.
          </p>
        )}
        {messages.map((m, i) => {
          const original = m.replyToId ? messages.find((msg) => msg.id === m.replyToId) : null;
          const dragging = swipeState?.id === m.id;
          const showDayDivider = isNewDay(m.createdAt, messages[i - 1]?.createdAt);
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
                  onContextMenu={(e) => handleBubbleContextMenu(e, m)}
                >
                  {original && (
                    <div className="chat-quote-block">
                      <span className="chat-quote-sender">{original.sender === "admin" ? "You" : customerName}</span>
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

      {editingMessage && (
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

      {attachmentError && (
        <div className="chat-mic-error">
          {attachmentError}
          <button type="button" onClick={() => setAttachmentError("")} aria-label="Dismiss">
            <X size={14} />
          </button>
        </div>
      )}

      {replyFile && (
        <div className="chat-attachment-preview">
          {isVideoFile(replyFile) && <VideoIcon size={14} />}
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
                setReplyFile(picked);
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
            {!editingMessage && (
              <button
                type="button"
                className="chat-attach-btn"
                aria-label="Quick share"
                onClick={() => setQuickShareOpen(true)}
              >
                <Share2 size={16} />
              </button>
            )}
            {!editingMessage && (
              <button
                type="button"
                className="chat-attach-btn"
                aria-label="Attach image"
                onClick={() => fileInputRef.current?.click()}
              >
                <Paperclip size={16} />
              </button>
            )}
            {hasComposerContent || editingMessage ? (
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

      {quickShareOpen && (
        <QuickShareModal onSelect={handleQuickShareSelect} onClose={() => setQuickShareOpen(false)} />
      )}

      {activeMenu && (
        <MessageUnsendMenu
          x={activeMenu.x}
          y={activeMenu.y}
          currentReaction={messages.find((m) => m.id === activeMenu.messageId)?.reaction}
          canEdit={messages.find((m) => m.id === activeMenu.messageId)?.sender === "admin"}
          onReact={(emoji) => {
            const target = messages.find((m) => m.id === activeMenu.messageId);
            if (target) handleReact(target, emoji);
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
          onUnsend={() => {
            const target = messages.find((m) => m.id === activeMenu.messageId);
            if (target) handleDeleteMessage(target);
            setActiveMenu(null);
          }}
          onClose={() => setActiveMenu(null)}
        />
      )}

      {deleteConfirmOpen && (
        <ConfirmDialog
          title="Delete this order's messages?"
          message={`This deletes every message in "${selectedOrder?.listingTitle}" (order #${selectedOrderId}) only — this cannot be undone. The rest of this customer's orders are unaffected.`}
          confirmLabel="Delete"
          onConfirm={confirmDeleteConversation}
          onCancel={() => setDeleteConfirmOpen(false)}
        />
      )}
    </div>
  );
}
