import { Elysia, t } from "elysia";

export const postsModule = new Elysia({ 
  name: "posts", 
  prefix: "/posts",
  tags: ["posts"]
})
  .model({
    "post.create": t.Object({
      authorId: t.String({ description: "ID of the post author" }),
      content: t.String({ 
        minLength: 1, 
        maxLength: 2000,
        description: "Post content text" 
      }),
      circleId: t.Optional(t.String({ description: "Optional circle/group ID" })),
      attachments: t.Optional(t.Array(t.String(), { description: "Attachment URLs" })),
      tags: t.Optional(t.Array(t.String(), { description: "Post tags" }))
    }),
    "post.item": t.Object({
      id: t.String(),
      authorId: t.String(),
      content: t.String(),
      circleId: t.Optional(t.String()),
      attachments: t.Optional(t.Array(t.String())),
      tags: t.Optional(t.Array(t.String())),
      likesCount: t.Number(),
      commentsCount: t.Number(),
      createdAt: t.String({ format: 'date-time' }),
      updatedAt: t.String({ format: 'date-time' })
    }),
    "post.list": t.Object({
      items: t.Array(t.Ref("post.item")),
      total: t.Number(),
      page: t.Optional(t.Number()),
      limit: t.Optional(t.Number())
    })
  })
  .get("/", () => ({ items: [], total: 0 }), {
    detail: {
      summary: "Get posts list",
      description: "Retrieve a paginated list of posts",
      tags: ["posts"]
    },
    response: {
      200: "post.list"
    }
  })
  .post(
    "/",
    ({ body }) => ({ 
      id: `post_${Date.now()}`,
      ...body,
      likesCount: 0,
      commentsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }),
    {
      detail: {
        summary: "Create new post",
        description: "Create a new post with content and optional attachments",
        tags: ["posts"]
      },
      body: "post.create",
      response: {
        201: "post.item"
      }
    }
  );
