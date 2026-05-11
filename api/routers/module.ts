import { z } from "zod";
import { createRouter, publicQuery, representativeQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { modules, moduleSectors } from "@db/schema";
import { eq, and, isNull, or, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const moduleRouter = createRouter({
  listAll: representativeQuery.query(async () => {
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
        // Find modules where sectorId matches OR there's an entry in moduleSectors
        const ms = await db.select().from(moduleSectors).where(eq(moduleSectors.sectorId, input.sectorId));
        const moduleIdsFromJunction = ms.map(m => m.moduleId);

        if (moduleIdsFromJunction.length > 0) {
          return db
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
            )
            .orderBy(modules.name);
        }

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
        semester: z.number().int().min(1).max(2),
        sectorIds: z.array(z.number().int().positive()).optional(),
        icon: z.string().optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const isRepresentative = ctx.user.role === "representative";
      const isPromoRepresentative = ctx.user.role === "promo_representative";
      
      if (isRepresentative || isPromoRepresentative) {
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
        
        if (isRepresentative) {
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
      }

      const result = await db.insert(modules).values({
        name: input.name,
        description: input.description || null,
        yearId: (isRepresentative || isPromoRepresentative) ? ctx.user.yearId : input.yearId,
        sectorId: isRepresentative ? (ctx.user.sectorId || null) : (input.sectorId || null),
        semester: input.semester,
        icon: input.icon || "book",
        color: input.color || "#b24760",
      });
      const modId = Number(result[0].insertId);

      // Handle multiple sectors if provided
      if (input.sectorIds && input.sectorIds.length > 0) {
        for (const sId of input.sectorIds) {
          await db.insert(moduleSectors).values({
            moduleId: modId,
            sectorId: sId,
          });
        }
      }

      return db.query.modules.findFirst({ where: eq(modules.id, modId) });
    }),

  update: representativeQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().optional(),
        description: z.string().optional(),
        semester: z.number().int().min(1).max(2).optional(),
        icon: z.string().optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        sectorIds: z.array(z.number().int().positive()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      
      const mod = await db.query.modules.findFirst({
        where: eq(modules.id, input.id),
      });
      if (!mod) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
      }

      const isRepresentative = ctx.user.role === "representative";
      const isPromoRepresentative = ctx.user.role === "promo_representative";

      if (isRepresentative || isPromoRepresentative) {
        if (mod.yearId !== ctx.user.yearId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update modules for your assigned year",
          });
        }
        if (isRepresentative && mod.sectorId && mod.sectorId !== ctx.user.sectorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only update modules for your assigned sector",
          });
        }
      }

      const { id, sectorIds, ...data } = input;
      await db
        .update(modules)
        .set(data)
        .where(eq(modules.id, id));

      if (sectorIds) {
        // Refresh sectors
        await db.delete(moduleSectors).where(eq(moduleSectors.moduleId, id));
        for (const sId of sectorIds) {
          await db.insert(moduleSectors).values({
            moduleId: id,
            sectorId: sId,
          });
        }
      }

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

      const isRepresentative = ctx.user.role === "representative";
      const isPromoRepresentative = ctx.user.role === "promo_representative";

      if (isRepresentative || isPromoRepresentative) {
        if (mod.yearId !== ctx.user.yearId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete modules for your assigned year",
          });
        }
        if (isRepresentative && mod.sectorId && mod.sectorId !== ctx.user.sectorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only delete modules for your assigned sector",
          });
        }
      }

      await db.delete(moduleSectors).where(eq(moduleSectors.moduleId, input.id));
      await db.delete(modules).where(eq(modules.id, input.id));
      return { success: true };
    }),
});
