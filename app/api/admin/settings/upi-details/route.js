import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

export async function PATCH(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const upiId = typeof body.upiId === "string" ? body.upiId.trim() : "";
  const payeeName = typeof body.payeeName === "string" ? body.payeeName.trim() : "";

  if (!upiId || !payeeName) {
    return NextResponse.json({ error: "UPI ID and payee name are both required" }, { status: 400 });
  }

  await Promise.all([
    prisma.setting.upsert({
      where: { key: "upiId" },
      update: { value: upiId },
      create: { key: "upiId", value: upiId },
    }),
    prisma.setting.upsert({
      where: { key: "upiPayeeName" },
      update: { value: payeeName },
      create: { key: "upiPayeeName", value: payeeName },
    }),
  ]);

  return NextResponse.json({ upiId, payeeName });
}
