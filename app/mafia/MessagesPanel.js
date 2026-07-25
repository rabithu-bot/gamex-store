"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Paperclip, X, Trash2, Send, Pencil, Check } from "lucide-react";
import Lightbox from "@/app/components/Lightbox";
import QuickRepliesMenu from "./QuickRepliesMenu";

function truncate(text, max) {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function initials(name) {
  return (name || "?").trim().slice(0, 2).toUpperCase();
}

function relativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

const MAX_SUGGESTIONS = 5;

export default function MessagesPanel() {
  const [orders, setOrders] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyFile, setReplyFile] = useState(null);
  const [sending, setSending] = useState(false);
  const [zoomSrc, setZoomSrc] = useState(null);
  const [quickReplies, setQuickReplies] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [supportName, setSupportName] = useState("Support");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);
  const fileInputRef = useRef(null);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    if (res.ok) setOrders(await res.json());
  }, []);

  const fetchQuickReplies = useCallback(async () => {
    const res = await fetch("/api/admin/quick-replies", { cache: "no-store" });
    if (res.ok) setQuickReplies(await res.json());
  }, []);

  const fetchSupportName = useCallback(async () => {
    const res = await fetch("/api/settings/support-name", { cache: "no-store" });
    if (res.ok) setSupportName((await res.json()).name);
  }, []);

  useEffect(() => {
    fetchOrders();
    fetchQuickReplies();
    fetchSupportName();
    const interval = setInterval(fetchOrders, 4000);
    return () => clearInterval(interval);
  }, [fetchOrders, fetchQuickReplies, fetchSupportName]);

  function startEditingName() {
    setNameInput(supportName);
    setEditingName(true);
  }

  async function handleSaveName(e) {
    e.preventDefault();
    if (!nameInput.trim() || savingName) return;
    setSavingName(true);
    const res = await fetch("/api/admin/settings/support-name", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: nameInput.trim() }),
    });
    if (res.ok) {
      setSupportName((await res.json()).name);
      setEditingName(false);
    }
    setSavingName(false);
  }

  const conversations = useMemo(() => {
    if (!orders) return [];
    return orders
      .filter((o) => o.messages.length > 0)
      .sort((a, b) => {
        const aLast = a.messages[a.messages.length - 1].createdAt;
        const bLast = b.messages[b.messages.length - 1].createdAt;
        return new Date(bLast) - new Date(aLast);
      });
  }, [orders]);

  useEffect(() => {
    if (selectedId === null && conversations.length > 0) {
      setSelectedId(conversations[0].id);
    }
  }, [conversations, selectedId]);

  const selected = conversations.find((o) => o.id === selectedId) || null;

  const suggestions = useMemo(() => {
    const q = replyText.trim().toLowerCase();
    if (!q || !showSuggestions) return [];
    return quickReplies.filter((r) => r.text.toLowerCase().includes(q)).slice(0, MAX_SUGGESTIONS);
  }, [replyText, quickReplies, showSuggestions]);

  async function handleReply(e) {
    e.preventDefault();
    if ((!replyText.trim() && !replyFile) || !selected) return;
    setSending(true);
    const formData = new FormData();
    formData.set("body", replyText.trim());
    if (replyFile) formData.set("attachment", replyFile);
    await fetch(`/api/admin/orders/${selected.id}/messages`, {
      method: "POST",
      body: formData,
    });
    setReplyText("");
    setReplyFile(null);
    setShowSuggestions(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
    await fetchOrders();
    setSending(false);
  }

  async function handleDeleteMessage(messageId) {
    if (!selected) return;
    await fetch(`/api/admin/orders/${selected.id}/messages/${messageId}`, { method: "DELETE" });
    fetchOrders();
  }

  async function handleDeleteConversation() {
    if (!selected) return;
    if (!confirm("Delete this entire conversation? This cannot be undone.")) return;
    await fetch(`/api/admin/orders/${selected.id}/messages`, { method: "DELETE" });
    setSelectedId(null);
    fetchOrders();
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

  function customerName(order) {
    return order.buyerName || "Buyer";
  }

  const supportNameControl = (
    <div className="support-name-control">
      <span className="muted">Customers see you as</span>
      {editingName ? (
        <form onSubmit={handleSaveName} className="support-name-form">
          <input
            type="text"
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            maxLength={30}
            autoFocus
          />
          <button type="submit" className="support-name-save" disabled={savingName || !nameInput.trim()} aria-label="Save">
            <Check size={14} />
          </button>
        </form>
      ) : (
        <button type="button" className="support-name-edit" onClick={startEditingName}>
          <strong>{supportName}</strong>
          <Pencil size={12} />
        </button>
      )}
    </div>
  );

  if (!orders) return <p className="muted">Loading messages...</p>;
  if (conversations.length === 0) {
    return (
      <div>
        {supportNameControl}
        <p className="muted">No support conversations yet.</p>
      </div>
    );
  }

  return (
    <div>
      {supportNameControl}
      <div className="messages-layout">
      <div className="messages-list">
        {conversations.map((order) => {
          const last = order.messages[order.messages.length - 1];
          const unread = last.sender === "buyer";
          return (
            <button
              key={order.id}
              className={`messages-list-item ${order.id === selectedId ? "active" : ""}`}
              onClick={() => setSelectedId(order.id)}
            >
              <span className="dm-avatar">{initials(customerName(order))}</span>
              <span className="dm-list-body">
                <span className="dm-list-top">
                  <strong>{customerName(order)}</strong>
                  <span className="dm-time">{relativeTime(last.createdAt)}</span>
                </span>
                <span className="muted dm-preview-listing">{order.listingTitle}</span>
                <span className={`muted dm-preview ${unread ? "unread" : ""}`}>
                  {last.sender === "admin" ? "You: " : ""}
                  {last.attachmentPath && !last.body ? "📷 Photo" : truncate(last.body, 36)}
                </span>
              </span>
              {unread && <span className="dm-unread-dot" />}
            </button>
          );
        })}
      </div>

      <div className="messages-thread">
        {selected && (
          <>
            <div className="dm-thread-header">
              <span className="dm-avatar">{initials(customerName(selected))}</span>
              <div>
                <h3 style={{ marginBottom: 0 }}>{customerName(selected)}</h3>
                <span className="muted">
                  Order #{selected.id} · {selected.listingTitle}
                </span>{" "}
                <span className={`status-pill ${selected.status}`}>{selected.status}</span>
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

            <div className="chat-thread" style={{ maxHeight: 360 }}>
              {selected.messages.map((m) => (
                <div key={m.id} className={`chat-bubble dm-bubble ${m.sender === "admin" ? "self" : "them"}`}>
                  <span className="chat-sender">{m.sender === "admin" ? "You" : customerName(selected)}</span>
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
              ))}
            </div>

            {replyFile && (
              <div className="chat-attachment-preview">
                <span className="muted">{replyFile.name}</span>
                <button type="button" onClick={() => { setReplyFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
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

              <form onSubmit={handleReply} className="chat-form">
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
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="Reply to buyer..."
                />
                <button className="btn" type="submit" disabled={sending || (!replyText.trim() && !replyFile)}>
                  <Send size={14} />
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      {zoomSrc && <Lightbox src={zoomSrc} alt="Attachment" onClose={() => setZoomSrc(null)} />}
      </div>
    </div>
  );
}
