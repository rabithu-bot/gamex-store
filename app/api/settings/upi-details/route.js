import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  const [upiId, payeeName, secondaryUpiId] = await Promise.all([
    prisma.setting.findUnique({ where: { key: "upiId" } }),
    prisma.setting.findUnique({ where: { key: "upiPayeeName" } }),
    prisma.setting.findUnique({ where: { key: "upiIdSecondary" } }),
  ]);
  return NextResponse.json({
    upiId: upiId?.value || null,
    payeeName: payeeName?.value || null,
    secondaryUpiId: secondaryUpiId?.value || null,
  });
}
