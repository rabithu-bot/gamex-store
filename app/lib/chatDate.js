function isSameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

// WhatsApp-style day divider label — shown once above the first message of
// each calendar day instead of repeating the date on every single bubble.
export function formatDayDivider(iso) {
  const date = new Date(iso);
  const now = new Date();
  if (isSameDay(date, now)) return "Today";

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

// True when `iso` falls on a different calendar day than `prevIso` (or
// there's no previous message) — the caller renders a day divider then.
export function isNewDay(iso, prevIso) {
  if (!prevIso) return true;
  return !isSameDay(new Date(iso), new Date(prevIso));
}
