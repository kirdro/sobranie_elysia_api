import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import postgres from "postgres";

import { env } from "../src/config/env";

async function main() {
  if (!env.DATABASE_URL) {
    console.error("DATABASE_URL is not configured. Please set it in .env");
    process.exit(1);
  }

  const viewsPath = resolve("prisma", "sql", "views.sql");
  const sqlStatements = readFileSync(viewsPath, "utf8");

  if (!sqlStatements.trim()) {
    console.warn("No SQL statements found in prisma/sql/views.sql");
    return;
  }

  const sql = postgres(env.DATABASE_URL, { max: 1 });

  try {
    await sql.unsafe(sqlStatements);
    console.log("Database views and triggers applied");
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main().catch((error) => {
  console.error("Failed to apply database views", error);
  process.exit(1);
});
