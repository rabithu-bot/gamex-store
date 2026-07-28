import Razorpay from "razorpay";
import crypto from "crypto";

// The buyer-facing checkout UI stays on the existing QR/screenshot flow
// until these are actually set — so shipping this integration can never
// break real checkout for anyone, whether the env vars simply don't exist
// yet or the account is still in Test Mode.
export function isRazorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

let cachedClient = null;
export function getRazorpayClient() {
  if (!isRazorpayConfigured()) return null;
  if (!cachedClient) {
    cachedClient = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }
  return cachedClient;
}

function safeCompare(expectedHex, actualHex) {
  if (!actualHex) return false;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = Buffer.from(actualHex, "hex");
  if (expected.length !== actual.length) return false;
  return crypto.timingSafeEqual(expected, actual);
}

// Verifies a webhook delivery against the separate Webhook Secret set in
// the Razorpay dashboard (distinct from the API Key Secret) — this is what
// actually proves a call really came from Razorpay and isn't someone
// POSTing a fake "payment succeeded" event at the endpoint. Takes the raw
// request body text, since the signature is computed over the exact bytes
// sent, not a re-serialized version of the parsed JSON.
export function verifyWebhookSignature(rawBody, signatureHeader) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret) return false;
  const expected = crypto.createHmac("sha256", webhookSecret).update(rawBody).digest("hex");
  return safeCompare(expected, signatureHeader);
}

// Verifies the checkout modal's client-side success callback. This is only
// used to redirect the buyer to the confirming page a little sooner — the
// webhook above remains the sole authoritative source that actually flips
// an order to "confirmed", since a client-side callback can be spoofed by
// anyone with devtools open.
export function verifyPaymentSignature({ razorpayOrderId, razorpayPaymentId, signature }) {
  if (!process.env.RAZORPAY_KEY_SECRET) return false;
  const expected = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");
  return safeCompare(expected, signature);
}
