import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";
import { saveProofImage } from "@/app/lib/uploads";

const MAX_PROOFS = 150;

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const proofs = await prisma.proofImage.findMany({ orderBy: { createdAt: "desc" } });
  return NextResponse.json(proofs);
}

export async function POST(request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await prisma.proofImage.count();
  if (count >= MAX_PROOFS) {
    return NextResponse.json({ error: `You can upload up to ${MAX_PROOFS} proof images` }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("image");
  const hasFile = file && typeof file.arrayBuffer === "function" && file.size > 0;
  if (!hasFile) {
    return NextResponse.json({ error: "Choose an image first" }, { status: 400 });
  }

  // Optional — the real date this delivery/screenshot happened, since
  // proofs are often uploaded in a batch long after the fact and the
  // upload timestamp alone would show a misleading cluster of identical
  // dates on the public page. Admin-supplied, not inferred or guessed.
  const proofDateRaw = formData.get("proofDate");
  const proofDate = proofDateRaw ? new Date(proofDateRaw) : null;
  if (proofDate && Number.isNaN(proofDate.getTime())) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const url = await saveProofImage(file);
  const proof = await prisma.proofImage.create({ data: { url, proofDate } });
  return NextResponse.json(proof);
}
