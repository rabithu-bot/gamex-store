import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { parseRareItems } from "@/app/lib/listingTags";

export async function PUT(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const listingId = Number(id);

  const existing = await prisma.listing.findUnique({ where: { id: listingId } });
  if (!existing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  try {
    const formData = await request.formData();
    const title = String(formData.get("title") || "").trim();
    const description = String(formData.get("description") || "").trim();
    const price = Number(formData.get("price"));
    const finalPrice = price || existing.price;
    // Cleared (left blank) means "no discount" — unlike the fields above, this
    // one has to be settable back to null, so it can't fall back to existing.
    const originalPriceRaw = formData.get("originalPrice");
    const originalPrice = originalPriceRaw ? Number(originalPriceRaw) : null;
    const category = String(formData.get("category") || "").trim();
    // Blank clears it (like originalPrice) rather than falling back to the
    // existing value — an admin removing the UID needs that to actually stick.
    const gameUid = String(formData.get("gameUid") || "").trim() || null;
    const tier = String(formData.get("tier") || "").trim() || null;
    const levelRaw = formData.get("level");
    const level = levelRaw ? Number(levelRaw) : null;
    const server = String(formData.get("server") || "").trim() || null;
    const rareItems = parseRareItems(formData.get("rareItems"));
    const accountId = String(formData.get("accountId") || "").trim();
    const accountPassword = String(formData.get("accountPassword") || "").trim();
    const status = String(formData.get("status") || existing.status);
    // Images are uploaded straight to S3 by the client BEFORE this request
    // (see app/lib/listingImageUpload.js) — this only ever receives URLs as
    // JSON, never raw file bytes. Proxying a batch of many full-resolution
    // screenshots through this route as multipart form data would blow
    // past Vercel's 4.5MB serverless request-body cap and get silently
    // rejected by Vercel's own edge layer before this code ever ran —
    // that's what "Couldn't save changes" with no real error body actually
    // was, not a data-format bug in how images were merged.
    //
    // keepImages: which of the listing's CURRENT images to keep, sent
    // explicitly by the edit form so an admin can remove a bad/duplicate
    // photo, not just add more. Falls back to "keep everything currently
    // saved" when the field is absent, so any other caller of this route
    // keeps behaving exactly as it did before this could remove anything.
    let newImageUrls = [];
    let keptImages;
    try {
      newImageUrls = JSON.parse(formData.get("newImageUrls") || "[]");
      const keepImagesRaw = formData.get("keepImages");
      const existingImages = JSON.parse(existing.images);
      keptImages = keepImagesRaw ? JSON.parse(keepImagesRaw) : existingImages;
    } catch {
      return NextResponse.json({ error: "Malformed image list" }, { status: 400 });
    }

    // Same rule as creating a new listing: never end up with zero photos.
    if (keptImages.length + newImageUrls.length === 0) {
      return NextResponse.json(
        { error: "A listing needs at least one screenshot — add one before saving." },
        { status: 400 }
      );
    }

    const listing = await prisma.listing.update({
      where: { id: listingId },
      data: {
        title: title || existing.title,
        description: description || existing.description,
        price: finalPrice,
        originalPrice: originalPrice && originalPrice > finalPrice ? originalPrice : null,
        category: category || existing.category,
        gameUid,
        tier,
        level,
        server,
        rareItems: JSON.stringify(rareItems),
        accountId: accountId || existing.accountId,
        accountPassword: accountPassword || existing.accountPassword,
        status,
        images: JSON.stringify([...keptImages, ...newImageUrls]),
      },
    });

    return NextResponse.json({ id: listing.id });
  } catch (err) {
    // A raw, unlogged 500 is exactly how a real bug turns into a generic
    // "Couldn't save changes" with nothing to debug from — logged here
    // with enough detail to actually diagnose, and returned to the client
    // too (this route is admin-only, already gated by requireAdmin above,
    // so the extra detail isn't reaching an untrusted caller).
    console.error(`PUT /api/admin/listings/${listingId} failed:`, err);
    return NextResponse.json(
      { error: `Couldn't save changes: ${err.message || "unknown error"}` },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  // Deleting an already-deleted id throws Prisma's P2025 and surfaced as a
  // bare 500 — return the same clean 404 shape PUT already does above.
  const existing = await prisma.listing.findUnique({ where: { id: Number(id) } });
  if (!existing) {
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  await prisma.listing.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
