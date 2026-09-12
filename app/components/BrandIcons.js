// Real, recognizable brand glyphs (not generic lucide stand-ins) so each
// footer button reads instantly as "this goes to Instagram/Telegram/
// WhatsApp" — same reasoning as TelegramBanner's own Telegram glyph,
// shared here so the footer doesn't need its own copy of it.

export function InstagramIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="footer-ig-grad" x1="0" y1="24" x2="24" y2="0" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FEDA75" />
          <stop offset="0.35" stopColor="#D62976" />
          <stop offset="0.7" stopColor="#962FBF" />
          <stop offset="1" stopColor="#4F5BD5" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill="url(#footer-ig-grad)" />
      <rect x="6" y="6" width="12" height="12" rx="3.6" fill="none" stroke="#fff" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="3.2" fill="none" stroke="#fff" strokeWidth="1.4" />
      <circle cx="15.6" cy="8.4" r="0.9" fill="#fff" />
    </svg>
  );
}

export function TelegramIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="footer-tg-grad" x1="0" y1="0" x2="24" y2="24" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2AABEE" />
          <stop offset="1" stopColor="#229ED9" />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="12" fill="url(#footer-tg-grad)" />
      <path
        d="M17.72 6.85 15.4 17.53c-.17.78-.63.97-1.28.6l-3.54-2.6-1.71 1.64c-.19.19-.35.35-.71.35l.25-3.6 6.55-5.92c.29-.25-.06-.4-.44-.14l-8.1 5.1-3.49-1.09c-.76-.24-.77-.76.16-1.12l13.63-5.25c.63-.24 1.19.14.99 1.35Z"
        fill="#fff"
      />
    </svg>
  );
}

export function WhatsAppIcon({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="12" fill="#25D366" />
      <path
        fill="#fff"
        d="M12.02 5.5a6.47 6.47 0 0 0-5.53 9.83L5.5 18.5l3.28-.96a6.47 6.47 0 1 0 3.24-12.04Zm0 1.2a5.27 5.27 0 0 1 4.53 8.01 5.24 5.24 0 0 1-6.34 2.24l-.24-.09-1.94.57.58-1.87-.1-.25a5.27 5.27 0 0 1 3.51-8.6Z"
      />
      <path
        fill="#fff"
        d="M9.9 8.8c-.14-.32-.29-.32-.42-.33h-.36c-.13 0-.33.05-.5.24-.17.19-.66.65-.66 1.58s.68 1.83.77 1.95c.1.13 1.31 2.1 3.23 2.86 1.6.63 1.92.5 2.27.47.35-.03 1.12-.46 1.28-.9.16-.44.16-.82.11-.9-.05-.08-.18-.13-.38-.23-.19-.1-1.13-.56-1.31-.62-.18-.07-.3-.1-.44.1-.13.19-.5.62-.61.75-.11.13-.23.14-.42.05-.19-.1-.82-.3-1.57-.97-.58-.52-.97-1.15-1.08-1.35-.11-.19-.01-.3.09-.4.09-.09.19-.23.29-.35.1-.11.13-.19.19-.32.06-.13.03-.24-.02-.34-.05-.1-.43-1.06-.6-1.45Z"
      />
    </svg>
  );
}
