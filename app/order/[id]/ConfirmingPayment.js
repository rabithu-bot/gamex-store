"use client";

import { useEffect, useState } from "react";

const TOTAL_SECONDS = 5 * 60;

export default function ConfirmingPayment() {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);

  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timeLabel = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <div className="confirming-payment">
      <div className="confirming-ring">
        <div className="confirming-ring-inner" />
      </div>
      <h3>Confirming Payment</h3>
      <p className="confirming-timer">{timeLabel}</p>
      <p className="muted">
        {secondsLeft > 0
          ? "We're verifying your payment. This usually only takes a few minutes."
          : "Still verifying — thanks for your patience."}
      </p>
    </div>
  );
}
