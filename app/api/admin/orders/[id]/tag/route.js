import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { CUSTOMER_TAGS } from "@/app/lib/customerTags";

export async function PATCH(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const { tag } = await request.json().catch(() => ({}));

  // null/empty clears the tag; anything else must be one of the presets —
  // never store arbitrary free text since the UI only ever offers presets.
  const normalized = tag || null;
  if (normalized && !CUSTOMER_TAGS.some((t) => t.key === normalized)) {
    return NextResponse.json({ error: "Unknown tag" }, { status: 400 });
  }

  await prisma.order.update({ where: { id }, data: { tag: normalized } });

  return NextResponse.json({ ok: true, tag: normalized });
}
