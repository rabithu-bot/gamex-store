import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await prisma.pushSubscription.count();

  return NextResponse.json({ count });
}
