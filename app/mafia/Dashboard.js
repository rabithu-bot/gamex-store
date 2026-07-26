"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  LogOut,
  ShoppingBag,
  Package,
  MessagesSquare,
  ShieldCheck,
  Settings,
  ArrowLeft,
} from "lucide-react";
import ListingsPanel from "./ListingsPanel";
import OrdersPanel from "./OrdersPanel";
import MessagesPanel from "./MessagesPanel";
import SettingsPanel from "./SettingsPanel";
import StatsBar from "./StatsBar";

const SECTIONS = [
  {
    key: "orders",
    label: "Orders",
    icon: ShoppingBag,
    description: "Review payment proof and manage buyer orders.",
  },
  {
    key: "listings",
    label: "Listings",
    icon: Package,
    description: "Add, edit, and manage gaming accounts for sale.",
  },
  {
    key: "messages",
    label: "Messages",
    icon: MessagesSquare,
    description: "Reply to buyers in the support inbox.",
  },
  {
    key: "settings",
    label: "Settings",
    icon: Settings,
    description: "Update the UPI QR code and support display name.",
  },
];

export default function Dashboard() {
  const router = useRouter();
  const [tab, setTab] = useState(null);
  const [loggingOut, setLoggingOut] = useState(false);

  // Lets a "< Back" link from elsewhere (e.g. the full-screen chat page)
  // land directly in a specific section via /mafia?tab=messages instead of
  // always landing on the section-picker home.
  useEffect(() => {
    const requested = new URLSearchParams(window.location.search).get("tab");
    if (requested) setTab(requested);
  }, []);

  function openSection(key) {
    setTab(key);
    window.history.replaceState(null, "", `/mafia?tab=${key}`);
  }

  function backToMenu() {
    setTab(null);
    window.history.replaceState(null, "", "/mafia");
  }

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

  const activeSection = SECTIONS.find((s) => s.key === tab);

  if (activeSection) {
    const Icon = activeSection.icon;
    return (
      <div>
        <div className="dashboard-focus-header">
          <button type="button" className="dashboard-back" onClick={backToMenu}>
            <ArrowLeft size={16} />
            Back to Dashboard
          </button>
          <h2 className="dashboard-focus-title">
            <Icon size={18} />
            {activeSection.label}
          </h2>
        </div>

        {tab === "orders" && <OrdersPanel />}
        {tab === "listings" && <ListingsPanel />}
        {tab === "messages" && <MessagesPanel />}
        {tab === "settings" && <SettingsPanel />}
      </div>
    );
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

      <div className="dashboard-nav-grid">
        {SECTIONS.map((section) => (
          <button
            key={section.key}
            type="button"
            className="dashboard-nav-card"
            onClick={() => openSection(section.key)}
          >
            <span className="dashboard-nav-icon">
              <section.icon size={20} />
            </span>
            <strong>{section.label}</strong>
            <span className="muted">{section.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
