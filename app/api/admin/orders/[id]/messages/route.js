import { NextResponse, after } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { saveMessageAttachment } from "@/app/lib/uploads";
import { notifyBuyerOfReply } from "@/app/lib/push";
import { isBuyerOnline } from "@/app/lib/onlineStatus";
import { recordObservation } from "@/app/lib/aiLearning";
import { transcribeVoiceNote } from "@/app/lib/transcribeAudio";

// Resolves a message down to real, readable text for the shadow-learning
// log — transcribing a voice note via Gemini's audio input (same module
// the live bot uses to understand voice input) rather than logging a
// blind "[voice note]" placeholder that would be useless to learn from.
async function resolveMessageText(message) {
  if (message.attachmentType === "audio" && message.attachmentPath) {
    const transcript = await transcribeVoiceNote(message.attachmentPath);
    return transcript || "[voice note — transcription failed]";
  }
  return message.body || "";
}

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
    data: {
      orderId,
      sender: "admin",
      body: text,
      attachmentPath,
      attachmentType,
      replyToId: Number.isInteger(replyToId) ? replyToId : null,
    },
  });

  // Shadow learning: log this real admin reply paired with the customer
  // message it responded to, while the AI auto-reply stays switched off.
  // Deferred via after() — transcribing a voice note on either side takes
  // real time (a Gemini call), and that must never delay the admin's own
  // reply from sending. Never blocks or fails the actual reply either way;
  // see resolveMessageText/recordObservation.
  after(async () => {
    const lastBuyerMessage = await prisma.message.findFirst({
      where: { orderId, sender: "buyer" },
      orderBy: { createdAt: "desc" },
    });
    if (!lastBuyerMessage) return;

    const [customerMessage, adminReplyText] = await Promise.all([
      resolveMessageText(lastBuyerMessage),
      resolveMessageText({ body: text, attachmentType, attachmentPath }),
    ]);

    await recordObservation({
      orderId,
      customerMessage,
      customerAttachmentType: lastBuyerMessage.attachmentType,
      adminReply: adminReplyText,
      adminAttachmentType: attachmentType,
    });
  });

  // Only worth pinging the buyer's phone if they're not already looking at
  // the page — isBuyerOnline reuses the same threshold the "Online" badge
  // in the admin panel is based on.
  if (!isBuyerOnline(order.buyerLastSeenAt)) {
    await notifyBuyerOfReply({
      orderId,
      body:
        attachmentType === "audio"
          ? "🎤 Voice message"
          : attachmentType === "video" && !text
            ? "🎥 Video"
            : attachmentPath && !text
              ? "📷 Photo"
              : text,
    }).catch(() => {});
  }

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
