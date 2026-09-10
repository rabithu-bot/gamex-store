import { uploadBuffer, getSignedUploadParams } from "./cloudinary";
import path from "path";
import crypto from "crypto";
import sharp from "sharp";

// Serverless functions run on a read-only filesystem, so uploads can't be
// written to local disk the way they can in local dev — everything goes to
// Cloudinary (see cloudinary.js) instead, keyed by a random, unguessable
// path.
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

// Chat attachments: public (both buyer and admin can view either side's uploads).
export function saveMessageAttachment(file) {
  return saveFile(file, "messages", { maxDimension: 1280 });
}

// Large/many-file uploads are too big to reliably proxy through a
// serverless function (Vercel caps a Serverless Function's request body at
// 4.5MB, enforced by its own edge layer before any of this app's code
// runs), so the browser uploads straight to Cloudinary with a one-time
// signed params set instead — no bytes pass through here. Originally
// video-only; now also used for listing photos, since a real batch of
// 25-100 full-resolution screenshots hits the exact same cap a single
// video does. Cloudinary detects image vs video itself, so file type /
// extension don't matter here.

// Chat video attachments.
export function getMessageVideoUploadUrl(fileName) {
  return getSignedUploadParams("messages", fileName);
}

// Proof videos: same folder/gallery as proof screenshots, just a video
// instead of an image (see ProofImage.type).
export function getProofVideoUploadUrl(fileName) {
  return getSignedUploadParams("proofs", fileName);
}

// Listing photos: public, shown directly on the storefront.
export function getListingImageUploadUrl(fileName) {
  return getSignedUploadParams("listings", fileName);
}

// UPI payment QR: public, shown on every pending order's payment step.
export function savePaymentQr(file) {
  return saveFile(file, "payment-qr", { maxDimension: 800 });
}

// Trust-building proof screenshots: public, shown on the /proofs page.
export function saveProofImage(file) {
  return saveFile(file, "proofs", { maxDimension: 1600 });
}
