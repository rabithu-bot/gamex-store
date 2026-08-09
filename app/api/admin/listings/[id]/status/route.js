import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

const VALID_STATUSES = ["available", "sold"];

export async function PATCH(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { status } = await request.json().catch(() => ({}));

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const listing = await prisma.listing.update({
    where: { id: Number(id) },
    data: { status },
  });

  return NextResponse.json({ id: listing.id, status: listing.status });
}
