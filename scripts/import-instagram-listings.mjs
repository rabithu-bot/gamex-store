// Reads a JSON file of Instagram posts (however you sourced it — Apify export,
// manual list, etc.) and imports each one as a DRAFT listing for admin review.
// This script does no fetching/scraping of Instagram itself — it only reads
// the file you point it at and downloads the image URLs already inside it.
//
// Nothing goes live: every row is inserted with status = "draft" and a
// placeholder accountId/accountPassword, so it stays invisible to buyers
// (see app/page.js and app/product/[id]/page.js's draft guards) until an
// admin fills in the real account credentials and flips it to "available"
// from /mafia/listings.
//
// Expected JSON shape — an array of posts. Common alternate field names
// (e.g. Apify's Instagram scraper output) are auto-detected; see
// normalizePost() below if yours uses something else:
//   [
//     {
//       "url": "https://www.instagram.com/p/Cxxxxx/",   // or "permalink" / "postUrl" — used only to dedupe re-runs
//       "caption": "Free Fire acc, level 70, 3x EVO MAX, 1500rs",
//       "images": ["https://.../1.jpg", "https://.../2.jpg"]  // or "displayUrl" for a single image
//     },
//     ...
//   ]
//
// Requires in .env.local:
//   GEMINI_API_KEY
//   AWS_REGION / AWS_S3_BUCKET / AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY
//   DATABASE_URL
//
// Run with:
//   node --require=./load-env.mjs scripts/import-instagram-listings.mjs posts.json
//   node --require=./load-env.mjs scripts/import-instagram-listings.mjs posts.json --limit 5 --dry-run

import { readFile } from "fs/promises";
import dns from "dns";
import { Client } from "@neondatabase/serverless";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";

// Some network setups (certain sandboxes/containers, DNS64 gateways) return
// a synthetic IPv6 address alongside the real IPv4 one and Node's fetch()
// picks the broken one — this avoids that class of flaky ECONNRESET.
dns.setDefaultResultOrder("ipv4first");

const args = process.argv.slice(2);
const jsonPath = args.find((a) => !a.startsWith("--"));
const DRY_RUN = args.includes("--dry-run");
const limitIndex = args.indexOf("--limit");
const POST_LIMIT = limitIndex !== -1 ? Number(args[limitIndex + 1]) : Infinity;

const GEMINI_MODEL = "gemini-flash-latest";
const MAX_IMAGES_TO_GEMINI = 3; // cost/context control for multi-photo posts
const REQUIRED_ENV = [
  "GEMINI_API_KEY",
  "AWS_REGION",
  "AWS_S3_BUCKET",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "DATABASE_URL",
];

if (!jsonPath) {
  console.error("Usage: node --require=./load-env.mjs scripts/import-instagram-listings.mjs <posts.json> [--limit N] [--dry-run]");
  process.exit(1);
}

for (const name of REQUIRED_ENV) {
  if (!process.env[name]) {
    console.error(`Missing required env var: ${name}`);
    process.exit(1);
  }
}

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const GEMINI_SCHEMA = {
  type: "OBJECT",
  properties: {
    title: { type: "STRING", description: "Short catchy listing title, e.g. 'Free Fire Max Account - Level 65'" },
    category: { type: "STRING", description: "The game name, e.g. 'Free Fire', 'PUBG Mobile', 'BGMI'" },
    gameUid: { type: "STRING", nullable: true, description: "In-game UID if visible/mentioned, else null" },
    level: { type: "INTEGER", nullable: true },
    rareItems: { type: "ARRAY", items: { type: "STRING" }, description: "Short tags for rare skins/items mentioned or visible, e.g. ['3x EVO MAX', 'PRIME 7']" },
    description: { type: "STRING", description: "2-4 sentence buyer-facing description based on the caption and image" },
    price: { type: "INTEGER", nullable: true, description: "Price in INR if clearly stated in the caption, else null" },
  },
  required: ["title", "category", "description", "rareItems"],
};

// Normalizes whatever shape the source JSON uses (Apify's Instagram
// scrapers, a hand-built list, etc.) into { permalink, caption, imageUrls }.
// Extend the fallbacks here if your export uses different field names.
function normalizePost(raw) {
  const permalink = raw.url || raw.permalink || raw.postUrl || raw.link || raw.id;
  const caption = raw.caption ?? raw.text ?? raw.edge_media_to_caption?.edges?.[0]?.node?.text ?? "";

  let imageUrls = [];
  if (Array.isArray(raw.images) && raw.images.length > 0) {
    imageUrls = raw.images;
  } else if (Array.isArray(raw.childPosts) && raw.childPosts.length > 0) {
    imageUrls = raw.childPosts.map((c) => c.displayUrl || c.url).filter(Boolean);
  } else if (raw.displayUrl || raw.display_url) {
    imageUrls = [raw.displayUrl || raw.display_url];
  } else if (raw.imageUrl) {
    imageUrls = [raw.imageUrl];
  }

  // Video-only entries (type/media_type === "Video") have no static image
  // to work with unless a thumbnail is present — fall back to that.
  if (imageUrls.length === 0 && (raw.videoThumbnail || raw.thumbnailUrl)) {
    imageUrls = [raw.videoThumbnail || raw.thumbnailUrl];
  }

  return { permalink: String(permalink), caption, imageUrls };
}

