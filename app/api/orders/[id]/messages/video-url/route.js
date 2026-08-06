import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { assertOrderAccess } from "@/app/lib/orderAccessToken";
import { getMessageVideoUploadUrl } from "@/app/lib/uploads";

const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export async function POST(request, { params }) {
  const { id } = await params;

  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }
  if (!(await assertOrderAccess(id, order))) {
    return NextResponse.json({ error: "Access denied", code: "UNRECOGNIZED_DEVICE" }, { status: 403 });
  }

  const { fileName, contentType, size } = await request.json().catch(() => ({}));
  if (!contentType?.startsWith("video/")) {
    return NextResponse.json({ error: "Not a video file" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_VIDEO_BYTES) {
    return NextResponse.json({ error: "Video must be under 50MB" }, { status: 400 });
  }

  const { uploadUrl, publicUrl } = await getMessageVideoUploadUrl(fileName, contentType);
  return NextResponse.json({ uploadUrl, publicUrl });
}
