import jwt from "jsonwebtoken";
import { or, eq } from "drizzle-orm";
import type { User } from "@db/schema";
import { users } from "@db/schema";
import { getDb } from "../queries/connection";
import {
  buildGoogleOAuthUrl,
  exchangeGoogleOAuthCode,
  fetchGoogleUserInfo,
  verifyGoogleOAuthState,
} from "./googleDrive";

const JWT_SECRET = process.env.APP_SECRET || "studyam-secret-key";

function normalizeBaseEnsamCode(email: string): string {
  const localPart = email.split("@")[0] || "googleuser";
  const sanitized = localPart.replace(/[^a-zA-Z0-9._-]/g, "").slice(0, 50);
  return sanitized || "googleuser";
}

async function ensureUniqueEnsamCode(baseCode: string): Promise<string> {
  const db = getDb();
  let candidate = baseCode.slice(0, 50) || "googleuser";
  let suffix = 0;

  while (true) {
    const existing = await db.query.users.findFirst({
      where: eq(users.ensamCode, candidate),
    });
    if (!existing) {
      return candidate;
    }

    suffix += 1;
    const suffixText = `-${suffix}`;
    candidate = `${baseCode.slice(0, Math.max(1, 50 - suffixText.length))}${suffixText}`;
  }
}

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

  const existing = await db.query.users.findFirst({
    where: or(eq(users.email, userInfo.email), eq(users.googleEmail, userInfo.email)),
  });

  const refreshToken = tokens.refresh_token || existing?.googleRefreshToken || null;
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  let user: User;
  if (!existing) {
    const ensamCode = await ensureUniqueEnsamCode(normalizeBaseEnsamCode(userInfo.email));
    const result = await db.insert(users).values({
      name: userInfo.name || userInfo.email,
      email: userInfo.email,
      ensamCode,
      passwordHash: null,
      role: "student",
      yearId: null,
      sectorId: null,
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

  const token = buildAppAuthToken(user);
  const destination = user.role === "admin" || user.role === "promo_representative" ? "/admin" : "/dashboard";

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
