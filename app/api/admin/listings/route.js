import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { saveListingImage } from "@/app/lib/uploads";
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
  const imageFiles = formData.getAll("images").filter((f) => typeof f !== "string");

  if (!title || !price || !category || !accountId || !accountPassword) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (imageFiles.length === 0) {
    return NextResponse.json({ error: "At least one screenshot is required" }, { status: 400 });
  }

  const imagePaths = [];
  for (const file of imageFiles) {
    const savedPath = await saveListingImage(file);
    if (savedPath) imagePaths.push(savedPath);
  }
  // Every file was rejected/failed to upload (e.g. corrupt file, S3
  // hiccup) — this used to fail silently and create the listing anyway
  // with images: "[]". Fail the request instead so the admin can retry
  // rather than discover it later on the live listing.
  if (imagePaths.length === 0) {
    return NextResponse.json(
      { error: "Couldn't upload the selected image(s) — please try again." },
      { status: 500 }
    );
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
      images: JSON.stringify(imagePaths),
    },
  });

  return NextResponse.json({ id: listing.id });
}
