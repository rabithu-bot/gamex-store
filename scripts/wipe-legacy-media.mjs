// One-off: clears every media URL still pointing at the dead AWS S3 bucket
// (gamexstore.s3.ap-south-1.amazonaws.com — AllAccessDisabled, not coming
// back). New uploads go to Cloudinary; this only removes the broken
// legacy references so the site stops rendering 403 placeholders.
//
// Scoped strictly to that one AWS host — anything else (Cloudinary URLs,
// blob: previews, local paths) is left untouched.
//
// DRY RUN BY DEFAULT. Run:
//   node --require=./load-env.mjs scripts/wipe-legacy-media.mjs            # preview only
//   node --require=./load-env.mjs scripts/wipe-legacy-media.mjs --commit   # actually write
//
// --commit writes a full JSON backup of every affected row FIRST
// (media-backup-<timestamp>.json), then does all changes in one
// transaction. Keep that backup: it is the only map back to which file
// belonged to which record if S3 ever becomes readable again.

import pg from "pg";
import fs from "fs";

const COMMIT = process.argv.includes("--commit");
const HOST = "s3.ap-south-1.amazonaws.com";
const LIKE = `%${HOST}%`;
const isAws = (u) => typeof u === "string" && u.includes(HOST);

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
    } catch {}
    const kept = urls.filter((u) => !isAws(u));
    const removed = urls.filter(isAws);
    return { id: l.id, title: l.title, before: urls, after: kept, removed };
  })
  .filter((l) => l.removed.length > 0);

const proofs = (
  await client.query(`SELECT id, url, type, "proofDate", "createdAt" FROM "ProofImage" WHERE url LIKE $1 ORDER BY id`, [LIKE])
).rows;

const orders = (
  await client.query(
    `SELECT id, "screenshotPath", status, "createdAt" FROM "Order" WHERE "screenshotPath" LIKE $1 ORDER BY "createdAt"`,
    [LIKE]
  )
).rows;

const messages = (
  await client.query(
    `SELECT id, "orderId", "attachmentPath", "attachmentType", sender, "createdAt" FROM "Message" WHERE "attachmentPath" LIKE $1 ORDER BY id`,
    [LIKE]
  )
).rows;

const qrSetting = (
  await client.query(`SELECT key, value FROM "Setting" WHERE key = 'paymentQrUrl' AND value LIKE $1`, [LIKE])
).rows;

// ---- report ----
console.log(COMMIT ? "*** COMMIT MODE — writing changes ***\n" : "*** DRY RUN — no changes written (pass --commit to write) ***\n");
console.log(`Listing rows to update:  ${affectedListings.length}  (${affectedListings.reduce((n, l) => n + l.removed.length, 0)} image URLs removed; all become [] : ${affectedListings.every((l) => l.after.length === 0)})`);
console.log(`ProofImage rows to DELETE: ${proofs.length}  (${proofs.filter((p) => p.type === "video").length} video, ${proofs.filter((p) => p.type !== "video").length} image)`);
console.log(`Order.screenshotPath -> NULL: ${orders.length}`);
console.log(`Message attachment -> NULL:  ${messages.length}  (${messages.filter((m) => m.attachmentType === "audio").length} audio, rest image)`);
console.log(`Setting[paymentQrUrl] to DELETE: ${qrSetting.length}  ${qrSetting.length ? "(storefront falls back to bundled /upi-qr.jpg)" : ""}`);

if (!COMMIT) {
  await client.end();
  console.log("\nNothing written. Re-run with --commit to apply.");
  process.exit(0);
}

// ---- backup ----
const backupPath = `media-backup-${Date.now()}.json`;
fs.writeFileSync(
  backupPath,
  JSON.stringify(
    {
      exportedAt: new Date().toISOString(),
      note: "Snapshot taken immediately before wipe-legacy-media.mjs --commit. The only map back to which file belonged to which record.",
      listings: affectedListings,
      proofs,
      orders,
      messages,
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
  const delProofs = await client.query(`DELETE FROM "ProofImage" WHERE url LIKE $1`, [LIKE]);
  const nullOrders = await client.query(`UPDATE "Order" SET "screenshotPath" = NULL WHERE "screenshotPath" LIKE $1`, [LIKE]);
  const nullMsgs = await client.query(
    `UPDATE "Message" SET "attachmentPath" = NULL, "attachmentType" = NULL WHERE "attachmentPath" LIKE $1`,
    [LIKE]
  );
  const delQr = await client.query(`DELETE FROM "Setting" WHERE key = 'paymentQrUrl' AND value LIKE $1`, [LIKE]);

  await client.query("COMMIT");

  console.log("\n== applied ==");
  console.log(`  listings updated:        ${affectedListings.length}`);
  console.log(`  proof rows deleted:      ${delProofs.rowCount}`);
  console.log(`  order screenshots nulled:${nullOrders.rowCount}`);
  console.log(`  message attachments nulled:${nullMsgs.rowCount}`);
  console.log(`  paymentQrUrl deleted:    ${delQr.rowCount}`);
} catch (err) {
  await client.query("ROLLBACK");
  console.error("\nROLLED BACK — no changes applied:", err);
  process.exit(1);
} finally {
  await client.end();
}
