"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import SiteHeader from "@/app/components/SiteHeader";
import { getMyOrders } from "@/app/lib/myOrders";

export default function MyOrdersPage() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    const saved = getMyOrders();
    if (saved.length === 0) {
      setOrders([]);
      return;
    }
    Promise.all(
      saved.map(async (o) => {
        try {
          const res = await fetch(`/api/orders/${o.id}`, { cache: "no-store" });
          if (!res.ok) return null;
          const data = await res.json();
          return { id: o.id, status: data.status, price: data.listing.price, title: data.listing.title };
        } catch {
          return null;
        }
      })
    ).then((results) => setOrders(results.filter(Boolean)));
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="container" style={{ maxWidth: 640 }}>
        <h1>My Orders</h1>
        <p className="muted">Orders you&apos;ve placed from this device — no login needed.</p>

        {orders === null && <p className="muted" style={{ marginTop: "1rem" }}>Loading...</p>}

        {orders && orders.length === 0 && (
          <div className="empty-state">
            <p>No orders yet on this device.</p>
            <Link href="/" className="btn" style={{ marginTop: "1rem", display: "inline-flex" }}>
              Browse listings
            </Link>
          </div>
        )}

        {orders && orders.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "1.5rem" }}>
            {orders.map((o) => (
              <Link key={o.id} href={`/order/${o.id}`} className="panel my-order-row">
                <div>
                  <strong>{o.title}</strong>
                  <span className="muted">
                    Order #{o.id} · ₹{o.price.toLocaleString("en-IN")}
                  </span>
                </div>
                <span className={`status-pill ${o.status}`}>{o.status}</span>
              </Link>
            ))}
          </div>
        )}
      </main>
    </>
  );
}
