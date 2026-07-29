"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Search } from "lucide-react";
import ListingAvailabilityToggle from "./ListingAvailabilityToggle";
import Lightbox from "@/app/components/Lightbox";

const FILTERS = ["all", "pending_verification", "pending"];
const FILTER_LABELS = {
  all: "All",
  pending_verification: "Needs Review",
  pending: "Awaiting Payment",
};

export default function OrdersPanel() {
  const [orders, setOrders] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [zoomedProof, setZoomedProof] = useState(null);

  const fetchOrders = useCallback(async () => {
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    if (res.ok) setOrders(await res.json());
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  async function handleAction(orderId, action) {
    setBusyId(orderId);
    await fetch(`/api/admin/orders/${orderId}/${action}`, { method: "POST" });
    await fetchOrders();
    setBusyId(null);
  }

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
                  {order.screenshotPath ? (
                    <button
                      type="button"
                      className="proof-thumb-btn"
                      onClick={() => setZoomedProof(order.screenshotPath)}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={order.screenshotPath} alt={`Payment proof for order #${order.id}`} loading="lazy" />
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <span className={`status-pill ${order.status}`}>
                    {order.status.replace("_", " ")}
                  </span>
                </td>
                <td>
                  {order.status === "pending_verification" && (
                    <div style={{ display: "flex", gap: "0.5rem" }}>
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
                      <ListingAvailabilityToggle listing={order.listing} onChanged={fetchOrders} />
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
