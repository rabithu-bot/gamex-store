import crypto from "crypto";

// Cloudinary media hosting — replaced AWS S3 after that account was locked.
// Hand-rolled against the upload REST API (no `cloudinary` SDK) to match
// how the rest of this project talks to external services (see
// elevenLabsTts.js), and to keep the dependency list lean now that
// @aws-sdk is gone.
//
// The /auto/ upload endpoint lets Cloudinary detect image vs video vs
// audio itself, so nothing here has to branch on file type. Every upload
// returns a permanent public CDN URL (`secure_url`) — no expiry, no auth
// headers — which is what gets stored in the DB.

const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

function uploadEndpoint() {
  return `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;
}

// Without this, a missing env var silently builds a malformed URL
// (".../v1_1/undefined/auto/upload"), Cloudinary rejects it, and the
// resulting error is confusing to whoever's debugging it. Fails loudly
// and specifically instead — this is almost always what's wrong when an
// upload route 500s right after a fresh deploy that didn't get the env
// vars set in Vercel yet.
function assertConfigured() {
  const missing = ["CLOUDINARY_CLOUD_NAME", "CLOUDINARY_API_KEY", "CLOUDINARY_API_SECRET"].filter(
    (name) => !process.env[name]
  );
  if (missing.length) {
    throw new Error(`Cloudinary is not configured — missing ${missing.join(", ")}`);
  }
}

// Cloudinary's signature scheme: sha1 of the to-be-signed params as a
// sorted "k=v&k=v" string with api_secret appended. Empty/undefined values
// are dropped (Cloudinary does the same), and the exact same set must be
// sent in the request (minus file/api_key/signature) — so `sendableParams`
// gives callers the filtered set to append to the form.
function sendableParams(params) {
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "")
  );
}

function signParams(params) {
  const clean = sendableParams(params);
  const toSign = Object.keys(clean)
    .sort()
    .map((k) => `${k}=${clean[k]}`)
    .join("&");
  return crypto.createHash("sha1").update(toSign + apiSecret).digest("hex");
}

// Splits an old S3-style key ("proofs/1699-uuid.jpg") into the folder +
// extension-less public_id Cloudinary wants. Cloudinary re-adds the right
// extension on the resulting URL based on the detected format.
function keyToTarget(key) {
  const slash = key.lastIndexOf("/");
  return {
    folder: slash >= 0 ? key.slice(0, slash) : "",
    publicId: (slash >= 0 ? key.slice(slash + 1) : key).replace(/\.[^.]+$/, ""),
  };
}

// Server-side upload (payment screenshots, QR, proof images, chat image
// attachments, TTS audio). Returns the permanent secure_url string, same
// contract the old S3 uploadBuffer had.
export async function uploadBuffer(key, buffer, contentType) {
  assertConfigured();
  const { folder, publicId } = keyToTarget(key);
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = sendableParams({ folder, public_id: publicId, timestamp });

  const form = new FormData();
  form.append("file", new Blob([buffer], { type: contentType || "application/octet-stream" }));
  form.append("api_key", apiKey);
  for (const [k, v] of Object.entries(signed)) form.append(k, String(v));
  form.append("signature", signParams(signed));

  const res = await fetch(uploadEndpoint(), { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Cloudinary upload failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = await res.json();
  return json.secure_url;
}

// Signed one-time params for a direct browser -> Cloudinary upload, used
// for large files (videos, big image batches) that can't be proxied
// through a Next.js route — Vercel caps a serverless request body at
// 4.5MB, enforced at its edge before any app code runs. The api secret
// never leaves the server; only this signature does. The client POSTs
// multipart { file, ...fields } to uploadUrl and reads `secure_url` from
// the JSON response.
export function getSignedUploadParams(folder, fileName) {
  assertConfigured();
  const base =
    String(fileName || "")
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 60) || "file";
  const publicId = `${Date.now()}-${crypto.randomUUID()}-${base}`.slice(0, 180);
  const timestamp = Math.floor(Date.now() / 1000);
  const signed = { folder, public_id: publicId, timestamp };

  return {
    uploadUrl: uploadEndpoint(),
    fields: {
      api_key: apiKey,
      timestamp: String(timestamp),
      folder,
      public_id: publicId,
      signature: signParams(signed),
    },
  };
}
