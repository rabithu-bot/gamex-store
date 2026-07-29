import { GoogleGenerativeAI } from "@google/generative-ai";

export function isGeminiConfigured() {
  return Boolean(process.env.GEMINI_API_KEY);
}

let cachedClient = null;
function getClient() {
  if (!cachedClient) {
    cachedClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return cachedClient;
}

function messagePreview(message, customerName) {
  const speaker = message.sender === "admin" ? "Support" : customerName || "Customer";
  let content = message.body || "";
  if (!content) {
    if (message.attachmentType === "audio") content = "[voice message]";
    else if (message.attachmentPath) content = "[photo]";
  }
  return `${speaker}: ${content}`;
}

// Drafts ONE reply suggestion for the admin to review and edit before
// sending — this is never sent automatically. Deliberately never given
// accountId/accountPassword, only message text, so real account
// credentials are never part of what's sent to a third-party API.
export async function draftReply({ currentThread, pastReplies, customerName }) {
  if (!isGeminiConfigured()) return null;

  const model = getClient().getGenerativeModel({ model: "gemini-2.0-flash" });

  const threadText = currentThread.map((m) => messagePreview(m, customerName)).join("\n");

  const styleBlock = pastReplies.length
    ? `For tone and style reference, here are some of this support agent's past replies to other customers:\n${pastReplies
        .map((r) => `- "${r}"`)
        .join("\n")}\n\n`
    : "";

  const prompt = `You are helping a customer support agent at an online gaming-account marketplace draft their next reply.

${styleBlock}Current conversation${customerName ? ` with ${customerName}` : ""}:
${threadText}

Write ONE short, natural reply the agent could send next, continuing the conversation and matching their usual tone from the examples above (if any were given). Reply with ONLY the message text itself — no quotation marks, no labels, no explanation.`;

  const result = await model.generateContent(prompt);
  return result.response.text().trim();
}
