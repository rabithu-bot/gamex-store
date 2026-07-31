import { useId } from "react";

// Four identical rounded-arrow arms rotated around an open center — reads as
// the "X" in GameX, as a d-pad cross, and as an outward/expand glyph. Kept as
// a shared component (rather than duplicated inline SVGs) so the favicon,
// header, and splash screen can never drift out of sync with each other.
export default function Logo({ size = 32, withBackground = true, className }) {
  const gradientId = useId();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {withBackground && (
        <>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="32" y2="32" gradientUnits="userSpaceOnUse">
              <stop offset="0" stopColor="#c4b5fd" />
              <stop offset="0.55" stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#7c3aed" />
            </linearGradient>
          </defs>
          <rect width="32" height="32" rx="9" fill={`url(#${gradientId})`} />
        </>
      )}
      <g fill="#0d0b17">
        <g transform="rotate(45 16 16)">
          <rect x="4" y="13.8" width="7" height="4.4" rx="2.2" />
          <polygon points="11,11.6 15.2,16 11,20.4" />
        </g>
        <g transform="rotate(135 16 16)">
          <rect x="4" y="13.8" width="7" height="4.4" rx="2.2" />
          <polygon points="11,11.6 15.2,16 11,20.4" />
        </g>
        <g transform="rotate(225 16 16)">
          <rect x="4" y="13.8" width="7" height="4.4" rx="2.2" />
          <polygon points="11,11.6 15.2,16 11,20.4" />
        </g>
        <g transform="rotate(315 16 16)">
          <rect x="4" y="13.8" width="7" height="4.4" rx="2.2" />
          <polygon points="11,11.6 15.2,16 11,20.4" />
        </g>
      </g>
    </svg>
  );
}
