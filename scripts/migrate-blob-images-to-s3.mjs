// One-off migration: copies every file still hosted on the old Vercel Blob
// store over to S3 and rewrites the DB rows that reference it. Safe to
// re-run — anything that isn't a vercel-storage.com URL is left untouched,
// so already-migrated rows are skipped automatically.
//
// Requires the Blob store to actually be readable again (billing suspension
// resolved) — until then every fetch below 403s and the row is left as-is.
//
// Run with:
//   node --require=./load-env.mjs scripts/migrate-blob-images-to-s3.mjs
//   node --require=./load-env.mjs scripts/migrate-blob-images-to-s3.mjs --dry-run

import { Client } from "@neondatabase/serverless";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import crypto from "crypto";
import path from "path";

const DRY_RUN = process.argv.includes("--dry-run");
const OLD_HOST_MARKER = "public.blob.vercel-storage.com";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const stats = { migrated: 0, failed: 0, skipped: 0 };

function isOldBlobUrl(url) {
  return typeof url === "string" && url.includes(OLD_HOST_MARKER);
}

async function migrateUrl(oldUrl, prefix) {
  if (!isOldBlobUrl(oldUrl)) {
    stats.skipped++;
    return oldUrl;
  }

  const res = await fetch(oldUrl);
  if (!res.ok) {
    console.error(`  ✗ ${res.status} ${oldUrl}`);
    stats.failed++;
    return oldUrl; // leave the old (broken) URL in place rather than lose the reference
  }

  const buffer = Buffer.from(await res.arrayBuffer());
  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const ext = path.extname(new URL(oldUrl).pathname).slice(0, 10);
  const key = `${prefix}/${Date.now()}-${crypto.randomUUID()}${ext}`;

  if (!DRY_RUN) {
    await s3.send(
      new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
      })
    );
  }

  const newUrl = `https://${process.env.AWS_S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
  console.log(`  ✓ ${oldUrl}\n    -> ${newUrl}`);
  stats.migrated++;
  return newUrl;
}

async function migrateListings(client) {
  console.log("\n== Listing.images ==");
  const { rows } = await client.query(`SELECT id, images FROM "Listing"`);
  for (const row of rows) {
    let urls;
    try {
      urls = JSON.parse(row.images || "[]");
    } catch {
      continue;
    }
    if (!urls.some(isOldBlobUrl)) continue;

    console.log(`Listing #${row.id}:`);
    const migrated = [];
    for (const url of urls) migrated.push(await migrateUrl(url, "listings"));

    if (!DRY_RUN) {
      await client.query(`UPDATE "Listing" SET images = $1 WHERE id = $2`, [JSON.stringify(migrated), row.id]);
    }
  }
}

async function migrateSingleUrlColumn(client, table, column, prefix) {
  console.log(`\n== ${table}.${column} ==`);
  const { rows } = await client.query(
    `SELECT id, "${column}" AS value FROM "${table}" WHERE "${column}" LIKE $1`,
    [`%${OLD_HOST_MARKER}%`]
  );
  for (const row of rows) {
    console.log(`${table} #${row.id}:`);
    const newUrl = await migrateUrl(row.value, prefix);
    if (!DRY_RUN && newUrl !== row.value) {
      await client.query(`UPDATE "${table}" SET "${column}" = $1 WHERE id = $2`, [newUrl, row.id]);
    }
  }
}

async function migrateSetting(client, key, prefix) {
  console.log(`\n== Setting[${key}] ==`);
  const { rows } = await client.query(`SELECT value FROM "Setting" WHERE key = $1`, [key]);
  if (rows.length === 0 || !isOldBlobUrl(rows[0].value)) return;

  console.log(`Setting ${key}:`);
  const newUrl = await migrateUrl(rows[0].value, prefix);
  if (!DRY_RUN && newUrl !== rows[0].value) {
    await client.query(`UPDATE "Setting" SET value = $1 WHERE key = $2`, [newUrl, key]);
  }
}

async function main() {
  if (DRY_RUN) console.log("*** DRY RUN — no writes to S3 or the database ***");

  const client = new Client(process.env.DATABASE_URL);
  await client.connect();

  await migrateListings(client);
  await migrateSingleUrlColumn(client, "Order", "screenshotPath", "payment-screenshots");
  await migrateSingleUrlColumn(client, "Message", "attachmentPath", "messages");
  await migrateSingleUrlColumn(client, "ProofImage", "url", "proofs");
  await migrateSetting(client, "paymentQrUrl", "payment-qr");

  await client.end();

  console.log("\n== Summary ==");
  console.log(`Migrated: ${stats.migrated}`);
  console.log(`Failed (still unreadable — left as-is): ${stats.failed}`);
  console.log(`Skipped (already on S3 or not a Blob URL): ${stats.skipped}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
