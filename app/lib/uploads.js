import { mkdir, writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

// STORAGE_DIR lets a host mount one persistent disk over this whole folder
// (e.g. Render). Defaults to the project root so local dev is unaffected.
const STORAGE_ROOT = path.join(process.env.STORAGE_DIR || process.cwd(), "storage", "uploads");
const PRIVATE_UPLOAD_DIR = path.join(STORAGE_ROOT, "private");
const PUBLIC_LISTING_DIR = path.join(STORAGE_ROOT, "listings");
const PUBLIC_MESSAGE_DIR = path.join(STORAGE_ROOT, "messages");

async function saveFile(file, dir) {
  if (!file || typeof file.arrayBuffer !== "function") return null;

  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name || "").slice(0, 10);
  const safeName = `${Date.now()}-${crypto.randomUUID()}${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  await writeFile(path.join(dir, safeName), buffer);

  return safeName;
}

// Payment screenshots: private, only ever served through the admin-authenticated route.
export function savePaymentScreenshot(file) {
  return saveFile(file, PRIVATE_UPLOAD_DIR);
}

export function paymentScreenshotDir() {
  return PRIVATE_UPLOAD_DIR;
}

// Listing photos: public, served through an unauthenticated API route reading from disk.
export async function saveListingImage(file) {
  const fileName = await saveFile(file, PUBLIC_LISTING_DIR);
  return fileName ? `/api/uploads/listings/${fileName}` : null;
}

export function listingImageDir() {
  return PUBLIC_LISTING_DIR;
}

// Chat attachments: public (both buyer and admin can view either side's uploads),
// served through an unauthenticated API route reading from disk.
export async function saveMessageAttachment(file) {
  const fileName = await saveFile(file, PUBLIC_MESSAGE_DIR);
  return fileName ? `/api/uploads/messages/${fileName}` : null;
}

export function messageAttachmentDir() {
  return PUBLIC_MESSAGE_DIR;
}
