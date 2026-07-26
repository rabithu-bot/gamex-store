// One-off backfill: assigns a new 12-char alphabetic id ("newId") to every
// existing Order row, and copies the corresponding id into Message.newOrderId
// for every Message. Idempotent (guarded by `WHERE "newId" IS NULL`) so it's
// safe to run more than once — the shared DB keeps taking live traffic
// during this migration window, so re-running sweeps up anything created
// mid-migration.
//
// Uses the raw @neondatabase/serverless client directly rather than the
// app's generated Prisma client, since that client is emitted as
// TypeScript (Prisma 7's "prisma-client" generator) and this script runs
// under plain `node`, outside Next's build pipeline. The id-generation
// logic is intentionally duplicated (not imported from app/lib/orderIds.js)
// for the same reason — this is a throwaway one-time migration script, not
// long-term app code.
import crypto from "crypto";
import { neon } from "@neondatabase/serverless";

const ORDER_ID_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

function generateOrderId() {
  let id = "";
  for (let i = 0; i < 12; i++) {
    id += ORDER_ID_ALPHABET[crypto.randomInt(0, ORDER_ID_ALPHABET.length)];
  }
  return id;
}

const sql = neon(process.env.DATABASE_URL);

async function assignNewOrderIds() {
  const orders = await sql`SELECT id FROM "Order" WHERE "newId" IS NULL`;
  console.log(`Assigning new ids to ${orders.length} order row(s)...`);

  for (const { id } of orders) {
    let assigned = false;
    for (let attempt = 0; attempt < 5 && !assigned; attempt++) {
      const candidate = generateOrderId();
      try {
        await sql`UPDATE "Order" SET "newId" = ${candidate} WHERE "id" = ${id}`;
        assigned = true;
      } catch (err) {
        if (!String(err?.message).includes("duplicate key")) throw err;
        // unique collision on newId (astronomically rare) — retry with a fresh candidate
      }
    }
    if (!assigned) throw new Error(`Failed to assign a unique newId to Order ${id} after 5 attempts`);
  }
}

async function propagateToMessages() {
  const result = await sql`
    UPDATE "Message" m
    SET "newOrderId" = o."newId"
    FROM "Order" o
    WHERE o."id" = m."orderId" AND m."newOrderId" IS NULL
  `;
  console.log(`Updated ${result.length ?? 0} message row(s) (rowCount may be unreported by the driver).`);
}

async function main() {
  await assignNewOrderIds();
  await propagateToMessages();

  const [{ count: remainingOrders }] = await sql`SELECT count(*)::int AS count FROM "Order" WHERE "newId" IS NULL`;
  const [{ count: remainingMessages }] = await sql`SELECT count(*)::int AS count FROM "Message" WHERE "newOrderId" IS NULL`;
  console.log(`Remaining unassigned: ${remainingOrders} orders, ${remainingMessages} messages.`);
  if (remainingOrders > 0 || remainingMessages > 0) {
    console.log("Not fully backfilled yet — re-run this script.");
    process.exitCode = 1;
  } else {
    console.log("Backfill complete.");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
