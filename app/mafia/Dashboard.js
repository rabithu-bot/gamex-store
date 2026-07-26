"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut, ShoppingBag, Package, MessagesSquare, ShieldCheck, Settings } from "lucide-react";
import ListingsPanel from "./ListingsPanel";
import OrdersPanel from "./OrdersPanel";
import MessagesPanel from "./MessagesPanel";
import SettingsPanel from "./SettingsPanel";
import StatsBar from "./StatsBar";

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState("orders");
  const [loggingOut, setLoggingOut] = useState(false);

  // Lets a "< Back" link from the full-screen chat page (or anywhere else)
  // return to a specific tab via /mafia?tab=messages instead of always
  // landing back on the default Orders tab.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested) setTab(requested);
  }, []);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Even if the network request fails, still send the admin to the login
      // screen below — a stuck logout button is worse than a stale session.
    } finally {
      router.push("/mafia/login");
      router.refresh();
    }
  }

  return (
    <div>
      <div className="dashboard-header">
        <div className="dashboard-title">
          <span className="dashboard-badge">
            <ShieldCheck size={14} />
            Vault Control
          </span>
          <h1>Admin Dashboard</h1>
        </div>
        <button className="btn danger vault-logout" onClick={handleLogout} disabled={loggingOut}>
          <LogOut size={16} />
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </div>

      <StatsBar />

      <div className="tabs" style={{ marginTop: "1.5rem" }}>
        <button className={tab === "orders" ? "active" : ""} onClick={() => setTab("orders")}>
          <ShoppingBag size={15} />
          Orders
        </button>
        <button className={tab === "listings" ? "active" : ""} onClick={() => setTab("listings")}>
          <Package size={15} />
          Listings
        </button>
        <button className={tab === "messages" ? "active" : ""} onClick={() => setTab("messages")}>
          <MessagesSquare size={15} />
          Messages
        </button>
        <button className={tab === "settings" ? "active" : ""} onClick={() => setTab("settings")}>
          <Settings size={15} />
          Settings
        </button>
      </div>

      {tab === "orders" && <OrdersPanel />}
      {tab === "listings" && <ListingsPanel />}
      {tab === "messages" && <MessagesPanel />}
      {tab === "settings" && <SettingsPanel />}
    </div>
  );
}
