import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { saveMessageAttachment } from "@/app/lib/uploads";

export async function POST(request, { params }) {
  const { id } = await params;
  const orderId = Number(id);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const text = String(formData.get("body") || "").trim();
  const attachment = formData.get("attachment");
  const hasAttachment = attachment && typeof attachment.arrayBuffer === "function" && attachment.size > 0;

  if (!text && !hasAttachment) {
    return NextResponse.json({ error: "Message can't be empty" }, { status: 400 });
  }

  const attachmentPath = hasAttachment ? await saveMessageAttachment(attachment) : null;

  await prisma.message.create({
    data: { orderId, sender: "buyer", body: text, attachmentPath },
  });

  return NextResponse.json({ ok: true });
}
