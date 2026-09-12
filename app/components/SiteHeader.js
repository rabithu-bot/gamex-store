import Link from "next/link";
import Logo from "./Logo";
import InstallAppButton from "./InstallAppButton";

// Small gamepad badge tucked at the base of the "G" — a plain inline SVG
// (not lucide's Gamepad2) so it can carry its own blue gradient fill
// instead of a stroke-only icon.
function GamepadBadge() {
  return (
    <svg className="brand-gamepad" width="13" height="13" viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="brand-gamepad-gradient" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#7ec8ff" />
          <stop offset="1" stopColor="#3d7dff" />
        </linearGradient>
      </defs>
      <path
        fill="url(#brand-gamepad-gradient)"
        d="M6.5 8h11a4 4 0 0 1 3.98 4.4l-.5 5A3 3 0 0 1 17.8 20a3 3 0 0 1-2.5-1.33L14 16.5h-4l-1.3 2.17A3 3 0 0 1 6.2 20a3 3 0 0 1-3-2.6l-.5-5A4 4 0 0 1 6.5 8Z"
      />
      <circle cx="7.5" cy="12.5" r="0.9" fill="#0d0b17" />
      <circle cx="7.5" cy="14.5" r="0.9" fill="#0d0b17" />
      <circle cx="6.5" cy="13.5" r="0.9" fill="#0d0b17" />
      <circle cx="8.5" cy="13.5" r="0.9" fill="#0d0b17" />
      <circle cx="16.5" cy="12.7" r="1" fill="#0d0b17" />
      <circle cx="18.5" cy="14.3" r="1" fill="#0d0b17" />
    </svg>
  );
}

export default function SiteHeader() {
  return (
    <header className="site-header">
      <Link href="/" className="brand">
        <span className="brand-icon">
          <GamepadBadge />
        </span>
        <span className="brand-word">
          <span className="brand-gamex">
            <span className="brand-game">Game</span>
            <Logo size={26} className="brand-x-mark" />
          </span>
          <span className="brand-store">
            <span className="brand-store-line" />
            <span className="brand-store-text">STORE</span>
            <span className="brand-store-line right" />
          </span>
        </span>
      </Link>
      <nav className="site-header-nav-desktop">
        <Link href="/proofs">Proofs</Link>
        <Link href="/orders">My Orders</Link>
      </nav>
      <InstallAppButton />
    </header>
  );
}
