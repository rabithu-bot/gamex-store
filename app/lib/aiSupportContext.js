import { prisma } from "@/app/lib/prisma";
import { extractBudgetAmount, isAvailabilityQuestion, classifyIntent } from "@/app/lib/aiIntent";
import { findListingsNearBudget, findAvailableListings, firstListingImage } from "@/app/lib/listingSearch";
import { detectChatStage, intentStageHint, countRepeatedIntent, findVerbatimMatch } from "@/app/lib/replyCloning";

// Pulled from the real Reply Patterns Learned dataset (AiObservation) now,
// not just any past admin message — richer signal since each row already
// pairs the admin's real reply with the customer message that prompted it.
// A larger pool is fetched than actually used so there's enough to filter
// down to the CURRENT conversation's stage (see detectChatStage) and still
// have samples left; the final prompt only ever sees STYLE_SAMPLE_SIZE.
const STYLE_SAMPLE_POOL_SIZE = 60;
const STYLE_SAMPLE_SIZE = 10;
// Only the tail of a long thread matters for "what's the current
// situation" — capping this keeps the prompt (and therefore latency) from
// growing unbounded on orders with a long conversation history.
const CONVERSATION_TAIL_SIZE = 10;
// From this many repeats of the exact same intent bucket onward, the reply
// should stop re-explaining and go blunt/short instead (see gemini.js).
const ESCALATION_THRESHOLD = 3;

// Everything Gemini needs to answer a specific order's support query:
// the order's own record + full thread, plus a stage- and repetition-aware
// style sample from the real Reply Patterns Learned dataset. Credentials
// are only ever included once the order is actually confirmed — mirrors
// the same gate the real order page uses before showing them to the buyer.
//
// Returns { verbatimReply } instead of the usual shape in the one case
// where literal reuse of a past admin line is actually safe (see
// findVerbatimMatch) — callers should send that reply directly and skip
// generation entirely for that turn.
export async function buildOrderAiContext(orderId, latestText) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: { select: { description: true, category: true, gameUid: true, server: true, level: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) return null;

  const verbatimReply = await findVerbatimMatch(orderId, latestText);
  if (verbatimReply) return { verbatimReply };

  const buyerTexts = order.messages.filter((m) => m.sender === "buyer").map((m) => m.body);
  const stage = detectChatStage(order, buyerTexts.length);
  const currentIntent = classifyIntent(latestText);
  const repeatCount = countRepeatedIntent(buyerTexts, currentIntent);
  const escalate = repeatCount >= ESCALATION_THRESHOLD;

  const observationPool = await prisma.aiObservation.findMany({
    where: { orderId: { not: orderId }, adminReply: { not: "" } },
    orderBy: { createdAt: "desc" },
    take: STYLE_SAMPLE_POOL_SIZE,
    select: { customerMessage: true, adminReply: true },
  });
  const stageMatched = observationPool.filter(
    (o) => intentStageHint(classifyIntent(o.customerMessage)) === stage
  );
  // Falls back to the unfiltered pool rather than an empty list if this
  // stage genuinely doesn't have enough history yet — some real style
  // sample beats none, especially early on while the dataset is small.
  const stylePool = stageMatched.length >= STYLE_SAMPLE_SIZE ? stageMatched : observationPool;

  // "500 rs me id dikhao" — real, live listing search, not the LLM
  // guessing at stock. Null when no budget/availability question was asked
  // at all (as opposed to an empty array, which means the question WAS
  // asked and genuinely nothing is in stock right now).
  const budgetAmount = extractBudgetAmount(latestText);
  let matchingListings = null;
  if (budgetAmount !== null) {
    matchingListings = await findListingsNearBudget(budgetAmount);
  } else if (isAvailabilityQuestion(latestText)) {
    matchingListings = await findAvailableListings();
  }
  const topListingImage = matchingListings?.length ? firstListingImage(matchingListings[0]) : null;

  return {
    order: {
      id: order.id,
      buyerName: order.buyerName,
      listingTitle: order.listingTitle,
      listingPrice: order.listingPrice,
      status: order.status,
      hasPaymentScreenshot: Boolean(order.screenshotPath),
      createdAt: order.createdAt,
      confirmedAt: order.confirmedAt,
      accountId: order.status === "confirmed" ? order.accountId : null,
      accountPassword: order.status === "confirmed" ? order.accountPassword : null,
      // Only ever the listing's own real fields — never anything an admin
      // said in a past chat — so a question like "login Facebook se hai ya
      // Google se?" gets answered from the actual product record, or the
      // model honestly says it's not listed, instead of guessing.
      productDescription: order.listing?.description || null,
      productCategory: order.listing?.category || null,
    },
    conversation: order.messages.slice(-CONVERSATION_TAIL_SIZE).map((m) => ({
      sender: m.sender,
      body: m.body,
      attachmentType: m.attachmentType,
      createdAt: m.createdAt,
    })),
    styleSamples: stylePool.slice(0, STYLE_SAMPLE_SIZE).map((o) => o.adminReply),
    stage,
    escalate,
    repeatCount,
    budgetAmount,
    matchingListings,
    topListingImage,
  };
}
