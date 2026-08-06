"use client";

import { useEffect, useState } from "react";
import { subscribeToPush, hasActivePushSubscription, isPushSupported } from "@/app/lib/pushClient";

// Auto-subscribes as soon as this mounts (order page / support chat) instead
// of waiting for a manual toggle — the browser's own native permission
// prompt ("gamexstore.com wants to send you notifications") is the only UI
// a customer sees; there's nothing left here for them to click. Renders
// nothing except a quiet hint if the customer has actually blocked
// notifications at the browser level, since there's no button left to
// explain that state.
export default function EnableNotifications({ apiPath, extra }) {
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!isPushSupported()) return;
    if (Notification.permission === "denied") {
      setDenied(true);
      return;
    }

    let cancelled = false;
    (async () => {
      const alreadyOn = await hasActivePushSubscription();
      if (alreadyOn || cancelled) return;
      const result = await subscribeToPush(apiPath, extra);
      if (!cancelled && result.reason === "denied") setDenied(true);
    })();

    return () => {
      cancelled = true;
    };
    // extra is a plain object recreated on every render by callers — keying
    // off apiPath alone (the actual identity of "which subscription") avoids
    // re-running this effect (and re-prompting) on every unrelated re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiPath]);

  if (!denied) return null;

  return (
    <span className="muted enable-notifications-denied">
      Notifications are blocked — enable them in your browser&apos;s site settings.
    </span>
  );
}
