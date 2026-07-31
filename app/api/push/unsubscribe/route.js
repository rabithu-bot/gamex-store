import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

// One shared route for both admin and buyer toggles — the endpoint is a
// unique, unguessable value the browser generated, so it's what identifies
// which row to remove rather than needing a role/order check here.
export async function POST(request) {
  const { endpoint } = await request.json().catch(() => ({}));
  if (!endpoint) {
    return NextResponse.json({ error: "Missing endpoint" }, { status: 400 });
  }

  await prisma.pushSubscription.deleteMany({ where: { endpoint } });

  return NextResponse.json({ ok: true });
}
