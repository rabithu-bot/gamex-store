import { prisma } from "@/app/lib/prisma";

// Single Setting row storing all four links as one JSON blob (same pattern
// as Listing.images) rather than four separate rows — one read, one write,
// and the shape can grow without a migration.
const SETTING_KEY = "socialLinks";

export const SOCIAL_LINK_FIELDS = ["instagram", "telegram", "whatsapp", "telegramChannel"];

const DEFAULTS = Object.fromEntries(SOCIAL_LINK_FIELDS.map((f) => [f, ""]));

// The one and only source of truth for "what social links does the
// storefront footer show" — an admin-set Setting row, or all-blank
// (every button hidden) if none has been saved yet.
export async function getSocialLinks() {
  const setting = await prisma.setting.findUnique({ where: { key: SETTING_KEY } });
  if (!setting?.value) return { ...DEFAULTS };
  try {
    const parsed = JSON.parse(setting.value);
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveSocialLinks(links) {
  const clean = Object.fromEntries(
    SOCIAL_LINK_FIELDS.map((f) => [f, String(links[f] || "").trim()])
  );
  await prisma.setting.upsert({
    where: { key: SETTING_KEY },
    update: { value: JSON.stringify(clean) },
    create: { key: SETTING_KEY, value: JSON.stringify(clean) },
  });
  return clean;
}
