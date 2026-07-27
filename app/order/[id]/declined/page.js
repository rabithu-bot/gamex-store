"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import SiteHeader from "@/app/components/SiteHeader";
import { useOrderPoll } from "../useOrderPoll";
import AccessDeniedNotice from "../AccessDeniedNotice";
import DeclinedNotice from "../DeclinedNotice";

export default function DeclinedPaymentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { order, accessDenied } = useOrderPoll(id);

  // Same idea as the confirming page — this route only makes sense while
  // the order is actually declined; any other status (including a fresh
  // resubmission flipping it back to pending_verification) sends the buyer
  // back to the main order page.
  useEffect(() => {
    if (order && order.status !== "declined") {
      router.replace(`/order/${id}`);
    }
  }, [order, id, router]);

  if (accessDenied) {
    return (
      <>
        <SiteHeader />
        <main className="container" style={{ maxWidth: 560 }}>
          <AccessDeniedNotice />
        </main>
      </>
    );
  }

  if (!order || order.status !== "declined") {
    return (
      <>
        <SiteHeader />
        <main className="container" style={{ maxWidth: 560 }} />
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="container" style={{ maxWidth: 560 }}>
        <DeclinedNotice
          orderId={order.id}
          declineReason={order.declineReason}
          declineNote={order.declineNote}
        />
      </main>
    </>
  );
}
