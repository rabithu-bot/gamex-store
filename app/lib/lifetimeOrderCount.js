import { prisma } from "@/app/lib/prisma";

const SETTING_KEY = "totalOrdersAllTime";

// A permanent, ever-growing counter of every order ever created — kept
// independent of the Order table itself so it survives any future pruning
// of old expired/declined rows (unlike a live COUNT(*), which would drop
// to whatever's still in the table). Stored as a Setting row rather than
// its own model since it's a single scalar, not a record with a lifecycle.
export async function incrementLifetimeOrderCount() {
  await prisma.$executeRaw`
    INSERT INTO "Setting" ("key", "value") VALUES (${SETTING_KEY}, '1')
    ON CONFLICT ("key") DO UPDATE SET "value" = (CAST("Setting"."value" AS INTEGER) + 1)::text
  `;
}

export async function getLifetimeOrderCount() {
  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  return setting ? Number(setting.value) : 0;
}

const MANUAL_BASELINE_KEY = "manualDealsBaseline";

// Optional admin-entered override for real deals this site's own order
// history can't see — pre-website/offline sales (e.g. Instagram DMs before
// GameX Store existed), which the automatic counter above has no way to
// know about since they never went through this site's checkout. This is
// deliberately never invented or defaulted to anything here: it's null
// (unset) until the admin types their own number into the settings panel
// and saves it themselves, so the figure is always something the owner is
// personally vouching for, not something generated on their behalf.
export async function getManualDealsBaseline() {
  const setting = await prisma.setting.findUnique({ where: { key: MANUAL_BASELINE_KEY } });
  if (!setting) return null;
  const parsed = Number(setting.value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

export async function setManualDealsBaseline(value) {
  if (value === null) {
    await prisma.setting.deleteMany({ where: { key: MANUAL_BASELINE_KEY } });
    return;
  }
  await prisma.setting.upsert({
    where: { key: MANUAL_BASELINE_KEY },
    update: { value: String(value) },
    create: { key: MANUAL_BASELINE_KEY, value: String(value) },
  });
}

// The number actually worth showing publicly as "deals completed": the
// admin's own manually-attested figure when they've set one, otherwise the
// real auto-incrementing on-site count. Never a fabricated fallback.
export async function getEffectiveLifetimeDeals() {
  const manual = await getManualDealsBaseline();
  if (manual !== null) return manual;
  return getLifetimeOrderCount();
}
