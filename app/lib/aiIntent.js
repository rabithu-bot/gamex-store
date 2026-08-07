// Deterministic pre-checks that run BEFORE the Gemini call. Several kinds
// of question have exactly one correct, policy-level answer that has
// nothing to do with LLM creativity — greetings, QR requests, how to buy,
// login method, and trust/warranty terms — so they're handled directly
// instead of trusting a model to phrase store policy correctly every time.
// Each fixed reply is pre-split into the 2-3 short chunks it should be
// sent as (see app/lib/chunkReply.js) rather than one long block.

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
// "Hello sir" count, but "Hi mera order kab aayega" does not, so a real
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

const GREETING_REPLIES = [["Hello Sir, kaise madad kar sakta hoon?"], ["Haan Sir, bataiye kya chahiye aapko?"]];

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

export const QR_REPLY_CHUNKS = ["Sir ye lo QR code.", "Ispe payment karke screenshot bhej do."];

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

export const BUYING_GUIDANCE_CHUNKS = [
  "Sir, aap main menu me jayea wha pr id select kariya.",
  "Buy now pr click krke pay krdejiya jitna ke id select kri hai apne utne and apko automatic id mill jayega.",
];

const LOGIN_KEYWORDS = ["login", "log in", "facebook se", "google se", "kaise chalega", "id kaise chale"];

export function isLoginQuestion(text) {
  const lower = String(text || "").toLowerCase();
  return LOGIN_KEYWORDS.some((kw) => lower.includes(kw));
}

export const LOGIN_REPLY_CHUNKS = ["Sir id Facebook se login hai."];

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
  "Sir, id ki guaranteed rehti hai 6 month ki.",
  "Agar 6 month me koi dikat aaye to aapke paise aapko wps ho jayenga ya jaise id aapko dikhaye gye hai ushe ache id aapko de jayegi free of cost bina aapise ek rs liye.",
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
  "Sir, aap is official QR par amount pay karke screenshot yahi bhej dijiye.",
  "Payment verify hote hi automatic ID aur password aapko turant mil jayega.",
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

// Deterministic language detection for the general Gemini fallback — a
// real test showed the model defaulting to Hinglish even for a plain
// English message, apparently pattern-matching the (all-Hinglish)
// past-reply style samples over the customer's actual current language.
// Rather than trust instruction-following alone for this, the detected
// language is stated explicitly in the prompt as a hard fact.
const HINGLISH_MARKER_WORDS = new Set([
  "hai",
  "hain",
  "kya",
  "kaise",
  "kab",
  "kahan",
  "kyun",
  "kyu",
  "mera",
  "meri",
  "mere",
  "aapka",
  "aapki",
  "aap",
  "nahi",
  "nahin",
  "kar",
  "karo",
  "kro",
  "krdo",
  "raha",
  "rha",
  "rahi",
  "hua",
  "hogaya",
  "ho",
  "tha",
  "thi",
  "milega",
  "bhejo",
  "bhej",
  "diya",
  "diyo",
  "sahi",
  "abhi",
  "batao",
  "bataiye",
  "chahiye",
]);

export function detectLanguage(text) {
  const cleaned = String(text || "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .trim();
  if (!cleaned) return "english";
  const words = cleaned.split(/\s+/).filter(Boolean);
  const hasHinglishMarker = words.some((w) => HINGLISH_MARKER_WORDS.has(w));
  return hasHinglishMarker ? "hinglish" : "english";
}
