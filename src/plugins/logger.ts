import { Elysia } from "elysia";
import pino from "pino";

import { env } from "../config/env";

const logger = pino({
  level: env.LOG_LEVEL,
  transport:
    env.NODE_ENV === "development"
      ? {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "SYS:standard"
          }
        }
      : undefined
});

export const loggerPlugin = new Elysia({ name: "logger" }).decorate("logger", logger);

export type Logger = typeof logger;

