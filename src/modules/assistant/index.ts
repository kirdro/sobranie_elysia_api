import { Elysia, t } from "elysia";

export const assistantModule = new Elysia({
  name: "assistant",
  prefix: "/assistant",
  tags: ["assistant"]
})
  .model({
    "assistant.mode": t.Object({
      id: t.String(),
      name: t.String(),
      description: t.String(),
      capabilities: t.Array(t.String())
    }),
    "assistant.session": t.Object({
      sessionId: t.String(),
      mode: t.String(),
      createdAt: t.String({ format: 'date-time' }),
      status: t.Union([
        t.Literal("active"),
        t.Literal("paused"),
        t.Literal("ended")
      ])
    })
  })
  .get("/modes", () => ({ items: [] }), {
    detail: {
      summary: "Get assistant modes",
      description: "Retrieve available AI assistant modes",
      tags: ["assistant"]
    },
    response: {
      200: t.Object({
        items: t.Array(t.Ref("assistant.mode"))
      })
    }
  })
  .post("/sessions", () => ({ 
    sessionId: `session_${Date.now()}`,
    mode: "general",
    createdAt: new Date().toISOString(),
    status: "active" as const
  }), {
    detail: {
      summary: "Create assistant session",
      description: "Start a new AI assistant session",
      tags: ["assistant"]
    },
    response: {
      201: "assistant.session"
    }
  });
