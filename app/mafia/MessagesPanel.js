"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { Check, Pencil } from "lucide-react";
import CustomerTagBadge from "./CustomerTagBadge";
import { useVisiblePolling } from "@/app/lib/useVisiblePolling";
import { isBuyerOnline } from "@/app/lib/onlineStatus";
import { setCachedThread, shouldPrefetch, markPrefetched } from "@/app/mafia/chatCache";

// How many of the most-recently-active conversations get warmed in the
// background while the admin is just sitting on the inbox — enough that
// clicking into any of the ones actually near the top feels instant,
// without quietly fetching the admin's entire message history every poll.
const PREFETCH_COUNT = 8;

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

  // Warms the cache for the most-recently-active conversations while the
  // admin is just browsing the inbox, so opening any of them renders
  // instantly from cache instead of waiting on a fresh round trip — see
  // ChatThread/CustomerChatThread reading from the same cache on mount.
  // Skips a conversation entirely if it's already cached with no newer
  // message since the last prefetch, so this doesn't refetch unchanged
  // threads on every 4s inbox poll.
  useEffect(() => {
    conversations.slice(0, PREFETCH_COUNT).forEach((conversation) => {
      const cacheKey = conversation.sessionId ? `customer:${conversation.sessionId}` : `order:${conversation.orderId}`;
      const latestAt = conversation.last.createdAt;
      if (!shouldPrefetch(cacheKey, latestAt)) return;
      markPrefetched(cacheKey, latestAt);

      const apiUrl = conversation.sessionId
        ? `/api/admin/customers/${conversation.sessionId}`
        : `/api/admin/orders/${conversation.orderId}`;
      fetch(apiUrl, { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : null))
        .then((json) => {
          if (json) setCachedThread(cacheKey, json);
        })
        .catch(() => {});
    });
  }, [conversations]);

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

  // Groups every order from the same buyer (their persistent
  // gamex_session_id) into one inbox row instead of one row per purchase —
  // so the same customer buying a second or third ID never splinters into
  // a separate thread in the admin panel. Orders from before this cookie
  // existed have no sessionId and just stay as their own standalone row,
  // exactly as they always have.
  const conversations = useMemo(() => {
    if (!orders) return [];
    const withMessages = orders.filter((o) => o.messages.length > 0);

    const groups = new Map();
    for (const order of withMessages) {
      const key = order.sessionId || `order-${order.id}`;
      if (!groups.has(key)) {
        groups.set(key, { key, sessionId: order.sessionId, orders: [] });
      }
      groups.get(key).orders.push(order);
    }

    const merged = Array.from(groups.values()).map((group) => {
      // Each order's `messages` here is just its latest message (see the
      // /api/admin/orders select) — recency across the group is still just
      // the max of those.
      const byRecency = [...group.orders].sort(
        (a, b) => new Date(b.messages[0].createdAt) - new Date(a.messages[0].createdAt)
      );
      const latestOrder = byRecency[0];
      const last = latestOrder.messages[0];
      const unread = group.orders.some((o) => {
        const m = o.messages[0];
        return m.sender === "buyer" && !m.readAt;
      });
      const tag = byRecency.find((o) => o.tag)?.tag || null;
      return {
        key: group.key,
        sessionId: group.sessionId,
        orderId: latestOrder.id,
        href: group.sessionId
          ? `/mafia/messages/customer/${group.sessionId}`
          : `/mafia/messages/${latestOrder.id}`,
        buyerName: latestOrder.buyerName,
        buyerLastSeenAt: byRecency.reduce(
          (max, o) => (o.buyerLastSeenAt && (!max || o.buyerLastSeenAt > max) ? o.buyerLastSeenAt : max),
          null
        ),
        notificationsEnabled: group.orders.some((o) => o.notificationsEnabled),
        tag,
        orderCount: group.orders.length,
        listingTitle: group.orders.length > 1 ? `${group.orders.length} orders` : latestOrder.listingTitle,
        last,
      };
    });

    return merged.sort((a, b) => {
      // Only jumps above normal recency sorting while a tagged customer
      // has a fresh, unread message waiting — once it's read/replied to,
      // it settles back into its normal spot by recency like anyone else.
      const aPriority = Boolean(a.tag) && a.last.sender === "buyer" && !a.last.readAt;
      const bPriority = Boolean(b.tag) && b.last.sender === "buyer" && !b.last.readAt;
      if (aPriority !== bPriority) return aPriority ? -1 : 1;
      return new Date(b.last.createdAt) - new Date(a.last.createdAt);
    });
  }, [orders]);

  function customerName(conversation) {
    return conversation.buyerName || "Buyer";
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
          {conversations.map((conversation) => {
            const { last } = conversation;
            const unread = last.sender === "buyer" && !last.readAt;
            return (
              <Link
                key={conversation.key}
                href={conversation.href}
                className="messages-list-item"
              >
                <span className="dm-avatar-wrap">
                  <span className="dm-avatar">{initials(customerName(conversation))}</span>
                  {isBuyerOnline(conversation.buyerLastSeenAt) && (
                    <span className="dm-online-dot" role="img" aria-label="Online now" />
                  )}
                </span>
                <span className="dm-list-body">
                  <span className="dm-list-top">
                    <span className="dm-list-name-group">
                      <strong>{customerName(conversation)}</strong>
                      <span
                        className={`notify-status-dot ${conversation.notificationsEnabled ? "on" : "off"}`}
                        title={conversation.notificationsEnabled ? "Notifications ON" : "Notifications OFF"}
                        role="img"
                        aria-label={
                          conversation.notificationsEnabled ? "Notifications enabled" : "Notifications disabled"
                        }
                      />
                      {conversation.tag && <CustomerTagBadge tag={conversation.tag} />}
                    </span>
                    <span className="dm-time">{relativeTime(last.createdAt)}</span>
                  </span>
                  <span className="muted dm-preview-listing">{conversation.listingTitle}</span>
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
