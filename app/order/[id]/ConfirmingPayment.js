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
  const timedOut = secondsLeft === 0;

  return (
    <div className="confirming-payment">
      <span className="confirming-status-badge">⏳ Payment Verification in Progress</span>
      <div className="confirming-ring">
        <div className="confirming-ring-spinner" />
        <div className="confirming-ring-inner">
          <span className="confirming-timer">{timeLabel}</span>
        </div>
      </div>
      <p className="muted confirming-instruction">
        {timedOut
          ? "Verification is taking a little longer than usual. Kindly wait and check back in a few minutes — this page will update automatically."
          : "Your payment proof is under review. Credentials will automatically unlock once confirmed by our verification team."}
      </p>
    </div>
  );
}
