// Deterministic pre-checks that run BEFORE the Gemini call. Several kinds
// of question have exactly one correct, policy-level answer that has
// nothing to do with LLM creativity — greetings, QR requests, how to buy,
// login method, and trust/warranty terms — so they're handled directly
// instead of trusting a model to phrase store policy correctly every time.
// Every fixed reply here is kept under ~15 words and sent as ONE message
// (see app/lib/chunkReply.js) — no multi-bubble splitting anymore.

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

// "Sir" is reserved for the start of a conversation / genuine respect
// moments — a greeting IS that moment, so it stays here. Everything after
// this defaults to "Bhai"/"Yaar".
const GREETING_REPLIES = [["Hello Sir, bolo kya help chahiye?"], ["Haan bhai, bata kya chahiye?"]];

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

export const QR_REPLY_CHUNKS = ["Bhai ye lo QR code, payment karke screenshot bhej do."];

const BUYING_KEYWORDS = [
  "kaise le",
  "kaise kharide",
  "kaise khareed",
  "id kaise",
  "buy kaise",
  "kaise buy",
  "purchase kaise",
  "kaise order",
  "kaise le sakta",
  "how to buy",
  "how to purchase",
  "how to order",
];

export function isBuyingGuidanceQuestion(text) {
  const lower = String(text || "").toLowerCase();
  return BUYING_KEYWORDS.some((kw) => lower.includes(kw));
}

export const BUYING_GUIDANCE_CHUNKS = ["Bhai menu se ID select kar, buy now dabao, payment karke ID mil jayegi turant."];

const LOGIN_KEYWORDS = ["login", "log in", "facebook se", "google se", "kaise chalega", "id kaise chale"];

export function isLoginQuestion(text) {
  const lower = String(text || "").toLowerCase();
  return LOGIN_KEYWORDS.some((kw) => lower.includes(kw));
}

export const LOGIN_REPLY_CHUNKS = ["Bhai id Facebook se login hai."];

const TRUST_KEYWORDS = [
  "trust",
  "guarantee",
  "warranty",
  "scam",
  "fraud",
  "fake",
  "bharosa",
  "vishwas",
  "vishwash",
  "asli hai",
  "sahi hai na",
  "dhoka",
];

export function isTrustQuestion(text) {
  const lower = String(text || "").toLowerCase();
  return TRUST_KEYWORDS.some((kw) => lower.includes(kw));
}

export const TRUST_REPLY_CHUNKS = [
  "Bhai 6 month guarantee hai, dikkat aaye to paisa wapas ya nayi ID free milegi.",
];

// Fires when the customer has just agreed to buy a specific ID that was
// already shown to them (e.g. after a budget pitch) — "haan ye chahiye",
// "deal done", "buy karna hai". Distinct from isBuyingGuidanceQuestion,
// which is someone asking HOW the buying process works in general.
const BUY_INTENT_KEYWORDS = [
  "haan ye chahiye",
  "ye chahiye",
  "deal done",
  "buy karna hai",
  "le lunga",
  "le lena",
  "ye lelo",
  "ye le lo",
  "ye wala de do",
  "ye wala chahiye",
  "confirm kar",
  "final kar",
  "pay kar deta",
  "pay karta hoon",
  "chalo le lete",
  "haan le lunga",
  "ok le lo",
  "isse le lunga",
  "yes i want this",
  "i want this one",
  "i'll take this",
  "i will take this",
];

export function isBuyIntent(text) {
  const lower = String(text || "").toLowerCase();
  return BUY_INTENT_KEYWORDS.some((kw) => lower.includes(kw));
}

// The sale-closing message — deliberately different wording from the bare
// isQrRequest reply above (that one's a plain "here's the QR"; this one is
// the actual closing line once they've committed to a specific ID).
export const CLOSING_REPLY_CHUNKS = [
  "Bhai QR pe payment karke screenshot bhejo, ID-password turant mil jayega.",
];

// Pulls a rupee amount out of a budget-shopping message ("500 rs me id
// dikhao", "budget 800 hai", "700 wala kya hai") — requires BOTH a number
// and a nearby budget/shopping-context word, so a stray number elsewhere
// in the conversation doesn't get misread as a price ask.
const BUDGET_CONTEXT_PATTERN =
  /budget|rs\.?\s*\d|rupee|price|me id|mein id|me kya|mein kya|ka id|wala id|dikhao|milega|hai kya|range|ke andar|se kam|se km|tak/i;

export function extractBudgetAmount(text) {
  const raw = String(text || "");
  if (!BUDGET_CONTEXT_PATTERN.test(raw)) return null;
  const match = raw.match(/\d{2,6}/);
  if (!match) return null;
  const amount = parseInt(match[0], 10);
  if (amount < 50 || amount > 100000) return null;
  return amount;
}

export function isBudgetQuestion(text) {
  return extractBudgetAmount(text) !== null;
}

// A general "kya available hai" / "koi id hai kya" question — no specific
// price mentioned, so extractBudgetAmount won't fire, but the customer
// still needs a REAL, live stock answer, never a guessed "sab sold out".
const AVAILABILITY_KEYWORDS = [
  "available hai",
  "available h",
  "koi id hai",
  "id hai kya",
  "stock hai",
  "kya hai abhi",
  "kya available",
  "id available",
  "any id available",
  "what's available",
  "do you have",
  "got any",
];

export function isAvailabilityQuestion(text) {
  const lower = String(text || "").toLowerCase();
  return AVAILABILITY_KEYWORDS.some((kw) => lower.includes(kw));
}

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

const DISCOUNT_KEYWORDS = [
  "discount",
  "kam kar",
  "kam nahi",
  "thoda kam",
  "less price",
  "price kam",
  "sasta",
  "rate kam",
  "final price",
  "kam me de",
  "kam mein de",
  "negotiat",
];

export function isDiscountQuestion(text) {
  const lower = String(text || "").toLowerCase();
  return DISCOUNT_KEYWORDS.some((kw) => lower.includes(kw));
}

// Buckets any buyer message into ONE label, in the same priority order the
// live bot itself checks these in (a message can only ever match one of
// these anyway) — this is the single source of truth both the repetition
// counter and the historical style-sample filter key off of, so "the same
// question" always means the same thing everywhere.
export function classifyIntent(text) {
  if (isGreetingOnly(text)) return "greeting";
  if (isBuyIntent(text)) return "buy_intent";
  if (isQrRequest(text)) return "qr_request";
  if (isLoginQuestion(text)) return "login";
  if (isBuyingGuidanceQuestion(text)) return "buying_guidance";
  if (isTrustQuestion(text)) return "trust";
  if (isDiscountQuestion(text)) return "discount";
  if (isOrderStatusQuestion(text)) return "order_status";
  if (isBudgetQuestion(text)) return "budget";
  if (isAvailabilityQuestion(text)) return "availability";
  return "general";
}
