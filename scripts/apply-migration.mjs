import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const { Client } = pg;

async function run() {
  const envFile = fs.existsSync(".env.local") ? ".env.local" : ".env";
  if (!fs.existsSync(envFile)) {
    console.error("Error: .env.local not found.");
    process.exit(1);
  }

  const envContent = fs.readFileSync(envFile, "utf8");
  const env = Object.fromEntries(
    envContent
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const [k, ...v] = l.trim().split("=");
        return [k.trim(), v.join("=").trim()];
      })
  );

  const connectionString = env.DATABASE_URL || env.POSTGRES_URL;
  if (!connectionString) {
    console.log(
      "[Migration] DATABASE_URL not set in .env.local.\n" +
      "To apply migrations automatically from CLI, add DATABASE_URL=postgres://... to .env.local.\n" +
      "Alternatively, copy supabase/migrations/20260920000000_stage2_schema.sql into the Supabase SQL Editor and run it."
    );
    return;
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    console.log("[Migration] Connected to PostgreSQL.");

    const migrationPath = path.join(process.cwd(), "supabase", "migrations", "20260920000000_stage2_schema.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    console.log("[Migration] Executing migration 20260920000000_stage2_schema.sql...");
    await client.query(sql);
    console.log("[Migration] Migration applied successfully!");
  } catch (error) {
    console.error("[Migration] Migration failed:", error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
