import crypto from "crypto";
import { uploadBuffer } from "@/app/lib/s3";

// "Adam" — a clear, natural default male voice on ElevenLabs. Paired with
// eleven_multilingual_v2, which handles Hindi/Hinglish text correctly
// regardless of the voice's own base accent. This key doesn't have the
// voices_read permission (only text-to-speech), so browsing the voice
// library programmatically wasn't possible — swap this ID directly if a
// more specifically Indian-accented voice is picked from the ElevenLabs
// dashboard later.
const VOICE_ID = "pNInz6obpgDQGcFmaJgB";
const MODEL_ID = "eleven_multilingual_v2";

// Returns a public S3 URL for the synthesized voice note, or null if the
// key isn't configured or the call fails — callers treat null as "skip
// the voice reply", never as something to surface as an error to the
// buyer (same resilience pattern as every other AI-pipeline step here).
export async function synthesizeVoiceNote(text) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  const trimmed = String(text || "").trim();
  if (!apiKey || !trimmed) return null;

  try {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        text: trimmed,
        model_id: MODEL_ID,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    const key = `voice-replies/${Date.now()}-${crypto.randomUUID()}.mp3`;
    return await uploadBuffer(key, buffer, "audio/mpeg");
  } catch {
    return null;
  }
}
