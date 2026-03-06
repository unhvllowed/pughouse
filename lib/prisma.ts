import { config } from "dotenv";
config({ path: ".env.local", override: true });
config();

import { PrismaClient } from "@prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient() {
  // During Vercel build, Next.js evaluates routes which triggers this file.
  // If the env var isn't set (e.g., during static generation), provide a dummy URL 
  // so the build doesn't crash.
  const url = process.env.TURSO_DATABASE_URL || "libsql://dummy-url.turso.io";

  // @libsql/client accepts auth token embedded in URL as ?authToken=...
  const libsql = createClient({ url });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapter = new PrismaLibSql(libsql as any);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return new PrismaClient({ adapter } as any);
}

// In production (Vercel serverless), we must NOT cache the client globally 
// if it was instantiated during the build phase with the dummy URL.
// We only use the global singleton in development to survive HMR.
export const prisma =
  process.env.NODE_ENV === "production"
    ? createPrismaClient()
    : globalForPrisma.prisma || (globalForPrisma.prisma = createPrismaClient());

