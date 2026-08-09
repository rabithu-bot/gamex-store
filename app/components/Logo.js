import { useId } from "react";

// "Shuriken Blade X" — four sharpened blades crossing at the center (the
// "X" in GameX, and a throwing star — the kind of weapon silhouette that
// shows up in every Free Fire GFX thumbnail), with a small flame at the
// core where the blades meet. Kept as a shared component (rather than
// duplicated inline SVGs) so the favicon, header, and splash screen can
// never drift out of sync with each other.
export default function Logo({ size = 32, withBackground = true, className }) {
  const gradientId = useId();
  const flameGradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#c4b5fd" />
          <stop offset="0.55" stopColor="#8b5cf6" />
          <stop offset="1" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id={flameGradientId} x1="0" y1="1" x2="0" y2="0" gradientUnits="objectBoundingBox">
          <stop offset="0" stopColor="#ef4444" />
          <stop offset="0.6" stopColor="#fb923c" />
          <stop offset="1" stopColor="#fde68a" />
        </linearGradient>
      </defs>
      {withBackground && <rect width="100" height="100" rx="28" fill={`url(#${gradientId})`} />}
      {/* Always dark ink, regardless of withBackground — when there's no
          rect (e.g. the splash screen), the caller's own CSS already
          supplies a colorful gradient card behind this mark (see
          .splash-mark), so the blades need to read as a dark silhouette on
          top of that, not another gradient layered on a gradient. */}
      <g fill="#0d0b17">
        <polygon transform="rotate(45 50 50)" points="50,47 58,47 58,48.5 90,50 58,51.5 58,53 50,53" />
        <polygon transform="rotate(135 50 50)" points="50,47 58,47 58,48.5 90,50 58,51.5 58,53 50,53" />
        <polygon transform="rotate(225 50 50)" points="50,47 58,47 58,48.5 90,50 58,51.5 58,53 50,53" />
        <polygon transform="rotate(315 50 50)" points="50,47 58,47 58,48.5 90,50 58,51.5 58,53 50,53" />
      </g>
      <path
        fill={`url(#${flameGradientId})`}
        transform="translate(41,32) scale(0.72)"
        d="M12,0 C18,7 20,14 15,19 C12,22 6,20 7,15 C8,18 11,17 11,13 C8,12 6,8 9,3 C10,8 12,6 12,0 Z"
      />
    </svg>
  );
}
