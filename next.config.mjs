/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // The whole app now renders plain <img> tags pointing straight at S3 —
    // this is a belt-and-suspenders guard so a future next/image usage
    // can't silently start burning Vercel's Image Optimization quota again
    // without someone noticing (this was the actual cause of a 402 outage
    // on the Orders admin page's proof thumbnails).
    unoptimized: true,
  },
};

export default nextConfig;
