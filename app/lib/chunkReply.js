import { prisma } from "@/app/lib/prisma";
import { synthesizeVoiceNote } from "@/app/lib/elevenLabsTts";

// Sends a reply as ONE single chat message — no more multi-bubble
// splitting (a customer complained real messages and a burst of separate
// bubbles were going out together and it read as spam). Callers still
// pass an array for convenience (a fixed script can be written as a few
// short pieces in source for readability) — they're just joined into one
// message body here instead of becoming separate rows.
//
// voiceReply: true additionally sends ONE more message with a synthesized
// voice note of the same text (voice-for-voice routing — only set this
// when the customer's own message was itself a voice note; text questions
// get text-only replies). Currently always false — voice-note replies are
// switched off for now (see the route's isVoiceInput/wantsVoiceReply
// comment). Failure to synthesize just skips the voice note silently — it
// never blocks or removes the text reply that already sent.
export async function sendChunkedReply({ orderId, chunks, attachmentPath, attachmentType, voiceReply = false }) {
  const combined = chunks.filter(Boolean).join(" ").trim();
  if (!combined) return "";

  await prisma.message.create({
    data: {
      orderId,
      sender: "admin",
      body: combined,
      attachmentPath: attachmentPath || null,
      attachmentType: attachmentType || null,
    },
  });

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
