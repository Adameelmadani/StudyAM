import { z } from "zod";
import { createRouter, publicQuery, representativeQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { modules } from "@db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const moduleRouter = createRouter({
  listAll: adminQuery.query(async () => {
    const db = getDb();
    return db.select().from(modules).orderBy(modules.name);
  }),
  list: publicQuery
    .input(
      z.object({
        yearId: z.number().int().positive(),
        sectorId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();
      if (input.sectorId) {
        return db
          .select()
          .from(modules)
          .where(
            and(
              eq(modules.yearId, input.yearId),
              eq(modules.sectorId, input.sectorId)
            )
          )
          .orderBy(modules.name);
      }
      return db
        .select()
        .from(modules)
        .where(
          and(
            eq(modules.yearId, input.yearId),
            isNull(modules.sectorId)
          )
        )
        .orderBy(modules.name);
    }),

  create: representativeQuery
    .input(
      z.object({
        name: z.string().min(1, "Module name is required"),
        description: z.string().optional(),
        yearId: z.number().int().positive(),
        sectorId: z.number().int().positive().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const isRepresentative = ctx.user.role === "representative";
      if (isRepresentative) {
        if (!ctx.user.yearId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Representative must be assigned to a year",
          });
        }
        if (input.yearId !== ctx.user.yearId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only create modules for your assigned year",
          });
        }
        if (ctx.user.sectorId && input.sectorId !== ctx.user.sectorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only create modules for your assigned sector",
          });
        }
        if (!ctx.user.sectorId && input.sectorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only create modules without a sector",
          });
        }
      }
      const result = await db.insert(modules).values({
        name: input.name,
        description: input.description || null,
        yearId: isRepresentative ? ctx.user.yearId : input.yearId,
        sectorId: isRepresentative ? (ctx.user.sectorId || null) : (input.sectorId || null),
        icon: input.icon || "book",
      });
      const modId = Number(result[0].insertId);
      return db.query.modules.findFirst({ where: eq(modules.id, modId) });
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().optional(),
        description: z.string().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db
        .update(modules)
        .set(data)
        .where(eq(modules.id, id));
      return db.query.modules.findFirst({ where: eq(modules.id, id) });
    }),

  delete: representativeQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const mod = await db.query.modules.findFirst({
        where: eq(modules.id, input.id),
      });
      if (!mod) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      }

      if (ctx.user.role === "representative") {
        if (mod.yearId !== ctx.user.yearId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete modules for your assigned year",
          });
        }
        if (mod.sectorId && mod.sectorId !== ctx.user.sectorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete modules for your assigned sector",
          });
        }
      }

      await db.delete(modules).where(eq(modules.id, input.id));
      return { success: true };
    }),
});
