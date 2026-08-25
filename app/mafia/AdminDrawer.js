"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import {
  X,
  ChevronRight,
  LogOut,
  QrCode,
  MessageSquareText,
  PackagePlus,
  ShieldCheck,
  Megaphone,
  Bot,
  Flame,
} from "lucide-react";

const SETTINGS_LINKS = [
  { href: "/mafia/settings/payment-qr", label: "Payment QR Code", icon: QrCode },
  { href: "/mafia/settings/quick-replies", label: "Saved Replies", icon: MessageSquareText },
  { href: "/mafia/settings/add-listing", label: "Add New Listing", icon: PackagePlus },
  { href: "/mafia/settings/proofs", label: "Proofs", icon: ShieldCheck },
  { href: "/mafia/settings/broadcast", label: "Broadcast Push", icon: Megaphone },
  { href: "/mafia/settings/ai-learning", label: "AI Learning", icon: Bot },
  // Split out from the Payment QR page into its own settings page — see
  // app/mafia/DealsCounterSettings.js. Uses the Flame icon component (not
  // a literal 🔥 emoji glyph) so it stays visually consistent with every
  // other row's vector icon — the label text keeps the 🔥 you asked for.
  { href: "/mafia/settings/deals-counter", label: "🔥 Lifetime Deals Counter", icon: Flame },
];

export default function AdminDrawer({ open, onClose }) {
  const router = useRouter();
  const pathname = usePathname();
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

        {SETTINGS_LINKS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`admin-drawer-row${active ? " active" : ""}`}
              onClick={onClose}
            >
              <span className="admin-drawer-row-label">
                <span className="admin-drawer-row-icon">
                  <Icon size={16} />
                </span>
                {label}
              </span>
              <ChevronRight size={16} className="admin-drawer-chevron" />
            </Link>
          );
        })}

        <button type="button" className="btn danger admin-drawer-signout" onClick={handleLogout} disabled={loggingOut}>
          <LogOut size={16} />
          {loggingOut ? "Signing out..." : "Sign Out"}
        </button>
      </div>
    </>
  );
}
