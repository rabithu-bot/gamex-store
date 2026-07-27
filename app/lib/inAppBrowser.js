// Detects Meta's (Instagram/Facebook) in-app browser WebView, which blocks
// UPI app deep-linking and can't reliably bookmark/save the page. Keywords
// match Meta's own documented in-app-browser user-agent tokens.
export function isInstagramBrowser(userAgent) {
  if (!userAgent) return false;
  return /Instagram|FBAN|FBAV|FB_IAB/i.test(userAgent);
}

export function isIOSUserAgent(userAgent) {
  if (!userAgent) return false;
  return /iPhone|iPad|iPod/i.test(userAgent);
}
