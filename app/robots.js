import { SITE_URL } from "@/app/lib/siteUrl";

// Known AI-training/AI-search crawlers that respect robots.txt (all of
// these are documented as compliant by their own operators) — blocked
// outright, separate from the normal search-engine rule below. This is a
// real, working mechanism for the crawlers that actually honor it; it has
// no effect on a scraper that ignores robots.txt entirely, which is a
// different problem robots.txt was never able to solve for anyone.
const AI_CRAWLER_USER_AGENTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "PerplexityBot",
  "Perplexity-User",
  "Bytespider",
  "CCBot",
  "cohere-ai",
  "Meta-ExternalAgent",
  "Applebot-Extended",
];

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // /order/[id] shows account credentials after purchase and /orders is
        // a per-browser-session order list — neither should ever reach a
        // search index. /mafia is the admin panel; /api is server-only.
        disallow: ["/mafia", "/api/", "/order/", "/orders"],
      },
      ...AI_CRAWLER_USER_AGENTS.map((userAgent) => ({ userAgent, disallow: "/" })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
