import { put } from "@vercel/blob";
import path from "path";
import crypto from "crypto";

// Vercel's serverless functions run on a read-only filesystem, so uploads
// can't be written to local disk the way they can in local dev — everything
// goes to Vercel Blob instead, keyed by a random, unguessable path.
async function saveFile(file, prefix) {
  if (!file || typeof file.arrayBuffer !== "function" || file.size === 0) return null;

  const ext = path.extname(file.name || "").slice(0, 10);
  const key = `${prefix}/${Date.now()}-${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const blob = await put(key, buffer, {
    access: "public",
    contentType: file.type || undefined,
  });

  return blob.url;
}

// Payment screenshots: the URL is only ever included in admin-authenticated
// API responses (never sent to the buyer-facing order endpoint), so it stays
// effectively private even though the underlying blob store is public.
export function savePaymentScreenshot(file) {
  return saveFile(file, "payment-screenshots");
}

// Listing photos: public, shown directly on the storefront.
export function saveListingImage(file) {
  return saveFile(file, "listings");
}

// Chat attachments: public (both buyer and admin can view either side's uploads).
export function saveMessageAttachment(file) {
  return saveFile(file, "messages");
}
