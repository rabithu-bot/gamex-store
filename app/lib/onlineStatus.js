// Generous relative to the buyer's 1.5s poll interval (useOrderPoll) so a
// couple of missed/slow ticks don't flicker the indicator, while still
// going stale quickly once they actually close the tab or it backgrounds.
export const ONLINE_THRESHOLD_MS = 10 * 1000;

export function isBuyerOnline(buyerLastSeenAt, now = Date.now()) {
  if (!buyerLastSeenAt) return false;
  return now - new Date(buyerLastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}

// Same threshold, mirrored for the buyer's own view of support (driven by
// adminLastSeenAt instead of buyerLastSeenAt).
export function isAdminOnline(adminLastSeenAt, now = Date.now()) {
  if (!adminLastSeenAt) return false;
  return now - new Date(adminLastSeenAt).getTime() < ONLINE_THRESHOLD_MS;
}
