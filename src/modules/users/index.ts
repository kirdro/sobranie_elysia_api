import { Elysia, t } from "elysia";
import { prismaPlugin } from "../../plugins/prisma";

export const usersModule = new Elysia({ 
  name: "users", 
  prefix: "/users",
  tags: ["users"]
})
  .use(prismaPlugin)
  .model({
    "user.list": t.Object({
      items: t.Array(t.Object({
        id: t.String(),
        email: t.String(),
        firstName: t.Union([t.String(), t.Null()]),
        lastName: t.Union([t.String(), t.Null()]),
        role: t.String(),
        isActive: t.Boolean(),
        createdAt: t.String({ format: 'date-time' })
      })),
      total: t.Number(),
      page: t.Optional(t.Number()),
      limit: t.Optional(t.Number())
    }),
    "user.detail": t.Object({
      id: t.String(),
      email: t.String(),
      firstName: t.Union([t.String(), t.Null()]),
      lastName: t.Union([t.String(), t.Null()]),
      role: t.String(),
      isActive: t.Boolean(),
      createdAt: t.String({ format: 'date-time' }),
      updatedAt: t.String({ format: 'date-time' }),
      teamId: t.Union([t.String(), t.Null()]),
      avatarId: t.Union([t.String(), t.Null()])
    })
  })
  .get("/", async ({ prisma, query }) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.users.findMany({
        skip,
        take: limit,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.users.count()
    ]);

    return {
      items: users.map((user: any) => ({
        ...user,
        role: user.role.toString(),
        createdAt: user.createdAt.toISOString()
      })),
      total,
      page,
      limit
    };
  }, {
    detail: {
      summary: "Get users list",
      description: "Retrieve a paginated list of users from the database",
      tags: ["users"]
    },
    query: t.Object({
      page: t.Optional(t.String({ description: "Page number (default: 1)" })),
      limit: t.Optional(t.String({ description: "Items per page (default: 10)" }))
    }),
    response: {
      200: "user.list"
    }
  })
  .get(
    "/:id",
    async ({ params: { id }, prisma, set }) => {
      const user = await prisma.users.findUnique({
        where: { id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          teamId: true,
          avatarId: true
        }
      });

      if (!user) {
        set.status = 404;
        return { message: "User not found" };
      }

      return {
        ...user,
        role: user.role.toString(),
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString()
      };
    },
    {
      detail: {
        summary: "Get user by ID",
        description: "Retrieve detailed information about a specific user from the database",
        tags: ["users"]
      },
      params: t.Object({
        id: t.String({ description: "User ID" })
      }),
      response: {
        200: "user.detail",
        404: t.Object({
          message: t.String()
        })
      }
    }
  );
