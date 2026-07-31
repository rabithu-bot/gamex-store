import { SITE_URL } from "@/app/lib/siteUrl";

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
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
