import { Elysia, t } from "elysia";

export const navigationModule = new Elysia({
  name: "navigation",
  prefix: "/navigation",
  tags: ["navigation"]
})
  .model({
    "navigation.link": t.Object({
      id: t.String(),
      title: t.String(),
      url: t.String({ format: 'uri' }),
      icon: t.Optional(t.String()),
      order: t.Number(),
      isExternal: t.Boolean()
    })
  })
  .model({
    "navigation.menu": t.Object({
      items: t.Array(t.Ref("navigation.link"))
    })
  })
  .get("/links", () => ({ items: [] }), {
    detail: {
      summary: "Get navigation links",
      description: "Retrieve navigation menu links",
      tags: ["navigation"]
    },
    response: {
      200: "navigation.menu"
    }
  });
