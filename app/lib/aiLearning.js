import { prisma } from "@/app/lib/prisma";

const SETTING_KEY = "aiAutoReplyEnabled";

// How much "shadow learning" counts as ready — deliberately conservative,
// arbitrary numbers picked as a reasonable bar rather than derived from
// anything scientific. Observations (real admin-reply patterns captured)
// count for more of the score than conversions (successful sales), since
// there are naturally far fewer of the latter.
export const TARGET_OBSERVATIONS = 10000;
export const TARGET_CONVERSIONS = 1000;
const OBSERVATION_WEIGHT = 0.6;
const CONVERSION_WEIGHT = 0.4;

// Bounds for the simulated "typing" delay a live AI reply waits out after
// marking a customer's message seen — never instant (which would look
// robotic) and never so long it risks the sale, regardless of what the
// historical average or the reply's own length would otherwise suggest.
const MIN_TYPING_SECONDS = 2;
const MAX_TYPING_SECONDS = 10;
// Fallback estimate when there isn't a learned average yet — a rough
// "normal" phone-typing pace, in characters per second.
const TYPING_CHARS_PER_SECOND = 9;
// Only deltas at or under this are treated as "the admin was actually
// typing" when averaging — a seen-to-reply gap longer than this almost
// certainly means the admin stepped away, not that they type slowly, and
// would otherwise drag the learned average (and so every live AI reply)
// out to something unnaturally slow.
const MAX_NATURAL_SEEN_TO_REPLY_SECONDS = 60;

// Always computed live from real data — never a stored/cached number that
// could drift out of sync with what's actually in the database.
export async function getLearningStats() {
  const [observations, conversions] = await Promise.all([
    prisma.aiObservation.count(),
    prisma.order.count({ where: { status: "confirmed" } }),
  ]);

  const observationRatio = Math.min(1, observations / TARGET_OBSERVATIONS);
  const conversionRatio = Math.min(1, conversions / TARGET_CONVERSIONS);
  const progress = Math.round((observationRatio * OBSERVATION_WEIGHT + conversionRatio * CONVERSION_WEIGHT) * 100);

  return {
    observations,
    conversions,
    targetObservations: TARGET_OBSERVATIONS,
    targetConversions: TARGET_CONVERSIONS,
    progress,
    readyToEnable: progress >= 100,
  };
}

export async function isAiAutoReplyEnabled() {
  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  return setting?.value === "true";
}

// Turning it OFF is always allowed. Turning it ON is hard-gated at 100%
// learning progress server-side — not just a UI suggestion, since the
// point of shadow mode is that it genuinely can't go live early even if
// someone flips a switch in the browser.
export async function setAiAutoReplyEnabled(enabled) {
  if (enabled) {
    const stats = await getLearningStats();
    if (!stats.readyToEnable) {
      return { ok: false, error: "Learning progress isn't at 100% yet", stats };
    }
  }
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: enabled ? "true" : "false" },
    create: { key: SETTING_KEY, value: enabled ? "true" : "false" },
  });
  return { ok: true };
}

// Logged for every real admin reply, tagged or not — the fuller the
// picture of how the admin actually responds, the better. body/attachment
// describe the admin's own message; customerBody/customerAttachmentType
// describe the buyer message it was replying to (looked up by the caller).
export async function recordObservation({
  orderId,
  customerMessage,
  customerAttachmentType,
  adminReply,
  adminAttachmentType,
  seenToReplySeconds,
}) {
  await prisma.aiObservation
    .create({
      data: {
        orderId,
        customerMessage: customerMessage || "",
        customerAttachmentType: customerAttachmentType || null,
        adminReply: adminReply || "",
        adminAttachmentType: adminAttachmentType || null,
        seenToReplySeconds: Number.isFinite(seenToReplySeconds) ? Math.round(seenToReplySeconds) : null,
      },
    })
    .catch(() => {
      // Observation logging must never break the admin's actual reply from
      // sending — worst case, this one exchange just doesn't get logged.
    });
}

// The learned "how long does the admin actually take to type a reply once
// they've seen the message" — null until there's at least one usable
// sample, in which case callers fall back to a length-based estimate.
export async function getAverageSeenToReplySeconds() {
  const result = await prisma.aiObservation.aggregate({
    _avg: { seenToReplySeconds: true },
    where: { seenToReplySeconds: { not: null, lte: MAX_NATURAL_SEEN_TO_REPLY_SECONDS } },
  });
  return result._avg.seenToReplySeconds;
}

// How long a live AI reply should show "typing..." before actually
// sending — the learned admin average if there's enough real data yet,
// otherwise a length-based guess, always clamped to a sane range so it
// never looks instant/robotic or drags out long enough to risk the sale.
export async function estimateTypingSeconds(replyText) {
  const avg = await getAverageSeenToReplySeconds();
  const seconds = avg && avg > 0 ? avg : (replyText || "").length / TYPING_CHARS_PER_SECOND;
  return Math.min(MAX_TYPING_SECONDS, Math.max(MIN_TYPING_SECONDS, seconds));
}
