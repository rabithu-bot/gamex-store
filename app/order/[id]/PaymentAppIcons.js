// Simplified, approximate brand-colored glyphs used purely to identify each
// payment app on its own button — not a pixel-accurate reproduction of any
// official logo.

export function GPayIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <circle cx="24" cy="24" r="24" fill="#fff" />
      <path d="M35.5 24.4c0-1-.1-1.9-.3-2.8H24v5.3h6.5c-.3 1.6-1.2 2.9-2.5 3.8v3.2h4.1c2.4-2.2 3.4-5.5 3.4-9.5z" fill="#4285F4" />
      <path d="M24 36c3.2 0 5.9-1 7.9-2.8l-4.1-3.2c-1.1.8-2.5 1.2-3.8 1.2-3 0-5.5-2-6.4-4.7h-4.2v3.3C15.4 33.9 19.4 36 24 36z" fill="#34A853" />
      <path d="M17.6 26.5c-.2-.7-.4-1.5-.4-2.5s.1-1.7.4-2.5v-3.3h-4.2C12.5 20 12 21.9 12 24s.5 4 1.4 5.8l4.2-3.3z" fill="#FBBC05" />
      <path d="M24 15.9c1.7 0 3.3.6 4.5 1.8l3.4-3.4C29.9 12.3 27.2 11 24 11c-4.6 0-8.6 2.1-10.6 6.2l4.2 3.3c.9-2.7 3.4-4.6 6.4-4.6z" fill="#EA4335" />
    </svg>
  );
}

export function PhonePeIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#5F259F" />
      <path d="M31 16h-4.2l-6.6 8.4V16H16v20h4.2v-8.6L27 36h5l-7.4-9.6L31 16Z" fill="#fff" />
    </svg>
  );
}

export function PaytmIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <rect width="48" height="48" rx="10" fill="#00BAF2" />
      <text x="24" y="29" textAnchor="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="12" fill="#002E6E">
        Paytm
      </text>
    </svg>
  );
}
