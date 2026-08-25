import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { parseRareItems } from "@/app/lib/listingTags";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const listings = await prisma.listing.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      description: true,
      price: true,
      originalPrice: true,
      category: true,
      gameUid: true,
      tier: true,
      level: true,
      server: true,
      rareItems: true,
      accountId: true,
      accountPassword: true,
      status: true,
      images: true,
    },
  });
  return NextResponse.json(
    listings.map((listing) => ({
      ...listing,
      rareItems: JSON.parse(listing.rareItems),
      images: JSON.parse(listing.images || "[]"),
    }))
  );
}

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const price = Number(formData.get("price"));
    const originalPriceRaw = formData.get("originalPrice");
    const originalPrice = originalPriceRaw ? Number(originalPriceRaw) : null;
    const category = String(formData.get("category") || "").trim();
    const gameUid = String(formData.get("gameUid") || "").trim() || null;
    const tier = String(formData.get("tier") || "").trim() || null;
    const levelRaw = formData.get("level");
    const level = levelRaw ? Number(levelRaw) : null;
    const server = String(formData.get("server") || "").trim() || null;
    const rareItems = parseRareItems(formData.get("rareItems"));
    const accountId = String(formData.get("accountId") || "").trim();
    const accountPassword = String(formData.get("accountPassword") || "").trim();
    // Images are uploaded straight to S3 by the client BEFORE this request
    // (see app/lib/listingImageUpload.js) — this only ever receives the
    // resulting URLs as a JSON array, never raw file bytes. A batch of many
    // full-resolution screenshots proxied through this route as multipart
    // form data would blow past Vercel's 4.5MB serverless request-body cap
    // and get silently rejected by Vercel's own edge layer before this code
    // ever ran — that's what "Couldn't save changes" with no real error
    // body actually was.
    let newImageUrls = [];
    try {
      newImageUrls = JSON.parse(formData.get("newImageUrls") || "[]");
    } catch {
      return NextResponse.json({ error: "Malformed image list" }, { status: 400 });
    }

    if (!title || !price || !category || !accountId || !accountPassword) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (newImageUrls.length === 0) {
      return NextResponse.json({ error: "At least one screenshot is required" }, { status: 400 });
    }

    const listing = await prisma.listing.create({
      data: {
        title,
        description,
        price,
        // Only stored as a real discount when it's actually higher than price —
        // the display layer also checks this, but keeping bad data out at the
        // source avoids a listing quietly claiming a "discount" that's not one.
        originalPrice: originalPrice && originalPrice > price ? originalPrice : null,
        category,
        gameUid,
        tier,
        level,
        server,
        rareItems: JSON.stringify(rareItems),
        accountId,
        accountPassword,
        images: JSON.stringify(newImageUrls),
      },
    });

    return NextResponse.json({ id: listing.id });
  } catch (err) {
    // A raw, unlogged 500 is exactly how a real bug turns into a generic
    // "Couldn't save changes" with nothing to debug from — logged here
    // with enough detail to actually diagnose, and returned to the client
    // too (this route is admin-only, already gated by requireAdmin above,
    // so the extra detail isn't reaching an untrusted caller).
    console.error("POST /api/admin/listings failed:", err);
    return NextResponse.json(
      { error: `Couldn't save listing: ${err.message || "unknown error"}` },
      { status: 500 }
    );
  }
}
