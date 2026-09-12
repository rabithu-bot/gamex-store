// One-off: backfills the auto quality-enhancement (added for new uploads
// in app/lib/cloudinary.js — enhanceImageUrl/enhanceVideoUrl) onto every
// image/video already stored in the DB from before that change shipped.
//
// Purely a URL rewrite — Cloudinary applies (and caches) the
// transformation at delivery time, so nothing gets re-uploaded or
// re-encoded here. Skips anything that isn't a recognizable Cloudinary
// URL, and skips anything that already has the transformation applied
// (so re-running this after new uploads start carrying it is a no-op for
// those rows, not a double-application).
//
// DRY RUN BY DEFAULT. Run:
//   node --require=./load-env.mjs scripts/enhance-existing-media.mjs            # preview only
//   node --require=./load-env.mjs scripts/enhance-existing-media.mjs --commit   # actually write
//
// --commit writes a full JSON backup of every affected row's PREVIOUS
// value FIRST (media-enhance-backup-<timestamp>.json), then does all
// changes in one transaction.

import pg from "pg";
import fs from "fs";

const COMMIT = process.argv.includes("--commit");

const IMAGE_TRANSFORM = "e_improve:100,e_sharpen:100,e_saturation:20,e_contrast:10";
const VIDEO_TRANSFORM = "q_auto:best";

// Same logic as withTransformation in app/lib/cloudinary.js, plus the
// "already enhanced" and "not a Cloudinary URL" guards this backfill
// specifically needs that a fresh upload never has to worry about.
function enhance(url, transformation) {
  if (typeof url !== "string" || !url.startsWith("https://res.cloudinary.com/")) return null;
  if (url.includes(transformation)) return null; // already carries this exact transform
  const marker = "/upload/";
  const idx = url.indexOf(marker);
  if (idx === -1) return null;
  const insertAt = idx + marker.length;
  return `${url.slice(0, insertAt)}${transformation}/${url.slice(insertAt)}`;
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

// ---- collect everything that will be touched (for backup + reporting) ----
const listings = (await client.query('SELECT id, title, images FROM "Listing" ORDER BY id')).rows;
const affectedListings = listings
  .map((l) => {
    let urls = [];
    try {
      urls = JSON.parse(l.images || "[]");
    } catch {
      return null;
    }
    if (!Array.isArray(urls)) return null;
    let changed = false;
    const after = urls.map((u) => {
      const e = enhance(u, IMAGE_TRANSFORM);
      if (e) changed = true;
      return e || u;
    });
    return changed ? { id: l.id, title: l.title, before: urls, after } : null;
  })
  .filter(Boolean);

const orders = (await client.query(`SELECT id, "screenshotPath" FROM "Order" WHERE "screenshotPath" IS NOT NULL ORDER BY "createdAt"`)).rows
  .map((o) => ({ id: o.id, before: o.screenshotPath, after: enhance(o.screenshotPath, IMAGE_TRANSFORM) }))
  .filter((o) => o.after);

const messages = (
  await client.query(
    `SELECT id, "attachmentPath", "attachmentType" FROM "Message" WHERE "attachmentPath" IS NOT NULL ORDER BY id`
  )
).rows
  .filter((m) => m.attachmentType !== "audio") // voice notes are never touched
  .map((m) => {
    const transform = m.attachmentType === "video" ? VIDEO_TRANSFORM : IMAGE_TRANSFORM;
    return { id: m.id, before: m.attachmentPath, after: enhance(m.attachmentPath, transform) };
  })
  .filter((m) => m.after);

const proofs = (await client.query(`SELECT id, url, type FROM "ProofImage" ORDER BY id`)).rows
  .map((p) => {
    const transform = p.type === "video" ? VIDEO_TRANSFORM : IMAGE_TRANSFORM;
    return { id: p.id, before: p.url, after: enhance(p.url, transform) };
  })
  .filter((p) => p.after);

const qrSetting = (await client.query(`SELECT key, value FROM "Setting" WHERE key = 'paymentQrUrl'`)).rows
  .map((s) => ({ key: s.key, before: s.value, after: enhance(s.value, IMAGE_TRANSFORM) }))
  .filter((s) => s.after);

// ---- report ----
console.log(COMMIT ? "*** COMMIT MODE — writing changes ***\n" : "*** DRY RUN — no changes written (pass --commit to write) ***\n");
console.log(`Listing rows to update:        ${affectedListings.length}`);
console.log(`Order.screenshotPath to update: ${orders.length}`);
console.log(`Message.attachmentPath to update: ${messages.length}`);
console.log(`ProofImage.url to update:      ${proofs.length}`);
console.log(`Setting[paymentQrUrl] to update: ${qrSetting.length}`);

const totalRows = affectedListings.length + orders.length + messages.length + proofs.length + qrSetting.length;

if (!COMMIT) {
  await client.end();
  console.log(`\n${totalRows} row(s) would change. Nothing written. Re-run with --commit to apply.`);
  process.exit(0);
}

// ---- backup ----
const backupPath = `media-enhance-backup-${Date.now()}.json`;
fs.writeFileSync(
  backupPath,
  JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      note: "Previous (pre-enhancement) URL values, snapshotted immediately before enhance-existing-media.mjs --commit.",
      listings: affectedListings,
      orders,
      messages,
      proofs,
      settings: qrSetting,
    },
    null,
    2
  )
);
console.log(`\nBackup written: ${backupPath}`);

// ---- apply, one transaction ----
try {
  await client.query("BEGIN");

  for (const l of affectedListings) {
    await client.query(`UPDATE "Listing" SET images = $1 WHERE id = $2`, [JSON.stringify(l.after), l.id]);
  }
  for (const o of orders) {
    await client.query(`UPDATE "Order" SET "screenshotPath" = $1 WHERE id = $2`, [o.after, o.id]);
  }
  for (const m of messages) {
    await client.query(`UPDATE "Message" SET "attachmentPath" = $1 WHERE id = $2`, [m.after, m.id]);
  }
  for (const p of proofs) {
    await client.query(`UPDATE "ProofImage" SET url = $1 WHERE id = $2`, [p.after, p.id]);
  }
  for (const s of qrSetting) {
    await client.query(`UPDATE "Setting" SET value = $1 WHERE key = $2`, [s.after, s.key]);
  }

  await client.query("COMMIT");

  console.log("\n== applied ==");
  console.log(`  listings updated:  ${affectedListings.length}`);
  console.log(`  orders updated:    ${orders.length}`);
  console.log(`  messages updated:  ${messages.length}`);
  console.log(`  proofs updated:    ${proofs.length}`);
  console.log(`  settings updated:  ${qrSetting.length}`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error("\nROLLED BACK — no changes applied:", err);
  process.exit(1);
} finally {
  await client.end();
}
