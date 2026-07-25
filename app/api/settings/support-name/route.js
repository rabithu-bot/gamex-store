import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

const DEFAULT_NAME = "Support";

export async function GET() {
  const setting = await prisma.setting.findUnique({ where: { key: "supportDisplayName" } });
  return NextResponse.json({ name: setting?.value || DEFAULT_NAME });
}
