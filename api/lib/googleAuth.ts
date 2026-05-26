import jwt from "jsonwebtoken";
import { or, eq } from "drizzle-orm";
import type { User } from "@db/schema";
import { users, years } from "@db/schema";
import { getDb } from "../queries/connection";
import { TRPCError } from "@trpc/server";
import {
  buildGoogleOAuthUrl,
  exchangeGoogleOAuthCode,
  fetchGoogleUserInfo,
  verifyGoogleOAuthState,
} from "./googleDrive";

const JWT_SECRET = process.env.APP_SECRET || "studyam-secret-key";

function buildAppAuthToken(user: User): string {
  return jwt.sign(
    { userId: user.id, role: user.role, ensamCode: user.ensamCode },
    JWT_SECRET,
    { expiresIn: "30d" },
  );
}

export function buildGoogleLoginUrl(): string {
  return buildGoogleOAuthUrl({ purpose: "auth" });
}

export function buildGoogleDriveConnectUrl(userId: number): string {
  return buildGoogleOAuthUrl({ purpose: "drive-connect", userId });
}

export async function handleGoogleAuthCallback(code: string): Promise<{ token: string; destination: string }> {
  const db = getDb();
  const tokens = await exchangeGoogleOAuthCode(code);
  const userInfo = await fetchGoogleUserInfo(tokens.access_token);

  if (!userInfo.email) {
    throw new Error("Google account did not return an email address");
  }

  const existingByGoogleEmail = await db.query.users.findFirst({
    where: eq(users.googleEmail, userInfo.email),
  });
  const existingByEmail = existingByGoogleEmail
    ? null
    : await db.query.users.findFirst({
      where: eq(users.email, userInfo.email),
    });
  const existing = existingByGoogleEmail || existingByEmail;

  const refreshToken = tokens.refresh_token || existing?.googleRefreshToken || null;
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  let user: User;
  if (!existing) {
    const result = await db.insert(users).values({
      name: userInfo.name || userInfo.email,
      email: userInfo.email,
      ensamCode: null,
      passwordHash: null,
      role: "student",
      yearId: null,
      sectorId: null,
      profileComplete: false,
      isApproved: true,
      avatar: userInfo.picture || null,
      googleEmail: userInfo.email,
      googleRefreshToken: refreshToken,
      googleAccessToken: tokens.access_token,
      googleTokenExpiresAt: expiresAt,
      googleConnectedAt: new Date(),
    });

    const userId = Number(result[0].insertId);
    const createdUser = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!createdUser) {
      throw new Error("Failed to create Google account");
    }
    user = createdUser;
  } else {
    await db.update(users).set({
      name: existing.name || userInfo.name || existing.email,
      email: userInfo.email,
      googleEmail: userInfo.email,
      googleRefreshToken: refreshToken,
      googleAccessToken: tokens.access_token,
      googleTokenExpiresAt: expiresAt,
      googleConnectedAt: new Date(),
      avatar: userInfo.picture || existing.avatar,
    }).where(eq(users.id, existing.id));

    const updatedUser = await db.query.users.findFirst({ where: eq(users.id, existing.id) });
    if (!updatedUser) {
      throw new Error("Failed to update Google account");
    }
    user = updatedUser;
  }

  const year = user.yearId
    ? await db.query.years.findFirst({ where: eq(years.id, user.yearId) })
    : null;
  const needsProfileCompletion =
    !user.profileComplete ||
    !user.ensamCode ||
    !user.yearId ||
    (year?.hasSectors && !user.sectorId);

  const token = buildAppAuthToken(user);
  const destination = needsProfileCompletion
    ? "/complete-profile"
    : user.role === "admin" || user.role === "promo_representative"
      ? "/admin"
      : "/dashboard";

  return { token, destination };
}

export async function handleGoogleDriveConnectCallback(userId: number, code: string): Promise<void> {
  const db = getDb();
  const tokens = await exchangeGoogleOAuthCode(code);
  const userInfo = await fetchGoogleUserInfo(tokens.access_token);
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });

  if (!existing) {
    throw new Error("User not found");
  }

  const refreshToken = tokens.refresh_token || existing.googleRefreshToken;
  if (!refreshToken) {
    throw new Error("Google did not return a refresh token. Reconnect and approve offline access.");
  }

  if (userInfo.email) {
    const conflictingUser = await db.query.users.findFirst({
      where: eq(users.googleEmail, userInfo.email),
    });

    if (conflictingUser && conflictingUser.id !== userId) {
      throw new TRPCError({
        code: "CONFLICT",
        message: "This Google account is already linked to another StudyAM account.",
      });
    }
  }

  await db.update(users).set({
    googleEmail: userInfo.email || existing.googleEmail || null,
    googleRefreshToken: refreshToken,
    googleAccessToken: tokens.access_token,
    googleTokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    googleConnectedAt: new Date(),
    avatar: userInfo.picture || existing.avatar,
  }).where(eq(users.id, userId));
}

export { verifyGoogleOAuthState, buildGoogleOAuthUrl };