async function fetchImageAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image (${res.status}): ${url}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  return { base64: buffer.toString("base64"), buffer, contentType: res.headers.get("content-type") || "image/jpeg" };
}

async function parseWithGemini(caption, images) {
  const parts = [
    {
      text:
        "You're helping list a gaming account for sale on an e-commerce store, based on an Instagram post. " +
        "Extract structured listing details from the caption and photo(s) below. " +
        "If the caption doesn't clearly state something, use your best guess from the image, or null — don't invent specifics that aren't implied.\n\n" +
        `Caption: ${caption || "(no caption)"}`,
    },
    ...images.map((img) => ({ inline_data: { mime_type: img.contentType, data: img.base64 } })),
  ];

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseMimeType: "application/json", responseSchema: GEMINI_SCHEMA },
      }),
    }
  );

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error(`Gemini returned no content: ${JSON.stringify(data).slice(0, 300)}`);
  return JSON.parse(text);
}

async function uploadToS3(buffer, contentType) {
  const ext = contentType.includes("png") ? ".png" : ".jpg";
  const key = `listings/${Date.now()}-${crypto.randomUUID()}${ext}`;
  if (!DRY_RUN) {
    await s3.send(
      new PutObjectCommand({ Bucket: process.env.AWS_S3_BUCKET, Key: key, Body: buffer, ContentType: contentType })
    );
  }
  return `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
}

// The post's permalink/id is stashed at the end of the description as a
// hidden marker so re-running this script on an overlapping export doesn't
// create duplicate listings.
function alreadyImportedMarker(permalink) {
  return `\n[ig-import:${permalink}]`;
}

async function main() {
  if (DRY_RUN) console.log("*** DRY RUN — no S3 uploads or database writes ***");

  const raw = JSON.parse(await readFile(jsonPath, "utf-8"));
  const rawPosts = Array.isArray(raw) ? raw : raw.items || raw.posts || [];
  const posts = rawPosts.slice(0, POST_LIMIT).map(normalizePost);

  console.log(`Loaded ${posts.length} post(s) from ${jsonPath}.\n`);

  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  let imported = 0;
  let skipped = 0;
  let failed = 0;

  for (const post of posts) {
    try {
      const { rows } = await client.query(
        `SELECT id FROM "Listing" WHERE description LIKE $1`,
        [`%[ig-import:${post.permalink}]%`]
      );
      if (rows.length > 0) {
        console.log(`- Skipping (already imported): ${post.permalink}`);
        skipped++;
        continue;
      }

      if (post.imageUrls.length === 0) {
        console.log(`- Skipping (no usable image found): ${post.permalink}`);
        skipped++;
        continue;
      }

      console.log(`Processing: ${post.permalink}`);
      const downloaded = [];
      for (const url of post.imageUrls) downloaded.push(await fetchImageAsBase64(url));

      const parsed = await parseWithGemini(post.caption, downloaded.slice(0, MAX_IMAGES_TO_GEMINI));

      const s3Urls = [];
      for (const img of downloaded) s3Urls.push(await uploadToS3(img.buffer, img.contentType));

      const description = (parsed.description || "").trim() + alreadyImportedMarker(post.permalink);

      if (!DRY_RUN) {
        await client.query(
          `INSERT INTO "Listing"
             (title, description, price, category, "gameUid", level, "rareItems", images, status, "accountId", "accountPassword")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'draft', $9, $9)`,
          [
            parsed.title || "Untitled (from Instagram import)",
            description,
            parsed.price ?? 0,
            parsed.category || "Uncategorized",
            parsed.gameUid || null,
            parsed.level ?? null,
            JSON.stringify(parsed.rareItems || []),
            JSON.stringify(s3Urls),
            "PENDING_ADMIN_INPUT",
          ]
        );
      }

      console.log(`  ✓ Imported as draft: "${parsed.title}" (${s3Urls.length} image(s), price: ${parsed.price ?? "not detected"})`);
      imported++;
    } catch (err) {
      console.error(`  ✗ Failed on ${post.permalink}: ${err.message}`);
      failed++;
    }
  }

  await client.end();

  console.log("\n== Summary ==");
  console.log(`Imported as draft: ${imported}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  if (imported > 0 && !DRY_RUN) {
    console.log(`\nGo to /mafia/listings to review each draft, fill in the real account ID/password, and flip status to "available".`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
