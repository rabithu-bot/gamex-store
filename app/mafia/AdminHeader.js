"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Settings, ShieldCheck } from "lucide-react";
import AdminDrawer from "./AdminDrawer";

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isRoot = pathname === "/mafia";

  return (
    <>
      <header className="admin-header-bar">
        <div className="admin-header-left">
          {!isRoot && (
            <button
              type="button"
              className="admin-header-back"
              aria-label="Back to dashboard"
              onClick={() => router.push("/mafia")}
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <span className="dashboard-badge">
            <ShieldCheck size={14} />
            Vault Control
          </span>
        </div>
        <button
          type="button"
          className="admin-header-gear"
          aria-label="Open settings"
          onClick={() => setDrawerOpen(true)}
        >
          <Settings size={18} />
        </button>
      </header>

      <AdminDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
