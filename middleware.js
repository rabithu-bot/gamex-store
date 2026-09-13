import { NextResponse } from "next/server";

// AI-training/data-scraping crawlers and common scripted HTTP clients —
// these don't run JavaScript and don't reliably respect robots.txt, so
// this is a real backstop for app/robots.js's polite-crawler rules (which
// only work on bots that choose to honor them). Blocked at the edge with
// a 403 before any page render or DB query happens.
//
// Deliberately NOT blocking generic search-engine crawlers (Googlebot,
// Bingbot, etc.) or link-preview bots (Telegram/WhatsApp/Facebook,
// TelegramBot, WhatsApp) — the storefront depends on real search traffic
// and on shared order/product links unfurling correctly in chat apps.
const BLOCKED_UA_PATTERN =
  /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|anthropic-ai|Anthropic|PerplexityBot|Perplexity-User|CCBot|Bytespider|Diffbot|Scrapy|python-requests|curl\/|Wget|HeadlessChrome|headless|PhantomJS|puppeteer|selenium/i;

export function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  if (BLOCKED_UA_PATTERN.test(ua)) {
    return new NextResponse("Forbidden", { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  // Runs on real page/API requests but skips static assets and Next
  // internals — no reason to spend an Edge invocation deciding whether to
  // 403 a JS chunk, a PWA icon, or a font file.
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|icons/|.*\\.(?:png|jpg|jpeg|svg|webp|ico|woff2?)$).*)",
  ],
};
