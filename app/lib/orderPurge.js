import { prisma } from "@/app/lib/prisma";

export const PURGE_AGE_MS = 24 * 60 * 60 * 1000;

// Separate from orderExpiry.js's expireStaleOrders() on purpose — that one is
// a 5-minute *status flip* (pending -> expired) run as a lazy sweep on every
// order-touching request. This is a 24-hour *hard delete*, only ever called
// from the cron route, never from request paths.
//
// "confirmed" orders are deliberately never candidates here, regardless of
// age — they're completed sales holding real account credentials a buyer
// may still need to retrieve, and the actual goal (clearing abandoned
// checkouts out of the admin queue) doesn't require touching them at all.
export async function purgeStaleOrders() {
  const cutoff = new Date(Date.now() - PURGE_AGE_MS);
  const result = await prisma.order.deleteMany({
    where: {
      status: { in: ["pending", "pending_verification", "declined", "expired"] },
      createdAt: { lt: cutoff },
    },
  });
  // Message rows for purged orders cascade-delete automatically via the
  // existing onDelete: Cascade on Message.order.
  return result.count;
}
