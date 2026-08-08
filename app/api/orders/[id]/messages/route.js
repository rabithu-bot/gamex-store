import { NextResponse, after } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { saveMessageAttachment } from "@/app/lib/uploads";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";
import { notifyAdminsOfMessage, notifyBuyerOfReply } from "@/app/lib/push";
import { buildOrderAiContext } from "@/app/lib/aiSupportContext";
import { generateSupportReply } from "@/app/lib/gemini";
import { getOfficialQrUrl } from "@/app/lib/paymentQr";
import { transcribeVoiceNote } from "@/app/lib/transcribeAudio";
import { sendChunkedReply } from "@/app/lib/chunkReply";
import { isAiAutoReplyEnabled, estimateTypingSeconds } from "@/app/lib/aiLearning";
import {
  isGreetingOnly,
  pickGreetingReply,
  isQrRequest,
  QR_REPLY_CHUNKS,
  isBuyIntent,
  CLOSING_REPLY_CHUNKS,
  isLoginQuestion,
  LOGIN_REPLY_CHUNKS,
  isBuyingGuidanceQuestion,
  BUYING_GUIDANCE_CHUNKS,
  isTrustQuestion,
  TRUST_REPLY_CHUNKS,
} from "@/app/lib/aiIntent";

// Debounce window for the AI auto-reply. A buyer firing off several
// messages in quick succession ("bhai" / "order ka status?" / "please
// batao") should get ONE reply after they actually stop, not one per
// message — so each message's after() callback waits this long, then
// checks whether it's still the most recent buyer message. If a newer one
// landed in the meantime, this attempt backs off silently; only the last
// message in a burst ends up finding itself still "latest" and actually
// fires the reply. Randomized per message (not a fixed constant) so the
// bot doesn't reply after a suspiciously identical delay every time —
// reads more like a real person's natural typing time.
const AI_DEBOUNCE_MIN_MS = 2000;
const AI_DEBOUNCE_MAX_MS = 3000;

// How often the "admin is typing..." flag gets re-touched while the AI is
// simulating a natural typing delay — must stay comfortably under the
// buyer UI's own staleness window (SupportChat.js's TYPING_STALE_MS, 4s) so
// the indicator never flickers off mid-wait.
const TYPING_PING_INTERVAL_MS = 2500;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomDebounceMs() {
  return AI_DEBOUNCE_MIN_MS + Math.floor(Math.random() * (AI_DEBOUNCE_MAX_MS - AI_DEBOUNCE_MIN_MS));
}

async function pingAdminTyping(orderId) {
  await prisma.order.update({ where: { id: orderId }, data: { adminTypingAt: new Date() } }).catch(() => {});
}

