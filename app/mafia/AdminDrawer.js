"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X, ChevronDown, LogOut, QrCode, MessageSquareText, PackagePlus, ShieldCheck } from "lucide-react";
import SettingsPanel from "./SettingsPanel";
import QuickRepliesSettings from "./QuickRepliesSettings";
import AddListingPanel from "./AddListingPanel";
import ProofsSettings from "./ProofsSettings";
import EnableNotifications from "@/app/components/EnableNotifications";

export default function AdminDrawer({ open, onClose }) {
  const router = useRouter();
  const [qrExpanded, setQrExpanded] = useState(false);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [addListingExpanded, setAddListingExpanded] = useState(false);
  const [proofsExpanded, setProofsExpanded] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  async function handleLogout() {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } catch {
      // Even if the network request fails, still send the admin to the login
      // screen below — a stuck sign-out button is worse than a stale session.
    } finally {
      router.push("/mafia/login");
      router.refresh();
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="admin-drawer-backdrop" onClick={onClose} />
      <div className="admin-drawer">
        <div className="admin-drawer-header">
          <strong>Settings</strong>
          <button type="button" className="admin-drawer-close" aria-label="Close settings" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="admin-drawer-notifications">
          <span className="admin-drawer-row-label">
            <MessageSquareText size={16} />
            Message Notifications
          </span>
          <EnableNotifications apiPath="/api/admin/push/subscribe" />
        </div>

        <button type="button" className="admin-drawer-row" onClick={() => setQrExpanded((v) => !v)}>
          <span className="admin-drawer-row-label">
            <QrCode size={16} />
            Payment QR Code
          </span>
          <ChevronDown size={16} className={`admin-drawer-chevron${qrExpanded ? " open" : ""}`} />
        </button>
        {qrExpanded && (
          <div className="admin-drawer-qr">
            <SettingsPanel />
          </div>
        )}

        <button type="button" className="admin-drawer-row" onClick={() => setRepliesExpanded((v) => !v)}>
          <span className="admin-drawer-row-label">
            <MessageSquareText size={16} />
            Saved Replies
          </span>
          <ChevronDown size={16} className={`admin-drawer-chevron${repliesExpanded ? " open" : ""}`} />
        </button>
        {repliesExpanded && (
          <div className="admin-drawer-qr">
            <QuickRepliesSettings />
          </div>
        )}

        <button type="button" className="admin-drawer-row" onClick={() => setAddListingExpanded((v) => !v)}>
          <span className="admin-drawer-row-label">
            <PackagePlus size={16} />
            Add New Listing
          </span>
          <ChevronDown size={16} className={`admin-drawer-chevron${addListingExpanded ? " open" : ""}`} />
        </button>
        {addListingExpanded && (
          <div className="admin-drawer-qr">
            <AddListingPanel />
          </div>
        )}

        <button type="button" className="admin-drawer-row" onClick={() => setProofsExpanded((v) => !v)}>
          <span className="admin-drawer-row-label">
            <ShieldCheck size={16} />
            Proofs
          </span>
          <ChevronDown size={16} className={`admin-drawer-chevron${proofsExpanded ? " open" : ""}`} />
        </button>
        {proofsExpanded && (
          <div className="admin-drawer-qr">
            <ProofsSettings />
          </div>
        )}

        <button type="button" className="btn danger admin-drawer-signout" onClick={handleLogout} disabled={loggingOut}>
          <LogOut size={16} />
          {loggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </>
  );
}
