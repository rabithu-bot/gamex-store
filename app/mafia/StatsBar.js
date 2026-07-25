"use client";

import { useEffect, useState, useCallback } from "react";
import { IndianRupee, PackageCheck, PackageX, MessageCircle } from "lucide-react";

export default function StatsBar() {
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    const [ordersRes, listingsRes] = await Promise.all([
      fetch("/api/admin/orders", { cache: "no-store" }),
      fetch("/api/admin/listings", { cache: "no-store" }),
    ]);
    if (!ordersRes.ok || !listingsRes.ok) return;
    const orders = await ordersRes.json();
    const listings = await listingsRes.json();

    const revenue = orders
      .filter((o) => o.status === "confirmed")
      .reduce((sum, o) => sum + o.listingPrice, 0);
    const available = listings.filter((l) => l.status === "available").length;
    const sold = listings.filter((l) => l.status === "sold").length;
    const unreadConvos = orders.filter((o) => {
      if (o.messages.length === 0) return false;
      return o.messages[o.messages.length - 1].sender === "buyer";
    }).length;

    setStats({ revenue, available, sold, unreadConvos });
  }, []);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  if (!stats) {
    return (
      <div className="stats-bar">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="stat-card skeleton" style={{ height: 74 }} />
        ))}
      </div>
    );
  }

  return (
    <div className="stats-bar">
      <div className="stat-card">
        <div className="stat-icon revenue">
          <IndianRupee size={16} />
        </div>
        <div>
          <span className="stat-value">₹{stats.revenue.toLocaleString("en-IN")}</span>
          <span className="stat-label">Confirmed Revenue</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon available">
          <PackageCheck size={16} />
        </div>
        <div>
          <span className="stat-value">{stats.available}</span>
          <span className="stat-label">Listings Available</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon sold">
          <PackageX size={16} />
        </div>
        <div>
          <span className="stat-value">{stats.sold}</span>
          <span className="stat-label">Listings Sold</span>
        </div>
      </div>
      <div className="stat-card">
        <div className="stat-icon messages">
          <MessageCircle size={16} />
        </div>
        <div>
          <span className="stat-value">{stats.unreadConvos}</span>
          <span className="stat-label">Unread Chats</span>
        </div>
      </div>
    </div>
  );
}
