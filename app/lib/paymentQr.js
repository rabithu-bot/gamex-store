import { prisma } from "@/app/lib/prisma";

const DEFAULT_QR_URL = "/upi-qr.jpg";

// The one and only source of truth for "what is the official store QR" —
// the admin-uploaded Setting row, or the bundled default asset if none has
// been uploaded yet. Never derived from chat history or any other order's
// data, on purpose: this is what the AI auto-reply's QR handling relies on
// to make sure it can only ever send the real store QR, never something
// pulled from a past conversation.
export async function getOfficialQrUrl() {
  const setting = await prisma.setting.findUnique({ where: { key: "paymentQrUrl" } });
  return setting?.value || DEFAULT_QR_URL;
}
