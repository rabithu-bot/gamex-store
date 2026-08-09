import { ONLINE_THRESHOLD_MS } from "@/app/lib/onlineStatus";

// The online dot is driven by a lastSeenAt column refreshed from the
// viewer's own 1.5s chat poll. Writing on literally every poll meant a
// row update every 1.5s per open thread (and on the merged customer view,
// one per order that customer has) purely to move a timestamp — real write
// volume on a metered Postgres for a presence dot.
//
// Writing at this interval instead keeps the indicator just as accurate:
// it's comfortably under ONLINE_THRESHOLD_MS, so an actively-open thread
// always refreshes well before its own timestamp could go stale.
const WRITE_INTERVAL_MS = Math.floor(ONLINE_THRESHOLD_MS / 2.5);

// Module-level, so it's per warm serverless instance rather than global.
// A cold start just means one extra write — harmless, and the alternative
// (shared state) would cost more than the write it saves.
const lastWriteAt = new Map();
// Bounds memory on a long-lived instance; entries are pure throttle state,
// so dropping the oldest just allows one extra write for that key later.
const MAX_TRACKED_KEYS = 500;

export function shouldWritePresence(key) {
  const now = Date.now();
  const previous = lastWriteAt.get(key);
  if (previous && now - previous < WRITE_INTERVAL_MS) return false;

  if (lastWriteAt.size >= MAX_TRACKED_KEYS && !lastWriteAt.has(key)) {
    lastWriteAt.delete(lastWriteAt.keys().next().value);
  }
  lastWriteAt.set(key, now);
  return true;
}
