"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { subscribeToPush, isPushSupported } from "@/app/lib/pushClient";

// `supported` starts false on both the server render and the client's first
// render (before effects run) so they agree — checking isPushSupported()
// directly in the render body would read `window`/Notification.permission
// differently between server and client and trigger a hydration mismatch.
export default function EnableNotifications({ apiPath, extra, label = "Enable notifications" }) {
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | subscribing | done | denied

  useEffect(() => {
    setSupported(isPushSupported());
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      setStatus("done");
    }
  }, []);

  async function handleClick() {
    setStatus("subscribing");
    const result = await subscribeToPush(apiPath, extra);
    if (result.ok) setStatus("done");
    else if (result.reason === "denied") setStatus("denied");
    else setStatus("idle");
  }

  if (!supported) return null;

  if (status === "done") {
    return (
      <span className="enable-notifications-done">
        <Check size={14} />
        Notifications enabled
      </span>
    );
  }

  if (status === "denied") {
    return (
      <span className="muted enable-notifications-denied">
        Notifications are blocked — enable them in your browser&apos;s site settings.
      </span>
    );
  }

  return (
    <button type="button" className="btn secondary" onClick={handleClick} disabled={status === "subscribing"}>
      <Bell size={14} />
      {status === "subscribing" ? "Enabling..." : label}
    </button>
  );
}
