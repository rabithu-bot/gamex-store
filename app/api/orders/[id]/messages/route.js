import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { saveMessageAttachment } from "@/app/lib/uploads";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";
import { notifyAdminsOfMessage, notifyBuyerOfReply } from "@/app/lib/push";
import { buildOrderAiContext } from "@/app/lib/aiSupportContext";
import { generateSupportReply } from "@/app/lib/gemini";

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
  // Videos are already uploaded straight to S3 (see the video-url route) by
  // the time this request is made — the client sends the resulting URL
  // instead of the file itself, so there's no attachment bytes to proxy.
  const preUploadedUrl = formData.get("attachmentUrl");
  const preUploadedType = formData.get("attachmentType");

  if (!text && !hasAttachment && !preUploadedUrl) {
    return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  }

  let attachmentPath = null;
  let attachmentType = null;
  if (preUploadedUrl) {
    attachmentPath = String(preUploadedUrl);
    attachmentType = preUploadedType === "video" ? "video" : "image";
  } else if (hasAttachment) {
    attachmentPath = await saveMessageAttachment(attachment);
    // Voice notes are recorded client-side and uploaded with a real audio
    // MIME type; anything else with an attachment keeps the pre-existing
    // image behavior.
    attachmentType = attachment.type?.startsWith("audio/") ? "audio" : "image";
  }

  await prisma.message.create({
    data: { orderId, sender: "buyer", body: text, attachmentPath, attachmentType },
  });

  const notifyBody =
    attachmentType === "audio"
      ? "🎤 Voice message"
      : attachmentType === "video" && !text
        ? "🎥 Video"
        : attachmentPath && !text
          ? "📷 Photo"
          : text;

  // Awaited (rather than fire-and-forget) since a serverless function can be
  // torn down the moment the response is sent, before an un-awaited promise
  // gets to finish.
  await notifyAdminsOfMessage({
    orderId,
    buyerName: order.buyerName,
    tag: order.tag,
    body: notifyBody,
  }).catch(() => {});

  // Untagged orders get an instant AI-generated reply — tagging a customer
  // (VIP, priority, etc.) is the admin's own signal that they're handling
  // this one personally, so the bot stays out of the way once that happens.
  // Failures here must never break the buyer's own message from saving —
  // worst case, no auto-reply goes out and a human picks it up as normal.
  if (!order.tag) {
    try {
      const context = await buildOrderAiContext(orderId);
      const reply = context ? await generateSupportReply(context, notifyBody) : null;
      if (reply) {
        await prisma.message.create({
          data: { orderId, sender: "admin", body: reply },
        });
        await notifyBuyerOfReply({ orderId, body: reply }).catch(() => {});
      }
    } catch {
      // Swallowed — see comment above.
    }
  }

  return NextResponse.json({ ok: true });
}
