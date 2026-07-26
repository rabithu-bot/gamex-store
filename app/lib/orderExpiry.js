import { prisma } from "@/app/lib/prisma";

export const ORDER_EXPIRY_MS = 5 * 60 * 1000;

// This app has no background worker, so instead of a cron job, every route
// that reads or creates orders sweeps stale ones first. "pending" means
// awaiting payment with no proof attached yet — once a screenshot is
// submitted the order moves to pending_verification and stops being subject
// to this timer. Cheap enough at this app's scale to run on every request.
export async function expireStaleOrders() {
  const cutoff = new Date(Date.now() - ORDER_EXPIRY_MS);
  await prisma.order.updateMany({
    where: { status: "pending", createdAt: { lt: cutoff } },
    data: { status: "expired" },
  });
}
