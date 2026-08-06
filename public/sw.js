// activate immediately rather than waiting for old clients to close — this
// worker has no cache to migrate, so there's nothing to gain by waiting.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// A pass-through fetch handler, present purely so the browser recognizes an
// active, controlling service worker (a PWA installability requirement) —
// this app has no offline/cache story, so every request still just goes to
// the network exactly as it would with no service worker at all.
self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch {
    return;
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || "GAMEX STORE", {
      body: payload.body,
      icon: "/icon.svg",
      badge: "/icon.svg",
      image: payload.image || undefined,
      data: { url: payload.url || "/" },
      tag: payload.tag,
    })
  );
});

// Clicking a notification focuses an already-open tab on the target URL if
// one exists, otherwise opens a new one — avoids piling up duplicate tabs
// for admins who click several message notifications in a row.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(targetUrl) && "focus" in client) return client.focus();
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
