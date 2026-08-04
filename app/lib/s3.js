import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

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
