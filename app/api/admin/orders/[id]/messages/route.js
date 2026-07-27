import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { saveMessageAttachment } from "@/app/lib/uploads";

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

  const formData = await request.formData();
  const text = String(formData.get("body") || "").trim();
  const attachment = formData.get("attachment");
  const hasAttachment = attachment && typeof attachment.arrayBuffer === "function" && attachment.size > 0;
  const replyToIdRaw = formData.get("replyToId");
  const replyToId = replyToIdRaw ? Number(replyToIdRaw) : null;

  if (!text && !hasAttachment) {
    return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  }

  const attachmentPath = hasAttachment ? await saveMessageAttachment(attachment) : null;
  // Voice notes are recorded client-side and uploaded with a real audio
  // MIME type; anything else with an attachment keeps the pre-existing
  // image behavior.
  const attachmentType = hasAttachment ? (attachment.type?.startsWith("audio/") ? "audio" : "image") : null;

  await prisma.message.create({
    data: {
      orderId,
      sender: "admin",
      body: text,
      attachmentPath,
      attachmentType,
      replyToId: Number.isInteger(replyToId) ? replyToId : null,
    },
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orderId = id;

  await prisma.message.deleteMany({ where: { orderId } });

  return NextResponse.json({ ok: true });
}
