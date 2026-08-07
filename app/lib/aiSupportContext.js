import { prisma } from "@/app/lib/prisma";

// There's no real similarity search here — just the most recent admin-
// authored replies from OTHER orders, given to the model as tone/phrasing
// samples so it can mimic how this store's admin actually talks.
const STYLE_SAMPLE_SIZE = 20;

// Everything Gemini needs to answer a specific order's support query:
// the order's own record + full thread, plus a style sample from past
// admin replies elsewhere. Credentials are only ever included once the
// order is actually confirmed — mirrors the same gate the real order page
// uses before showing them to the buyer.
export async function buildOrderAiContext(orderId) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
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
    },
    conversation: order.messages.map((m) => ({
      sender: m.sender,
      body: m.body,
      attachmentType: m.attachmentType,
      createdAt: m.createdAt,
    })),
    styleSamples: pastAdminMessages.map((m) => m.body),
  };
}
