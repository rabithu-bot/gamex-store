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
