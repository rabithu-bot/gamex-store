import { GoogleGenerativeAI } from "@google/generative-ai";
import { isOrderStatusQuestion } from "@/app/lib/aiIntent";

// gemini-1.5-pro/gemini-2.5-flash are both retired or pro-gated on this
// key's free tier. The "lite" tier turned out to matter for more than
// quota, too — gemini-3.5-flash carries an internal "thinking" step that
// added ~18s of latency per reply (and occasionally ate the entire
// maxOutputTokens budget on reasoning, truncating the actual answer).
// gemini-3.1-flash-lite has none of that: same task, under ~1s.
const MODEL_NAME = "gemini-3.1-flash-lite";

const SYSTEM_INSTRUCTION = `You are the owner of gamexstore.com, personally replying to a customer over chat. You are NOT a bot, NOT support staff, NOT a third party — you ARE the admin. Never refer to "the admin" as someone else; you are speaking as yourself, in first person.

### LENGTH — THE MOST IMPORTANT RULE
- Maximum 10-15 words. One single short sentence. Never more.
- ONE message only — never multiple lines, never a list, never a paragraph. Everything you want to say has to fit in that one short line.
- If you can't fit the full answer in 10-15 words, say the most important part only and stop. Short and incomplete beats long and complete here.

### TONE
- Talk exactly like a real Indian gamer texting a friend — casual, warm, zero corporate polish.
- Always first person: "Maine check kiya", "Maine reject kiya" — NEVER "Admin ne check kiya" or third-person references to yourself.
- Address the customer as "Bhai" or "Yaar" by default — like talking to a fellow gamer. Only use "Sir" right at the start of a fresh conversation or for one genuine moment of respect (e.g. reassuring them about a big payment) — never repeat "Sir" every single line, that reads as spam.
- Natural Hinglish (Hindi in Roman script) ALWAYS — this is the one and only language, regardless of what language the customer used. No pure English sentences.
- Zero technical/backend words — never say "fetch", "system", "database", "server", "data load ho raha hai", "API". Say it like a human: "bas 2 minute ruko, ID check karke abhi bhejta hu" instead of "system check kar raha hai".

### NEVER LIE ABOUT STOCK OR SCREENSHOTS
- Never say "screenshot available nahi hai" or claim something's out of stock from memory/guesswork — the AVAILABLE LISTINGS data below is checked live, right now. If it has real matches, confidently offer them and their screenshot. If it's genuinely empty, say so honestly — don't invent a listing either way.
- This is about showing photos of an AVAILABLE (not yet purchased) listing — totally fine and expected. It is NOT about giving out a specific order's login/password early — that part stays gated to a confirmed, paid order (see ORDER STATUS below), which is a real rule, not an evasive lie.

### SALES ENERGY
- You're the seller, not just support. When a real listing matches, sound genuinely into it: "Bhai abhi 700 me ye mast account available hai, dekhoge?" — natural excitement, not corporate.
- Only ever describe real listings/prices from the data below. Never invent a stock count or a fake "only 1 left".
- Customer just agreed to buy? Close warmly and confidently — that's your moment, not a place to repeat product details.

### TOPIC DISCIPLINE
- Answer ONLY the specific thing asked. Order status/payment/decline is a SEPARATE topic from product questions (login, features, server, level) — never blend them, even if that happens to be the order's current status.
- Product question but the data doesn't have the answer? Say so naturally, don't guess: "Abhi ye detail nahi hai, payment ke baad bhej dunga."
- Plain greeting? Just greet back — never mention order status unprompted.

### RESPONSE RULES
1. Never invent a status, product detail, price, or outcome not literally in the data below.
2. Match the ENERGY (directness, excitement) of the past reply samples below, not necessarily their exact words.
3. Never promise a refund/cancellation unless the data explicitly allows it.
4. Never tell a customer to "place a new order" or that their "session expired" while they're actively paying for what they already started — stay focused on finishing THIS payment, regardless of the backend status.
5. Unsure what the data means? Say less, don't guess.`;

let client = null;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new GoogleGenerativeAI(apiKey);
  return client;
}

// Maps every real order status to an unambiguous, literal, first-person
// directive — the model is told exactly what to say for the status it was
// actually given, rather than having to infer meaning from a bare string.
// Only ever shown to the model when the customer is actually asking about
// their order/payment (see isOrderStatusQuestion) — a real incident showed
// this leaking into unrelated product questions just because it happened
// to be the order's current status, which is exactly what this gate stops.
const STATUS_DIRECTIVES = {
  pending: "Customer hasn't paid/uploaded a screenshot yet — say so straight, ask for the screenshot. e.g. \"Bhai, tune pay nahi kiya isliye nahi mila. Screenshot bhej check ke liye.\"",
  pending_verification: "Screenshot IS submitted, you haven't checked it yet. Say you're checking it now yourself. Don't confirm delivery, don't say declined.",
  confirmed: "Order is paid and confirmed. Credentials are below — give them straight away, no waiting language.",
  declined: "You already rejected this — payment wasn't received or screenshot looked fake. Say so directly, tell them to redo it. Do NOT say wait — that already happened and failed.",
  // Deliberately does NOT say "session expired, place a new order" — a
  // real incident showed this killing active sales, telling a customer who
  // was actively mid-payment to restart from scratch. Whatever the backend
  // expiry flag says, if they're here talking about it, treat it exactly
  // like "pending": stay focused on getting the payment done.
  expired: "Customer hasn't completed payment yet. Stay focused on the payment — ask for the screenshot, or say you're checking if they say they sent one. Do NOT mention session/expiry, do NOT say to start over.",
};

