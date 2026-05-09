import { z } from "zod";
import { adminQuery, createRouter, representativeQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { users, documents, elements } from "@db/schema";
import { eq, and, or } from "drizzle-orm";
import type { User } from "@db/schema";
import { TRPCError } from "@trpc/server";

export const userRouter = createRouter({
  list: representativeQuery
    .input(
      z
        .object({
          role: z.enum(["student", "representative", "promo_representative", "admin"]).optional(),
          search: z.string().optional(),
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
          yearId: z.number().int().positive().optional(),
        })
        .optional()
    )
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const offset = (page - 1) * limit;

      const isPromoRep = ctx.user.role === "promo_representative";
      const isAdmin = ctx.user.role === "admin";

      if (!isAdmin && !isPromoRep) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only admins or promo representatives can list users" });
      }

      let query: User[];
      const yearFilter = isPromoRep ? ctx.user.yearId : input?.yearId;

      if (input?.role) {
        query = await db
          .select()
          .from(users)
          .where(
            and(
              eq(users.role, input.role),
              yearFilter ? eq(users.yearId, yearFilter) : undefined
            )
          );
      } else {
        query = await db
          .select()
          .from(users)
          .where(yearFilter ? eq(users.yearId, yearFilter) : undefined);
      }

      let filtered = query;
      if (input?.search) {
        const s = input.search.toLowerCase();
        filtered = query.filter(
          (u: User) =>
            u.name?.toLowerCase().includes(s) ||
            u.email?.toLowerCase().includes(s) ||
            u.ensamCode?.toLowerCase().includes(s)
        );
      }

      const total = filtered.length;
      const paginated = filtered.slice(offset, offset + limit);

      return { users: paginated, total };
    }),

  getById: representativeQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const u = await db.query.users.findFirst({
        where: eq(users.id, input.id),
      });

      if (!u) return null;

      if (ctx.user.role === "promo_representative" && u.yearId !== ctx.user.yearId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "You can only view users in your year" });
      }

      return u;
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        yearId: z.number().int().positive().optional(),
        sectorId: z.number().int().positive().optional(),
        role: z.enum(["student", "representative", "promo_representative", "admin"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(users).set(data).where(eq(users.id, id));
      return db.query.users.findFirst({ where: eq(users.id, id) });
    }),

  delete: representativeQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const u = await db.query.users.findFirst({
        where: eq(users.id, input.id),
      });

      if (!u) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }

      const isAdmin = ctx.user.role === "admin";
      const isPromoRep = ctx.user.role === "promo_representative";

      if (!isAdmin) {
        if (!isPromoRep || u.yearId !== ctx.user.yearId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "Permission denied" });
        }
        // Promo rep can delete students and representatives in their year
        if (u.role !== "student" && u.role !== "representative") {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete students or representatives" });
        }
      }

      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),

  grantRepresentative: representativeQuery
    .input(
      z.object({
        userId: z.number().int().positive(),
        yearId: z.number().int().positive(),
        sectorId: z.number().int().positive().optional(),
        role: z.enum(["representative", "promo_representative"]).default("representative"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const targetUser = await db.query.users.findFirst({ where: eq(users.id, input.userId) });
      
      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const isAdmin = ctx.user.role === "admin";
      const isPromoRep = ctx.user.role === "promo_representative";

      if (!isAdmin) {
        if (!isPromoRep || targetUser.yearId !== ctx.user.yearId || input.yearId !== ctx.user.yearId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only grant access to students in your year" });
        }
        // Promo rep can only grant representative role (maybe not promo_rep?)
        if (input.role === "promo_representative") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Only admins can grant promo representative role" });
        }
      }

      await db
        .update(users)
        .set({
          role: input.role,
          yearId: input.yearId,
          sectorId: input.sectorId || null,
          isApproved: true,
        })
        .where(eq(users.id, input.userId));
      return db.query.users.findFirst({ where: eq(users.id, input.userId) });
    }),

  revokeRepresentative: representativeQuery
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const targetUser = await db.query.users.findFirst({ where: eq(users.id, input.userId) });
      
      if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const isAdmin = ctx.user.role === "admin";
      const isPromoRep = ctx.user.role === "promo_representative";

      if (!isAdmin) {
        if (!isPromoRep || targetUser.yearId !== ctx.user.yearId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only revoke access in your year" });
        }
        if (targetUser.role !== "representative") {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only revoke representative role" });
        }
      }

      await db
        .update(users)
        .set({
          role: "student",
          isApproved: true,
        })
        .where(eq(users.id, input.userId));
      return db.query.users.findFirst({ where: eq(users.id, input.userId) });
    }),

  stats: representativeQuery.query(async ({ ctx }) => {
    const db = getDb();

    const isAdmin = ctx.user.role === "admin";
    const isPromoRep = ctx.user.role === "promo_representative";

    let allUsers: User[];
    if (isAdmin) {
      allUsers = await db.select().from(users);
    } else if (isPromoRep) {
      allUsers = await db.select().from(users).where(eq(users.yearId, ctx.user.yearId));
    } else {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const totalStudents = allUsers.filter((u: User) => u.role === "student").length;
    const totalRepresentatives = allUsers.filter(
      (u: User) => u.role === "representative" || u.role === "promo_representative"
    ).length;

    // For simplicity, stats for docs/elements remain global or filtered by year
    const allDocs = await db.select().from(documents);
    const totalDocuments = isAdmin ? allDocs.length : 0; // Or filter by year

    const allElements = await db.select().from(elements);
    const totalElements = isAdmin ? allElements.length : 0; // Or filter by year

    return {
      totalStudents,
      totalRepresentatives,
      totalDocuments,
      totalElements,
    };
  }),
});
