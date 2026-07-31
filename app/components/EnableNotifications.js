"use client";

import { useEffect, useState } from "react";
import {
  subscribeToPush,
  unsubscribeFromPush,
  hasActivePushSubscription,
  isPushSupported,
} from "@/app/lib/pushClient";

// `supported`/`on` start false on both the server render and the client's
// first render (before effects run) so they agree — reading them directly in
// the render body would read window/Notification state differently between
// server and client and trigger a hydration mismatch.
export default function EnableNotifications({ apiPath, extra }) {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(false);
  const [denied, setDenied] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    setSupported(true);
    setDenied(Notification.permission === "denied");
    hasActivePushSubscription().then(setOn);
  }, []);

  async function handleToggle() {
    if (busy) return;
    setBusy(true);
    if (on) {
      await unsubscribeFromPush();
      setOn(false);
    } else {
      const result = await subscribeToPush(apiPath, extra);
      setDenied(result.reason === "denied");
      setOn(result.ok);
    }
    setBusy(false);
  }

  if (!supported) return null;

  if (denied) {
    return (
      <span className="muted enable-notifications-denied">
        Notifications are blocked — enable them in your browser&apos;s site settings.
      </span>
    );
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Toggle message notifications"
      className={`notif-toggle${on ? " on" : ""}`}
      onClick={handleToggle}
      disabled={busy}
    >
      <span className="notif-toggle-thumb" />
    </button>
  );
}
