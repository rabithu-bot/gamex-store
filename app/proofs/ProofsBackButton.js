"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

// A plain Link back to "/" would always land on the homepage regardless of
// which product page the buyer came from — router.back() actually returns
// them to that product. Falls back to "/" only if there's no history to go
// back to (e.g. this page was opened directly/in a new tab).
export default function ProofsBackButton() {
  const router = useRouter();

  function handleBack() {
    if (window.history.length > 1) router.back();
    else router.push("/");
  }

  return (
    <button type="button" onClick={handleBack} className="order-support-back">
      <ArrowLeft size={16} />
      Back
    </button>
  );
}
