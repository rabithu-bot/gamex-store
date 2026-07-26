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

  const existingImages = JSON.parse(existing.images);
  const newImagePaths = [];
  for (const file of newImageFiles) {
    const savedPath = await saveListingImage(file);
    if (savedPath) newImagePaths.push(savedPath);
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
      images: JSON.stringify([...existingImages, ...newImagePaths]),
    },
  });

  return NextResponse.json({ id: listing.id });
}

export async function DELETE(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  await prisma.listing.delete({ where: { id: Number(id) } });
  return NextResponse.json({ ok: true });
}
