import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

const DEFAULT_QR_URL = "/upi-qr.jpg";

export async function GET() {
  const setting = await prisma.setting.findUnique({ where: { key: "paymentQrUrl" } });
  return NextResponse.json({ url: setting?.value || DEFAULT_QR_URL });
}
