"use client";

import { useState, useCallback, useMemo, memo } from "react";
import { Search, ImageOff } from "lucide-react";
import ListingAvailabilityToggle from "./ListingAvailabilityToggle";
import Lightbox from "@/app/components/Lightbox";
import { useVisiblePolling } from "@/app/lib/useVisiblePolling";
import { getCached, setCached } from "./panelCache";

function ProofThumb({ src, orderId, onZoom }) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <span className="proof-thumb-btn proof-thumb-missing" aria-label="No payment proof">
        <ImageOff size={18} />
      </span>
    );
  }

  return (
    <button type="button" className="proof-thumb-btn" onClick={onZoom}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={`Payment proof for order #${orderId}`}
        onError={() => setFailed(true)}
      />
    </button>
  );
}

// Same reasoning as ListingAvailabilityToggle's memo — every poll tick
// hands this a freshly-parsed src string, but the src value itself rarely
// changes. onZoom's identity is deliberately ignored: if src/orderId are
// the same, it opens the same image regardless of which render's closure
// it came from.
const MemoProofThumb = memo(
  ProofThumb,
  (prev, next) => prev.src === next.src && prev.orderId === next.orderId
);

const FILTERS = ["all", "pending_verification", "pending"];
const FILTER_LABELS = {
  all: "All",
  pending_verification: "Needs Review",
  pending: "Awaiting Payment",
};

export default function OrdersPanel() {
  // Lazy initializer: renders the last-known orders instantly on mount
  // (e.g. navigating back to /mafia/orders) instead of flashing the
  // skeleton rows every time, while the poll below still refreshes it.
  const [orders, setOrders] = useState(() => getCached("orders"));
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [zoomedProof, setZoomedProof] = useState(null);

  // Every write to `orders` — the poll's fresh fetch, an optimistic
  // action, or a rollback — also mirrors into the cache, so a remount
  // right after any of those picks up the latest value instead of a
  // slightly-stale one from the last poll tick.
  const updateOrders = useCallback((updater) => {
    setOrders((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      setCached("orders", next);
      return next;
    });
  }, []);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    if (res.ok) updateOrders(await res.json());
  }, [updateOrders]);

  // This is the screen where incoming "Needs Review" payment proofs land,
  // so it has to refresh on its own — it previously fetched once on mount,
  // meaning an admin sitting on this tab wouldn't see a new order until
  // they manually reloaded. Same visibility-aware polling every sibling
  // panel already uses (messages 4s, listings 5s, stats 6s).
  useVisiblePolling(fetchOrders, 5000);

  // Optimistic: flips this order's status (and, for a confirm, its
  // listing to "sold" — mirrors what confirmOrder() actually does
  // server-side) immediately instead of waiting for the POST to finish
  // and then re-fetching the entire orders list. Rolls back to the exact
  // prior array if the request fails.
  async function handleAction(orderId, action) {
    const prevOrders = orders;
    const nextStatus = action === "confirm" ? "confirmed" : "declined";
    setBusyId(orderId);
    updateOrders((prev) =>
      prev?.map((o) => {
        if (o.id !== orderId) return o;
        const patched = { ...o, status: nextStatus };
        if (action === "confirm" && o.listing) patched.listing = { ...o.listing, status: "sold" };
        return patched;
      })
    );
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/${action}`, { method: "POST" });
      if (!res.ok) throw new Error("action failed");
    } catch {
      updateOrders(prevOrders);
    } finally {
      setBusyId(null);
    }
  }

  // Patches the matching order(s) in local state — no refetch. The
  // background poll (useVisiblePolling above) is what reconciles anything
  // this misses (e.g. a second admin toggling the same listing elsewhere).
  const patchListingStatus = useCallback((listingId, status) => {
    updateOrders((prev) =>
      prev?.map((o) => (o.listing?.id === listingId ? { ...o, listing: { ...o.listing, status } } : o))
    );
  }, [updateOrders]);

  const counts = useMemo(() => {
    const base = { all: orders?.length || 0 };
    orders?.forEach((o) => {
      base[o.status] = (base[o.status] || 0) + 1;
    });
    return base;
  }, [orders]);

  const filtered = useMemo(() => {
    if (!orders) return [];
    const q = query.trim().toLowerCase();
    return orders.filter((o) => {
      if (filter !== "all" && o.status !== filter) return false;
      if (!q) return true;
      return (
        String(o.id).includes(q) ||
        o.listingTitle.toLowerCase().includes(q) ||
        (o.buyerName || "").toLowerCase().includes(q)
      );
    });
  }, [orders, filter, query]);

  if (!orders) {
    return (
      <div className="panel-skeleton-list">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="skeleton panel-skeleton-row" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="orders-toolbar">
        <div className="tabs">
          {FILTERS.map((f) => (
            <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {FILTER_LABELS[f]} <span className="tab-count">{counts[f] || 0}</span>
            </button>
          ))}
        </div>
        <div className="admin-search">
          <Search size={15} />
          <input
            type="text"
            placeholder="Search order #, customer, or listing..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="muted" style={{ marginTop: "1rem" }}>
          No orders match this view.
        </p>
      ) : (
        <div className="table-scroll">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Listing</th>
              <th>Proof</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((order) => (
              <tr key={order.id}>
                <td>#{order.id}</td>
                <td>{order.buyerName || <span className="muted">—</span>}</td>
                <td>
                  {order.listingTitle}
                  {!order.listing && <span className="muted"> (listing deleted)</span>}
                  <div className="muted">₹{order.listingPrice.toLocaleString("en-IN")}</div>
                </td>
                <td>
                  <MemoProofThumb
                    src={order.screenshotPath}
                    orderId={order.id}
                    onZoom={() => setZoomedProof(order.screenshotPath)}
                  />
                </td>
                <td>
                  <span className={`status-pill ${order.status}`}>
                    {order.status.replace("_", " ")}
                  </span>
                </td>
                <td>
                  {order.status === "pending_verification" && (
                    <div className="order-actions">
                      <button
                        className="btn success"
                        disabled={busyId === order.id}
                        onClick={() => handleAction(order.id, "confirm")}
                      >
                        Confirm &amp; Release Account
                      </button>
                      <button
                        className="btn decline"
                        disabled={busyId === order.id}
                        onClick={() => handleAction(order.id, "decline")}
                      >
                        Decline &amp; Flag Screenshot
                      </button>
                    </div>
                  )}

                  {order.status === "pending" && (
                    <span className="muted">Awaiting payment screenshot</span>
                  )}

                  {order.status === "confirmed" && (
                    order.listing ? (
                      <ListingAvailabilityToggle listing={order.listing} onChanged={patchListingStatus} />
                    ) : (
                      <span className="muted">Listing deleted</span>
                    )
                  )}

                  {order.status === "declined" && <span className="muted">Awaiting new screenshot</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}

      {zoomedProof && (
        <Lightbox src={zoomedProof} alt="Payment proof" onClose={() => setZoomedProof(null)} />
      )}
    </div>
  );
}
