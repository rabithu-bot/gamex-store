import path from "path";
import { readFile } from "fs/promises";
import { NextResponse } from "next/server";
import { listingImageDir } from "@/app/lib/uploads";

const CONTENT_TYPES = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(request, { params }) {
  const { filename } = await params;

  // filename is a generated safeName (timestamp-uuid.ext), never user path input, but
  // strip any path separators defensively before touching the filesystem.
  const safe = path.basename(filename);
  const filePath = path.join(listingImageDir(), safe);

  try {
    const buffer = await readFile(filePath);
    const contentType = CONTENT_TYPES[path.extname(safe).toLowerCase()] || "application/octet-stream";
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
