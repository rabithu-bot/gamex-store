"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { X, Copy, Check } from "lucide-react";
import { isInstagramBrowser, isIOSUserAgent } from "@/app/lib/inAppBrowser";

const DISMISS_KEY = "gamex-iab-banner-dismissed";

export default function InAppBrowserBanner() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if (sessionStorage.getItem(DISMISS_KEY) === "1") return;
    const ua = navigator.userAgent || "";
    if (!isInstagramBrowser(ua)) return;
    setIsIOS(isIOSUserAgent(ua));
    setVisible(true);
  }, []);

  // Skip the admin panel entirely — nobody reaches /mafia from an Instagram
  // ad, and AuroraBackground/MobileTabBar already follow this same rule.
  if (!visible || pathname?.startsWith("/mafia")) return null;

  function handleDismiss() {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setVisible(false);
  }

  async function handleCopyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API can be blocked inside some in-app webviews — the
      // instructions below are still enough to complete the breakout by hand.
    }
  }

  return (
    <div className="iab-banner" role="alert">
      <div className="iab-banner-content">
        <span className="iab-banner-text">
          ⚡ For 1-Tap UPI Payments (GPay/PhonePe), open this site in {isIOS ? "Safari" : "Chrome"}!
        </span>

        <div className="iab-banner-ios">
          <span className="iab-banner-ios-hint">
            {isIOS ? (
              <>
                Tap <strong>•••</strong> at the top right → <strong>Open in Browser</strong>
              </>
            ) : (
              <>
                Tap <strong>⋮</strong> at the top right → <strong>Open in Chrome</strong>
              </>
            )}
          </span>
          <button type="button" className="btn secondary iab-banner-copy" onClick={handleCopyLink}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? "Copied!" : "Copy Link"}
          </button>
        </div>
      </div>

      <button type="button" className="iab-banner-close" aria-label="Dismiss" onClick={handleDismiss}>
        <X size={16} />
      </button>
    </div>
  );
}
