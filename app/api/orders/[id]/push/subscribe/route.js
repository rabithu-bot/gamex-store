import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";

export async function POST(request, { params }) {
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (!(await assertOrderAccess(id, order))) {
    return NextResponse.json({ error: "Access denied", code: "UNRECOGNIZED_DEVICE" }, { status: 403 });
  }

  const { subscription } = await request.json().catch(() => ({}));
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    update: { role: "buyer", orderId: id, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      role: "buyer",
      orderId: id,
    },
  });

  return NextResponse.json({ ok: true });
}
