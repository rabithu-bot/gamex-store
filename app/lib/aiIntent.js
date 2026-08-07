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
