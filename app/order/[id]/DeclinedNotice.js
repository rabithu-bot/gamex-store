import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export default function DeclinedNotice({ orderId }) {
  return (
    <div className="panel security-notice-modal">
      <div className="security-notice-icon">
        <ShieldAlert size={22} />
      </div>
      <h3>Payment Verification Failed ❌</h3>
      <p className="muted">
        Your payment screenshot could not be verified (Invalid or Fake Screenshot). Please
        complete the real payment and upload a valid screenshot to receive your ID credentials.
      </p>
      <Link href={`/order/${orderId}`} className="btn security-notice-cta">
        Upload Real Screenshot 🔄
      </Link>
    </div>
  );
}
