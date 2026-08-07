import { prisma } from "@/app/lib/prisma";
import { synthesizeVoiceNote } from "@/app/lib/elevenLabsTts";

const MAX_CHUNKS = 3;
// Small gap between each chunk so they read like separate messages someone
// actually typed one after another, not a single block that got sliced.
const CHUNK_DELAY_MS = 700;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Splits a raw Gemini reply into up to MAX_CHUNKS short pieces — primarily
// on newlines (the system instruction asks the model to put each short
// sentence on its own line for exactly this reason), falling back to
// sentence-ending punctuation if the model ignores that and returns one
// unbroken line.
export function splitIntoChunks(text) {
  const trimmed = String(text || "").trim();
  if (!trimmed) return [];

  let pieces = trimmed
    .split("\n")
    .map((p) => p.trim())
    .filter(Boolean);

  if (pieces.length <= 1) {
    const sentences = trimmed.match(/[^.!?]+[.!?]*/g)?.map((s) => s.trim()).filter(Boolean);
    pieces = sentences && sentences.length > 1 ? sentences : [trimmed];
  }

  if (pieces.length <= MAX_CHUNKS) return pieces;
  // More pieces than the cap — merge the overflow into the last chunk
  // rather than silently dropping content.
  const head = pieces.slice(0, MAX_CHUNKS - 1);
  const tail = pieces.slice(MAX_CHUNKS - 1).join(" ");
  return [...head, tail];
}

// Sends a reply as a short burst of separate admin messages instead of one
// paragraph — matches how a real person actually texts. Any attachment
// (e.g. the QR image) rides on the first chunk. Returns the combined text,
// for callers that need one string for a push notification body.
//
// voiceReply: true additionally sends ONE more message with a synthesized
// voice note of the combined text (voice-for-voice routing — only set this
// when the customer's own message was itself a voice note; text questions
// get text-only replies). Failure to synthesize just skips the voice note
// silently — it never blocks or removes the text reply that already sent.
export async function sendChunkedReply({ orderId, chunks, attachmentPath, attachmentType, voiceReply = false }) {
  const list = chunks.filter(Boolean);
  if (list.length === 0) return "";

  for (let i = 0; i < list.length; i++) {
    await prisma.message.create({
      data: {
        orderId,
        sender: "admin",
        body: list[i],
        attachmentPath: i === 0 ? attachmentPath || null : null,
        attachmentType: i === 0 ? attachmentType || null : null,
      },
    });
    if (i < list.length - 1) await sleep(CHUNK_DELAY_MS);
  }

  const combined = list.join(" ");

  if (voiceReply) {
    const voiceUrl = await synthesizeVoiceNote(combined);
    if (voiceUrl) {
      await prisma.message.create({
        data: { orderId, sender: "admin", body: "", attachmentPath: voiceUrl, attachmentType: "audio" },
      });
    }
  }

  return combined;
}
