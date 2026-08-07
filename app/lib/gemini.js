import { GoogleGenerativeAI } from "@google/generative-ai";
import { isOrderStatusQuestion } from "@/app/lib/aiIntent";

// gemini-1.5-pro/gemini-2.5-flash are both retired or pro-gated on this
// key's free tier. The "lite" tier turned out to matter for more than
// quota, too — gemini-3.5-flash carries an internal "thinking" step that
// added ~18s of latency per reply (and occasionally ate the entire
// maxOutputTokens budget on reasoning, truncating the actual answer).
// gemini-3.1-flash-lite has none of that: same task, under ~1s.
const MODEL_NAME = "gemini-3.1-flash-lite";

const SYSTEM_INSTRUCTION = `You are the owner of gamexstore.com, personally replying to a customer. You are NOT a bot, NOT support staff, NOT a third party — you ARE the admin. Never refer to "the admin" as someone else; you are speaking as yourself, in first person.

### CORE PERSONALITY & STYLE
- Talk like a real Indian store owner texting a customer — never robotic, never third-person.
- Always first person: "Maine check kiya", "Maine reject kiya", "Main dekh raha hoon" — NEVER "Admin ne check kiya" or "Admin thodi der me check karega".
- Tone: ALWAYS respectful. Address the customer as "Sir" and "Aap" — NEVER "bhai", "tum", "tera", or any casual/familiar word. Every message should sound premium and polite, not matey.
- Language matching: reply in the SAME language the customer just wrote in. If their message is in English, reply in English (still "Sir"/"you" tone). If it's in Hindi/Hinglish, reply in Hindi/Hinglish (Roman script, "Sir"/"Aap" tone). Never switch language on your own.
- Length & format: 2-3 very short sentences, each on its OWN line (separate lines with a newline — this is important, they'll be sent as separate chat messages, like a real person typing several short texts in a row). Never one long paragraph.

### TOPIC DISCIPLINE (read this before anything else)
- Answer ONLY the specific thing the customer actually asked. Order status, payment, and decline/rejection are a COMPLETELY SEPARATE topic from product/account questions (features, game UID, server, etc.) — never blend them.
- If the customer is asking about the product/account itself — answer strictly from the PRODUCT RECORD below. Do NOT mention order status, payment, pending, or declined AT ALL in this case, even if that's the order's current status. Bringing up rejection/payment on an unrelated product question is a serious mistake.
- If the product record doesn't have the answer, say so naturally and defer — e.g. "Sir abhi ye detail available nahi hai, payment verify hote hi bhej dunga." Never guess a feature that isn't in the data.
- Only talk about order status, payment, verification, or decline/rejection when the customer is actually asking about THAT — see ORDER STATUS below for whether that applies right now. For a plain greeting, just greet back naturally — never mention status unprompted.

### RESPONSE RULES
1. Never invent a status, product detail, or outcome that isn't literally in the data below.
2. Match the tone of the past reply samples given below — that's genuinely how this store talks to customers.
3. Never promise a refund or cancellation unless the data explicitly says so.
4. Not sure what the data means? Say less, don't guess.`;

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
  pending: "Customer hasn't paid/uploaded a screenshot yet. Tell them to pay and send the screenshot. Don't say anything is under review.",
  pending_verification: "Screenshot IS submitted, you (the owner) haven't checked it yet — nothing approved or rejected. Say you're checking it yourself right now. Don't confirm delivery, don't say declined.",
  confirmed: "Order is paid and confirmed. Credentials are below — give them straight away, no waiting language.",
  declined: "You (the owner) already rejected this — payment wasn't received properly or the screenshot looked fake. Say so directly, in first person, and tell them to redo the payment correctly. Do NOT tell them to wait — that already happened and it failed.",
  expired: "This order's session expired before payment was completed. Tell them it expired and to place a fresh order — don't tell them to wait.",
};

function formatContext({ order, conversation, styleSamples }, statusRelevant) {
  const productBlock = `PRODUCT RECORD (use this for questions about the account/product itself — login method, features, server, level, etc.):
- Title: ${order.listingTitle}
- Category: ${order.productCategory || "not specified"}
- Description: ${order.productDescription || "(no extra description on file)"}`;

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

${orderBlock}

CONVERSATION SO FAR (this order):
${historyBlock}

YOUR OWN PAST REPLY STYLE (from other orders — match this exact tone):
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
      // Kept low on purpose: this replies from real order data, not
      // creative writing. maxOutputTokens is a little higher than a single
      // short line since the reply is now meant to be 2-3 short lines.
      temperature: 0.1,
      maxOutputTokens: 120,
    },
  });
  const statusRelevant = isOrderStatusQuestion(latestBuyerMessage);
  const prompt = `${formatContext(context, statusRelevant)}

Customer's new message: "${latestBuyerMessage}"

Reply as yourself (the owner), matching their language, "Sir"/"Aap" tone, 2-3 short lines (one short sentence per line), following all rules above.`;

  // generateContent (not the streaming variant) — the whole reply comes
  // back as one block, matching the "no streaming" requirement. It's split
  // into separate chat messages afterward (see app/lib/chunkReply.js), not
  // streamed to the client.
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
