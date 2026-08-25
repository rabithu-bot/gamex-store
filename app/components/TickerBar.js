// Server component — no interactivity needed, just real numbers pulled
// from the DB plus static, factually-true copy. Deliberately never a fixed
// starting number with a timer mechanically incrementing it regardless of
// real activity.
export default function TickerBar({ dealsToday, lifetimeDeals }) {
  const items = [
    "⚡ INSTANT DELIVERY GUARANTEED",
    `🔥 ${dealsToday} DEALS COMPLETED TODAY`,
    // Lifetime, not "today" — this can include the admin's own manually
    // entered pre-website/offline history (see /mafia/settings), so it's
    // deliberately never given a same-day time frame the way the line
    // above is.
    `✅ ${lifetimeDeals}+ VERIFIED DEALS COMPLETED`,
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
