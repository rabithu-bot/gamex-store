// Generic module-level cache for admin panel data — same idea as
// chatCache.js's ordersListCache, generalized for every other panel that
// lives on its own /mafia/* route (Dashboard, Orders, Listings, and each
// Settings sub-page). Since each of those is a real route, navigating away
// and back — or just switching tabs and coming back — unmounts and
// remounts the panel component. Without this, every single one restarts
// from useState(null) and flashes its skeleton/"Loading..." state even
// when the underlying data hasn't meaningfully changed since the admin
// last saw it. Reading the last-known value on mount renders instantly
// instead, while each panel's own poll/useEffect fetch still runs right
// behind it to catch anything new.
//
// Deliberately a plain Map, not a fancier store: the data here is exactly
// what each panel already fetches and owns — this only removes the
// artificial "start over from null" gap between mounts, it doesn't change
// who's responsible for keeping it fresh.
const cache = new Map();

export function getCached(key) {
  return cache.has(key) ? cache.get(key) : null;
}

export function setCached(key, data) {
  cache.set(key, data);
}
