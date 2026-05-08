import { z } from "zod";
import { adminQuery, createRouter } from "../middleware";
import { getDb } from "../queries/connection";
import { users, documents, elements } from "@db/schema";
import { eq } from "drizzle-orm";
import type { User } from "@db/schema";

export const userRouter = createRouter({
  list: adminQuery
    .input(
      z
        .object({
          role: z.enum(["student", "representative", "admin"]).optional(),
          search: z.string().optional(),
          page: z.number().int().min(1).default(1),
          limit: z.number().int().min(1).max(100).default(20),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const page = input?.page || 1;
      const limit = input?.limit || 20;
      const offset = (page - 1) * limit;

      let query: User[];
      if (input?.role) {
        query = await db
          .select()
          .from(users)
          .where(eq(users.role, input.role));
      } else {
        query = await db.select().from(users);
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

  getById: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.query.users.findFirst({
        where: eq(users.id, input.id),
      });
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number().int().positive(),
        name: z.string().optional(),
        email: z.string().email().optional(),
        yearId: z.number().int().positive().optional(),
        sectorId: z.number().int().positive().optional(),
        role: z.enum(["student", "representative", "admin"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(users).set(data).where(eq(users.id, id));
      return db.query.users.findFirst({ where: eq(users.id, id) });
    }),

  delete: adminQuery
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(users).where(eq(users.id, input.id));
      return { success: true };
    }),

  grantRepresentative: adminQuery
    .input(
      z.object({
        userId: z.number().int().positive(),
        yearId: z.number().int().positive(),
        sectorId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(users)
        .set({
          role: "representative",
          yearId: input.yearId,
          sectorId: input.sectorId || null,
          isApproved: true,
        })
        .where(eq(users.id, input.userId));
      return db.query.users.findFirst({ where: eq(users.id, input.userId) });
    }),

  revokeRepresentative: adminQuery
    .input(z.object({ userId: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db
        .update(users)
        .set({
          role: "student",
          isApproved: true,
        })
        .where(eq(users.id, input.userId));
      return db.query.users.findFirst({ where: eq(users.id, input.userId) });
    }),

  stats: adminQuery.query(async () => {
    const db = getDb();

    const allUsers: User[] = await db.select().from(users);
    const totalStudents = allUsers.filter((u: User) => u.role === "student").length;
    const totalRepresentatives = allUsers.filter(
      (u: User) => u.role === "representative"
    ).length;

    const allDocs = await db.select().from(documents);
    const totalDocuments = allDocs.length;

    const allElements = await db.select().from(elements);
    const totalElements = allElements.length;

    return {
      totalStudents,
      totalRepresentatives,
      totalDocuments,
      totalElements,
    };
  }),
});
