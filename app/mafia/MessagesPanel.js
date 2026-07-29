"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Check, Pencil } from "lucide-react";
import CustomerTagBadge from "./CustomerTagBadge";
import { useVisiblePolling } from "@/app/lib/useVisiblePolling";

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

export default function MessagesPanel() {
  const [orders, setOrders] = useState(null);
  const [supportName, setSupportName] = useState("Support");
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [savingName, setSavingName] = useState(false);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    if (res.ok) setOrders(await res.json());
  }, []);

  const fetchSupportName = useCallback(async () => {
    const res = await fetch("/api/settings/support-name", { cache: "no-store" });
    if (res.ok) setSupportName((await res.json()).name);
  }, []);

  useVisiblePolling(fetchOrders, 4000);

  useEffect(() => {
    fetchSupportName();
  }, [fetchSupportName]);

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
        // Tagged customers (VIP/Priority/Booked) always pin above untagged
        // ones, regardless of who messaged most recently.
        const aTagged = Boolean(a.tag);
        const bTagged = Boolean(b.tag);
        if (aTagged !== bTagged) return aTagged ? -1 : 1;
        const aLast = a.messages[a.messages.length - 1].createdAt;
        const bLast = b.messages[b.messages.length - 1].createdAt;
        return new Date(bLast) - new Date(aLast);
      });
  }, [orders]);

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

  if (!orders) {
    return (
      <div>
        {supportNameControl}
        <div className="panel-skeleton-list">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="panel-skeleton-row avatar">
              <div className="skeleton panel-skeleton-circle" />
              <div className="panel-skeleton-lines">
                <div className="skeleton panel-skeleton-line short" />
                <div className="skeleton panel-skeleton-line" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {supportNameControl}
      {conversations.length === 0 ? (
        <p className="muted">No support conversations yet.</p>
      ) : (
        <div className="messages-list">
          {conversations.map((order) => {
            const last = order.messages[order.messages.length - 1];
            const unread = last.sender === "buyer" && !last.readAt;
            return (
              <Link
                key={order.id}
                href={`/mafia/messages/${order.id}`}
                className="messages-list-item"
              >
                <span className="dm-avatar">{initials(customerName(order))}</span>
                <span className="dm-list-body">
                  <span className="dm-list-top">
                    <span className="dm-list-name-group">
                      <strong>{customerName(order)}</strong>
                      {order.tag && <CustomerTagBadge tag={order.tag} />}
                    </span>
                    <span className="dm-time">{relativeTime(last.createdAt)}</span>
                  </span>
                  <span className="muted dm-preview-listing">{order.listingTitle}</span>
                  <span className={`muted dm-preview ${unread ? "unread" : ""}`}>
                    {last.sender === "admin" ? "You: " : ""}
                    {last.attachmentPath && !last.body ? "📷 Photo" : truncate(last.body, 36)}
                  </span>
                </span>
                {unread && (
                  <span className="dm-unread-dot" role="img" aria-label="Unread message" />
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
