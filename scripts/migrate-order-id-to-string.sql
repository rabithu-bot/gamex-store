-- Migrates Order.id from an auto-increment Int primary key to a
-- 12-character alphabetic string, preserving all existing rows and their
-- Message.orderId foreign key relationships. Applied by hand via
-- `prisma db execute` (NOT `prisma migrate`) because this project's
-- migration history predates its switch to Postgres and is not trustworthy
-- (see prisma/migrations/migration_lock.toml / plan notes).
--
-- Run this in the numbered steps below, NOT as one blind execution — the
-- backfill step (populating "newId"/"newOrderId") must happen via
-- scripts/backfill-order-ids.mjs BETWEEN step 1 and step 2, since it needs
-- the app's own generateOrderId() to produce ids, which raw SQL can't do.

-- ============ STEP 0: safety backup ============
CREATE TABLE "_backup_order_20260726" AS TABLE "Order";
CREATE TABLE "_backup_message_20260726" AS TABLE "Message";

-- ============ STEP 1: add new nullable columns ============
ALTER TABLE "Order" ADD COLUMN "newId" TEXT;
ALTER TABLE "Message" ADD COLUMN "newOrderId" TEXT;
ALTER TABLE "Order" ADD COLUMN "accessTokenHash" TEXT;

-- >>> STOP HERE and run `node scripts/backfill-order-ids.mjs` <<<
-- It populates "newId" for every Order row and "newOrderId" for every
-- Message row. Re-run it as many times as needed (it's idempotent) until
-- `SELECT count(*) FROM "Order" WHERE "newId" IS NULL` returns 0 and
-- `SELECT count(*) FROM "Message" WHERE "newOrderId" IS NULL` returns 0.

-- ============ STEP 2: lock down the new columns ============
ALTER TABLE "Order" ALTER COLUMN "newId" SET NOT NULL;
ALTER TABLE "Order" ADD CONSTRAINT "Order_newId_key" UNIQUE ("newId");
ALTER TABLE "Message" ALTER COLUMN "newOrderId" SET NOT NULL;

-- ============ STEP 3: swap PK/FK columns into place ============
ALTER TABLE "Message" DROP CONSTRAINT "Message_orderId_fkey";

ALTER TABLE "Order" DROP CONSTRAINT "Order_pkey";
ALTER TABLE "Order" DROP COLUMN "id";
ALTER TABLE "Order" RENAME COLUMN "newId" TO "id";
ALTER TABLE "Order" ADD CONSTRAINT "Order_pkey" PRIMARY KEY ("id");
ALTER TABLE "Order" DROP CONSTRAINT "Order_newId_key";

ALTER TABLE "Message" DROP COLUMN "orderId";
ALTER TABLE "Message" RENAME COLUMN "newOrderId" TO "orderId";
ALTER TABLE "Message" ADD CONSTRAINT "Message_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS "Message_orderId_idx" ON "Message"("orderId");

DROP SEQUENCE IF EXISTS "Order_id_seq";

-- ============ Verification queries (run manually, not part of migration) ============
-- SELECT id, "accessTokenHash" FROM "Order" LIMIT 5;
-- SELECT count(*) FROM "Order";
-- SELECT count(*) FROM "Message" m LEFT JOIN "Order" o ON o.id = m."orderId" WHERE o.id IS NULL; -- must be 0

-- Once verified in production, these can be dropped:
-- DROP TABLE "_backup_order_20260726";
-- DROP TABLE "_backup_message_20260726";
