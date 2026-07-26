import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { saveListingImage } from "@/app/lib/uploads";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const listings = await prisma.listing.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(
    listings.map((listing) => ({ ...listing, images: JSON.parse(listing.images) }))
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
  const accountId = String(formData.get("accountId") || "").trim();
  const accountPassword = String(formData.get("accountPassword") || "").trim();
  const imageFiles = formData.getAll("images").filter((f) => typeof f !== "string");

  if (!title || !price || !category || !accountId || !accountPassword) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const imagePaths = [];
  for (const file of imageFiles) {
    const savedPath = await saveListingImage(file);
    if (savedPath) imagePaths.push(savedPath);
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
      accountId,
      accountPassword,
      images: JSON.stringify(imagePaths),
    },
  });

  return NextResponse.json({ id: listing.id });
}
