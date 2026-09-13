import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { decideAiReply } from "@/app/lib/aiDecision";
import { transcribeVoiceNote } from "@/app/lib/transcribeAudio";

// "Suggest Mode" — a draft reply the admin can review, edit, or send with
// one tap, using the exact same decision pipeline as the live AI
// Auto-Reply (see app/lib/aiDecision.js). Unlike Auto-Reply, this is never
// gated behind the 10,000-observation bar in app/lib/aiLearning.js: a human
// is reading and approving every suggestion before it reaches a customer,
// so there's no need to wait for that confidence threshold to get real use
// out of the same grounded-reply pipeline.
export async function GET(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const orderId = id;

  const lastBuyerMessage = await prisma.message.findFirst({
    where: { orderId, sender: "buyer" },
    orderBy: { createdAt: "desc" },
  });
  if (!lastBuyerMessage) {
    return NextResponse.json({ suggestion: null });
  }

  // Nothing to suggest once a real reply already went out after this
  // message — an admin (or, if it's ever turned on, Auto-Reply itself)
  // already handled it.
  const laterAdminReply = await prisma.message.findFirst({
    where: { orderId, sender: "admin", createdAt: { gt: lastBuyerMessage.createdAt } },
  });
  if (laterAdminReply) {
    return NextResponse.json({ suggestion: null });
  }

  let effectiveText = lastBuyerMessage.body || "";
  if (lastBuyerMessage.attachmentType === "audio" && lastBuyerMessage.attachmentPath) {
    effectiveText = (await transcribeVoiceNote(lastBuyerMessage.attachmentPath)) || "";
  }
  if (!effectiveText) {
    return NextResponse.json({ suggestion: null });
  }

  // Distinguished from "genuinely nothing to suggest" (a real, expected
  // outcome — see the null returns above) — decideAiReply throwing means
  // the Gemini call itself failed (bad/missing GEMINI_API_KEY, quota,
  // network), which used to look identical to "nothing to suggest" on the
  // admin's screen with zero way to tell the two apart. Logged here so
  // it's visible in Vercel's function logs instead of only ever showing up
  // as a quiet, unexplained blank.
  let decision;
  try {
    decision = await decideAiReply(orderId, effectiveText, effectiveText);
  } catch (err) {
    console.error("ai-suggestion: decideAiReply failed:", err);
    return NextResponse.json({ error: "AI suggestion failed to generate" }, { status: 502 });
  }
  if (!decision) {
    return NextResponse.json({ suggestion: null });
  }

  const text = decision.chunks.filter(Boolean).join(" ").trim();
  if (!text) {
    return NextResponse.json({ suggestion: null });
  }

  return NextResponse.json({
    suggestion: {
      forMessageId: lastBuyerMessage.id,
      text,
      // The composer's own attach flow only knows how to send a File the
      // admin picked or an already-uploaded video URL — not an arbitrary
      // image URL by itself — so a suggested QR/listing-photo attachment
      // is surfaced as a flag (the admin can still attach it manually via
      // the existing Quick Share / attach controls) rather than silently
      // dropped or half-supported.
      hasAttachment: Boolean(decision.attachmentPath),
    },
  });
}
