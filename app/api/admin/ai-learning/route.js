import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/session";
import { getLearningStats, isAiAutoReplyEnabled } from "@/app/lib/aiLearning";

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [stats, enabled] = await Promise.all([getLearningStats(), isAiAutoReplyEnabled()]);
  return NextResponse.json({ ...stats, enabled });
}
