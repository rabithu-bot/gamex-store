// A plain module-level cache — survives client-side navigation (the JS
// module stays loaded as long as the SPA doesn't do a full page reload),
// which is exactly what a chat thread needs: ChatThread/CustomerChatThread
// are deliberately remounted (key={orderId}/key={sessionId}) on every
// navigation to guarantee no state bleeds between two different
// customers, but that also means the fresh instance would otherwise start
// from a blank slate every time. Reading from here on mount lets it render
// the last-known state instantly instead, while the real fetch still runs
// in the background to refresh it.
const threadCache = new Map();
// Tracks the newest message timestamp we've actually prefetched per key,
// so the inbox's background prefetch (see MessagesPanel.js) only re-fetches
// a conversation when there's real new activity, instead of re-hitting the
// same threads on every poll tick regardless of whether anything changed.
const prefetchedAt = new Map();

export function getCachedThread(key) {
  return threadCache.get(key) || null;
}

export function setCachedThread(key, data) {
  threadCache.set(key, data);
}

export function shouldPrefetch(key, latestMessageAt) {
  return prefetchedAt.get(key) !== latestMessageAt;
}

export function markPrefetched(key, latestMessageAt) {
  prefetchedAt.set(key, latestMessageAt);
}

// Same idea as threadCache above, for MessagesPanel's own inbox list: it's
// a route (/mafia/messages), so opening a conversation and hitting back
// unmounts and remounts it, which used to mean starting from
// useState(null) and flashing the skeleton loader every single time even
// though the list barely changed. Reading this on mount renders the
// last-known list instantly instead, while useVisiblePolling's own
// immediate-on-mount fetch still runs right behind it to catch anything
// new.
let ordersListCache = null;

export function getCachedOrdersList() {
  return ordersListCache;
}

export function setCachedOrdersList(data) {
  ordersListCache = data;
}
