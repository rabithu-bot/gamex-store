This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## AI crawler protection

This site blocks AI-training/scraping crawlers and states its usage terms
at several layers, all application-level (enforced by this Next.js app
once a request reaches it):

- **`app/robots.js`** — disallows a named list of AI crawlers (GPTBot,
  ClaudeBot, Claude-Web, Claude-User, PerplexityBot, CCBot, Bytespider,
  Diffbot, Omgilibot, Amazonbot, ImagesiftBot, and others) while still
  allowing Google/Bing to index the storefront normally — this only works
  on crawlers that choose to honor `robots.txt`.
- **`public/llms.txt`** — the emerging plain-text convention for stating
  AI usage terms directly to any model that reads it.
- **`middleware.js`** — the real enforcement layer: 403s the same crawler
  list (plus generic scripted HTTP clients like `curl`/`python-requests`/
  headless browsers) at the edge, case-insensitively, before any page
  renders or DB query runs. Also blocks a live clone of this site's
  frontend from calling back into this site's own API cross-origin. Never
  blocks Googlebot, Bingbot, or link-preview bots (Telegram, WhatsApp,
  Twitter, Facebook) — the storefront depends on organic search traffic
  and on shared links unfurling correctly in chat apps.
- **`next.config.mjs`** — `X-Robots-Tag: noai, noimageai` on every
  response, plus production hardening (no source maps, `console.*`
  stripped) unrelated to crawling but in the same "don't make copying
  convenient" spirit.
- **`app/layout.js`** — matching `robots` meta tag, a `<link
  rel="terms-of-service">` pointing at `/terms`, and an HTML comment
  watermark that travels with any raw copy of the page source.
- **`app/terms/page.js` (Section 10)** — the actual legal restriction on
  scraping, cloning, and automated/AI-assisted replication; everything
  above is a technical signal or backstop, this is what has real legal
  weight.

**None of this stops a sufficiently determined human** — a browser must
download the full HTML/CSS/JS to render the page at all, so it can always
be viewed or saved by whoever receives it; there is no technical
measure that changes that. If you're using Cloudflare in front of this
deployment, its dashboard toggle under **Security → Bots → Block AI
Scrapers and Crawlers** is worth enabling separately — it's the only
layer here that would enforce at the network/DNS level, before a request
ever reaches this app, rather than by requesting compliance once it does.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
