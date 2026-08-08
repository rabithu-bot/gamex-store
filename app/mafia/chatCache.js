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
