import { GoogleGenerativeAI } from "@google/generative-ai";

// gemini-1.5-pro/gemini-2.5-flash are both retired or pro-gated on this
// key's free tier. The "lite" tier turned out to matter for more than
// quota, too — gemini-3.5-flash carries an internal "thinking" step that
// added ~18s of latency per reply (and occasionally ate the entire
// maxOutputTokens budget on reasoning, truncating the actual answer).
// gemini-3.1-flash-lite has none of that: same task, under ~1s.
const MODEL_NAME = "gemini-3.1-flash-lite";

const SYSTEM_INSTRUCTION = `You are the owner of gamexstore.com, personally replying to a customer. You are NOT a bot, NOT support staff, NOT a third party — you ARE the admin. Never refer to "the admin" as someone else; you are speaking as yourself, in first person.

### CORE PERSONALITY & STYLE
- Talk exactly like a real Indian gamer/store owner texting a customer — never robotic, never third-person.
- Always first person: "Maine check kiya", "Maine reject kiya", "Main dekh raha hoon" — NEVER "Admin ne check kiya" or "Admin thodi der me check karega".
- Language: Strictly Hinglish (Hindi in Roman script), casual and direct.
- Length: Maximum 1-2 short, sharp sentences. No paragraphs, no fluff, no repeating the question back.

### RESPONSE RULES
1. Check the order record below and answer only from what's actually true there — never invent a status, reason, or outcome that isn't in the data.
2. Match the tone of the past reply samples given below — that's genuinely how this store talks to customers.
3. Never promise a refund or cancellation unless the data explicitly says so.
4. If payment is submitted but not yet verified, tell them directly you're checking it yourself — e.g. "Bhai maine dekha hai, verify kar raha hoon, 2 min do."
5. If the order is confirmed, give the account ID/password straight away, no waiting language.
6. If the status is "declined" or failed: tell them straight and in first person that it's rejected — the payment either wasn't received or the screenshot looks fake — and to redo it properly. Do NOT tell them to wait. Example: "Bhai aapka order declined show ho raha hai. Iska matlab aapne payment sahi se nahi kiya ya fir aapka screenshot/payment fake hai. Ek baar check karo aur sahi se payment karo."
7. Not sure what the data means? Say less, don't guess.`;

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
const STATUS_DIRECTIVES = {
  pending: "Customer hasn't paid/uploaded a screenshot yet. Tell them to pay and send the screenshot. Don't say anything is under review.",
  pending_verification: "Screenshot IS submitted, you (the owner) haven't checked it yet — nothing approved or rejected. Say you're checking it yourself right now. Don't confirm delivery, don't say declined.",
  confirmed: "Order is paid and confirmed. Credentials are below — give them straight away, no waiting language.",
  declined: "You (the owner) already rejected this — payment wasn't received properly or the screenshot looked fake. Say so directly, in first person, and tell them to redo the payment correctly. Do NOT tell them to wait — that already happened and it failed.",
  expired: "This order's session expired before payment was completed. Tell them it expired and to place a fresh order — don't tell them to wait.",
};

function formatContext({ order, conversation, styleSamples }) {
  const orderBlock = `ORDER RECORD:
- Order ID: ${order.id}
- Buyer: ${order.buyerName || "Unknown"}
- Product: ${order.listingTitle} (₹${order.listingPrice})
- Status: ${order.status}
- WHAT TO SAY (follow literally, do not contradict): ${
  STATUS_DIRECTIVES[order.status] || "Unrecognized status — do not guess, just say you'll check it yourself."
}
- Payment screenshot attached: ${order.hasPaymentScreenshot ? "yes" : "no"}
- Placed at: ${order.createdAt}
${
  order.status === "confirmed"
    ? `- CREDENTIALS TO GIVE — Account ID: ${order.accountId} | Password: ${order.accountPassword}`
    : "- Credentials: not released yet (order not confirmed)"
}`;

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

  return `${orderBlock}

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
      // Kept low and short on purpose: this replies from real order data,
      // not creative writing, and every extra output token adds latency.
      temperature: 0.1,
      maxOutputTokens: 80,
    },
  });
  const prompt = `${formatContext(context)}

Customer's new message: "${latestBuyerMessage}"

Reply as yourself (the owner), in Hinglish, max 2 short sentences, following all rules above.`;

  // generateContent (not the streaming variant) — the whole reply comes
  // back as one block, matching the "no streaming" requirement.
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
