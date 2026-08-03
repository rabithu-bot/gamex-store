import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";
import { isUroPayConfigured, uroPayHeaders } from "@/app/lib/uropay";

const UROPAY_API_BASE_URL = process.env.UROPAY_API_BASE_URL || "https://api.uropay.me";

// Relays the buyer's self-reported UPI reference number (UTR) to UroPay so
// it starts watching for the matching bank SMS. This does NOT confirm the
// order — per UroPay's docs the UTR is unverified at this stage; only the
// webhook's `companion.sms.data` event (or a status-changed event landing on
// COMPLETED) is trusted to actually release the account — see
// app/api/webhooks/uropay/route.ts.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!isUroPayConfigured()) {
    return NextResponse.json({ error: "Instant checkout isn't available right now" }, { status: 503 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!(await assertOrderAccess(id, order))) {
    return NextResponse.json({ error: "Access denied", code: "UNRECOGNIZED_DEVICE" }, { status: 403 });
  }

  if (!order.uroPayOrderId) {
    return NextResponse.json({ error: "No payment in progress for this order" }, { status: 400 });
  }

  const { referenceNumber } = await request.json().catch(() => ({}));
  if (!referenceNumber || typeof referenceNumber !== "string") {
    return NextResponse.json({ error: "Please enter your UPI reference number" }, { status: 400 });
  }

  let uroPayRes: Response;
  try {
    uroPayRes = await fetch(`${UROPAY_API_BASE_URL}/order/update`, {
      method: "PATCH",
      headers: uroPayHeaders(),
      body: JSON.stringify({
        uroPayOrderId: order.uroPayOrderId,
        referenceNumber,
      }),
    });
  } catch {
    return NextResponse.json({ error: "Could not reach payment provider" }, { status: 502 });
  }

  const body = await uroPayRes.json().catch(() => null);
  if (!uroPayRes.ok || body?.status !== "success") {
    return NextResponse.json({ error: body?.message || "Couldn't submit reference number" }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
