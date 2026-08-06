import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/session";
import { sendBroadcast } from "@/app/lib/push";

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, message, url, image } = await request.json().catch(() => ({}));
  const trimmedTitle = String(title || "").trim();
  const trimmedMessage = String(message || "").trim();
  if (!trimmedTitle || !trimmedMessage) {
    return NextResponse.json({ error: "Title and message are required" }, { status: 400 });
  }

  const result = await sendBroadcast({
    title: trimmedTitle,
    body: trimmedMessage,
    url: String(url || "").trim() || "/",
    image: String(image || "").trim() || undefined,
  });

  return NextResponse.json(result);
}
