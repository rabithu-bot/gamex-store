"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, Paperclip, X, Trash2, Send } from "lucide-react";
import Lightbox from "@/app/components/Lightbox";
import QuickRepliesMenu from "@/app/mafia/QuickRepliesMenu";

function initials(name) {
  return (name || "?").trim().slice(0, 2).toUpperCase();
}

function formatTime(iso) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

const MAX_SUGGESTIONS = 5;

export default function ChatThread({ orderId }) {
  const [order, setOrder] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replyFile, setReplyFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);
  const [quickReplies, setQuickReplies] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const fileInputRef = useRef(null);
  const bottomRef = useRef(null);

  const fetchOrder = useCallback(async () => {
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    if (!res.ok) return;
    const orders = await res.json();
    const found = orders.find((o) => o.id === orderId);
    if (found) setOrder(found);
    else setNotFound(true);
  }, [orderId]);

  const fetchQuickReplies = useCallback(async () => {
    const res = await fetch("/api/admin/quick-replies", { cache: "no-store" });
    if (res.ok) setQuickReplies(await res.json());
  }, []);

  useEffect(() => {
    fetchOrder();
    fetchQuickReplies();
    const interval = setInterval(fetchOrder, 4000);
    return () => clearInterval(interval);
  }, [fetchOrder, fetchQuickReplies]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [order?.messages?.length]);

  const suggestions = useMemo(() => {
    const q = replyText.trim().toLowerCase();
    if (!q || !showSuggestions) return [];
    return quickReplies.filter((r) => r.text.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [replyText, quickReplies, showSuggestions]);

  async function handleReply(e) {
    e.preventDefault();
    if ((!replyText.trim() && !replyFile) || !order) return;
    setSending(true);
    const formData = new FormData();
    formData.set("body", replyText.trim());
    if (replyFile) formData.set("attachment", replyFile);
    await fetch(`/api/admin/orders/${order.id}/messages`, { method: "POST", body: formData });
    setReplyText("");
    setReplyFile(null);
    setShowSuggestions(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await fetchOrder();
    setSending(false);
  }

  async function handleDeleteMessage(messageId) {
    if (!order) return;
    await fetch(`/api/admin/orders/${order.id}/messages/${messageId}`, { method: "DELETE" });
    fetchOrder();
  }

  async function handleDeleteConversation() {
    if (!order) return;
    if (!confirm("Delete this entire conversation? This cannot be undone.")) return;
    await fetch(`/api/admin/orders/${order.id}/messages`, { method: "DELETE" });
    window.location.href = "/mafia?tab=messages";
  }

  async function handleAddQuickReply(text) {
    await fetch("/api/admin/quick-replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    fetchQuickReplies();
  }

  async function handleDeleteQuickReply(id) {
    await fetch(`/api/admin/quick-replies/${id}`, { method: "DELETE" });
    fetchQuickReplies();
  }

  if (notFound) {
    return (
      <div className="admin-chat-page">
        <div className="admin-chat-header">
          <Link href="/mafia?tab=messages" className="admin-chat-back">
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

  return (
    <div className="admin-chat-page">
      <div className="admin-chat-header">
        <Link href="/mafia?tab=messages" className="admin-chat-back">
          <ArrowLeft size={18} />
          Back
        </Link>
        <span className="dm-avatar">{initials(customerName)}</span>
        <div className="admin-chat-header-info">
          <strong>{customerName}</strong>
          <span className="muted">
            {order.listingTitle} • Order #{order.id}
          </span>
        </div>
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
        {order.messages.map((m) => (
          <div
            key={m.id}
            className={`admin-chat-bubble-row ${m.sender === "admin" ? "sent" : "received"}`}
          >
            <div className={`admin-chat-bubble ${m.sender === "admin" ? "sent" : "received"}`}>
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
              <button
                type="button"
                className="dm-delete-message"
                aria-label="Delete message"
                onClick={() => handleDeleteMessage(m.id)}
              >
                <Trash2 size={12} />
              </button>
            </div>
            <span className="admin-chat-timestamp">{formatTime(m.createdAt)}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

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

      <div className="chat-form-wrap">
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

        <form onSubmit={handleReply} className="admin-chat-dock">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={(e) => setReplyFile(e.target.files?.[0] || null)}
          />
          <button
            type="button"
            className="chat-attach-btn"
            aria-label="Attach image"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip size={16} />
          </button>
          <QuickRepliesMenu
            replies={quickReplies}
            onAdd={handleAddQuickReply}
            onDelete={handleDeleteQuickReply}
            onPick={(text) => {
              setReplyText(text);
              setShowSuggestions(false);
            }}
          />
          <input
            type="text"
            className="admin-chat-input"
            value={replyText}
            onChange={(e) => {
              setReplyText(e.target.value);
              setShowSuggestions(true);
            }}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Message..."
          />
          <button
            className="admin-chat-send"
            type="submit"
            disabled={sending || (!replyText.trim() && !replyFile)}
            aria-label="Send"
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {zoomSrc && <Lightbox src={zoomSrc} alt="Attachment" onClose={() => setZoomSrc(null)} />}
    </div>
  );
}
