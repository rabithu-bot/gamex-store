"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { MessageCircle } from "lucide-react";
import SiteHeader from "@/app/components/SiteHeader";
import { useOrderPoll } from "../useOrderPoll";
import AccessDeniedNotice from "../AccessDeniedNotice";
import OrderNotFoundNotice from "../OrderNotFoundNotice";
import ConfirmingPayment from "../ConfirmingPayment";

export default function ConfirmingPaymentPage() {
  const { id } = useParams();
  const router = useRouter();
  const { order, accessDenied, notFound } = useOrderPoll(id);

  // This page only makes sense while a proof screenshot is actually under
  // review — any other status (confirmed, declined, expired, or even a
  // buyer landing here directly via a stale bookmark) sends them back to
  // the main order page, which knows how to render every other state.
  useEffect(() => {
    if (order && order.status !== "pending_verification") {
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

  if (notFound) {
    return (
      <>
        <SiteHeader />
        <main className="container" style={{ maxWidth: 560 }}>
          <OrderNotFoundNotice />
        </main>
      </>
    );
  }

  if (!order || order.status !== "pending_verification") {
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
        <h1>Order #{order.id}</h1>
        <p className="muted">{order.listing.title}</p>
        <div className="checkout-panel">
          <ConfirmingPayment />
        </div>

        <div className="panel" style={{ textAlign: "center" }}>
          <Link href={`/order/${order.id}/support`} className="btn secondary">
            <MessageCircle size={16} />
            Contact Support
          </Link>
        </div>
      </main>
    </>
  );
}
