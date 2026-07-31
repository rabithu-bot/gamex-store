import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { saveMessageAttachment } from "@/app/lib/uploads";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";
import { notifyAdminsOfMessage } from "@/app/lib/push";

export async function POST(request, { params }) {
  const { id } = await params;
  const orderId = id;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!(await assertOrderAccess(orderId, order))) {
    return NextResponse.json(
      { error: "Access denied", code: "UNRECOGNIZED_DEVICE" },
      { status: 403 }
    );
  }

  const formData = await request.formData();
  const text = String(formData.get("body") || "").trim();
  const attachment = formData.get("attachment");
  const hasAttachment = attachment && typeof attachment.arrayBuffer === "function" && attachment.size > 0;

  if (!text && !hasAttachment) {
    return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  }

  const attachmentPath = hasAttachment ? await saveMessageAttachment(attachment) : null;
  // Voice notes are recorded client-side and uploaded with a real audio
  // MIME type; anything else with an attachment keeps the pre-existing
  // image behavior.
  const attachmentType = hasAttachment ? (attachment.type?.startsWith("audio/") ? "audio" : "image") : null;

  await prisma.message.create({
    data: { orderId, sender: "buyer", body: text, attachmentPath, attachmentType },
  });

  // Awaited (rather than fire-and-forget) since a serverless function can be
  // torn down the moment the response is sent, before an un-awaited promise
  // gets to finish.
  await notifyAdminsOfMessage({
    orderId,
    buyerName: order.buyerName,
    tag: order.tag,
    body: attachmentType === "audio" ? "🎤 Voice message" : attachmentPath && !text ? "📷 Photo" : text,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
