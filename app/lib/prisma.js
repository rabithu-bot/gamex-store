import { PrismaClient } from "@/app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const globalForPrisma = globalThis;

// PrismaPg speaks the standard Postgres wire protocol over a normal TCP
// connection — unlike PrismaNeon (Neon's proprietary WebSocket/HTTP-based
// serverless driver), this works against any real Postgres server,
// self-hosted included. Switched when the database moved off Neon; if a
// future DATABASE_URL points back at a *.neon.tech host, PrismaNeon would
// need to come back for that connection specifically.
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
