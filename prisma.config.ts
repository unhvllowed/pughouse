import { config } from "dotenv";

// Load .env.local first (local dev), then .env as fallback
config({ path: ".env.local", override: true });
config();

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: process.env.TURSO_DATABASE_URL,
  },
});
