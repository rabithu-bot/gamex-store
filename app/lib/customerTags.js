// Shared source of truth for admin-assignable customer labels — used by
// both the tag-picker UI and the API route's server-side validation, so
// the two can never drift out of sync.
export const CUSTOMER_TAGS = [
  { key: "booked", label: "Booked", color: "#f87171", bg: "rgba(239, 68, 68, 0.18)", border: "rgba(239, 68, 68, 0.4)" },
  { key: "vip", label: "VIP", color: "#fbbf24", bg: "rgba(245, 158, 11, 0.18)", border: "rgba(245, 158, 11, 0.4)" },
  { key: "priority", label: "Priority", color: "#60a5fa", bg: "rgba(59, 130, 246, 0.18)", border: "rgba(59, 130, 246, 0.4)" },
];

export function getCustomerTag(key) {
  return CUSTOMER_TAGS.find((t) => t.key === key) || null;
}
