"use client";

import { useState, useCallback } from "react";
import { IndianRupee, PackageCheck, PackageX, MessageCircle } from "lucide-react";
import { useVisiblePolling } from "@/app/lib/useVisiblePolling";

export default function StatsBar() {
  const [stats, setStats] = useState(null);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/admin/stats", { cache: "no-store" });
    if (!res.ok) return;
    setStats(await res.json());
  }, []);

  useVisiblePolling(fetchStats, 6000);

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
