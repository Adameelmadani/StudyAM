import { z } from "zod";
import { createRouter, publicQuery, representativeQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { elements, modules, documents, moduleSectors } from "@db/schema";
import { eq, and, isNull, or, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

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
        const ms = await db.select().from(moduleSectors).where(eq(moduleSectors.sectorId, input.sectorId));
        const moduleIdsFromJunction = ms.map(m => m.moduleId);

        if (moduleIdsFromJunction.length > 0) {
          moduleQuery = await db
            .select()
            .from(modules)
            .where(
              and(
                eq(modules.yearId, input.yearId),
                or(
                  eq(modules.sectorId, input.sectorId),
                  inArray(modules.id, moduleIdsFromJunction)
                )
              )
            );
        } else {
          moduleQuery = await db
            .select()
            .from(modules)
            .where(
              and(
                eq(modules.yearId, input.yearId),
                eq(modules.sectorId, input.sectorId)
              )
            );
        }
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

  create: representativeQuery
    .input(
      z.object({
        name: z.string().min(1, "Element name is required"),
        description: z.string().optional(),
        moduleId: z.number().int().positive(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const mod = await db.query.modules.findFirst({
        where: eq(modules.id, input.moduleId),
      });
      if (!mod) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      }

      const isRepresentative = ctx.user.role === "representative";
      const isPromoRepresentative = ctx.user.role === "promo_representative";

      if (isRepresentative || isPromoRepresentative) {
        if (!ctx.user.yearId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Representative must be assigned to a year",
          });
        }
        if (mod.yearId !== ctx.user.yearId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only create elements for your assigned year",
          });
        }
        
        if (isRepresentative) {
          if (ctx.user.sectorId && mod.sectorId && mod.sectorId !== ctx.user.sectorId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You can only create elements for your assigned sector",
            });
          }
          if (!ctx.user.sectorId && mod.sectorId) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "You can only create elements for modules without a sector",
            });
          }
        }
      }
      const result = await db.insert(elements).values({
        name: input.name,
        description: input.description || null,
        moduleId: input.moduleId,
        color: input.color || "#b24760",
      });
      const elId = Number(result[0].insertId);
      return db.query.elements.findFirst({ where: eq(elements.id, elId) });
    }),

  update: representativeQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().optional(),
        description: z.string().optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const el = await db.query.elements.findFirst({
        where: eq(elements.id, input.id),
      });
      if (!el) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Element not found" });
      }

      const isRepresentative = ctx.user.role === "representative";
      const isPromoRepresentative = ctx.user.role === "promo_representative";

      if (isRepresentative || isPromoRepresentative) {
        const mod = await db.query.modules.findFirst({
          where: eq(modules.id, el.moduleId),
        });
        if (!mod) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
        }
        if (mod.yearId !== ctx.user.yearId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update elements for your assigned year",
          });
        }
        if (isRepresentative && mod.sectorId && mod.sectorId !== ctx.user.sectorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update elements for your assigned sector",
          });
        }
      }

      const { id, ...data } = input;
      await db
        .update(elements)
        .set(data)
        .where(eq(elements.id, id));
      return db.query.elements.findFirst({ where: eq(elements.id, id) });
    }),

  delete: representativeQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const el = await db.query.elements.findFirst({
        where: eq(elements.id, input.id),
      });
      if (!el) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Element not found" });
      }

      const isRepresentative = ctx.user.role === "representative";
      const isPromoRepresentative = ctx.user.role === "promo_representative";

      if (isRepresentative || isPromoRepresentative) {
        const mod = await db.query.modules.findFirst({
          where: eq(modules.id, el.moduleId),
        });
        if (!mod) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
        }
        if (mod.yearId !== ctx.user.yearId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete elements for your assigned year",
          });
        }
        if (isRepresentative && mod.sectorId && mod.sectorId !== ctx.user.sectorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete elements for your assigned sector",
          });
        }
      }

      await db.delete(elements).where(eq(elements.id, input.id));
      return { success: true };
    }),
});
