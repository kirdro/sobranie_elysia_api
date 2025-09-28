import { Elysia } from "elysia";

interface RateLimitState {
  hits: number;
  resetAt: number;
}

const windowMs = 60_000;
const maxHits = 120;
const bucket = new Map<string, RateLimitState>();

const computeKey = (request: Request) =>
  request.headers.get("x-forwarded-for") ?? request.headers.get("cf-connecting-ip") ?? "local";

export const rateLimitPlugin = new Elysia({ name: "rate-limit" }).onRequest(({ request, set }) => {
  const key = computeKey(request);
  const now = Date.now();
  const entry = bucket.get(key);

  if (!entry) {
    bucket.set(key, { hits: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.resetAt <= now) {
    bucket.set(key, { hits: 1, resetAt: now + windowMs });
    return;
  }

  if (entry.hits >= maxHits) {
    set.status = 429;
    set.headers["retry-after"] = Math.ceil((entry.resetAt - now) / 1000).toString();
    return "Too Many Requests";
  }

  entry.hits += 1;
});
