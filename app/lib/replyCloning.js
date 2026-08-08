import { prisma } from "@/app/lib/prisma";
import { classifyIntent } from "@/app/lib/aiIntent";

// Statuses where the conversation has functionally moved past "getting to
// know the store" into "get this transaction done" — a customer here wants
// speed and precision, not the warmer early-conversation trust-building
// tone. Message-count is the other half of this signal (see
// detectChatStage) since a long back-and-forth on a still-pending order
// reads the same way even without a status change.
const LATE_STAGE_STATUSES = new Set(["pending_verification", "declined"]);
const LATE_STAGE_MESSAGE_THRESHOLD = 6;

export function detectChatStage(order, buyerMessageCount) {
  if (LATE_STAGE_STATUSES.has(order.status)) return "late";
  if (buyerMessageCount >= LATE_STAGE_MESSAGE_THRESHOLD) return "late";
  return "early";
}

// Which of the fixed intent buckets read as "closing/transactional" versus
// "browsing/trust-building" — used to sort historical Reply Patterns
// Learned samples into the same early/late split a live conversation gets,
// without needing any new tagging on the stored data itself.
const LATE_STAGE_INTENTS = new Set(["order_status", "buy_intent", "qr_request", "discount"]);

export function intentStageHint(intent) {
  return LATE_STAGE_INTENTS.has(intent) ? "late" : "early";
}

// How many of this buyer's own prior messages in the conversation already
// landed in the same intent bucket as their latest one — "general" is
// excluded since it's a catch-all, not a specific repeated ask, and
// repetition only means something for a specific, nameable question
// (discount, trust, order status, etc.).
export function countRepeatedIntent(buyerTexts, currentIntent) {
  if (currentIntent === "general") return 0;
  return buyerTexts.filter((text) => classifyIntent(text) === currentIntent).length;
}

function normalizeForMatch(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// A reply is only safe to reuse verbatim for a DIFFERENT customer's order
// if it carries no order-specific figures — no digits at all (price,
// account IDs, order numbers, level numbers all pattern as digits), so a
// past admin line like "bhai 700 me le lo abhi" can never leak someone
// else's price onto today's customer.
function isFactFree(replyText) {
  return !/\d/.test(replyText);
}

// The one place literal historical reuse is allowed: the customer has
// asked EXACTLY (normalized) something a past customer already asked, on
// a DIFFERENT order, and the admin's real reply to it carries no
// order-specific figures — so reusing it word-for-word cannot possibly
// hand this customer someone else's price or account details. Anything
// short of that exact, safe match still goes through normal generation
// grounded in this order's own real data. Returns null (never throws) so
// a DB hiccup here just falls through to the normal generation path.
export async function findVerbatimMatch(orderId, customerMessage) {
  const normalized = normalizeForMatch(customerMessage);
  if (!normalized) return null;

  try {
    const candidates = await prisma.aiObservation.findMany({
      where: { orderId: { not: orderId }, adminReply: { not: "" } },
      orderBy: { createdAt: "desc" },
      take: 300,
      select: { customerMessage: true, adminReply: true },
    });
    const match = candidates.find(
      (c) => normalizeForMatch(c.customerMessage) === normalized && isFactFree(c.adminReply)
    );
    return match?.adminReply || null;
  } catch {
    return null;
  }
}
