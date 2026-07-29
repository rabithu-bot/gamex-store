import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { REACTION_EMOJIS } from "@/app/lib/reactions";

export async function DELETE(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, messageId } = await params;
  const orderId = id;

  await prisma.message.deleteMany({ where: { id: Number(messageId), orderId } });

  return NextResponse.json({ ok: true });
}

export async function PATCH(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, messageId } = await params;
  const { reaction, body } = await request.json().catch(() => ({}));

  if (body !== undefined) {
    const trimmed = String(body || "").trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
    }
    // Admin can only edit its own sent messages, never rewrite the buyer's.
    const result = await prisma.message.updateMany({
      where: { id: Number(messageId), orderId: id, sender: "admin" },
      data: { body: trimmed, editedAt: new Date() },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

  // null/empty clears the reaction; anything else must be one of the
  // preset emojis, never arbitrary text.
  const normalized = reaction || null;
  if (normalized && !REACTION_EMOJIS.includes(normalized)) {
    return NextResponse.json({ error: "Unknown reaction" }, { status: 400 });
  }

  await prisma.message.updateMany({
    where: { id: Number(messageId), orderId: id },
    data: { reaction: normalized },
  });

  return NextResponse.json({ ok: true, reaction: normalized });
}
