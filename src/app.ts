import { Elysia, NotFoundError } from "elysia";

import { registerModules } from "./modules";
import { registerPlugins } from "./plugins";

export const createApp = () => {
  const app = new Elysia({ name: "sobranie" });

  registerPlugins(app);
  registerModules(app);

  app
    .get("/healthz", () => ({ status: "ok" }))
    .onError(({ error, set }) => {
      if (error instanceof NotFoundError) {
        if (!set.status || Number(set.status) < 400) {
          set.status = 404;
        }

        return {
          error: "not_found",
          message: "Resource not found"
        };
      }

      console.error("Unhandled application error:", error);
      if (!set.status || Number(set.status) < 400) {
        set.status = 500;
      }

      return {
        error: "internal_error",
        message: error instanceof Error ? error.message : "Unknown error"
      };
    });

  return app;
};

export type App = ReturnType<typeof createApp>;
