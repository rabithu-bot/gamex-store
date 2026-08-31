import { NextResponse } from "next/server";

// Next's file-based manifest.js convention (used at app/manifest.js for the
// storefront) only generates a manifest at the app root — it doesn't support
// a scoped one for a subtree, so this is a plain route handler doing the
// same thing by hand for /mafia. Lets the admin dashboard install as its
// own home-screen app, separate from the storefront's. Reuses the same
// icon files (no new art needed) but its own name/start_url/scope so the
// two installs don't collide.
export async function GET() {
  return NextResponse.json(
    {
      name: "GameX Store - Admin Dashboard",
      short_name: "GameX Admin",
      description: "Vault Control — manage orders, listings, and messages for GameX Store.",
      start_url: "/mafia",
      scope: "/mafia",
      display: "standalone",
      background_color: "#050609",
      theme_color: "#050609",
      orientation: "portrait",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
        { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
        { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
