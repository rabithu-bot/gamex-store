import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { draftReply, isGeminiConfigured } from "@/app/lib/gemini";

const PAST_REPLIES_SAMPLE_SIZE = 15;

export async function POST(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isGeminiConfigured()) {
    return NextResponse.json({ error: "AI draft isn't set up yet" }, { status: 503 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (!order.messages.length) {
    return NextResponse.json({ error: "No conversation yet to draft from" }, { status: 400 });
  }

  // Sample of the admin's own past replies from OTHER conversations, for
  // tone/style reference only — text bodies never include account
  // credentials, so nothing sensitive reaches the Gemini API.
  const pastMessages = await prisma.message.findMany({
    where: { sender: "admin", orderId: { not: id }, body: { not: "" } },
    orderBy: { createdAt: "desc" },
    take: PAST_REPLIES_SAMPLE_SIZE,
    select: { body: true },
  });

  let draft;
  try {
    draft = await draftReply({
      currentThread: order.messages,
      pastReplies: pastMessages.map((m) => m.body),
      customerName: order.buyerName,
    });
  } catch (err) {
    console.error("Gemini draft failed", err);
    return NextResponse.json({ error: "Couldn't generate a draft right now" }, { status: 502 });
  }

  if (!draft) {
    return NextResponse.json({ error: "Couldn't generate a draft" }, { status: 500 });
  }

  return NextResponse.json({ draft });
}
