import path from "path";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/session";
import { paymentScreenshotDir } from "@/app/lib/uploads";

export async function GET(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;

  // filename is a generated safeName (timestamp-uuid.ext), never user path input, but
  // strip any path separators defensively before touching the filesystem.
  const safe = path.basename(filename);
  const filePath = path.join(paymentScreenshotDir(), safe);

  try {
    const buffer = await readFile(filePath);
    return new NextResponse(buffer);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
