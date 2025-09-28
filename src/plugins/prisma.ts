import { Elysia } from "elysia";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();

export const prismaPlugin = new Elysia({ name: "prisma" })
  .decorate("prisma", prisma)
  .onStop(async () => {
    await prisma.$disconnect();
  });

export type PrismaPlugin = typeof prismaPlugin;
