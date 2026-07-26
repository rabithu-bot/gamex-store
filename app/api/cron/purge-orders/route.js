import { NextResponse } from "next/server";
import { purgeStaleOrders } from "@/app/lib/orderPurge";

export async function GET(request) {
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const deletedCount = await purgeStaleOrders();
  return NextResponse.json({ ok: true, deletedCount });
}
