"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import SiteHeader from "@/app/components/SiteHeader";
import { useOrderPoll } from "../useOrderPoll";
import AccessDeniedNotice from "../AccessDeniedNotice";
import SupportChat from "../SupportChat";

export default function OrderSupportPage() {
  const { id } = useParams();
  const { order, setOrder, accessDenied, setAccessDenied, refetch } = useOrderPoll(id);
  const createdObjectUrlsRef = useRef(new Set());

  useEffect(
    () => () => createdObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)),
    []
  );

  async function handleSendMessage(text, file, videoMeta) {
    // Optimistic insert — same fix as the admin composer got: the bubble
    // appears instantly instead of waiting on the POST + a full refetch
    // before the buyer sees anything happen. Videos are already uploaded to
    // S3 by the time this is called (see SupportChat's handleSubmit), so the
    // preview uses the original File object purely for its blob: URL.
    const previewFile = videoMeta?.file || file;
    const optimisticAttachmentPath = previewFile ? URL.createObjectURL(previewFile) : null;
    if (optimisticAttachmentPath) createdObjectUrlsRef.current.add(optimisticAttachmentPath);
    setOrder((prev) =>
      prev
        ? {
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: -Date.now(),
                sender: "buyer",
                body: text,
                attachmentPath: optimisticAttachmentPath,
                attachmentType: videoMeta
                  ? "video"
                  : file
                    ? file.type?.startsWith("audio/")
                      ? "audio"
                      : "image"
                    : null,
                replyToId: null,
                readAt: null,
                reaction: null,
                createdAt: new Date().toISOString(),
              },
            ],
          }
        : prev
    );

    const formData = new FormData();
    formData.set("body", text);
    if (videoMeta) {
      formData.set("attachmentUrl", videoMeta.publicUrl);
      formData.set("attachmentType", "video");
    } else if (file) {
      formData.set("attachment", file);
    }

    const res = await fetch(`/api/orders/${id}/messages`, {
      method: "POST",
      body: formData,
    });
    if (res.ok) refetch();
    else if (res.status === 403) setAccessDenied(true);
  }

  async function handleReact(messageId, emoji) {
    const current = order?.messages.find((m) => m.id === messageId)?.reaction;
    const next = current === emoji ? null : emoji;
    setOrder((prev) =>
      prev
        ? { ...prev, messages: prev.messages.map((m) => (m.id === messageId ? { ...m, reaction: next } : m)) }
        : prev
    );
    const res = await fetch(`/api/orders/${id}/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reaction: next }),
    });
    if (res.status === 403) setAccessDenied(true);
    else refetch();
  }

  async function handleEditMessage(messageId, body) {
    setOrder((prev) =>
      prev
        ? {
            ...prev,
            messages: prev.messages.map((m) =>
              m.id === messageId ? { ...m, body, editedAt: new Date().toISOString() } : m
            ),
          }
        : prev
    );
    const res = await fetch(`/api/orders/${id}/messages/${messageId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    });
    if (res.status === 403) setAccessDenied(true);
    else refetch();
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
    <SupportChat
      orderId={order.id}
      listingTitle={order.listing.title}
      messages={order.messages}
      buyerName={order.buyerName}
      adminTypingAt={order.adminTypingAt}
      adminLastSeenAt={order.adminLastSeenAt}
      onSend={handleSendMessage}
      onSaveName={handleSaveName}
      onReact={handleReact}
      onEditMessage={handleEditMessage}
    />
  );
}
