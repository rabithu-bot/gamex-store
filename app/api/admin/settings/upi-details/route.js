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
  // Optional — a second VPA on a different bank to fall back to if the
  // primary one starts declining payments (e.g. a payments bank like Airtel
  // Payments Bank enforcing its own transaction/balance caps). Blank clears it.
  const secondaryUpiId = typeof body.secondaryUpiId === "string" ? body.secondaryUpiId.trim() : "";

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
    prisma.setting.upsert({
      where: { key: "upiIdSecondary" },
      update: { value: secondaryUpiId },
      create: { key: "upiIdSecondary", value: secondaryUpiId },
    }),
  ]);

  return NextResponse.json({ upiId, payeeName, secondaryUpiId: secondaryUpiId || null });
}
