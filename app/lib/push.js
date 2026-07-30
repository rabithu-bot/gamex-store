import webpush from "web-push";
import { prisma } from "@/app/lib/prisma";

let configured = false;
function ensureConfigured() {
  if (configured) return true;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails("mailto:support@example.com", publicKey, privateKey);
  configured = true;
  return true;
}

async function sendToSubscriptions(subscriptions, payload) {
  if (!ensureConfigured() || subscriptions.length === 0) return;
  const body = JSON.stringify(payload);

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
      } catch (err) {
        // 404/410 means the browser has revoked/expired this subscription —
        // clean it up so future sends don't keep retrying a dead endpoint.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
}

// Pinged when a buyer sends a message on a tagged order — every admin
// browser that's granted notification permission gets one.
export async function notifyAdminsOfTaggedMessage({ orderId, buyerName, tag, body }) {
  const subs = await prisma.pushSubscription.findMany({ where: { role: "admin" } });
  await sendToSubscriptions(subs, {
    title: `${tag[0].toUpperCase() + tag.slice(1)} customer: ${buyerName || "Buyer"}`,
    body: body || "Sent a new message",
    url: `/mafia/messages/${orderId}`,
    tag: `order-${orderId}`,
  });
}

// Pinged when the admin replies to an order whose buyer isn't currently
// browsing the site (see app/lib/onlineStatus.js) — every subscription tied
// to that specific order gets one, buyers don't get pinged for other orders.
export async function notifyBuyerOfReply({ orderId, supportName, body }) {
  const subs = await prisma.pushSubscription.findMany({ where: { role: "buyer", orderId } });
  await sendToSubscriptions(subs, {
    title: `${supportName || "Support"} replied`,
    body: body || "New message about your order",
    url: `/order/${orderId}/support`,
    tag: `order-${orderId}`,
  });
}
