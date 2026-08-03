import crypto from "crypto";

// UroPay requires the API SECRET (distinct from the API KEY) to be SHA-512
// hashed before use — both as the bearer token when calling their API, and
// as the HMAC key when verifying inbound webhook signatures. See
// https://www.uropay.me/documentation.
function hashedSecret() {
  return crypto.createHash("sha512").update(process.env.UROPAY_API_SECRET || "").digest("hex");
}

export function isUroPayConfigured() {
  return Boolean(process.env.UROPAY_API_KEY && process.env.UROPAY_API_SECRET);
}

export function uroPayHeaders() {
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-API-KEY": process.env.UROPAY_API_KEY,
    Authorization: `Bearer ${hashedSecret()}`,
  };
}

// The three payload shapes UroPay signs, each with its own fixed key order —
// reconstructing the wrong order produces a different HMAC entirely. Ported
// directly from the Node.js sample in their docs rather than re-derived, to
// avoid introducing a subtle mismatch.
const FIXED_TAIL = ["uroPayOrderId", "merchantOrderId", "detectedAt", "environment"];

function buildTransactionPayload(payload) {
  const fixedSet = new Set([...FIXED_TAIL, "event"]);
  const ordered = {};
  if ("event" in payload) ordered.event = payload.event;
  const middle = Object.keys(payload)
    .filter((k) => !fixedSet.has(k))
    .sort((a, b) => a.localeCompare(b));
  for (const k of middle) ordered[k] = payload[k];
  for (const k of FIXED_TAIL) ordered[k] = payload[k] ?? null;
  return ordered;
}

function buildOrderStatusPayload(payload) {
  return {
    event: payload.event,
    uroPayOrderId: payload.uroPayOrderId,
    merchantOrderId: payload.merchantOrderId,
    orderStatus: payload.orderStatus,
    submittedUTR: payload.submittedUTR ?? null,
    environment: payload.environment,
  };
}

function buildUtrSubmittedPayload(payload) {
  return {
    event: payload.event,
    uroPayOrderId: payload.uroPayOrderId,
    merchantOrderId: payload.merchantOrderId,
    orderStatus: payload.orderStatus,
    submittedUTR: payload.submittedUTR ?? null,
    amount: payload.amount,
    customerName: payload.customerName,
    customerEmail: payload.customerEmail,
    customerVPA: payload.customerVPA ?? null,
    environment: payload.environment,
    utrSubmittedAt: payload.utrSubmittedAt ?? null,
  };
}

function safeCompareHex(expectedHex, actualHex) {
  try {
    const expected = Buffer.from(expectedHex, "hex");
    const actual = Buffer.from(actualHex, "hex");
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

// Mirrors UroPay's own Node.js verification sample from /documentation.
export function verifyUroPayWebhookSignature(payload, signatureHeader) {
  if (!process.env.UROPAY_API_SECRET || !signatureHeader) return false;

  const ordered =
    payload.event === "order.status.utrsubmitted"
      ? buildUtrSubmittedPayload(payload)
      : "orderStatus" in payload
        ? buildOrderStatusPayload(payload)
        : buildTransactionPayload(payload);

  const computed = crypto.createHmac("sha256", hashedSecret()).update(JSON.stringify(ordered)).digest("hex");
  return safeCompareHex(computed, signatureHeader);
}
