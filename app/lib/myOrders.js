const STORAGE_KEY = "gamex_my_orders";
const MAX_ENTRIES = 25;

export function getMyOrders() {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveMyOrder({ id, listingId, listingTitle }) {
  if (typeof window === "undefined") return;
  try {
    const existing = getMyOrders().filter((o) => o.id !== id);
    const next = [{ id, listingId, listingTitle, savedAt: new Date().toISOString() }, ...existing].slice(
      0,
      MAX_ENTRIES
    );
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // localStorage unavailable (private browsing, quota) — losing the local
    // bookmark is fine, the order itself is already safe server-side.
  }
}

export function findMyOrderForListing(listingId) {
  return getMyOrders().find((o) => o.listingId === listingId) || null;
}
