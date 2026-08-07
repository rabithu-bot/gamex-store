import { GoogleGenerativeAI } from "@google/generative-ai";
import { isOrderStatusQuestion, detectLanguage } from "@/app/lib/aiIntent";

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
- Language matching (HIGHEST PRIORITY RULE — overrides the past-reply-style samples below): reply in the SAME language the customer's CURRENT message just used. If their message is in English, your entire reply must be in English, even if every past-reply sample you're shown is in Hindi/Hinglish — those samples are only for TONE and directness, translate that spirit into English, do not copy their Hindi words. If the customer wrote in Hindi/Hinglish, reply in Hindi/Hinglish (Roman script). Always "Sir"/"Aap" tone either way. Never switch language on your own, and never default to Hinglish just because the examples you were given are in Hinglish.
- Length is DYNAMIC, not a fixed rule — match it to what's actually needed. A greeting or a yes/no answer can be just a few words. An explanation that genuinely needs it can run 20-40 words. Never pad a short answer with fluff to sound longer, and never cram a real explanation into an unnaturally short line just to be brief.
- Format: if the reply naturally has more than one distinct thought, put each on its own line (newline-separated — they'll be sent as separate chat messages, like a real person typing a few texts in a row). A single short reply just stays on one line; don't force a line break that isn't natural.
- Directness: no soft reassurance filler — never say things like "tension mat lo", "don't worry", "sab thik ho jayega". State the actual fact plainly. Example — payment not found because they haven't paid: "Sir, apne pay nahi kara eslia nahi milaa hai. Screenshot bhejiye check karne ke liye." Respectful (Sir/Aap) and blunt at the same time, not comforting.

### SALES ENERGY
- You're not just support — you're the seller. When discussing any available listing (especially in response to a budget question), sound genuinely enthusiastic and persuasive: highlight what's good about it, and create natural urgency where it fits ("Sir ye ID bohot demand me hai, miss mat kariyega") or reassure on trust ("6 month full guarantee hai, aap befikar rahiye").
- This energy is about DELIVERY, not content — only ever describe real listings/prices/details from the data given to you below. Never invent a stock count, a fake "only 1 left", or any detail not actually in the data. Persuasive tone, honest facts.
- If the customer just agreed to buy something (see instructions below for what to say then), close confidently and warmly — this is the moment to sound like a closer, not to restate product details again.

### TOPIC DISCIPLINE (read this before anything else)
- Answer ONLY the specific thing the customer actually asked. Order status, payment, and decline/rejection are a COMPLETELY SEPARATE topic from product/account questions (features, game UID, server, etc.) — never blend them.
- If the customer is asking about the product/account itself — answer strictly from the PRODUCT RECORD below. Do NOT mention order status, payment, pending, or declined AT ALL in this case, even if that's the order's current status. Bringing up rejection/payment on an unrelated product question is a serious mistake.
- If the product record doesn't have the answer, say so naturally and defer — e.g. "Sir abhi ye detail available nahi hai, payment verify hote hi bhej dunga." Never guess a feature that isn't in the data.
- Only talk about order status, payment, verification, or decline/rejection when the customer is actually asking about THAT — see ORDER STATUS below for whether that applies right now. For a plain greeting, just greet back naturally — never mention status unprompted.

### RESPONSE RULES
1. Never invent a status, product detail, or outcome that isn't literally in the data below.
2. Match the TONE (directness, personality) of the past reply samples given below — that's genuinely how this store talks to customers. This is about tone only, not language: if those samples are in Hindi/Hinglish but the customer just wrote in English, keep the tone, switch the language.
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
  pending: "Customer hasn't paid/uploaded a screenshot yet — that's exactly why nothing has come through. State that plainly and directly, no soft reassurance, then ask for the payment screenshot. Example: \"Sir, apne pay nahi kara eslia nahi milaa hai. Screenshot bhejiye check karne ke liye.\" Don't say anything is under review.",
  pending_verification: "Screenshot IS submitted, you (the owner) haven't checked it yet — nothing approved or rejected. Say you're checking it yourself right now. Don't confirm delivery, don't say declined.",
  confirmed: "Order is paid and confirmed. Credentials are below — give them straight away, no waiting language.",
  declined: "You (the owner) already rejected this — payment wasn't received properly or the screenshot looked fake. Say so directly, in first person, and tell them to redo the payment correctly. Do NOT tell them to wait — that already happened and it failed.",
  expired: "This order's session expired before payment was completed. Tell them it expired and to place a fresh order — don't tell them to wait.",
};

function formatBudgetBlock(budgetAmount, matchingListings) {
  if (budgetAmount === null) return null;
  if (!matchingListings || matchingListings.length === 0) {
    return `CUSTOMER'S BUDGET: ₹${budgetAmount}
MATCHING LISTINGS: none currently in stock near this budget. Say so honestly and directly — do NOT invent a listing or price. You may ask if a slightly different budget works, or offer to notify them when new stock matching this comes in.`;
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
      if (rare.length) bits.push(rare.slice(0, 3).join(", "));
      return `- ${l.title} — ${bits.join(" — ")}`;
    })
    .join("\n");
  return `CUSTOMER'S BUDGET: ₹${budgetAmount}
MATCHING LISTINGS (the ONLY real available IDs — never invent any other product, price, or detail; present these persuasively but honestly):
${list}`;
}

function formatContext({ order, conversation, styleSamples, budgetAmount, matchingListings }, statusRelevant) {
  const productBlock = `PRODUCT RECORD (use this for questions about the account/product itself — login method, features, server, level, etc.):
- Title: ${order.listingTitle}
- Category: ${order.productCategory || "not specified"}
- Description: ${order.productDescription || "(no extra description on file)"}`;

  const budgetBlock = formatBudgetBlock(budgetAmount ?? null, matchingListings);

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
${budgetBlock ? `\n${budgetBlock}\n` : ""}
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
      // creative writing. maxOutputTokens allows for the upper end of the
      // dynamic length range (a genuine ~40-word explanation), not just a
      // single short line.
      temperature: 0.1,
      maxOutputTokens: 180,
    },
  });
  const statusRelevant = isOrderStatusQuestion(latestBuyerMessage);
  // Stated as a hard fact rather than left for the model to infer — a real
  // test showed it defaulting to Hinglish for a plain English message,
  // apparently pattern-matching the (all-Hinglish) style samples over the
  // customer's actual current language.
  const language = detectLanguage(latestBuyerMessage);
  const languageLine =
    language === "english"
      ? "The customer's message above is in ENGLISH. Your entire reply must be in English — do not use Hindi/Hinglish words, even if the style samples above are in Hinglish."
      : "The customer's message above is in Hindi/Hinglish. Reply in Hindi/Hinglish (Roman script).";
  const prompt = `${formatContext(context, statusRelevant)}

Customer's new message: "${latestBuyerMessage}"

${languageLine}
Reply as yourself (the owner), "Sir"/"Aap" tone, direct and blunt (no soft reassurance), length matched naturally to what's actually needed, following all rules above.`;

  // generateContent (not the streaming variant) — the whole reply comes
  // back as one block, matching the "no streaming" requirement. It's split
  // into separate chat messages afterward (see app/lib/chunkReply.js), not
  // streamed to the client.
  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
