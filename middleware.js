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
// Note: deliberately not a generic /bot.*ai|ai.*bot/i catch-all — that's
// broad enough to false-positive on legitimate services whose UA happens
// to contain both substrings in some order. Named tokens only; the list
// mirrors app/robots.js's AI_CRAWLER_USER_AGENTS (this is the real
// enforcement layer — robots.txt only works on bots that choose to honor
// it) plus generic scripted-HTTP-client tokens. Google-Extended is
// deliberately excluded here — it's a robots.txt-only permission token,
// not a distinct string real requests ever carry, so matching it here
// would never fire; it's already handled correctly in app/robots.js.
const BLOCKED_UA_PATTERN =
  /GPTBot|ChatGPT-User|OAI-SearchBot|ClaudeBot|Claude-Web|Claude-User|anthropic-ai|Anthropic|PerplexityBot|Perplexity-User|CCBot|Bytespider|Diffbot|Omgilibot|Amazonbot|ImagesiftBot|cohere-ai|Meta-ExternalAgent|Applebot-Extended|Scrapy|python-requests|curl\/|Wget|HeadlessChrome|headless|PhantomJS|puppeteer|selenium/i;

// The one real scenario where a full site clone (someone's own copy of the
// frontend, hosted on their own domain) can still be caught server-side: if
// they didn't rebuild a backend and their copied frontend JS calls straight
// back to *our* live API. A cross-origin fetch like that carries a real
// browser-set Origin header naming their domain — that's what this catches.
//
// Deliberately does NOT block when the Origin header is simply absent —
// same-origin navigation and plenty of legitimate same-site requests never
// send one, and treating "missing" as suspicious would risk a real
// customer's own checkout request here. Only an Origin that is *present
// and explicitly a different site* trips this, so it can't false-positive
// a genuine visitor.
const SITE_ORIGIN = "https://gamexstore.com";

export function middleware(request) {
  const ua = request.headers.get("user-agent") || "";
  if (BLOCKED_UA_PATTERN.test(ua)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (request.nextUrl.pathname.startsWith("/api/")) {
    const origin = request.headers.get("origin");
    if (origin && origin !== SITE_ORIGIN) {
      return NextResponse.json(
        {
          error:
            "This request came from an unauthorized copy of GameX Store's site. The real site is at " +
            SITE_ORIGIN +
            ". Cloning this site's code, layout, or API is prohibited under our Terms & Conditions.",
        },
        { status: 403 },
      );
    }
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
