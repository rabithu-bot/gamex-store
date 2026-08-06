function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map((c) => c.charCodeAt(0)));
}

export function isPushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY)
  );
}

// Browsers throw (or effectively hang) if pushManager.subscribe() is called
// a second time while a first call on the same registration is still in
// flight — a real risk now that this fires automatically from a mount
// effect, which React invokes twice in dev (Fast Refresh/StrictMode).
// Memoizing the in-flight promise means every caller in that window shares
// the one real subscribe attempt instead of racing a second one.
let inFlightSubscribe = null;

// Registers the service worker (idempotent — safe to call every time), asks
// for notification permission if not already decided, subscribes to push,
// and hands the subscription off to the given API route along with any
// extra fields (role/orderId) the backend needs to know who to notify later.
export async function subscribeToPush(apiPath, extra = {}) {
  if (!isPushSupported()) return { ok: false, reason: "unsupported" };

  if (Notification.permission === "denied") return { ok: false, reason: "denied" };
  if (Notification.permission !== "granted") {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return { ok: false, reason: "denied" };
  }

  try {
    const registration = await navigator.serviceWorker.register("/sw.js");
    await navigator.serviceWorker.ready;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      if (!inFlightSubscribe) {
        inFlightSubscribe = registration.pushManager
          .subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY),
          })
          .finally(() => {
            inFlightSubscribe = null;
          });
      }
      subscription = await inFlightSubscribe;
    }

    const res = await fetch(apiPath, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription, ...extra }),
    });
    return { ok: res.ok };
  } catch {
    return { ok: false, reason: "error" };
  }
}

// Unsubscribes the browser's push subscription and tells the server to drop
// the matching row. The endpoint itself (not role/orderId) is what the server
// uses to find the row, so this one route works for both admin and buyer.
export async function unsubscribeFromPush() {
  if (!isPushSupported()) return { ok: false };

  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return { ok: true };

  const endpoint = subscription.endpoint;
  await subscription.unsubscribe().catch(() => {});
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint }),
  }).catch(() => {});
  return { ok: true };
}

// Whether this browser currently has an active push subscription — used to
// decide whether the toggle should render on or off on first paint, since
// permission being "granted" doesn't guarantee a subscription still exists.
export async function hasActivePushSubscription() {
  if (!isPushSupported() || Notification.permission !== "granted") return false;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  const subscription = await registration?.pushManager.getSubscription();
  return Boolean(subscription);
}
