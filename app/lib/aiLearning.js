import { prisma } from "@/app/lib/prisma";

const SETTING_KEY = "aiAutoReplyEnabled";

// How much "shadow learning" counts as ready — deliberately conservative,
// arbitrary numbers picked as a reasonable bar rather than derived from
// anything scientific. Observations (real admin-reply patterns captured)
// count for more of the score than conversions (successful sales), since
// there are naturally far fewer of the latter.
export const TARGET_OBSERVATIONS = 200;
export const TARGET_CONVERSIONS = 30;
const OBSERVATION_WEIGHT = 0.6;
const CONVERSION_WEIGHT = 0.4;

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
}) {
  await prisma.aiObservation
    .create({
      data: {
        orderId,
        customerMessage: customerMessage || "",
        customerAttachmentType: customerAttachmentType || null,
        adminReply: adminReply || "",
        adminAttachmentType: adminAttachmentType || null,
      },
    })
    .catch(() => {
      // Observation logging must never break the admin's actual reply from
      // sending — worst case, this one exchange just doesn't get logged.
    });
}
