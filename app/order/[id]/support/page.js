"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SiteHeader from "@/app/components/SiteHeader";
import { useOrderPoll } from "../useOrderPoll";
import AccessDeniedNotice from "../AccessDeniedNotice";
import SupportChat from "../SupportChat";

export default function OrderSupportPage() {
  const { id } = useParams();
  const { order, accessDenied, setAccessDenied, refetch } = useOrderPoll(id);

  async function handleSendMessage(text, file) {
    const formData = new FormData();
    formData.set("body", text);
    if (file) formData.set("attachment", file);

    const res = await fetch(`/api/orders/${id}/messages`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) refetch();
    else if (res.status === 403) setAccessDenied(true);
  }

  async function handleSaveName(name) {
    const res = await fetch(`/api/orders/${id}/name`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ buyerName: name }),
    });
    if (res.status === 403) {
      setAccessDenied(true);
      return;
    }
    await refetch();
  }

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

  if (!order) {
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
        <Link href={`/order/${id}`} className="order-support-back">
          <ArrowLeft size={16} />
          Back to order
        </Link>
        <h1>Order #{order.id}</h1>
        <p className="muted">{order.listing.title}</p>
        <SupportChat
          orderId={order.id}
          messages={order.messages}
          buyerName={order.buyerName}
          onSend={handleSendMessage}
          onSaveName={handleSaveName}
        />
      </main>
    </>
  );
}
