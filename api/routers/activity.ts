import { z } from "zod";
import { createRouter, adminQuery, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { activityLog, users } from "@db/schema";
import { eq, desc } from "drizzle-orm";

export const activityRouter = createRouter({
  list: adminQuery
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
    .query(async ({ input }) => {
      const db = getDb();
      const limit = input?.limit || 50;

      let logs;
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
        ]),
        entityType: z.enum(["document", "user", "module", "element"]),
        entityId: z.number().int().positive().optional(),
        description: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const result = await db.insert(activityLog).values({
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId || null,
        description: input.description,
        performedBy: ctx.user.id,
      });
      const logId = Number(result[0].insertId);
      return db.query.activityLog.findFirst({
        where: eq(activityLog.id, logId),
      });
    }),
});
