"use client";

import { useState } from "react";
import { RefreshCw } from "lucide-react";
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
//
// There's no way for a static page to detect that a UPI app declined a
// payment (control leaves the browser entirely once the intent fires), so
// this can't be an automatic fallback — instead it's a manual toggle the
// buyer can use themselves if the primary VPA isn't going through, e.g.
// because it's on a payments bank enforcing its own transaction caps.
export default function UpiPayButtons({ upiId, secondaryUpiId, payeeName, amount }) {
  const [useSecondary, setUseSecondary] = useState(false);

  if (!upiId || !payeeName) return null;

  const activeUpiId = useSecondary && secondaryUpiId ? secondaryUpiId : upiId;
  const href = buildUpiIntentUrl({ upiId: activeUpiId, payeeName, amount });

  return (
    <div className="upi-pay-buttons">
      {APPS.map(({ key, label, Icon }) => (
        <a key={key} href={href} className="upi-pay-btn">
          <Icon size={22} />
          <span>{label}</span>
        </a>
      ))}
      {secondaryUpiId && (
        <button type="button" className="upi-pay-alt-toggle" onClick={() => setUseSecondary((v) => !v)}>
          <RefreshCw size={13} />
          {useSecondary ? "Using alternate UPI ID — switch back" : "Payment not going through? Try alternate UPI ID"}
        </button>
      )}
    </div>
  );
}
