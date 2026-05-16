import { z } from "zod";
import { createRouter, representativeQuery, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { activityLog, users } from "@db/schema";
import { eq, desc, and } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const activityRouter = createRouter({
  list: representativeQuery
    .input(
      z
        .object({
          limit: z.number().int().min(1).max(100).default(50),
          entityType: z
            .enum(["document", "user", "module", "element"])
            .optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const limit = input?.limit || 50;

      const isPromoRep = ctx.user.role === "promo_representative";
      const isRep = ctx.user.role === "representative";
      const isAdmin = ctx.user.role === "admin";

      if (!isAdmin && !isPromoRep && !isRep) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      let logs;
      
      // If rep or promo rep, filter by context and exclude admin actions
      if (isPromoRep || isRep) {
        const conditions = [eq(activityLog.yearId, ctx.user.yearId!)];
        
        if (isRep) {
          // Reps only see activities for their specific sector
          conditions.push(eq(activityLog.sectorId, ctx.user.sectorId!));
        }

        if (input?.entityType) {
          conditions.push(eq(activityLog.entityType, input.entityType));
        }

        const query = db
          .select({
            log: activityLog,
            performer: users,
          })
          .from(activityLog)
          .innerJoin(users, eq(activityLog.performedBy, users.id))
          .where(and(...conditions))
          .orderBy(desc(activityLog.createdAt))
          .limit(limit);
        
        const results = await query;
        // Exclude activities performed by admins
        return results
          .filter(r => r.performer.role !== "admin")
          .map(r => ({
            ...r.log,
            performerName: r.performer.name || "Unknown",
          }));
      }

      // Admin logic
      if (input?.entityType) {
        logs = await db
          .select()
          .from(activityLog)
          .where(eq(activityLog.entityType, input.entityType))
          .orderBy(desc(activityLog.createdAt))
          .limit(limit);
      } else {
        logs = await db
          .select()
          .from(activityLog)
          .orderBy(desc(activityLog.createdAt))
          .limit(limit);
      }

      const result = [];
      for (const log of logs) {
        const performer = await db.query.users.findFirst({
          where: eq(users.id, log.performedBy),
        });
        result.push({
          ...log,
          performerName: performer?.name || "Unknown",
        });
      }
      return result;
    }),

  create: authedQuery
    .input(
      z.object({
        action: z.enum([
          "upload",
          "edit",
          "delete",
          "grant_access",
          "revoke_access",
          "delete_student",
          "delete_document",
          "add_module",
          "add_element",
          "edit_module",
          "edit_element",
          "delete_module",
          "delete_element",
          "edit_document",
        ]),
        entityType: z.enum(["document", "user", "module", "element"]),
        entityId: z.number().int().positive().optional(),
        yearId: z.number().int().positive().optional(),
        sectorId: z.number().int().positive().optional(),
        description: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(activityLog).values({
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        yearId: input.yearId || null,
        sectorId: input.sectorId || null,
        description: input.description,
        performedBy: ctx.user.id,
      });
      const logId = Number(result[0].insertId);
      return db.query.activityLog.findFirst({
        where: eq(activityLog.id, logId),
      });
    }),
});
