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
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Nobody should be able to frame this site — the real target is
          // the admin panel, where a hidden iframe over a lookalike page
          // could get an authenticated admin to click something they can't
          // see. frame-ancestors is the modern equivalent and covers
          // browsers that ignore X-Frame-Options; both are cheap to send.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          // Chat/proof uploads land on S3 with a browser-supplied
          // Content-Type; nosniff stops a browser from second-guessing that
          // and executing something as script.
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Order URLs contain the order id — don't leak them to any
          // third-party origin a customer clicks through to.
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // The site needs none of these; denying them up front means a
          // future dependency can't quietly start asking customers for
          // camera/location access. Microphone is deliberately left out —
          // voice notes in support chat genuinely need it.
          { key: "Permissions-Policy", value: "camera=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
        ],
      },
    ];
  },
};

export default nextConfig;
