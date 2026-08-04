/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Wildcarded rather than pinned to one bucket/region string so config
    // doesn't need to change if the bucket moves regions or a second bucket
    // is added later.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      // Pre-migration uploads still point at Vercel Blob URLs stored in the
      // DB — only new uploads go to S3, nothing here backfills old rows.
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
    formats: ["image/webp"],
    qualities: [75, 90],
  },
};

export default nextConfig;
