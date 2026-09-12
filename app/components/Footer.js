"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from "./BrandIcons";

const SOCIAL_BUTTONS = [
  { key: "instagram", label: "Instagram", icon: <InstagramIcon size={18} /> },
  { key: "telegram", label: "Telegram", icon: <TelegramIcon size={18} /> },
  { key: "whatsapp", label: "WhatsApp", icon: <WhatsAppIcon size={18} /> },
  { key: "telegramChannel", label: "Telegram Channel", icon: <TelegramIcon size={18} /> },
];

export default function Footer() {
  // Starts as "every button hidden" rather than guessing — a link that
  // hasn't loaded yet is indistinguishable from one that was never set,
  // and showing a button that then vanishes a moment later would be worse
  // than a brief gap before it appears.
  const [links, setLinks] = useState(null);

  useEffect(() => {
    fetch("/api/settings/social-links", { cache: "no-store" })
      .then((res) => res.json())
      .then(setLinks)
      .catch(() => {});
  }, []);

  const visibleButtons = SOCIAL_BUTTONS.filter((b) => links?.[b.key]);

  return (
    <footer className="site-footer">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="GameX Store" className="site-footer-logo" />

      {visibleButtons.length > 0 && (
        <div className="site-footer-social">
          {visibleButtons.map(({ key, label, icon }) => (
            <a
              key={key}
              href={links[key]}
              target="_blank"
              rel="noopener noreferrer"
              className="site-footer-social-btn"
              aria-label={label}
            >
              {icon}
            </a>
          ))}
        </div>
      )}

      <div className="site-footer-links">
        <Link href="/terms">Terms &amp; Conditions</Link>
        <Link href="/privacy">Privacy Policy</Link>
      </div>

      <p className="site-footer-copyright">
        © {new Date().getFullYear()} GameX Store. All rights reserved.
      </p>
    </footer>
  );
}
