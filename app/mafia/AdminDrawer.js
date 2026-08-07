"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { X, ChevronRight, LogOut, QrCode, MessageSquareText, PackagePlus, ShieldCheck, Megaphone, Bot } from "lucide-react";

export default function AdminDrawer({ open, onClose }) {
  const router = useRouter();
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

        <Link href="/mafia/settings/payment-qr" className="admin-drawer-row" onClick={onClose}>
          <span className="admin-drawer-row-label">
            <QrCode size={16} />
            Payment QR Code
          </span>
          <ChevronRight size={16} className="admin-drawer-chevron" />
        </Link>

        <Link href="/mafia/settings/quick-replies" className="admin-drawer-row" onClick={onClose}>
          <span className="admin-drawer-row-label">
            <MessageSquareText size={16} />
            Saved Replies
          </span>
          <ChevronRight size={16} className="admin-drawer-chevron" />
        </Link>

        <Link href="/mafia/settings/add-listing" className="admin-drawer-row" onClick={onClose}>
          <span className="admin-drawer-row-label">
            <PackagePlus size={16} />
            Add New Listing
          </span>
          <ChevronRight size={16} className="admin-drawer-chevron" />
        </Link>

        <Link href="/mafia/settings/proofs" className="admin-drawer-row" onClick={onClose}>
          <span className="admin-drawer-row-label">
            <ShieldCheck size={16} />
            Proofs
          </span>
          <ChevronRight size={16} className="admin-drawer-chevron" />
        </Link>

        <Link href="/mafia/settings/broadcast" className="admin-drawer-row" onClick={onClose}>
          <span className="admin-drawer-row-label">
            <Megaphone size={16} />
            Broadcast Push
          </span>
          <ChevronRight size={16} className="admin-drawer-chevron" />
        </Link>

        <Link href="/mafia/settings/ai-learning" className="admin-drawer-row" onClick={onClose}>
          <span className="admin-drawer-row-label">
            <Bot size={16} />
            AI Learning
          </span>
          <ChevronRight size={16} className="admin-drawer-chevron" />
        </Link>

        <button type="button" className="btn danger admin-drawer-signout" onClick={handleLogout} disabled={loggingOut}>
          <LogOut size={16} />
          {loggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </>
  );
}
