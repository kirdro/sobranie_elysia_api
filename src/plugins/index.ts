import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { openapi } from "@elysiajs/openapi";

import { authPlugin } from "./auth";
import { loggerPlugin } from "./logger";
import { prismaPlugin } from "./prisma";
import { rateLimitPlugin } from "./rate-limit";

export const registerPlugins = (app: Elysia) =>
  app
    .use(cors())
    .use(openapi({
      documentation: {
        info: {
          title: 'Sobranie API',
          version: '0.1.0',
          description: 'Real-time social platform API'
        },
        tags: [
          { name: 'auth', description: '🔐 Authentication and authorization endpoints' },
          { name: 'users', description: 'User management' },
          { name: 'posts', description: 'Posts and content' },
          { name: 'circles', description: 'Circle (group) management' },
          { name: 'notifications', description: 'Notification system' },
          { name: 'realtime', description: 'Real-time features' },
          { name: 'assistant', description: 'AI assistant features' },
          { name: 'navigation', description: 'Navigation endpoints' }
        ]
      }
    }))
    // WebSocket теперь встроен в Elysia 1.4+
    .use(loggerPlugin)
    .use(prismaPlugin)
    .use(authPlugin)
    .use(rateLimitPlugin);
