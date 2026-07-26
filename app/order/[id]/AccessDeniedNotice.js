import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function AccessDeniedNotice() {
  return (
    <div className="panel expired-notice">
      <div className="security-notice-icon" style={{ margin: "0 auto 0.75rem" }}>
        <ShieldAlert size={22} />
      </div>
      <h3>Access Denied: Unrecognized Device</h3>
      <p className="muted">
        This order can only be viewed on the device and browser it was purchased
        from — there&apos;s no way to transfer or recover access from another
        device. Please restart checkout if you&apos;d like to purchase.
      </p>
      <Link href="/" className="btn" style={{ marginTop: "0.75rem", display: "inline-flex" }}>
        Browse listings
      </Link>
    </div>
  );
}
