import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";
import { REACTION_EMOJIS } from "@/app/lib/reactions";

export async function PATCH(request, { params }) {
  const { id, messageId } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!(await assertOrderAccess(id, order))) {
    return NextResponse.json(
      { error: "Access denied", code: "UNRECOGNIZED_DEVICE" },
      { status: 403 }
    );
  }

  const { reaction, body } = await request.json().catch(() => ({}));

  if (body !== undefined) {
    const trimmed = String(body || "").trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
    }
    // Buyer can only edit its own sent messages, never rewrite the admin's.
    const result = await prisma.message.updateMany({
      where: { id: Number(messageId), orderId: id, sender: "buyer" },
      data: { body: trimmed, editedAt: new Date() },
    });
    if (result.count === 0) {
      return NextResponse.json({ error: "Message not found" }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  }

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
