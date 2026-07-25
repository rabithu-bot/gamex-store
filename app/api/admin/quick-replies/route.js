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

  const { text } = await request.json();
  const trimmed = String(text || "").trim();
  if (!trimmed) {
    return NextResponse.json({ error: "Quick reply text can't be empty" }, { status: 400 });
  }

  const reply = await prisma.quickReply.create({ data: { text: trimmed } });
  return NextResponse.json(reply);
}
