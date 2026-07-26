// Admins enter rare items as one comma-separated line ("3 EVO MAX, PRIME 7");
// stored as a JSON array so the product page can render them as pills.
export function parseRareItems(raw) {
  return String(raw || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
