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
  if (order.status !== "pending") {
    return NextResponse.json(
      { error: "This order is no longer pending" },
      { status: 400 }
    );
  }

  const formData = await request.formData();
  const screenshot = formData.get("screenshot");

  if (!screenshot || typeof screenshot.arrayBuffer !== "function") {
    return NextResponse.json(
      { error: "Please attach a payment screenshot" },
      { status: 400 }
    );
  }

  const screenshotPath = await savePaymentScreenshot(screenshot);

  await prisma.order.update({
    where: { id: orderId },
    data: { screenshotPath },
  });

  return NextResponse.json({ ok: true });
}
