import { GoogleGenerativeAI } from "@google/generative-ai";

// Reuses the same key/model family as the support bot itself rather than
// pulling in a separate Whisper dependency/credential — Gemini accepts
// audio directly as multimodal input, which covers "speech-to-text" for
// this use case without a second API to configure.
const MODEL_NAME = "gemini-3.1-flash-lite";
const TRANSCRIBE_PROMPT =
  "Transcribe this voice message exactly as spoken, in Roman script if it's in Hindi/Hinglish. Reply with ONLY the transcript text — no commentary, no quotes, nothing else.";

let client = null;
function getClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new GoogleGenerativeAI(apiKey);
  return client;
}

function guessMimeType(url) {
  const clean = url.split("?")[0].toLowerCase();
  if (clean.endsWith(".mp3")) return "audio/mpeg";
  if (clean.endsWith(".wav")) return "audio/wav";
  if (clean.endsWith(".m4a") || clean.endsWith(".mp4")) return "audio/mp4";
  if (clean.endsWith(".ogg")) return "audio/ogg";
  // Voice notes recorded in-browser via MediaRecorder default to this.
  return "audio/webm";
}

// Returns the transcript text, or null if transcription isn't possible
// (no key configured, fetch/API failure) — callers treat null the same as
// any other AI-pipeline failure: skip the auto-reply, let a human handle it.
export async function transcribeVoiceNote(audioUrl) {
  const genAI = getClient();
  if (!genAI || !audioUrl) return null;

  try {
    const audioRes = await fetch(audioUrl);
    if (!audioRes.ok) return null;
    const buffer = Buffer.from(await audioRes.arrayBuffer());
    const base64Audio = buffer.toString("base64");

    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent([
      { inlineData: { mimeType: guessMimeType(audioUrl), data: base64Audio } },
      { text: TRANSCRIBE_PROMPT },
    ]);
    const transcript = result.response.text().trim();
    return transcript || null;
  } catch {
    return null;
  }
}
