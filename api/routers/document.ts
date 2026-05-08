import { z } from "zod";
import {
  createRouter,
  publicQuery,
  representativeQuery,
} from "../middleware";
import { getDb } from "../queries/connection";
import { documents, elements, modules, users } from "@db/schema";
import { eq, and, desc, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import type { Module, Element, Document } from "@db/schema";

export const documentRouter = createRouter({
  list: publicQuery
    .input(z.object({ elementId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getDb();
      const docs = await db
        .select()
        .from(documents)
        .where(eq(documents.elementId, input.elementId))
        .orderBy(desc(documents.createdAt));

      const result = [];
      for (const doc of docs) {
        const uploader = await db.query.users.findFirst({
          where: eq(users.id, doc.uploadedBy),
        });
        result.push({
          ...doc,
          uploaderName: uploader?.name || "Unknown",
        });
      }
      return result;
    }),

  listByYearSector: publicQuery
    .input(
      z.object({
        yearId: z.number().int().positive(),
        sectorId: z.number().int().positive().optional(),
        type: z.enum(["cours", "exam", "test", "tp", "resume"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = getDb();

      let moduleQuery: Module[];
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

      const moduleIds = moduleQuery.map((m: Module) => m.id);
      if (moduleIds.length === 0) return [];

      const allElements: Element[] = await db.select().from(elements);
      const filteredElements = allElements.filter((e: Element) =>
        moduleIds.includes(e.moduleId)
      );
      const elementIds = filteredElements.map((e: Element) => e.id);
      if (elementIds.length === 0) return [];

      const allDocs: Document[] = await db
        .select()
        .from(documents)
        .orderBy(desc(documents.createdAt));

      const filteredDocs = allDocs.filter((d: Document) =>
        elementIds.includes(d.elementId)
      );

      const result = [];
      for (const doc of input.type
        ? filteredDocs.filter((d: Document) => d.type === input.type)
        : filteredDocs) {
        const el = filteredElements.find((e: Element) => e.id === doc.elementId);
        const mod = moduleQuery.find((m: Module) => m.id === el?.moduleId);
        const uploader = await db.query.users.findFirst({
          where: eq(users.id, doc.uploadedBy),
        });
        result.push({
          ...doc,
          elementName: el?.name || "Unknown",
          moduleName: mod?.name || "Unknown",
          uploaderName: uploader?.name || "Unknown",
        });
      }
      return result;
    }),

  create: representativeQuery
    .input(
      z.object({
        title: z.string().min(1, "Document title is required"),
        type: z.enum(["cours", "exam", "test", "tp", "resume"]),
        url: z.string().url("Must be a valid URL"),
        elementId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();

      const element = await db.query.elements.findFirst({
        where: eq(elements.id, input.elementId),
      });
      if (!element) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Element not found" });
      }

      if (ctx.user.role === "representative") {
        const mod = await db.query.modules.findFirst({
          where: eq(modules.id, element.moduleId),
        });
        if (!mod) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Module not found" });
        }
        if (mod.yearId !== ctx.user.yearId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only upload for your assigned year",
          });
        }
        if (mod.sectorId && mod.sectorId !== ctx.user.sectorId) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: "You can only upload for your assigned sector",
          });
        }
      }

      const result = await db.insert(documents).values({
        title: input.title,
        type: input.type,
        url: input.url,
        elementId: input.elementId,
        uploadedBy: ctx.user.id,
      });

      const docId = Number(result[0].insertId);
      return db.query.documents.findFirst({ where: eq(documents.id, docId) });
    }),

  update: representativeQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        title: z.string().optional(),
        type: z.enum(["cours", "exam", "test", "tp", "resume"]).optional(),
        url: z.string().url().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, input.id),
      });
      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      if (ctx.user.role !== "admin" && doc.uploadedBy !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only update your own documents",
        });
      }

      const { id, ...data } = input;
      await db.update(documents).set(data).where(eq(documents.id, id));
      return db.query.documents.findFirst({ where: eq(documents.id, id) });
    }),

  delete: representativeQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const doc = await db.query.documents.findFirst({
        where: eq(documents.id, input.id),
      });
      if (!doc) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
      }

      if (ctx.user.role !== "admin" && doc.uploadedBy !== ctx.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only delete your own documents",
        });
      }

      await db.delete(documents).where(eq(documents.id, input.id));
      return { success: true };
    }),

  recent: publicQuery
    .input(
      z
        .object({
          yearId: z.number().int().positive(),
          sectorId: z.number().int().positive().optional(),
          limit: z.number().int().min(1).max(50).default(10),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      if (!input) {
        return db
          .select()
          .from(documents)
          .orderBy(desc(documents.createdAt))
          .limit(10);
      }

      let moduleQuery: Module[];
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

      const moduleIds = moduleQuery.map((m: Module) => m.id);
      if (moduleIds.length === 0) return [];

      const allElements: Element[] = await db.select().from(elements);
      const elementIds = allElements
        .filter((e: Element) => moduleIds.includes(e.moduleId))
        .map((e: Element) => e.id);
      if (elementIds.length === 0) return [];

      const allDocs: Document[] = await db
        .select()
        .from(documents)
        .orderBy(desc(documents.createdAt));

      return allDocs
        .filter((d: Document) => elementIds.includes(d.elementId))
        .slice(0, input.limit);
    }),
});
