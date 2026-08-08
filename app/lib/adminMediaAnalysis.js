import { GoogleGenerativeAI } from "@google/generative-ai";
import { guessMimeType } from "@/app/lib/transcribeAudio";

// Same key/model family as the rest of the shadow-learning pipeline —
// Gemini's multimodal input covers both image understanding and "listen to
// this audio" without a separate vision/speech API to configure.
const MODEL_NAME = "gemini-3.1-flash-lite";

let client = null;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new GoogleGenerativeAI(apiKey);
  return client;
}

function guessImageMimeType(url) {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".png")) return "image/png";
  if (clean.endsWith(".webp")) return "image/webp";
  if (clean.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

async function fetchAsBase64(url) {
  const res = await fetch(url);
  if (!res.ok) return null;
  const buffer = Buffer.from(await res.arrayBuffer());
  return buffer.toString("base64");
}

// One short, human-readable line describing what an admin-sent image
// actually was and why it was likely shared — e.g. "payment QR code",
// "rare items proof screenshot" — rather than just logging that *an*
// image existed. Returns null if analysis isn't possible; callers still
// count the image as "logged" independent of whether this succeeds.
export async function analyzeAdminImage(imageUrl, customerMessage) {
  const genAI = getClient();
  if (!genAI || !imageUrl) return null;

  try {
    const base64 = await fetchAsBase64(imageUrl);
    if (!base64) return null;

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt = `A game-account support agent just sent this image, replying to a customer who said: "${(customerMessage || "").slice(0, 200)}". In one short phrase (max 12 words), describe what the image shows and why it was likely shared (e.g. "payment QR code", "account stats screenshot", "rare items proof"). Reply with ONLY that phrase — no quotes, no extra commentary.`;

    const result = await model.generateContent([
      { inlineData: { mimeType: guessImageMimeType(imageUrl), data: base64 } },
      { text: prompt },
    ]);
    return result.response.text().trim() || null;
  } catch {
    return null;
  }
}

// Analyzes an admin's own voice-note reply in a single Gemini call that
// returns BOTH the transcript and a qualitative read on delivery style
// (pacing, where they pause, tone) — one call instead of two, since this
// already competes with the same free-tier quota as everything else in
// the shadow-learning pipeline.
//
// Important honesty note: this is a qualitative, text-described style
// summary from listening to the clip, not real acoustic feature
// extraction (pitch curves, formants, embeddings) — there's no audio DSP
// library or vector store in this stack. It's genuinely useful as a style
// hint for prompting a TTS voice later ("fast, confident, short pause
// after greeting"), but it will not reproduce the admin's actual voice —
// that would need a dedicated voice-cloning service.
export async function analyzeAdminVoiceReply(audioUrl) {
  const genAI = getClient();
  if (!genAI || !audioUrl) return { transcript: null, styleNotes: null };

  try {
    const base64 = await fetchAsBase64(audioUrl);
    if (!base64) return { transcript: null, styleNotes: null };

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const prompt =
      'Listen to this voice message from a support agent. Reply with ONLY valid JSON (no markdown fences), in exactly this shape: {"transcript": "<exact words spoken, Roman script if Hindi/Hinglish>", "style": "<one short sentence on pacing, where they pause, and tone, e.g. \'speaks fast, short pause after the greeting, casual confident tone\'>"}';

    const result = await model.generateContent([
      { inlineData: { mimeType: guessMimeType(audioUrl), data: base64 } },
      { text: prompt },
    ]);
    const raw = result.response
      .text()
      .trim()
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/, "")
      .trim();
    const parsed = JSON.parse(raw);
    return {
      transcript: typeof parsed.transcript === "string" ? parsed.transcript.trim() || null : null,
      styleNotes: typeof parsed.style === "string" ? parsed.style.trim() || null : null,
    };
  } catch {
    return { transcript: null, styleNotes: null };
  }
}