// Keeps "admin is typing..." alive for the full simulated duration by
// re-touching adminTypingAt at the start of every chunk, rather than one
// ping followed by a single long sleep that would go stale well before the
// reply actually sends.
async function waitWithTypingPings(orderId, totalSeconds) {
  let remainingMs = Math.round(totalSeconds * 1000);
  while (remainingMs > 0) {
    await pingAdminTyping(orderId);
    const step = Math.min(TYPING_PING_INTERVAL_MS, remainingMs);
    await sleep(step);
    remainingMs -= step;
  }
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
    sessionId: order.sessionId,
    buyerName: order.buyerName,
    tag: order.tag,
    body: notifyBody,
  }).catch(() => {});

  // Untagged orders get an AI-generated reply — tagging a customer (VIP,
  // priority, etc.) is the admin's own signal that they're handling this
  // one personally, so the bot stays out of the way once that happens.
  // Deferred via after() rather than awaited: the buyer's own message
  // still saves and this request still returns immediately either way, but
  // the Gemini round-trip no longer holds up the send button — the reply
  // just appears on the buyer's next poll tick, same as waiting for a real
  // person to type back. after() (unlike a bare un-awaited promise) is
  // guaranteed to actually finish running even though the response has
  // already gone out.
  if (!order.tag) {
    after(async () => {
      try {
        // Shadow learning mode: the AI observes and logs (see the admin
        // reply route) but never replies on its own until this is switched
        // on — which itself is hard-gated at 100% learning progress, see
        // app/lib/aiLearning.js. Checked first, before touching anything
        // below, so a disabled shop does zero extra work per message.
        if (!(await isAiAutoReplyEnabled())) return;

        // Live mode: the AI opens the chat like a real person would the
        // instant a message lands — mark it seen and start showing
        // "typing..." right away, well before it has actually decided
        // what to say.
        await prisma.message.updateMany({
          where: { orderId, sender: "buyer", readAt: null },
          data: { readAt: new Date() },
        });
        await pingAdminTyping(orderId);

        await sleep(randomDebounceMs());

        // A newer buyer message may have landed while this one was
        // settling — if so, back off silently and let THAT message's own
        // after() callback (running the same check) be the one that
        // eventually decides + replies.
        const latestBuyerMessage = await prisma.message.findFirst({
          where: { orderId, sender: "buyer" },
          orderBy: { createdAt: "desc" },
        });
        if (!latestBuyerMessage || latestBuyerMessage.id !== buyerMessage.id) return;

        // Voice notes get transcribed first so every check below (and the
        // Gemini fallback) can work from real text instead of a blind
        // "🎤 Voice message" placeholder. If transcription fails, there's
        // nothing reliable to respond to — skip the auto-reply and let a
        // human pick it up, same as any other AI-pipeline failure.
        let effectiveText = text;
        const isVoiceInput = attachmentType === "audio";
        // Voice-note REPLIES are switched off for now (explicit request —
        // both a text and a voice message were going out together, and
        // that wasn't wanted). Voice-note INPUT still gets transcribed
        // below either way, so the bot can still understand and text-reply
        // to a voice message — only the audio-output side is disabled.
        // Flip this back to isVoiceInput to re-enable voice-for-voice.
        const wantsVoiceReply = false;
        if (isVoiceInput) {
          const transcript = await transcribeVoiceNote(attachmentPath);
          if (!transcript) return;
          effectiveText = transcript;
        }

        // Decide WHAT to say without sending it yet — actually sending
        // only happens after the simulated typing delay further down, so
        // the buyer sees a natural "typing..." stretch before the message
        // itself appears, instead of it landing the instant it's decided.
        // A handful of questions have exactly one correct, policy-level
        // answer that has nothing to do with the LLM — handled directly
        // instead of trusting a model to phrase store policy right every
        // time. Checked in this order because a message can't be more
        // than one of these anyway (each check is fairly specific).
        let decision = null;
        if (isGreetingOnly(effectiveText)) {
          decision = { chunks: pickGreetingReply() };
        } else if (isBuyIntent(effectiveText)) {
          // Sale-closing takes priority over a bare "QR do" — the customer
          // has just committed to a specific ID, so the reply is the
          // closing line, not the plain "here's the QR" one, even though
          // both send the same real QR image pulled from the global
          // settings row (never from chat history or any other order's data).
          const qrUrl = await getOfficialQrUrl();
          decision = { chunks: CLOSING_REPLY_CHUNKS, attachmentPath: qrUrl, attachmentType: "image" };
        } else if (isQrRequest(effectiveText)) {
          // The ONLY source for this is the global settings row — never a
          // URL pulled from this or any other order's past chat history.
          const qrUrl = await getOfficialQrUrl();
          decision = { chunks: QR_REPLY_CHUNKS, attachmentPath: qrUrl, attachmentType: "image" };
        } else if (isLoginQuestion(effectiveText)) {
          decision = { chunks: LOGIN_REPLY_CHUNKS };
        } else if (isBuyingGuidanceQuestion(effectiveText)) {
          decision = { chunks: BUYING_GUIDANCE_CHUNKS };
        } else if (isTrustQuestion(effectiveText)) {
          decision = { chunks: TRUST_REPLY_CHUNKS };
        } else {
          const context = await buildOrderAiContext(orderId, effectiveText);
          // The one case where a past admin line gets reused word-for-word
          // instead of generating a fresh reply — see findVerbatimMatch for
          // exactly how narrow/safe that match has to be.
          if (context?.verbatimReply) {
            decision = { chunks: [context.verbatimReply] };
          } else {
            const reply = context ? await generateSupportReply(context, effectiveText || notifyBody) : null;
            if (reply) {
              // A real screenshot of the top matching listing rides along
              // when the customer was asking about budget/availability —
              // "ye lo ID ki details aur screenshot", with an actual photo
              // attached, not just a claim.
              decision = {
                chunks: [reply],
                attachmentPath: context.topListingImage || undefined,
                attachmentType: context.topListingImage ? "image" : undefined,
              };
            }
          }
        }

        if (!decision) return;

        // How long to keep "typing..." showing before the reply actually
        // lands — the learned average of how long the admin themselves
        // takes to reply once they've seen a message, or a length-based
        // guess while there isn't enough real data yet (see
        // app/lib/aiLearning.js). Re-pings adminTypingAt throughout so the
        // indicator survives the full wait instead of going stale partway.
        const combinedPreview = decision.chunks.filter(Boolean).join(" ").trim();
        const typingSeconds = await estimateTypingSeconds(combinedPreview);
        await waitWithTypingPings(orderId, typingSeconds);

        // The typing wait can run several seconds — re-check once more
        // that nothing newer has come in before actually sending.
        const latestBeforeSend = await prisma.message.findFirst({
          where: { orderId, sender: "buyer" },
          orderBy: { createdAt: "desc" },
        });
        if (!latestBeforeSend || latestBeforeSend.id !== buyerMessage.id) return;

        const combined = await sendChunkedReply({
          orderId,
          chunks: decision.chunks,
          attachmentPath: decision.attachmentPath,
          attachmentType: decision.attachmentType,
          voiceReply: wantsVoiceReply,
        });
        await notifyBuyerOfReply({ orderId, body: combined }).catch(() => {});
      } catch {
        // AI failures must never surface to the buyer — worst case, no
        // auto-reply goes out and a human picks it up as normal.
      }
    });
  }

  return NextResponse.json({ ok: true });
}
