import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import CopyButton from "@/app/components/CopyButton";
import { declineReasonLabel } from "@/app/lib/declineReasons";

export default function DeclinedNotice({ orderId, declineReason, declineNote }) {
  const reasonText = declineReasonLabel(declineReason) || "Your payment could not be verified.";

  return (
    <div className="declined-card">
      <div className="declined-icon-wrap">
        <div className="declined-icon-glow" aria-hidden="true" />
        <div className="declined-icon">
          <ShieldAlert size={26} />
        </div>
      </div>

      <h2 className="declined-heading">Payment Not Verified</h2>

      <div className="declined-reason-card">
        <span className="declined-reason-label">Reason</span>
        <p className="declined-reason-text">{reasonText}</p>

        {declineNote && (
          <>
            <span className="declined-note-label">Note from support</span>
            <p className="declined-note-text">{declineNote}</p>
          </>
        )}

        <div className="declined-order-row">
          <span className="declined-order-id">Order #{orderId}</span>
          <CopyButton value={orderId} label="Copy" />
        </div>
      </div>

      <Link href={`/order/${orderId}`} className="btn declined-primary-cta">
        Upload New Screenshot
      </Link>
      <Link href={`/order/${orderId}/support`} className="btn secondary declined-secondary-cta">
        Contact Support
      </Link>
    </div>
  );
}
