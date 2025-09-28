import { Elysia } from "elysia";

import { authModule } from "./auth";
import { assistantModule } from "./assistant";
import { circlesModule } from "./circles";
import { navigationModule } from "./navigation";
import { notificationsModule } from "./notifications";
import { postsModule } from "./posts";
import { realtimeModule } from "./realtime";
import { usersModule } from "./users";

export const registerModules = (app: Elysia) =>
  app
    .use(authModule)
    .use(usersModule)
    .use(circlesModule)
    .use(postsModule)
    .use(notificationsModule)
    .use(assistantModule)
    .use(realtimeModule)
    .use(navigationModule);
