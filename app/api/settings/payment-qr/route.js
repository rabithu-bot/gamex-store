import { NextResponse } from "next/server";
import { getOfficialQrUrl } from "@/app/lib/paymentQr";

export async function GET() {
  return NextResponse.json({ url: await getOfficialQrUrl() });
}
