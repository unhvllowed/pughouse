import { createClient } from "@libsql/client";

async function testConnection() {
  const url = "libsql://pughouse-unhvllowed.aws-us-east-1.turso.io";
  const authToken = "eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJpYXQiOjE3NzQwMTc4NDAsImlkIjoiMDE5Y2MwYjUtZmIwMS03YmM1LWI4ZmMtNjkzYTgwYTIzZDJkIiwicmlkIjoiMzVjYzNlMTEtZWFjNi00Y2FkLTlkM2QtNWJlY2NkYzI1Mjg1In0.Lqtx9iJcLX7yCU484Dle6UyJzOrh0XNBoCCspdQSih3MLjeXpweyk53qwCCxyzuxATtXvYmU-HTthASAJRNQDw";

  console.log("Testing connection to:", url);
  const client = createClient({ url, authToken });

  try {
    const rs = await client.execute("SELECT 1");
    console.log("Success! ResultSet:", rs.rows);
  } catch (e) {
    console.error("Failed to connect:", e);
  } finally {
    client.close();
  }
}

testConnection();
