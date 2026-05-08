import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { modules } from "@db/schema";
import { eq, and, isNull } from "drizzle-orm";

export const moduleRouter = createRouter({
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

  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1, "Module name is required"),
        description: z.string().optional(),
        yearId: z.number().int().positive(),
        sectorId: z.number().int().positive().optional(),
        icon: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(modules).values({
        name: input.name,
        description: input.description || null,
        yearId: input.yearId,
        sectorId: input.sectorId || null,
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

  delete: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(modules).where(eq(modules.id, input.id));
      return { success: true };
    }),
});
