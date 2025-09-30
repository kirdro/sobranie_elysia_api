import { Elysia } from "elysia";

export const corsManualPlugin = new Elysia({ name: "cors-manual" })
  .onRequest(({ request, set }) => {
    const origin = request.headers.get("origin");
    const allowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000'];

    if (origin && allowedOrigins.includes(origin)) {
      set.headers["Access-Control-Allow-Origin"] = origin;
      set.headers["Access-Control-Allow-Credentials"] = "true";
      set.headers["Vary"] = "Origin";
    }

    // Handle preflight OPTIONS
    if (request.method === "OPTIONS") {
      set.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, PATCH, OPTIONS";
      set.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, Accept";
      set.headers["Access-Control-Max-Age"] = "86400";
      set.status = 204;
      return "";
    }
  })
  .onAfterHandle(({ request, set }) => {
    const origin = request.headers.get("origin");
    const allowedOrigins = process.env.CORS_ORIGINS
      ? process.env.CORS_ORIGINS.split(',').map(o => o.trim())
      : ['http://localhost:3000'];

    if (origin && allowedOrigins.includes(origin)) {
      set.headers["Access-Control-Allow-Origin"] = origin;
      set.headers["Access-Control-Allow-Credentials"] = "true";
      set.headers["Access-Control-Expose-Headers"] = "Content-Length, Content-Type";
    }
  });