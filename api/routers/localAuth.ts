import { z } from "zod";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { users } from "@db/schema";
import { eq, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

const JWT_SECRET = process.env.APP_SECRET || "studyam-secret-key";

export const localAuthRouter = createRouter({
  register: publicQuery
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        email: z.string().email("Invalid email address"),
        ensamCode: z.string().min(3, "ENSAM code must be at least 3 characters"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        yearId: z.number().int().positive(),
        sectorId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      // Check for existing user
      const existing = await db
        .select()
        .from(users)
        .where(or(eq(users.ensamCode, input.ensamCode), eq(users.email, input.email)))
        .limit(1);

      if (existing.length > 0) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A user with this ENSAM code or email already exists",
        });
      }

      // Hash password
      const passwordHash = await bcrypt.hash(input.password, 10);

      // Insert user
      const result = await db.insert(users).values({
        name: input.name,
        email: input.email,
        ensamCode: input.ensamCode,
        passwordHash,
        role: "student",
        yearId: input.yearId,
        sectorId: input.sectorId || null,
        profileComplete: true,
        isApproved: true,
      });

      const userId = Number(result[0].insertId);
      const newUser = await db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!newUser) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: newUser.id, role: newUser.role, ensamCode: newUser.ensamCode },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      return {
        success: true,
        token,
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          ensamCode: newUser.ensamCode,
          role: newUser.role,
          yearId: newUser.yearId,
          sectorId: newUser.sectorId,
          profileComplete: newUser.profileComplete,
          isApproved: newUser.isApproved,
        },
      };
    }),

  login: publicQuery
    .input(
      z.object({
        ensamCode: z.string().min(1, "ENSAM code is required"),
        password: z.string().min(1, "Password is required"),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();

      const user = await db.query.users.findFirst({
        where: eq(users.ensamCode, input.ensamCode),
      });

      if (!user || !user.passwordHash) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid ENSAM code or password",
        });
      }

      const validPassword = await bcrypt.compare(input.password, user.passwordHash);
      if (!validPassword) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid ENSAM code or password",
        });
      }

      // Generate JWT token
      const token = jwt.sign(
        { userId: user.id, role: user.role, ensamCode: user.ensamCode },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          ensamCode: user.ensamCode,
          role: user.role,
          yearId: user.yearId,
          sectorId: user.sectorId,
          profileComplete: user.profileComplete,
          isApproved: user.isApproved,
        },
      };
    }),

  me: publicQuery.query(async ({ ctx }) => {
    // Return user from context if authenticated
    if (ctx.user) {
      return {
        id: ctx.user.id,
        name: ctx.user.name,
        email: ctx.user.email,
        ensamCode: ctx.user.ensamCode,
        role: ctx.user.role,
        yearId: ctx.user.yearId,
        sectorId: ctx.user.sectorId,
        profileComplete: ctx.user.profileComplete,
        isApproved: ctx.user.isApproved,
        avatar: ctx.user.avatar,
      };
    }

    return null;
  }),
});
