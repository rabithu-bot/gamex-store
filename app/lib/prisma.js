import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;

// PrismaPg speaks the standard Postgres wire protocol over a normal TCP
// connection — unlike PrismaNeon (Neon's proprietary WebSocket/HTTP-based
// serverless driver), this works against any real Postgres server,
// self-hosted included. Switched when the database moved off Neon; if a
// future DATABASE_URL points back at a *.neon.tech host, PrismaNeon would
// need to come back for that connection specifically.
//
// The self-hosted droplet's Postgres uses its default self-signed
// certificate, not one signed by a trusted CA (Neon's was) — this still
// encrypts the connection, it just doesn't verify the cert chain.
//
// Deliberately NOT done via a `?sslmode=...` query param on DATABASE_URL:
// pg.Client honors sslmode fine, but pg.Pool (what PrismaPg actually uses
// internally) does not reliably parse sslmode/uselibpqcompat from a
// connection string — confirmed directly: identical URL, pg.Client
// connects, pg.Pool fails with ECONNREFUSED. Passing `ssl` as an explicit
// config object instead (with a plain connectionString, no query params)
// is what actually works reliably through Pool. Keep DATABASE_URL plain.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
