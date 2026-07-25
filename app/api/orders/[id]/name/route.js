import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma";

export async function POST(request, { params }) {
  const { id } = await params;
  const orderId = Number(id);

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Only fills in a missing name (e.g. an older order created before this
  // field existed) — never overwrites a name already given at checkout.
  if (order.buyerName) {
    return NextResponse.json({ ok: true, buyerName: order.buyerName });
  }

  const { buyerName } = await request.json();
  const name = String(buyerName || "").trim();
  if (!name) {
    return NextResponse.json({ error: "Please enter your name" }, { status: 400 });
  }

  await prisma.order.update({ where: { id: orderId }, data: { buyerName: name } });

  return NextResponse.json({ ok: true, buyerName: name });
}
