"use client";

import { useEffect, useState } from "react";
import { Smartphone, CheckCircle2 } from "lucide-react";

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own (non-standard) flag for "launched from home screen"
    window.navigator.standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

// Chrome/Edge/Android fire `beforeinstallprompt` themselves when a page
// meets installability criteria (manifest + controlling service worker,
// both already set up — see app/mafia/manifest.js and
// RegisterServiceWorker.js); there's no way to trigger the native install
// UI without capturing that real event first. Firefox desktop and iOS
// Safari never fire it at all — for those there's no programmatic install,
// only the browser's own manual "Add to Home Screen", so this shows
// instructions instead of a dead button on iOS specifically.
export default function InstallAdminApp() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    setInstalled(isStandalone());
    setIos(isIos());

    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setDeferredPrompt(e);
    }
    function onAppInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    // Whatever the admin chose, this specific captured event is spent —
    // Chrome only fires beforeinstallprompt again on a future page load.
    setDeferredPrompt(null);
  }

  if (installed) {
    return (
      <div className="panel install-admin-app-panel">
        <div className="install-admin-app-icon">
          <CheckCircle2 size={20} />
        </div>
        <div>
          <strong>Admin app installed</strong>
          <p className="muted" style={{ marginTop: "0.2rem" }}>
            You're already running GameX Admin from your home screen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="panel install-admin-app-panel">
      <div className="install-admin-app-icon">
        <Smartphone size={20} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <strong>📱 Install Admin App</strong>
        {ios ? (
          <p className="muted" style={{ marginTop: "0.2rem" }}>
            Open the Share menu in Safari and tap "Add to Home Screen" — iOS doesn't allow
            one-tap install from the page itself.
          </p>
        ) : deferredPrompt ? (
          <p className="muted" style={{ marginTop: "0.2rem" }}>
            Get one-tap access to Vault Control from your home screen or desktop.
          </p>
        ) : (
          <p className="muted" style={{ marginTop: "0.2rem" }}>
            Your browser hasn't offered an install prompt yet — try again after browsing a bit, or
            use your browser menu's "Install app" option.
          </p>
        )}
      </div>
      {!ios && (
        <button type="button" className="btn" onClick={handleInstall} disabled={!deferredPrompt}>
          Install
        </button>
      )}
    </div>
  );
}
