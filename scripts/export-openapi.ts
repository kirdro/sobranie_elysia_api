import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { createApp } from "../src/app";
import { prisma } from "../src/plugins/prisma";

async function main() {
  const app = createApp();
  const response = await app.handle(
    new Request("http://localhost/swagger/json", { method: "GET" })
  );

  if (!response.ok) {
    throw new Error(`Failed to generate OpenAPI schema: ${response.status}`);
  }

  const spec = await response.json();
  const outputPath = resolve("docs", "openapi.json");

  writeFileSync(outputPath, JSON.stringify(spec, null, 2));
  console.log(`OpenAPI schema written to ${outputPath}`);
}

main()
  .catch((error) => {
    console.error("Failed to export OpenAPI schema", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
