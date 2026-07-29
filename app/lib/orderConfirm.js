import { prisma } from "@/app/lib/prisma";

// Shared by the admin's manual "Confirm & Release Account" action and the
// Razorpay webhook's automatic confirmation — both need the exact same
// side effect (mark paid, mark the listing sold so it stops showing as
// available to everyone else in the same beat). Idempotent: calling it
// twice for an already-confirmed order is a safe no-op, since a webhook
// can legitimately be delivered more than once for the same event.
export async function confirmOrder(orderId) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.status === "confirmed") return order;

  await prisma.$transaction([
    prisma.order.update({
      where: { id: orderId },
      // Confirmed buyers are worth flagging for faster support turnaround —
      // only set when the admin hasn't already picked a different tag, so
      // this never clobbers an existing "vip"/"booked" label.
      data: {
        status: "confirmed",
        confirmedAt: new Date(),
        ...(order.tag ? {} : { tag: "priority" }),
      },
    }),
    ...(order.listingId
      ? [prisma.listing.update({ where: { id: order.listingId }, data: { status: "sold" } })]
      : []),
  ]);

  return order;
}
