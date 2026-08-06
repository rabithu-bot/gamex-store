"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Settings, ShieldCheck } from "lucide-react";
import AdminDrawer from "./AdminDrawer";
import EnableNotifications from "@/app/components/EnableNotifications";

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isRoot = pathname === "/mafia";

  return (
    <>
      <EnableNotifications apiPath="/api/admin/push/subscribe" />
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
          {isRoot && (
            <span className="dashboard-badge">
              <ShieldCheck size={14} />
              Vault Control
            </span>
          )}
        </div>
        {isRoot && (
          <button
            type="button"
            className="admin-header-gear"
            aria-label="Open settings"
            onClick={() => setDrawerOpen(true)}
          >
            <Settings size={18} />
          </button>
        )}
      </header>

      <AdminDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
