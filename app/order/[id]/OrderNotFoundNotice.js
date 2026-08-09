import Link from "next/link";
import { PackageX } from "lucide-react";

// Shown when the order id genuinely no longer exists — abandoned orders are
// hard-deleted 24h after checkout (see app/lib/orderPurge.js), so a saved
// link can legitimately go dead. Without this the page just sat on its
// loading skeleton forever, which reads as "the site is broken".
export default function OrderNotFoundNotice() {
  return (
    <div className="panel expired-notice">
      <div className="security-notice-icon" style={{ margin: "0 auto 0.75rem" }}>
        <PackageX size={22} />
      </div>
      <h3>This order is no longer available</h3>
      <p className="muted">
        Orders that aren&apos;t completed are removed after 24 hours. If you already
        paid for this one, message us and we&apos;ll sort it out — otherwise just
        start a fresh checkout.
      </p>
      <Link href="/" className="btn" style={{ marginTop: "0.75rem", display: "inline-flex" }}>
        Browse listings
      </Link>
    </div>
  );
}
