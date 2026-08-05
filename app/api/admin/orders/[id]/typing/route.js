import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

// Pinged (debounced client-side) while the admin has text in the reply
// composer — mirrors the buyer's own typing ping. The buyer's UI treats
// adminTypingAt as stale after a few seconds, so this doesn't need its own
// "stopped typing" signal either.
export async function POST(_request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await prisma.order.update({ where: { id }, data: { adminTypingAt: new Date() } });

  return NextResponse.json({ ok: true });
}
