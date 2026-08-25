// Server component, no props needed — pure static marketing copy now, no
// DB-driven counts. (Previously showed a real "today" order count and a
// real/admin-overridable lifetime count; both removed per request so the
// banner no longer depends on any dynamic order data at all.)
export default function TickerBar() {
  const items = [
    "👑 VERIFIED FF ACCOUNTS STORE",
    "⚡ 100% SAFE & INSTANT HANDOVER",
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
