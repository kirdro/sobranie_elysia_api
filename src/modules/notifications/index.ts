import { Elysia, t } from "elysia";

export const notificationsModule = new Elysia({
  name: "notifications",
  prefix: "/notifications",
  tags: ["notifications"]
})
  .model({
    "notification.item": t.Object({
      id: t.String(),
      type: t.Union([
        t.Literal("like"),
        t.Literal("comment"),
        t.Literal("follow"),
        t.Literal("mention")
      ]),
      title: t.String(),
      message: t.String(),
      isRead: t.Boolean(),
      createdAt: t.String({ format: 'date-time' }),
      relatedId: t.Optional(t.String())
    })
  })
  .model({
    "notification.list": t.Object({
      items: t.Array(t.Ref("notification.item")),
      total: t.Number(),
      unreadCount: t.Number()
    })
  })
  .get("/", () => ({ items: [], total: 0, unreadCount: 0 }), {
    detail: {
      summary: "Get notifications",
      description: "Retrieve user notifications",
      tags: ["notifications"]
    },
    response: {
      200: "notification.list"
    }
  });
