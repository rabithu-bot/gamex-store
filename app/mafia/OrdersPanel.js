"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Search, Eye, EyeOff } from "lucide-react";

const FILTERS = ["all", "pending"];

export default function OrdersPanel() {
  const [orders, setOrders] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [visibilityBusyId, setVisibilityBusyId] = useState(null);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");

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

  async function handleSetListingStatus(listingId, status) {
    setVisibilityBusyId(listingId);
    await fetch(`/api/admin/listings/${listingId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await fetchOrders();
    setVisibilityBusyId(null);
  }

  const counts = useMemo(() => {
    const base = { all: orders?.length || 0, pending: 0, confirmed: 0 };
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

  if (!orders) return <p className="muted">Loading orders...</p>;

  return (
    <div>
      <div className="orders-toolbar">
        <div className="tabs">
          {FILTERS.map((f) => (
            <button key={f} className={filter === f ? "active" : ""} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)} <span className="tab-count">{counts[f] || 0}</span>
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
                    <a href={`/api/admin/uploads/${order.screenshotPath}`} target="_blank" rel="noreferrer">
                      View
                    </a>
                  ) : (
                    "—"
                  )}
                </td>
                <td>
                  <span className={`status-pill ${order.status}`}>{order.status}</span>
                </td>
                <td>
                  {order.status === "pending" && (
                    <button
                      className="btn"
                      disabled={busyId === order.id}
                      onClick={() => handleAction(order.id, "confirm")}
                    >
                      Confirm
                    </button>
                  )}

                  {order.status === "confirmed" && (
                    order.listing ? (
                      <div className="listing-visibility">
                        <span className="muted listing-visibility-label">
                          Listing is currently{" "}
                          <strong>{order.listing.status === "sold" ? "sold" : "available"}</strong> to
                          buyers
                        </span>
                        <div className="listing-visibility-actions">
                          <button
                            type="button"
                            className={`btn secondary visibility-btn ${order.listing.status === "sold" ? "active-sold" : ""}`}
                            disabled={visibilityBusyId === order.listing.id}
                            onClick={() => handleSetListingStatus(order.listing.id, "sold")}
                          >
                            <EyeOff size={14} />
                            Show Sold
                          </button>
                          <button
                            type="button"
                            className={`btn secondary visibility-btn ${order.listing.status === "available" ? "active-available" : ""}`}
                            disabled={visibilityBusyId === order.listing.id}
                            onClick={() => handleSetListingStatus(order.listing.id, "available")}
                          >
                            <Eye size={14} />
                            Keep Available
                          </button>
                        </div>
                      </div>
                    ) : (
                      <span className="muted">Listing deleted</span>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </div>
  );
}
