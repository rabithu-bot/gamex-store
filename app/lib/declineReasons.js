// Canonical preset decline reasons — shared by the admin decline modal, the
// admin orders list (inline summary), and the buyer-facing declined page, so
// the wording only ever lives in one place. Keys are what's persisted on
// Order.declineReason; labels are what gets shown to people.
export const DECLINE_REASONS = [
  { key: "no_match", label: "Screenshot doesn't match any payment received on our end" },
  { key: "amount_short", label: "Amount paid is less than the order total" },
  { key: "pending_settlement", label: "Payment is still pending / not settled yet" },
  { key: "unclear_utr", label: "Screenshot unclear — UTR / transaction ID not readable" },
  { key: "duplicate_screenshot", label: "Duplicate screenshot — already used on another order" },
  { key: "wrong_upi", label: "Payment sent to the wrong UPI ID / account" },
];

const REASON_MAP = new Map(DECLINE_REASONS.map((r) => [r.key, r.label]));

export function declineReasonLabel(key) {
  return REASON_MAP.get(key) || null;
}

export function isValidDeclineReason(key) {
  return REASON_MAP.has(key);
}
