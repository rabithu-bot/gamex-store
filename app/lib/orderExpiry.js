import { prisma } from "@/app/lib/prisma";

export const ORDER_EXPIRY_MS = 5 * 60 * 1000;

const THROTTLE_MS = 30 * 1000;
let lastRunAt = 0;

// This app has no background worker, so instead of a cron job, every route
// that reads or creates orders sweeps stale ones first. "pending" means
// awaiting payment with no proof attached yet — once a screenshot is
// submitted the order moves to pending_verification and stops being subject
// to this timer. Throttled per-instance since several admin screens now poll
// their routes every few seconds — the update is idempotent (pending only
// ever moves forward to expired), so skipping it on a warm instance that ran
// it recently is always safe, even though the throttle itself doesn't survive
// a cold start or get shared across concurrent instances.
export async function expireStaleOrders() {
  const now = Date.now();
  if (now - lastRunAt < THROTTLE_MS) return;
  lastRunAt = now;

  const cutoff = new Date(now - ORDER_EXPIRY_MS);
  await prisma.order.updateMany({
    where: { status: "pending", createdAt: { lt: cutoff } },
    data: { status: "expired" },
  });
}
