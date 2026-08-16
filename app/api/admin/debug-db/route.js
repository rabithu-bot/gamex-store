import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/session";
import { prisma } from "@/app/lib/prisma";

// TEMPORARY — added solely to diagnose the droplet Postgres migration
// (production shows a stripped-down error digest with no detail). Remove
// once the connection issue is confirmed fixed.
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await prisma.$queryRaw`SELECT 1 as ok`;
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        name: err?.name,
        message: err?.message,
        code: err?.code,
        cause: err?.cause
          ? { name: err.cause?.name, message: err.cause?.message, code: err.cause?.code }
          : null,
        stack: String(err?.stack || "").split("\n").slice(0, 10),
      },
      { status: 500 }
    );
  }
}
