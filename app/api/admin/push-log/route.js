import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const logs = await prisma.pushLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ logs });
}
