import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { savePaymentScreenshot } from "@/app/lib/uploads";

export async function POST(request, { params }) {
  const { id } = await params;
  const orderId = Number(id);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  // "declined" is allowed back in here too — a decline just means the buyer
  // needs to attach a fresh screenshot, not that the order is dead.
  if (order.status !== "pending" && order.status !== "declined") {
    return NextResponse.json(
      { error: "This order is not awaiting payment proof" },
      { status: 400 }
    );
  }

  let formData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Please attach a payment screenshot" }, { status: 400 });
  }
  const screenshot = formData.get("screenshot");

  // Mandatory payment-proof guarantee: no image blob, no write to the
  // database — a request with a missing or empty file never reaches here
  // as anything other than a rejection.
  if (!screenshot || typeof screenshot.arrayBuffer !== "function" || screenshot.size === 0) {
    return NextResponse.json(
      { error: "Please attach a payment screenshot" },
      { status: 400 }
    );
  }

  const screenshotPath = await savePaymentScreenshot(screenshot);

  await prisma.order.update({
    where: { id: orderId },
    data: { screenshotPath, status: "pending_verification" },
  });

  return NextResponse.json({ ok: true });
}
