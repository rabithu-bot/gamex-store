import crypto from "crypto";
import { prisma } from "@/app/lib/prisma";
import { incrementLifetimeOrderCount } from "@/app/lib/lifetimeOrderCount";

// Deliberately letters-only per spec (no digits, no symbols) — 52 choices
// per character, 12 characters, so collisions are not a practical concern
// (52^12 ≈ 3.9 * 10^20 possible ids) but the retry loop below still
// defends against the astronomically unlikely case.
const ORDER_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ORDER_ID_LENGTH = 12;
const MAX_CREATE_ATTEMPTS = 5;

export function generateOrderId() {
  let id = "";
  for (let i = 0; i < ORDER_ID_LENGTH; i++) {
    id += ORDER_ID_ALPHABET[crypto.randomInt(0, ORDER_ID_ALPHABET.length)];
  }
  return id;
}

// Prisma's `@default()` only supports built-ins (autoincrement/uuid/cuid/...),
// so a custom alphabet has to be generated here in application code, with a
// retry-on-collision loop the same way any hand-generated unique id needs one.
export async function createOrder(data) {
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    try {
      const order = await prisma.order.create({ data: { id: generateOrderId(), ...data } });
      await incrementLifetimeOrderCount();
      return order;
    } catch (err) {
      const isIdCollision = err?.code === "P2002" && err?.meta?.target?.includes("id");
      if (!isIdCollision || attempt === MAX_CREATE_ATTEMPTS - 1) throw err;
    }
  }
  throw new Error("Failed to generate a unique order id");
}
