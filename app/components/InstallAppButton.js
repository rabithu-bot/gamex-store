"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";

// True "download an APK" isn't something a website can trigger on its own —
// this instead uses the standard Android/Chrome install-as-app flow (the
// same mechanism behind "Add to Home Screen"), which gets a customer to the
// same end result: a GameX Store icon on their home screen that opens
// full-screen with no browser chrome, launched from installed app storage
// rather than a bookmark.
export default function InstallAppButton() {
  const [installEvent, setInstallEvent] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setInstalled(true);
    }

    function onBeforeInstallPrompt(e) {
      e.preventDefault();
      setInstallEvent(e);
    }
    function onAppInstalled() {
      setInstalled(true);
      setInstallEvent(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onAppInstalled);
    };
  }, []);

  async function handleInstall() {
    if (!installEvent) return;
    installEvent.prompt();
    await installEvent.userChoice;
    setInstallEvent(null);
  }

  if (installed || !installEvent) return null;

  return (
    <button type="button" className="install-app-btn" onClick={handleInstall}>
      <Download size={15} />
      <span>Install App</span>
    </button>
  );
}
