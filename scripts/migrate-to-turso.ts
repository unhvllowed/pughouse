import { createClient } from "@libsql/client";
import path from "path";

// This script exports all data from the local SQLite dev.db
// and runs INSERT statements into Turso via the libsql client.

const TURSO_URL = process.argv[2];
const TURSO_TOKEN = process.argv[3];

if (!TURSO_URL || !TURSO_TOKEN) {
  console.error("Usage: npx tsx scripts/migrate-to-turso.ts <TURSO_URL> <TURSO_TOKEN>");
  process.exit(1);
}

// Read local SQLite with better-sqlite3 directly
// eslint-disable-next-line @typescript-eslint/no-require-imports
const Database = require("better-sqlite3");
const db = new Database(path.join(process.cwd(), "prisma/dev.db"));

const turso = createClient({ url: TURSO_URL, authToken: TURSO_TOKEN });

async function migrateTable(tableName: string, columns: string[]) {
  const rows = db.prepare(`SELECT * FROM ${tableName}`).all() as Record<string, unknown>[];
  if (rows.length === 0) { console.log(`  ${tableName}: 0 rows (skip)`); return; }

  let migrated = 0;
  for (const row of rows) {
    const vals = columns.map((c) => row[c]);
    const placeholders = columns.map(() => "?").join(", ");
    const sql = `INSERT OR IGNORE INTO ${tableName} (${columns.join(", ")}) VALUES (${placeholders})`;
    try {
      await turso.execute({ sql, args: vals as never[] });
      migrated++;
    } catch (e) {
      console.error(`  ✗ ${tableName} row ${row.id}:`, e);
    }
  }
  console.log(`  ✅ ${tableName}: ${migrated}/${rows.length} filas migradas`);
}

async function main() {
  console.log("🚀 Iniciando migración a Turso...\n");

  await migrateTable("Game",    ["id", "name", "slug", "imageUrl", "createdAt"]);
  await migrateTable("CardSet", ["id", "name", "tcgdexId", "releaseDate", "logoUrl", "symbolUrl", "gameId", "createdAt"]);
  await migrateTable("Card",    ["id", "name", "number", "rarity", "imageUrl", "tcgdexId", "setId", "createdAt"]);
  await migrateTable("Product", ["id", "name", "type", "description", "imageUrl", "barcode", "quantity", "buyPrice", "sellPrice", "minStock", "gameId", "cardId", "createdAt", "updatedAt"]);
  await migrateTable("Transaction",     ["id", "type", "date", "total", "note", "createdAt"]);
  await migrateTable("TransactionItem", ["id", "transactionId", "productId", "quantity", "unitPrice"]);
  await migrateTable("CashFlow",        ["id", "type", "amount", "category", "date", "description", "reference", "createdAt"]);

  console.log("\n✅ Migración completada.");
  turso.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
