import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

const MAX_QUICK_REPLIES = 20;

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const replies = await prisma.quickReply.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(replies);
}

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await prisma.quickReply.count();
  if (count >= MAX_QUICK_REPLIES) {
    return NextResponse.json(
      { error: `You can save up to ${MAX_QUICK_REPLIES} quick replies` },
      { status: 400 }
    );
  }

  const { text, keyword } = await request.json();
  const trimmed = String(text || "").trim();
  // Instagram-style: the keyword is what the admin actually types to
  // trigger the suggestion, so it's required and kept short/single-word —
  // spaces would never match anything typed into the composer anyway.
  const trimmedKeyword = String(keyword || "").trim().toLowerCase().replace(/\s+/g, "");
  if (!trimmed) {
    return NextResponse.json({ error: "Quick reply text can't be empty" }, { status: 400 });
  }
  if (!trimmedKeyword) {
    return NextResponse.json({ error: "A trigger keyword is required" }, { status: 400 });
  }

  try {
    const reply = await prisma.quickReply.create({ data: { text: trimmed, keyword: trimmedKeyword } });
    return NextResponse.json(reply);
  } catch (err) {
    if (err.code === "P2002") {
      return NextResponse.json({ error: "That keyword is already used by another saved reply" }, { status: 400 });
    }
    throw err;
  }
}
