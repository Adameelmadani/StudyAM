import { z } from "zod";
import { createRouter, publicQuery, adminQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { elements, modules, documents } from "@db/schema";
import { eq, and, isNull } from "drizzle-orm";

export const elementRouter = createRouter({
  list: publicQuery
    .input(z.object({ moduleId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db
        .select()
        .from(elements)
        .where(eq(elements.moduleId, input.moduleId))
        .orderBy(elements.name);
    }),

  listByYearSector: publicQuery
    .input(
      z.object({
        yearId: z.number().int().positive(),
        sectorId: z.number().int().positive().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();

      let moduleQuery;
      if (input.sectorId) {
        moduleQuery = await db
          .select()
          .from(modules)
          .where(
            and(
              eq(modules.yearId, input.yearId),
              eq(modules.sectorId, input.sectorId)
            )
          );
      } else {
        moduleQuery = await db
          .select()
          .from(modules)
          .where(
            and(
              eq(modules.yearId, input.yearId),
              isNull(modules.sectorId)
            )
          );
      }

      const result = [];
      for (const mod of moduleQuery) {
        const elems = await db
          .select()
          .from(elements)
          .where(eq(elements.moduleId, mod.id))
          .orderBy(elements.name);

        for (const el of elems) {
          const docs = await db
            .select()
            .from(documents)
            .where(eq(documents.elementId, el.id));

          result.push({
            ...el,
            moduleName: mod.name,
            documents: docs,
          });
        }
      }

      return result;
    }),

  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1, "Element name is required"),
        description: z.string().optional(),
        moduleId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(elements).values({
        name: input.name,
        description: input.description || null,
        moduleId: input.moduleId,
      });
      const elId = Number(result[0].insertId);
      return db.query.elements.findFirst({ where: eq(elements.id, elId) });
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db
        .update(elements)
        .set(data)
        .where(eq(elements.id, id));
      return db.query.elements.findFirst({ where: eq(elements.id, id) });
    }),

  delete: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(elements).where(eq(elements.id, input.id));
      return { success: true };
    }),
});
