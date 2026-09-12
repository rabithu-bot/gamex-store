import { useId } from "react";

// The GameX brand mark's "X" — a leaping human figure crossing a blue
// wing (upper-left) and a blue-to-magenta band (lower-right), point-
// symmetric through the center. Kept as a shared component so the header
// (its only real user) never drifts from a single source of truth.
export default function Logo({ size = 32, className }) {
  const wingGradientId = useId();
  const bandGradientId = useId();

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
        <linearGradient id={wingGradientId} x1="60" y1="50" x2="13" y2="9" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4a86ff" />
          <stop offset="1" stopColor="#8ecdff" />
        </linearGradient>
        <linearGradient id={bandGradientId} x1="44" y1="44" x2="87" y2="91" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#4a7dff" />
          <stop offset="0.55" stopColor="#8a5cf0" />
          <stop offset="1" stopColor="#e34fd6" />
        </linearGradient>
      </defs>
      {/* Upper-left wing: one flowing curve tapering to a point — point-
          symmetric with the band below, through the mark's center. */}
      <path
        d="M56,56 C42,44 26,26 13,9 C20,7 27,10 33,17 C44,28 52,40 62,50 Z"
        fill={`url(#${wingGradientId})`}
      />
      {/* Lower-right band: the same curve mirrored 180°, blue fading to magenta. */}
      <path
        d="M44,44 C58,56 74,74 87,91 C80,93 73,90 67,83 C56,72 48,60 38,50 Z"
        fill={`url(#${bandGradientId})`}
      />
      {/* Leaping figure — head, torso, raised arm, two legs — layered on
          top so it reads as a person leaping through the X, not an
          abstract blob. */}
      <circle cx="63" cy="19" r="7" fill="#f6f4fc" />
      <g stroke="#f6f4fc" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M61,26 L54,44" />
        <path d="M58,29 L44,20 L28,10" />
        <path d="M54,44 L38,64" />
        <path d="M54,44 L64,52 L74,58" />
      </g>
    </svg>
  );
}
