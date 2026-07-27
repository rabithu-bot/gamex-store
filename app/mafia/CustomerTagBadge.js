import { getCustomerTag } from "@/app/lib/customerTags";

export default function CustomerTagBadge({ tag }) {
  const info = getCustomerTag(tag);
  if (!info) return null;
  return (
    <span
      className="customer-tag-badge"
      data-tag={tag}
      style={{ "--tag-color": info.color, "--tag-bg": info.bg, "--tag-border": info.border }}
    >
      {info.label}
    </span>
  );
}
