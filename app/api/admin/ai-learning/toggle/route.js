import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/session";
import { setAiAutoReplyEnabled, getLearningStats } from "@/app/lib/aiLearning";

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { enabled } = await request.json().catch(() => ({}));
  const result = await setAiAutoReplyEnabled(Boolean(enabled));

  if (!result.ok) {
    return NextResponse.json({ error: result.error, stats: result.stats }, { status: 400 });
  }

  const stats = await getLearningStats();
  return NextResponse.json({ ok: true, enabled: Boolean(enabled), ...stats });
}
