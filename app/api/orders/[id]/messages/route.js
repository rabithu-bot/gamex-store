import { NextResponse, after } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { saveMessageAttachment } from "@/app/lib/uploads";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";
import { notifyAdminsOfMessage, notifyBuyerOfReply } from "@/app/lib/push";
import { buildOrderAiContext } from "@/app/lib/aiSupportContext";
import { generateSupportReply } from "@/app/lib/gemini";
import { getOfficialQrUrl } from "@/app/lib/paymentQr";
import { isGreetingOnly, pickGreetingReply, isQrRequest, QR_REPLY_TEXT } from "@/app/lib/aiIntent";

// Debounce window for the AI auto-reply. A buyer firing off several
// messages in quick succession ("bhai" / "order ka status?" / "please
// batao") should get ONE reply after they actually stop, not one per
// message — so each message's after() callback waits this long, then
// checks whether it's still the most recent buyer message. If a newer one
// landed in the meantime, this attempt backs off silently; only the last
// message in a burst ends up finding itself still "latest" and actually
// fires the reply, ~2s after the buyer goes quiet.
const AI_DEBOUNCE_MS = 2000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  const buyerMessage = await prisma.message.create({
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

  // Untagged orders get an AI-generated reply — tagging a customer (VIP,
  // priority, etc.) is the admin's own signal that they're handling this
  // one personally, so the bot stays out of the way once that happens.
  // Deferred via after() rather than awaited: the buyer's own message
  // still saves and this request still returns immediately either way, but
  // the Gemini round-trip (a couple of seconds) no longer holds up the
  // send button — the reply just appears on the buyer's next poll tick,
  // same as waiting for a real person to type back. after() (unlike a bare
  // un-awaited promise) is guaranteed to actually finish running even
  // though the response has already gone out.
  if (!order.tag) {
    after(async () => {
      try {
        await sleep(AI_DEBOUNCE_MS);

        // A newer buyer message may have landed while this one was
        // waiting out its debounce window — if so, back off silently and
        // let THAT message's own after() callback (running the same
        // check) be the one that eventually replies.
        const latestBuyerMessage = await prisma.message.findFirst({
          where: { orderId, sender: "buyer" },
          orderBy: { createdAt: "desc" },
        });
        if (!latestBuyerMessage || latestBuyerMessage.id !== buyerMessage.id) return;

        // Two cases have exactly one correct answer that has nothing to do
        // with the LLM — handle them directly instead of trusting a model
        // to get them right every time.
        if (isGreetingOnly(text)) {
          const reply = pickGreetingReply();
          await prisma.message.create({ data: { orderId, sender: "admin", body: reply } });
          await notifyBuyerOfReply({ orderId, body: reply }).catch(() => {});
          return;
        }

        if (isQrRequest(text)) {
          // The ONLY source for this is the global settings row — never a
          // URL pulled from this or any other order's past chat history.
          const qrUrl = await getOfficialQrUrl();
          await prisma.message.create({
            data: { orderId, sender: "admin", body: QR_REPLY_TEXT, attachmentPath: qrUrl, attachmentType: "image" },
          });
          await notifyBuyerOfReply({ orderId, body: QR_REPLY_TEXT }).catch(() => {});
          return;
        }

        const context = await buildOrderAiContext(orderId);
        const reply = context ? await generateSupportReply(context, notifyBody) : null;
        if (reply) {
          await prisma.message.create({
            data: { orderId, sender: "admin", body: reply },
          });
          await notifyBuyerOfReply({ orderId, body: reply }).catch(() => {});
        }
      } catch {
        // AI failures must never surface to the buyer — worst case, no
        // auto-reply goes out and a human picks it up as normal.
      }
    });
  }

  return NextResponse.json({ ok: true });
}
