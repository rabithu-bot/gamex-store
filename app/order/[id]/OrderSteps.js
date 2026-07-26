import { Check, Clock, X } from "lucide-react";

const STEPS = ["Order Placed", "Payment Submitted", "Confirmed"];

export default function OrderSteps({ status, hasProof }) {
  const declined = status === "declined";

  // step index that is currently "in progress" (0-based), -1 once everything is done/declined
  let currentIndex = 0;
  if (hasProof) currentIndex = 1;
  if (status === "confirmed" || declined) currentIndex = 2;

  function stepState(i) {
    if (declined && i === 2) return "error";
    if (i < currentIndex) return "done";
    if (i === currentIndex) return status === "confirmed" && i === 2 ? "done" : "current";
    return "";
  }

  return (
    <div className="order-steps">
      {STEPS.map((label, i) => {
        const state = stepState(i);
        return (
          <div key={label} className={`order-step ${state}`}>
            {i > 0 && <div className="line" />}
            <div className="dot">
              {state === "done" ? (
                <Check size={16} />
              ) : state === "error" ? (
                <X size={16} />
              ) : (
                <Clock size={14} />
              )}
            </div>
            <span>{declined && i === 2 ? "Declined" : label}</span>
          </div>
        );
      })}
    </div>
  );
}
