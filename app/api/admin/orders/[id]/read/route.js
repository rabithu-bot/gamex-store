import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

// Admin-side counterpart to /api/orders/[id]/read — called whenever the
// admin actually has a conversation open, so the "unread" indicator in the
// messages list reflects whether the admin has viewed the buyer's messages,
// not just whether the admin has replied yet.
export async function POST(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  await prisma.message.updateMany({
    where: { orderId: id, sender: "buyer", readAt: null },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
