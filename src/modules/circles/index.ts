import { Elysia, t } from "elysia";

export const circlesModule = new Elysia({ 
  name: "circles", 
  prefix: "/circles",
  tags: ["circles"]
})
  .model({
    "circle.item": t.Object({
      id: t.String(),
      name: t.String(),
      description: t.Optional(t.String()),
      isPrivate: t.Boolean(),
      memberCount: t.Number(),
      createdAt: t.String({ format: 'date-time' }),
      createdBy: t.String()
    })
  })
  .model({
    "circle.list": t.Object({
      items: t.Array(t.Ref("circle.item")),
      total: t.Number(),
      page: t.Optional(t.Number()),
      limit: t.Optional(t.Number())
    })
  })
  .get("/", () => ({ items: [], total: 0 }), {
    detail: {
      summary: "Get circles list",
      description: "Retrieve a paginated list of circles/groups",
      tags: ["circles"]
    },
    response: {
      200: "circle.list"
    }
  })
  .get("/:id", ({ params: { id } }) => ({ 
    id, 
    name: `Circle ${id}`,
    description: "Example circle description",
    isPrivate: false,
    memberCount: 0,
    createdAt: new Date().toISOString(),
    createdBy: "user_1"
  }), {
    detail: {
      summary: "Get circle by ID",
      description: "Retrieve detailed information about a specific circle",
      tags: ["circles"]
    },
    params: t.Object({
      id: t.String({ description: "Circle ID" })
    }),
    response: {
      200: "circle.item"
    }
  });
