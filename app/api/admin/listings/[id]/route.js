import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { saveListingImage } from "@/app/lib/uploads";
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
  const newImageFiles = formData.getAll("images").filter((f) => typeof f !== "string");
  // Which of the listing's CURRENT images to keep — sent explicitly by the
  // edit form so an admin can remove a bad/duplicate photo, not just add
  // more. Falls back to "keep everything currently saved" when the field
  // is absent, so any other caller of this route (or an old cached form)
  // keeps behaving exactly as it did before this could remove anything.
  const keepImagesRaw = formData.get("keepImages");
  const existingImages = JSON.parse(existing.images);
  const keptImages = keepImagesRaw ? JSON.parse(keepImagesRaw) : existingImages;

  const newImagePaths = [];
  for (const file of newImageFiles) {
    const savedPath = await saveListingImage(file);
    if (savedPath) newImagePaths.push(savedPath);
  }

  // Same rule as creating a new listing: never end up with zero photos.
  if (keptImages.length + newImagePaths.length === 0) {
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
      images: JSON.stringify([...keptImages, ...newImagePaths]),
    },
  });

  return NextResponse.json({ id: listing.id });
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
