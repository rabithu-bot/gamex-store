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
// rejectUnauthorized: false — the self-hosted droplet's Postgres uses its
// default self-signed certificate, not one signed by a trusted CA (Neon's
// was). node-postgres, unlike libpq, still enforces Node's normal TLS
// verification even with sslmode=require in the connection string unless
// told not to, which would otherwise reject every connection outright.
// This still encrypts the connection — it just doesn't verify the cert
// chain, the same trust model sslmode=require has under libpq/Postgres
// itself. Safe to revisit if a real CA-signed cert gets added later.
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
