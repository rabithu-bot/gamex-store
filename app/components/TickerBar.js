import { PackageCheck, ShieldCheck, MessageCircle } from "lucide-react";

// Server component. `dealsCompleted` is the real figure computed in
// page.js: the admin's own manually-attested override from /mafia/settings
// when they've set one, otherwise the real auto-tracked on-site count.
// Static until that setting changes — deliberately never a formula that
// grows on its own with elapsed time.
//
// Static trust-badge row, not a scrolling marquee — a ticker reads as a
// dated web pattern, and it forced every line into one scrolling string
// instead of three legible, always-visible facts.
export default function TickerBar({ dealsCompleted }) {
  const items = [
    { icon: PackageCheck, text: `${dealsCompleted}+ deals completed` },
    { icon: ShieldCheck, text: "100% safe & instant handover" },
    // "Support", not "WhatsApp Support" — support here runs through the
    // site's own order chat (SupportChat.js), not WhatsApp, which isn't
    // an integrated channel anywhere on this site.
    { icon: MessageCircle, text: "24/7 support" },
  ];

  return (
    <div className="ticker-bar" aria-label="Store highlights">
      {items.map(({ icon: Icon, text }, i) => (
        <span key={i} className="ticker-item">
          <Icon size={15} />
          {text}
        </span>
      ))}
    </div>
  );
}
