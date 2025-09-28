import { createApp } from "./app";
import { env } from "./config/env";

const app = createApp();

const server = app.listen({ hostname: env.HOST, port: env.PORT }, ({ hostname, port }) => {
  console.log(`🦊 Sobranie API is running at http://${hostname}:${port}`);
});

process.on("SIGINT", () => {
  console.log("Shutting down Sobranie API (SIGINT)");
  server.stop();
});

process.on("SIGTERM", () => {
  console.log("Shutting down Sobranie API (SIGTERM)");
  server.stop();
});
