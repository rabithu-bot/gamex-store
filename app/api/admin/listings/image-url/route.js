import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/session";
import { getListingImageUploadUrl } from "@/app/lib/uploads";

// A generous sanity cap, not a real-world constraint — real screenshots are
// nowhere near this. Just guards against something absurd being requested.
const MAX_IMAGE_BYTES = 20 * 1024 * 1024;

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { fileName, contentType, size } = await request.json().catch(() => ({}));
  if (!contentType?.startsWith("image/")) {
    return NextResponse.json({ error: "Not an image file" }, { status: 400 });
  }
  if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_BYTES) {
    return NextResponse.json({ error: "Image must be under 20MB" }, { status: 400 });
  }

  const { uploadUrl, publicUrl } = await getListingImageUploadUrl(fileName, contentType);
  return NextResponse.json({ uploadUrl, publicUrl });
}
