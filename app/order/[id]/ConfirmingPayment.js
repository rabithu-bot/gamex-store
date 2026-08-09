"use client";

import { useEffect, useState } from "react";

const TOTAL_SECONDS = 5 * 60;

export default function ConfirmingPayment() {
  const [secondsLeft, setSecondsLeft] = useState(TOTAL_SECONDS);

  // Clears itself the moment it hits zero rather than ticking (and
  // re-rendering) forever — the copy below switches to its timed-out
  // message at 0 and never changes again. Kept as a single interval with an
  // empty dep array so it isn't torn down and recreated on every tick.
  useEffect(() => {
    const interval = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(interval);
          return 0;
        }
        return s - 1;
      });
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
