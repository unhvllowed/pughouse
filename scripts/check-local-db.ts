import { createClient } from "@libsql/client";
import path from "path";

async function checkLocalDb() {
  const dbPath = path.join(process.cwd(), "dev.db");
  console.log("Checking local DB at:", dbPath);
  
  const client = createClient({ url: `file:${dbPath}` });

  try {
    const rs = await client.execute("SELECT name FROM sqlite_master WHERE type='table'");
    console.log("Local tables found:", rs.rows.map(r => r.name));
  } catch (e) {
    console.error("Error checking local DB:", e);
  } finally {
    client.close();
  }
}

checkLocalDb();
