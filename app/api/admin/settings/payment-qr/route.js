import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { savePaymentQr } from "@/app/lib/uploads";

export async function PATCH(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("qr");
  if (!file || typeof file === "string" || file.size === 0) {
    return NextResponse.json({ error: "Please choose a QR image" }, { status: 400 });
  }

  let url;
  try {
    url = await savePaymentQr(file);
  } catch (err) {
    // Without this, an upload-side failure (e.g. Cloudinary env vars not
    // set in this environment yet) bubbled up as a bare 500 with no body —
    // real cause visible in server logs, invisible to whoever's staring at
    // the admin panel.
    console.error("Payment QR upload failed:", err);
    return NextResponse.json({ error: err.message || "Upload failed" }, { status: 500 });
  }
  if (!url) {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }

  await prisma.setting.upsert({
    where: { key: "paymentQrUrl" },
    update: { value: url },
    create: { key: "paymentQrUrl", value: url },
  });

  return NextResponse.json({ url });
}
