"use client";

import { buildUpiIntentUrl } from "@/app/lib/upi";
import { GPayIcon, PhonePeIcon, PaytmIcon } from "./PaymentAppIcons";

const APPS = [
  { key: "gpay", label: "Pay via GPay", Icon: GPayIcon },
  { key: "phonepe", label: "Pay via PhonePe", Icon: PhonePeIcon },
  { key: "paytm", label: "Pay via Paytm", Icon: PaytmIcon },
];

// All three buttons deliberately point at the exact same generic upi://pay
// link (see app/lib/upi.js) — there's no officially documented way to force
// one specific app to open with pre-filled details, so Android's own app
// chooser (or the single installed UPI app) is what actually opens.
export default function UpiPayButtons({ upiId, payeeName, amount, orderId }) {
  if (!upiId || !payeeName) return null;
  const href = buildUpiIntentUrl({ upiId, payeeName, amount, orderId });

  return (
    <div className="upi-pay-buttons">
      {APPS.map(({ key, label, Icon }) => (
        <a key={key} href={href} className="upi-pay-btn">
          <Icon size={22} />
          <span>{label}</span>
        </a>
      ))}
    </div>
  );
}
