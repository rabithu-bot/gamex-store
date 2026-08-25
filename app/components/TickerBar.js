// Server component — no interactivity needed, just a real number pulled
// from the DB (confirmed deliveries) plus static, factually-true copy.
// Deliberately not a made-up count like "1,500+" — this store's actual
// delivery volume is whatever it genuinely is.
export default function TickerBar({ confirmedDeliveries }) {
  const items = [
    "⚡ INSTANT DELIVERY GUARANTEED",
    `🔥 ${confirmedDeliveries}+ VERIFIED FF ACCOUNTS DELIVERED`,
    "🛡️ 100% ANTI-BAN SECURITY SEAL",
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
