const TELEGRAM_URL = "https://t.me/gamesXstore";

// Real, recognizable Telegram glyph (brand blue circle + paper plane) so the
// button reads instantly as "this goes to Telegram" — not a generic
// lucide "send" arrow standing in for it.
function TelegramLogo() {
  return (
    <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true">
      <defs>
        <linearGradient id="tg-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2AABEE" />
          <stop offset="1" stopColor="#229ED9" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="url(#tg-grad)" />
      <path
        d="M17.72 6.85 15.4 17.53c-.17.78-.63.97-1.28.6l-3.54-2.6-1.71 1.64c-.19.19-.35.35-.71.35l.25-3.6 6.55-5.92c.29-.25-.06-.4-.44-.14l-8.1 5.1-3.49-1.09c-.76-.24-.77-.76.16-1.12l13.63-5.25c.63-.24 1.19.14.99 1.35Z"
        fill="#fff"
      />
    </svg>
  );
}

// Below the listing grid, above where a site footer would go. No follower/
// subscriber count here — Telegram's channel preview doesn't expose one
// through this site's tooling, so there's no real number to show, and no
// "verified" badge either: that's Telegram's own platform-granted mark for
// accounts they've verified, not something this site can claim on the
// channel's behalf just because it's the store's real official channel.
export default function TelegramBanner() {
  return (
    <section className="telegram-banner">
      <div className="telegram-banner-glow" aria-hidden="true" />
      <TelegramLogo />
      <div className="telegram-banner-body">
        <div className="telegram-banner-title-row">
          <strong>GameX FF Store 🔥</strong>
          <span className="telegram-banner-live-tag">
            <span className="telegram-banner-live-dot" aria-hidden="true" />
            OFFICIAL CHANNEL
          </span>
        </div>
        <p className="muted">Daily restocks &amp; exclusive deals, straight from the store owner.</p>
      </div>
      <a
        href={TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="btn telegram-banner-cta"
      >
        Join Official Telegram
      </a>
    </section>
  );
}
