// Server component. `dealsCompleted` is the real figure computed in
// page.js: the admin's own manually-attested override from /mafia/settings
// when they've set one, otherwise the real auto-tracked on-site count.
// Static until that setting changes — deliberately never a formula that
// grows on its own with elapsed time.
export default function TickerBar({ dealsCompleted }) {
  const items = [
    `🔥 ${dealsCompleted}+ TOTAL DEALS COMPLETED`,
    "⚡ 100% SAFE & INSTANT HANDOVER",
    // "24/7 SUPPORT", not "24/7 WhatsApp Support" — support here runs
    // through the site's own order chat (SupportChat.js), not WhatsApp,
    // which isn't an integrated channel anywhere on this site.
    "💬 24/7 SUPPORT",
  ];
  // Duplicated once so the CSS marquee can loop seamlessly (scrolls
  // exactly one copy's width, then resets with no visible jump).
  const track = [...items, ...items];

  return (
    <div className="ticker-bar" role="marquee" aria-label="Store highlights">
      <div className="ticker-track">
        {track.map((text, i) => (
          <span key={i} className="ticker-item">
            {text}
          </span>
        ))}
      </div>
    </div>
  );
}
