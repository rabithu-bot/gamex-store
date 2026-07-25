import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/session";

export async function DELETE(request, { params }) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, messageId } = await params;
  const orderId = Number(id);

  await prisma.message.deleteMany({ where: { id: Number(messageId), orderId } });

  return NextResponse.json({ ok: true });
}
