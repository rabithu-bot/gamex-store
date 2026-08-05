"use client";

import { useEffect } from "react";

// Registered unconditionally (not just when a user opts into push, like
// pushClient.js does) because an active, controlling service worker is one
// of Chrome's install-eligibility requirements — without this, the site
// never qualifies for "Add to Home Screen" / the beforeinstallprompt event
// at all. Registering the same script twice is a safe no-op.
export default function RegisterServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  return null;
}
