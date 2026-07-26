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

  const url = await savePaymentQr(file);
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
