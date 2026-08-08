"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, Settings, ShieldCheck } from "lucide-react";
import AdminDrawer from "./AdminDrawer";
import EnableNotifications from "@/app/components/EnableNotifications";

// Individual chat threads — both the single-order view and the merged
// per-customer view — render as their own fixed, full-screen overlay (see
// .admin-chat-page) with a complete self-contained header — avatar, name,
// and its own "Back" link to the messages list. Rendering this shared
// header underneath it too just stacked a second back button on top of
// theirs, so it's skipped entirely on both of those routes.
const CHAT_THREAD_PATTERN = /^\/mafia\/messages\/(customer\/)?[^/]+$/;

export default function AdminHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isRoot = pathname === "/mafia";
  const isChatThread = CHAT_THREAD_PATTERN.test(pathname);

  if (isChatThread) return <EnableNotifications apiPath="/api/admin/push/subscribe" />;

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
