import { NextResponse } from "next/server";
import { getSocialLinks } from "@/app/lib/socialLinks";

export async function GET() {
  return NextResponse.json(await getSocialLinks());
}
