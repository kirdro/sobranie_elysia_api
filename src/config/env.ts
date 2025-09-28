import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z
    .string()
    .default("3000")
    .transform((value) => Number.parseInt(value, 10))
    .pipe(z.number().int().positive()),
  DATABASE_URL: z.string().url().optional(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  JWT_SECRET: z.string().min(32).default("change-me-to-a-secure-secret-key")
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
