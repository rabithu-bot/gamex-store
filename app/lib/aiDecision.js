import { getOfficialQrUrl } from "@/app/lib/paymentQr";
import { buildOrderAiContext } from "@/app/lib/aiSupportContext";
import { generateSupportReply } from "@/app/lib/gemini";
import {
  isGreetingOnly,
  pickGreetingReply,
  isBuyIntent,
  CLOSING_REPLY_CHUNKS,
  isQrRequest,
  QR_REPLY_CHUNKS,
  isLoginQuestion,
  LOGIN_REPLY_CHUNKS,
  isBuyingGuidanceQuestion,
  BUYING_GUIDANCE_CHUNKS,
  isTrustQuestion,
  TRUST_REPLY_CHUNKS,
} from "@/app/lib/aiIntent";

// Single source of truth for "what should the AI say back to this buyer
// message" — extracted out of the live buyer-message route so both callers
// can never drift into answering the same question two different ways:
//   - app/api/orders/[id]/messages/route.js: the live auto-reply pipeline,
//     only actually fires once AI Auto-Reply is switched on (see
//     app/lib/aiLearning.js).
//   - app/api/admin/orders/[id]/ai-suggestion/route.js: "Suggest Mode" —
//     runs this same decision as a DRAFT for the admin to review/edit/send,
//     available immediately regardless of that gate, so the admin gets
//     real value from this pipeline well before the 10k-observation bar is
//     ever reached.
//
// A handful of question types have exactly one correct, policy-level
// answer that has nothing to do with LLM creativity — checked first,
// deterministically, before falling back to a real Gemini call grounded in
// this order's actual data (see buildOrderAiContext).
export async function decideAiReply(orderId, effectiveText, fallbackText) {
  if (isGreetingOnly(effectiveText)) {
    return { chunks: pickGreetingReply() };
  }
  if (isBuyIntent(effectiveText)) {
    const qrUrl = await getOfficialQrUrl();
    return { chunks: CLOSING_REPLY_CHUNKS, attachmentPath: qrUrl, attachmentType: "image" };
  }
  if (isQrRequest(effectiveText)) {
    const qrUrl = await getOfficialQrUrl();
    return { chunks: QR_REPLY_CHUNKS, attachmentPath: qrUrl, attachmentType: "image" };
  }
  if (isLoginQuestion(effectiveText)) {
    return { chunks: LOGIN_REPLY_CHUNKS };
  }
  if (isBuyingGuidanceQuestion(effectiveText)) {
    return { chunks: BUYING_GUIDANCE_CHUNKS };
  }
  if (isTrustQuestion(effectiveText)) {
    return { chunks: TRUST_REPLY_CHUNKS };
  }

  const context = await buildOrderAiContext(orderId, effectiveText);
  if (context?.verbatimReply) {
    return { chunks: [context.verbatimReply] };
  }
  if (!context) return null;

  const reply = await generateSupportReply(context, effectiveText || fallbackText);
  if (!reply) return null;

  return {
    chunks: [reply],
    attachmentPath: context.topListingImage || undefined,
    attachmentType: context.topListingImage ? "image" : undefined,
  };
}
