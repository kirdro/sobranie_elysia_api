import postgres from "postgres";

import { env } from "../src/config/env";

async function main() {
  if (!env.DATABASE_URL) {
    console.error("DATABASE_URL is not configured. Please set it in .env");
    process.exit(1);
  }

  const sql = postgres(env.DATABASE_URL, { max: 1 });

  try {
    await sql`SELECT 1`;
    console.log("Database connection OK");
  } finally {
    await sql.end({ timeout: 1 });
  }
}

main().catch((error) => {
  console.error("Database check failed", error);
  process.exit(1);
});
