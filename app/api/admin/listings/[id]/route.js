import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { saveListingImage } from "@/app/lib/uploads";

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
  const category = String(formData.get("category") || "").trim();
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
      price: price || existing.price,
      category: category || existing.category,
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
