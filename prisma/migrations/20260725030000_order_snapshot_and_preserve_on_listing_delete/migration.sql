-- RedefineTables: orders (and their messages) must survive listing deletion.
-- listingId becomes nullable with ON DELETE SET NULL instead of CASCADE, and
-- title/price/credentials are snapshotted onto the order so it stays fully
-- readable even after its listing is gone.
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Order" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "listingId" INTEGER,
    "listingTitle" TEXT NOT NULL,
    "listingPrice" INTEGER NOT NULL,
    "accountId" TEXT NOT NULL,
    "accountPassword" TEXT NOT NULL,
    "buyerName" TEXT,
    "screenshotPath" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" DATETIME,
    CONSTRAINT "Order_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Order" ("id", "listingId", "listingTitle", "listingPrice", "accountId", "accountPassword", "buyerName", "screenshotPath", "status", "createdAt", "confirmedAt")
SELECT o."id", o."listingId", l."title", l."price", l."accountId", l."accountPassword", o."buyerName", o."screenshotPath", o."status", o."createdAt", o."confirmedAt"
FROM "Order" o LEFT JOIN "Listing" l ON l."id" = o."listingId";
DROP TABLE "Order";
ALTER TABLE "new_Order" RENAME TO "Order";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
