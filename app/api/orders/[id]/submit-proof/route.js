import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { savePaymentScreenshot } from "@/app/lib/uploads";
import { expireStaleOrders } from "@/app/lib/orderExpiry";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";
import { isRecognizedImage, getImageDimensions } from "@/app/lib/imageShape";

const MIN_SCREENSHOT_DIMENSION = 150;

export async function POST(request, { params }) {
  const { id } = await params;
  const orderId = id;

  // Sweep first so a screenshot can't sneak in past the 5-minute window just
  // because the periodic sweep on a GET hasn't caught this order yet.
  await expireStaleOrders();

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  if (!(await assertOrderAccess(orderId, order))) {
    return NextResponse.json(
      { error: "Access denied", code: "UNRECOGNIZED_DEVICE" },
      { status: 403 }
    );
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

  // Sanity gate, not real content verification — catches the obviously
  // wrong uploads (a landscape camera photo, a tiny icon) without needing
  // OCR/AI to actually confirm the screenshot shows a real payment. Fails
  // open on formats it can't parse (WEBP/GIF) rather than risk blocking a
  // genuine screenshot.
  const screenshotBuffer = Buffer.from(await screenshot.arrayBuffer());
  if (!isRecognizedImage(screenshotBuffer)) {
    return NextResponse.json(
      { error: "That doesn't look like a valid image file. Please upload your payment screenshot." },
      { status: 400 }
    );
  }
  const dimensions = getImageDimensions(screenshotBuffer);
  if (dimensions) {
    if (dimensions.width < MIN_SCREENSHOT_DIMENSION || dimensions.height < MIN_SCREENSHOT_DIMENSION) {
      return NextResponse.json(
        { error: "This image is too small to be a payment screenshot. Please upload the actual UPI payment confirmation." },
        { status: 400 }
      );
    }
    if (dimensions.width > dimensions.height) {
      return NextResponse.json(
        { error: "This doesn't look like a phone screenshot. Please upload a screenshot of your UPI payment confirmation." },
        { status: 400 }
      );
    }
  }

  const screenshotPath = await savePaymentScreenshot(screenshot);

  await prisma.order.update({
    where: { id: orderId },
    data: { screenshotPath, status: "pending_verification" },
  });

  return NextResponse.json({ ok: true });
}
