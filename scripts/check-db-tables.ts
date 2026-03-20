import { createClient } from "@libsql/client";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(__dirname, "../.env.local") });

async function checkDatabase() {
  const client = createClient({
    url: process.env.TURSO_DATABASE_URL!,
    authToken: process.env.TURSO_AUTH_TOKEN!,
  });

  try {
    console.log("Checking tables...");
    const rs = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Tables found:", rs.rows.map(r => r.name));
  } catch (e) {
    console.error("Error checking database:", e);
  } finally {
    client.close();
  }
}

checkDatabase();
