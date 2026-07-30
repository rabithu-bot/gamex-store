import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { subscription } = await request.json().catch(() => ({}));
  if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
    return NextResponse.json({ error: "Invalid subscription" }, { status: 400 });
  }

  await prisma.pushSubscription.upsert({
    where: { endpoint: subscription.endpoint },
    // A device that already subscribed as a buyer (e.g. someone browsing on
    // the same phone the admin uses) re-subscribing here just becomes an
    // admin subscription — one endpoint can only mean one role at a time.
    update: { role: "admin", orderId: null, p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
    create: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      role: "admin",
    },
  });

  return NextResponse.json({ ok: true });
}
