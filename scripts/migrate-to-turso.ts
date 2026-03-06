/**
 * Full migration: creates schema + migrates data from local SQLite to Turso
 * Only uses @libsql/client — no better-sqlite3, no turso CLI needed.
 * Usage: npx tsx scripts/migrate-to-turso.ts <TURSO_URL?authToken=TOKEN>
 * Or:    npx tsx scripts/migrate-to-turso.ts <TURSO_URL> <TOKEN>
 */
import { createClient } from "@libsql/client";
import path from "path";
import { fileURLToPath } from "url";

const arg1 = process.argv[2];
const arg2 = process.argv[3];

if (!arg1) {
  console.error("Usage: npx tsx scripts/migrate-to-turso.ts <TURSO_URL> [TOKEN]");
  process.exit(1);
}

const TURSO_URL = arg1;
const TURSO_TOKEN = arg2;
const DB_PATH = path.join(process.cwd(), "dev.db");

const local = createClient({ url: `file:${DB_PATH}` });
const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

// ── Schema SQL ──────────────────────────────────────────────────────────────
const SCHEMA = `
CREATE TABLE IF NOT EXISTS "Game" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "imageUrl" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Game_slug_key" ON "Game"("slug");

CREATE TABLE IF NOT EXISTS "CardSet" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "tcgdexId" TEXT NOT NULL,
  "releaseDate" TEXT,
  "logoUrl" TEXT,
  "symbolUrl" TEXT,
  "gameId" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CardSet_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "CardSet_tcgdexId_key" ON "CardSet"("tcgdexId");

CREATE TABLE IF NOT EXISTS "Card" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "number" TEXT NOT NULL,
  "rarity" TEXT,
  "imageUrl" TEXT,
  "tcgdexId" TEXT NOT NULL,
  "setId" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Card_setId_fkey" FOREIGN KEY ("setId") REFERENCES "CardSet" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Card_tcgdexId_key" ON "Card"("tcgdexId");

CREATE TABLE IF NOT EXISTS "Product" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "imageUrl" TEXT,
  "barcode" TEXT,
  "quantity" INTEGER NOT NULL DEFAULT 0,
  "buyPrice" REAL NOT NULL DEFAULT 0,
  "sellPrice" REAL NOT NULL DEFAULT 0,
  "minStock" INTEGER NOT NULL DEFAULT 1,
  "gameId" INTEGER NOT NULL,
  "cardId" INTEGER,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Product_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game" ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Product_barcode_key" ON "Product"("barcode");

CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "type" TEXT NOT NULL,
  "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "total" REAL NOT NULL,
  "note" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TransactionItem" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "transactionId" INTEGER NOT NULL,
  "productId" INTEGER NOT NULL,
  "quantity" INTEGER NOT NULL,
  "unitPrice" REAL NOT NULL,
  CONSTRAINT "TransactionItem_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction" ("id"),
  CONSTRAINT "TransactionItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id")
);

CREATE TABLE IF NOT EXISTS "CashFlow" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "type" TEXT NOT NULL,
  "amount" REAL NOT NULL,
  "category" TEXT NOT NULL,
  "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" TEXT,
  "reference" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
`;

async function migrateTable(table: string, columns: string[]) {
  const result = await local.execute(`SELECT ${columns.map(c => `"${c}"`).join(", ")} FROM "${table}"`);
  if (result.rows.length === 0) { console.log(`  ${table}: 0 rows (skip)`); return; }

  let ok = 0;
  for (const row of result.rows) {
    const phs = columns.map(() => "?").join(", ");
    const args = columns.map((c) => row[c] ?? null);
    try {
      await turso.execute({
        sql: `INSERT OR IGNORE INTO "${table}" (${columns.map(c => `"${c}"`).join(", ")}) VALUES (${phs})`,
        args,
      });
      ok++;
    } catch (e) {
      console.error(`  ✗ ${table}:`, (e as Error).message.slice(0, 80));
    }
  }
  console.log(`  ✅ ${table}: ${ok}/${result.rows.length} filas`);
}

async function main() {
  console.log("� Creando schema en Turso...");
  // Run each statement separately
  const statements = SCHEMA.split(";").map(s => s.trim()).filter(s => s.length > 0);
  for (const sql of statements) {
    await turso.execute(sql);
  }
  console.log("✅ Schema creado\n");

  console.log("🚀 Migrando datos...\n");
  await migrateTable("Game",            ["id", "name", "slug", "imageUrl", "createdAt"]);
  await migrateTable("CardSet",         ["id", "name", "tcgdexId", "releaseDate", "logoUrl", "symbolUrl", "gameId", "createdAt"]);
  await migrateTable("Card",            ["id", "name", "number", "rarity", "imageUrl", "tcgdexId", "setId", "createdAt"]);
  await migrateTable("Product",         ["id", "name", "type", "description", "imageUrl", "barcode", "quantity", "buyPrice", "sellPrice", "minStock", "gameId", "cardId", "createdAt", "updatedAt"]);
  await migrateTable("Transaction",     ["id", "type", "date", "total", "note", "createdAt"]);
  await migrateTable("TransactionItem", ["id", "transactionId", "productId", "quantity", "unitPrice"]);
  await migrateTable("CashFlow",        ["id", "type", "amount", "category", "date", "description", "reference", "createdAt"]);

  console.log("\n✅ ¡Listo! Todos los datos migrados a Turso.");
  local.close();
  turso.close();
}

main().catch((e) => { console.error("Error:", e); process.exit(1); });
