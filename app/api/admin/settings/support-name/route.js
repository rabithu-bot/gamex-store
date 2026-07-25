import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

export async function PATCH(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { name } = await request.json();
  const trimmed = String(name || "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Name can't be empty" }, { status: 400 });
  }
  if (trimmed.length > 30) {
    return NextResponse.json({ error: "Keep it under 30 characters" }, { status: 400 });
  }

  await prisma.setting.upsert({
    where: { key: "supportDisplayName" },
    update: { value: trimmed },
    create: { key: "supportDisplayName", value: trimmed },
  });

  return NextResponse.json({ name: trimmed });
}