function formatAvailabilityBlock(budgetAmount, matchingListings) {
  if (budgetAmount === null && !matchingListings) return null;
  const heading = budgetAmount !== null ? `CUSTOMER'S BUDGET: ₹${budgetAmount}` : "CUSTOMER IS ASKING WHAT'S AVAILABLE RIGHT NOW";
  if (!matchingListings || matchingListings.length === 0) {
    return `${heading}
AVAILABLE LISTINGS (checked live, right now): none in stock matching this. Say so honestly — do NOT invent one.`;
  }
  const list = matchingListings
    .map((l) => {
      const bits = [`₹${l.price}`];
      if (l.tier) bits.push(l.tier);
      if (l.level) bits.push(`Level ${l.level}`);
      if (l.gameUid) bits.push(`UID ${l.gameUid}`);
      let rare = [];
      try {
        rare = JSON.parse(l.rareItems || "[]");
      } catch {
        rare = [];
      }
      if (rare.length) bits.push(rare.slice(0, 2).join(", "));
      return `- ${l.title} — ${bits.join(" — ")}`;
    })
    .join("\n");
  return `${heading}
AVAILABLE LISTINGS (checked live, right now — the ONLY real stock, describe these, a screenshot of the top one is already attached to your reply):
${list}`;
}

function formatContext({ order, conversation, styleSamples, budgetAmount, matchingListings }, statusRelevant) {
  const productBlock = `PRODUCT RECORD (this order's own product — login method, features, server, level, etc.):
- Title: ${order.listingTitle}
- Category: ${order.productCategory || "not specified"}
- Description: ${order.productDescription || "(no extra description on file)"}`;

  const availabilityBlock = formatAvailabilityBlock(budgetAmount ?? null, matchingListings);

  const orderBlock = statusRelevant
    ? `ORDER STATUS (customer is asking about their order/payment — this is relevant right now):
- Status: ${order.status}
- WHAT TO SAY (follow literally, do not contradict): ${
        STATUS_DIRECTIVES[order.status] || "Unrecognized status — do not guess, just say you'll check it yourself."
      }
- Payment screenshot attached: ${order.hasPaymentScreenshot ? "yes" : "no"}
${
  order.status === "confirmed"
    ? `- CREDENTIALS TO GIVE — Account ID: ${order.accountId} | Password: ${order.accountPassword}`
    : "- Credentials: not released yet (order not confirmed)"
}`
    : `ORDER STATUS: not relevant to the customer's current message — do NOT bring up order status, payment, or decline/rejection here, even though the order's actual status is "${order.status}". Answer only the product/general question being asked.`;

  const historyBlock = conversation.length
    ? conversation
        .map(
          (m) =>
            `${m.sender === "buyer" ? "Customer" : "You"}: ${
              m.body || (m.attachmentType ? `[sent a ${m.attachmentType}]` : "[empty]")
            }`
        )
        .join("\n")
    : "(no messages yet)";

  const styleBlock = styleSamples.length
    ? styleSamples.map((s) => `- ${s}`).join("\n")
    : "(no past reply samples yet)";

  return `${productBlock}
${availabilityBlock ? `\n${availabilityBlock}\n` : ""}
${orderBlock}

CONVERSATION SO FAR (this order):
${historyBlock}

YOUR OWN PAST REPLY ENERGY (from other orders — match the vibe, not the exact words):
${styleBlock}`;
}

// Returns the generated reply text, or null if the key isn't configured or
// the API call fails — callers treat null as "skip the auto-reply", never
// as something to surface as an error to the buyer.
export async function generateSupportReply(context, latestBuyerMessage) {
  const genAI = getClient();
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({
    model: MODEL_NAME,
    systemInstruction: SYSTEM_INSTRUCTION,
    generationConfig: {
      // Tight on purpose — real order data, not creative writing, and the
      // 10-15 word cap means there's no reason to allow more tokens than
      // that could ever need.
      temperature: 0.15,
      maxOutputTokens: 45,
    },
  });
  const statusRelevant = isOrderStatusQuestion(latestBuyerMessage);
  const prompt = `${formatContext(context, statusRelevant)}

Customer's new message: "${latestBuyerMessage}"

Reply as yourself, natural Hinglish, "Bhai"/"Yaar" tone (Sir only if this is the very start), ONE short sentence, max 10-15 words, following all rules above.`;

  // generateContent (not the streaming variant) — the whole reply comes
  // back as one block, sent as a single chat message (see
  // app/lib/chunkReply.js), never split into multiple bubbles.
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
