import { GoogleGenerativeAI } from "@google/generative-ai";

// gemini-1.5-pro has been fully retired from the API, and this key's free
// tier has zero quota for any -pro model regardless — gemini-3.5-flash is
// what this key can actually call today. Bump to a pro model in this one
// spot once billing is upgraded.
const MODEL_NAME = "gemini-3.5-flash";

const SYSTEM_INSTRUCTION = `You are "GameXStore AI", an elite, high-speed automated customer support executive for gamexstore.com. Your job is to resolve customer queries instantly using the provided store database and admin chat history.

### CORE PERSONALITY & STYLE
- Tone: Extremely professional yet friendly, helpful, and direct. Avoid formal textbook English.
- Language: Strictly use "Hinglish" (Hindi written in Roman script) just like a typical Indian gamer/customer talks. (e.g., "Bhai aapka order process ho raha hai, 5 mins me check karo.")
- Brevity: Keep responses short, accurate, and straight to the point. No unnecessary corporate fluff.

### RESPONSE LOGIC & RULES
1. Untagged/New Customers: Instantly check the database for their order status, payment verification, or product delivery details.
2. Match Admin History: Analyze how the human admin handled similar past issues and mimic that exact resolution style.
3. Strict Constraints:
   - Never promise refunds or cancellations unless explicitly authorized in the database rules.
   - For complex issues (e.g., payment stuck but not received), politely ask them to wait for the human admin: "Bhai payment verify nahi hui hai, Admin thodi der me check karke update karega. Please wait karo."
4. Immediate Action: If an order is marked "Success" or "Delivered" in the database, provide the product codes/credentials instantly in a clean, readable format.`;

let client = null;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new GoogleGenerativeAI(apiKey);
  return client;
}

function formatContext({ order, conversation, styleSamples }) {
  const orderBlock = `ORDER RECORD:
- Order ID: ${order.id}
- Buyer: ${order.buyerName || "Unknown"}
- Product: ${order.listingTitle} (₹${order.listingPrice})
- Status: ${order.status}
- Payment screenshot attached: ${order.hasPaymentScreenshot ? "yes" : "no"}
- Placed at: ${order.createdAt}
${
  order.status === "confirmed"
    ? `- DELIVERED CREDENTIALS — Account ID: ${order.accountId} | Password: ${order.accountPassword}`
    : "- Credentials: NOT released yet (order not confirmed)"
}`;

  const historyBlock = conversation.length
    ? conversation
        .map(
          (m) =>
            `${m.sender === "buyer" ? "Customer" : "Admin"}: ${
              m.body || (m.attachmentType ? `[sent a ${m.attachmentType}]` : "[empty]")
            }`
        )
        .join("\n")
    : "(no messages yet)";

  const styleBlock = styleSamples.length
    ? styleSamples.map((s) => `- ${s}`).join("\n")
    : "(no past admin replies on record yet)";

  return `${orderBlock}

CONVERSATION SO FAR (this order):
${historyBlock}

PAST ADMIN REPLY STYLE SAMPLES (from other orders — match this tone):
${styleBlock}`;
}

// Returns the generated reply text, or null if the key isn't configured or
// the API call fails — callers treat null as "skip the auto-reply", never
// as something to surface as an error to the buyer.
export async function generateSupportReply(context, latestBuyerMessage) {
  const genAI = getClient();
  if (!genAI) return null;

  const model = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: SYSTEM_INSTRUCTION });
  const prompt = `${formatContext(context)}

Customer's new message: "${latestBuyerMessage}"

Reply as GameXStore AI, in Hinglish, following all rules above.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
