import { uploadBuffer } from "./s3";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

// Serverless functions run on a read-only filesystem, so uploads can't be
// written to local disk the way they can in local dev — everything goes to
// S3 instead, keyed by a random, unguessable path.
async function saveFile(file, prefix, { maxDimension } = {}) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) return null;

  const ext = path.extname(file.name || "").slice(0, 10);
  const key = `${prefix}/${Date.now()}-${crypto.randomUUID()}${ext}`;
  let buffer = Buffer.from(await file.arrayBuffer());

  // Best-effort downscale/recompress for image uploads — voice-note webm
  // blobs and other non-image attachments pass through untouched. sharp
  // throws on input it can't decode, so a failure here just falls back to
  // the original buffer rather than blocking the upload.
  if (maxDimension && (file.type || "").startsWith("image/")) {
    try {
      buffer = await sharp(buffer)
        .rotate()
        .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();
    } catch {
      // Not decodable by sharp (or already fine) — ship the original bytes.
    }
  }

  return uploadBuffer(key, buffer, file.type || "application/octet-stream");
}

// Payment screenshots: the URL is only ever included in admin-authenticated
// API responses (never sent to the buyer-facing order endpoint), so it stays
// effectively private even though the underlying blob store is public.
export function savePaymentScreenshot(file) {
  return saveFile(file, "payment-screenshots", { maxDimension: 1600 });
}

// Listing photos: public, shown directly on the storefront.
export function saveListingImage(file) {
  return saveFile(file, "listings", { maxDimension: 1600 });
}

// Chat attachments: public (both buyer and admin can view either side's uploads).
export function saveMessageAttachment(file) {
  return saveFile(file, "messages", { maxDimension: 1280 });
}

// UPI payment QR: public, shown on every pending order's payment step.
export function savePaymentQr(file) {
  return saveFile(file, "payment-qr", { maxDimension: 800 });
}

// Trust-building proof screenshots: public, shown on the /proofs page.
export function saveProofImage(file) {
  return saveFile(file, "proofs", { maxDimension: 1600 });
}
