// Deterministic pre-checks that run BEFORE the Gemini call — these two
// cases (a bare greeting, a QR code request) have exactly one correct
// answer that has nothing to do with order status or LLM creativity, so
// they're handled directly instead of trusting a model to get them right
// every time.

const GREETING_WORDS = new Set([
  "hi",
  "hii",
  "hiii",
  "hello",
  "helo",
  "hey",
  "heyy",
  "heyyy",
  "sir",
  "bhai",
  "bro",
  "namaste",
  "yo",
]);

// Only fires when the ENTIRE message is made of greeting words — "Hi" or
// "Hello bhai" count, but "Hi mera order kab aayega" does not, so a real
// question tacked onto a greeting still gets the full database-grounded
// reply instead of being short-circuited.
export function isGreetingOnly(text) {
  const cleaned = String(text || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .trim();
  if (!cleaned) return false;
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3) return false;
  return words.every((w) => GREETING_WORDS.has(w));
}

const GREETING_REPLIES = ["Hello bhai, bolo kya hua?", "Haan bhai, bolo."];

export function pickGreetingReply() {
  return GREETING_REPLIES[Math.floor(Math.random() * GREETING_REPLIES.length)];
}

const QR_KEYWORDS = [
  "qr",
  "payment link",
  "paymentlink",
  "pay link",
  "upi link",
  "scan code",
  "scanner",
];

export function isQrRequest(text) {
  const lower = String(text || "").toLowerCase();
  return QR_KEYWORDS.some((kw) => lower.includes(kw));
}

export const QR_REPLY_TEXT = "Bhai ye lo QR code, ispe payment karke screenshot bhej do.";

// Gates whether the order-status directive gets shown to the model at all.
// Without this, the bot was pulling in "your order is declined" for
// completely unrelated questions (e.g. "login Facebook ya Google se hai?")
// just because that happened to be the order's current status — a real
// incident, not a hypothetical. Deterministic keyword gating is far more
// reliable here than trusting the model to know when status is relevant,
// which is exactly what failed before.
const STATUS_KEYWORDS = [
  "order",
  "status",
  "payment",
  "paisa",
  "pay ",
  "paid",
  "verify",
  "verified",
  "declined",
  "decline",
  "reject",
  "pending",
  "screenshot",
  "refund",
  "kab aayega",
  "kab milega",
  "kab tak",
  "kyun reject",
  "kyu reject",
  "kya hua mera",
];

export function isOrderStatusQuestion(text) {
  const lower = String(text || "").toLowerCase();
  return STATUS_KEYWORDS.some((kw) => lower.includes(kw));
}
