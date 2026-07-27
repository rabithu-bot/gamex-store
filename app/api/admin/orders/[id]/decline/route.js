import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { isValidDeclineReason } from "@/app/lib/declineReasons";

const NOTE_MAX_LENGTH = 300;

export async function POST(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const orderId = id;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const declineReason = body.declineReason;
  if (!isValidDeclineReason(declineReason)) {
    return NextResponse.json({ error: "A valid decline reason is required" }, { status: 400 });
  }
  const declineNote =
    typeof body.declineNote === "string" ? body.declineNote.trim().slice(0, NOTE_MAX_LENGTH) || null : null;

  // Declining doesn't touch the listing — it stays available, since a failed
  // verification means nothing was actually sold.
  await prisma.order.update({
    where: { id: orderId },
    data: { status: "declined", declineReason, declineNote },
  });

  return NextResponse.json({ ok: true });
}
