import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/session";
import { saveListingImage } from "@/app/lib/uploads";

// A normal browser User-Agent — the same header any link-preview unfurler
// (Slack, Discord, WhatsApp) sends when reading a public page's Open Graph
// tags. This only ever reads ONE admin-supplied link at a time; it does not
// crawl, paginate, or attempt to get past a login wall.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function extractMetaContent(html, property) {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i"),
  ];
  for (const re of patterns) {
    const match = html.match(re);
    if (match) return match[1];
  }
  return null;
}

function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

// Instagram's og:description on a post reads like:
// `123 likes, 4 comments - username on Month Day, Year: "the actual caption"`
function parseCaption(ogDescription) {
  if (!ogDescription) return "";
  const match = ogDescription.match(/:\s*"(.*)"\s*$/);
  return match ? match[1] : ogDescription;
}

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json().catch(() => ({}));
  if (!url || !/^https?:\/\/(www\.)?instagram\.com\//i.test(url)) {
    return NextResponse.json({ error: "Enter a valid instagram.com post link" }, { status: 400 });
  }

  let html;
  try {
    const pageRes = await fetch(url, { headers: { "User-Agent": BROWSER_UA } });
    html = await pageRes.text();
  } catch {
    return NextResponse.json({ error: "Couldn't reach that link" }, { status: 502 });
  }

  const ogImage = extractMetaContent(html, "og:image");
  const ogDescription = decodeHtmlEntities(extractMetaContent(html, "og:description"));
  const ogTitle = decodeHtmlEntities(extractMetaContent(html, "og:title"));

  if (!ogImage && !ogDescription) {
    return NextResponse.json(
      { error: "Instagram didn't show any public data for this link — fill it in manually" },
      { status: 422 }
    );
  }

  let imageUrl = null;
  if (ogImage) {
    try {
      const imgRes = await fetch(ogImage);
      const buffer = Buffer.from(await imgRes.arrayBuffer());
      const contentType = imgRes.headers.get("content-type") || "image/jpeg";
      const file = new File([buffer], `instagram-${Date.now()}.jpg`, { type: contentType });
      imageUrl = await saveListingImage(file);
    } catch {
      // Image re-host failed — caption/title are still useful on their own.
    }
  }

  return NextResponse.json({
    caption: parseCaption(ogDescription),
    title: ogTitle || "",
    imageUrl,
  });
}
