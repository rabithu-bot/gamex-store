"use client";

import { useState, useCallback } from "react";
import { IndianRupee, PackageCheck, PackageX, MessageCircle, Users } from "lucide-react";
import { useVisiblePolling } from "@/app/lib/useVisiblePolling";
import { getCached, setCached } from "./panelCache";

export default function StatsBar() {
  // Lazy initializer: renders the last-known stats immediately on mount
  // (e.g. navigating back to the Dashboard) instead of flashing the
  // skeleton bar every time, while the poll below still refreshes it.
  const [stats, setStats] = useState(() => getCached("stats"));

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setStats(data);
    setCached("stats", data);
  }, []);

  useVisiblePolling(fetchStats, 6000);

  if (!stats) {
    return (
      <div className="stats-bar">
        {Array.from({ length: 5 }).map((_, i) => (
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
      <div className="stat-card">
        <div className="stat-icon lifetime">
          <Users size={16} />
        </div>
        <div>
          <span className="stat-value">{stats.totalOrdersAllTime.toLocaleString("en-IN")}</span>
          <span className="stat-label">Total Orders (All-Time)</span>
        </div>
      </div>
    </div>
  );
}
