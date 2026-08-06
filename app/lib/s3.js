import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const region = process.env.AWS_REGION;
const bucket = process.env.AWS_S3_BUCKET;

// Lazily constructed — importing this module shouldn't throw just because
// AWS env vars aren't set yet (e.g. during `next build` on a machine that
// only has them at runtime).
let client = null;
function getClient() {
  if (!client) {
    client = new S3Client({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return client;
}

// Objects are served straight off the bucket's virtual-hosted URL — public
// readability comes from the bucket policy (see AWS_S3_SETUP.md), not an
// object ACL, since new buckets have ACLs disabled by default.
//
// Every key is a fresh random UUID that's never overwritten, so it's safe to
// tell browsers/CDNs to cache the object forever instead of revalidating.
export async function uploadBuffer(key, buffer, contentType) {
  await getClient().send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType || "application/octet-stream",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

// Video chat attachments upload straight from the browser to S3 instead of
// proxying through a Next.js route — Vercel's Serverless Functions cap
// request bodies at 4.5MB, which most videos exceed well before Next.js
// code ever runs. A short-lived presigned PUT URL lets the browser send the
// bytes directly, so the API route only ever sees the small JSON message
// (attachment URL + type) once the upload itself has finished.
export async function getPresignedUploadUrl(key, contentType) {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType || "application/octet-stream",
    CacheControl: "public, max-age=31536000, immutable",
  });
  const uploadUrl = await getSignedUrl(getClient(), command, { expiresIn: 300 });
  return { uploadUrl, publicUrl: `https://${bucket}.s3.${region}.amazonaws.com/${key}` };
}
