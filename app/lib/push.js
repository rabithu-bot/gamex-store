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
  if (!ensureConfigured() || subscriptions.length === 0) return { sent: 0, failed: 0 };
  const body = JSON.stringify(payload);

  let sent = 0;
  let failed = 0;
  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body
        );
        sent += 1;
      } catch (err) {
        failed += 1;
        // 404/410 means the browser has revoked/expired this subscription —
        // clean it up so future sends don't keep retrying a dead endpoint.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        }
      }
    })
  );
  return { sent, failed };
}

// Every push send (admin alert, buyer reply, or broadcast) gets recorded here
// so the admin panel can show "how many notifications have gone out" without
// needing to inspect the webpush provider directly.
async function logPushSend({ type, title, body, url, sent, failed, total }) {
  await prisma.pushLog.create({ data: { type, title, body, url, sent, failed, total } }).catch(() => {});
}

// Pinged when a buyer sends a message on any order — every admin browser
// that's granted notification permission gets one. `tag` is optional and
// just dresses up the title when the order happens to have one. Deep-links
// to the merged per-customer thread (see the admin messages inbox) when a
// sessionId is available, so tapping the notification lands on the same
// unified conversation the inbox itself would open — falls back to the
// old per-order link for pre-sessionId legacy orders.
export async function notifyAdminsOfMessage({ orderId, sessionId, buyerName, tag, body }) {
  const subs = await prisma.pushSubscription.findMany({ where: { role: "admin" } });
  const prefix = tag ? `${tag[0].toUpperCase() + tag.slice(1)} customer` : "New message";
  const title = `${prefix}: ${buyerName || "Buyer"}`;
  const msgBody = body || "Sent a new message";
  const url = sessionId ? `/mafia/messages/customer/${sessionId}` : `/mafia/messages/${orderId}`;
  const { sent, failed } = await sendToSubscriptions(subs, { title, body: msgBody, url, tag: `order-${orderId}` });
  await logPushSend({ type: "admin-alert", title, body: msgBody, url, sent, failed, total: subs.length });
}

// Pinged when the admin replies to an order whose buyer isn't currently
// browsing the site (see app/lib/onlineStatus.js) — every subscription tied
// to that specific order gets one, buyers don't get pinged for other orders.
export async function notifyBuyerOfReply({ orderId, supportName, body }) {
  const subs = await prisma.pushSubscription.findMany({ where: { role: "buyer", orderId } });
  const title = `${supportName || "Support"} replied`;
  const msgBody = body || "New message about your order";
  const url = `/order/${orderId}/support`;
  const { sent, failed } = await sendToSubscriptions(subs, { title, body: msgBody, url, tag: `order-${orderId}` });
  await logPushSend({ type: "buyer-reply", title, body: msgBody, url, sent, failed, total: subs.length });
}

// Admin-triggered marketing/announcement blast — every push subscription in
// the table gets it (every past buyer and admin device that ever granted
// notification permission), regardless of which order it was tied to.
export async function sendBroadcast({ title, body, url, image }) {
  const subs = await prisma.pushSubscription.findMany();
  const targetUrl = url || "/";
  const { sent, failed } = await sendToSubscriptions(subs, {
    title,
    body,
    url: targetUrl,
    image: image || undefined,
    tag: "broadcast",
  });
  await logPushSend({ type: "broadcast", title, body, url: targetUrl, sent, failed, total: subs.length });
  return { total: subs.length, sent, failed };
}
