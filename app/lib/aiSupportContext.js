import { prisma } from "@/app/lib/prisma";

// There's no real similarity search here — just the most recent admin-
// authored replies from OTHER orders, given to the model as tone/phrasing
// samples so it can mimic how this store's admin actually talks. Kept small
// — every extra sample is more input tokens, and this bot answers in 1-2
// sentences from live order data, not from a large few-shot corpus.
const STYLE_SAMPLE_SIZE = 8;
// Only the tail of a long thread matters for "what's the current
// situation" — capping this keeps the prompt (and therefore latency) from
// growing unbounded on orders with a long conversation history.
const CONVERSATION_TAIL_SIZE = 10;

// Everything Gemini needs to answer a specific order's support query:
// the order's own record + full thread, plus a style sample from past
// admin replies elsewhere. Credentials are only ever included once the
// order is actually confirmed — mirrors the same gate the real order page
// uses before showing them to the buyer.
export async function buildOrderAiContext(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      listing: { select: { description: true, category: true, gameUid: true, server: true, level: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!order) return null;

  const pastAdminMessages = await prisma.message.findMany({
    where: { sender: "admin", orderId: { not: orderId }, body: { not: "" } },
    orderBy: { createdAt: "desc" },
    take: STYLE_SAMPLE_SIZE,
    select: { body: true },
  });

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
    styleSamples: pastAdminMessages.map((m) => m.body),
  };
}
