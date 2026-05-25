import { createHash } from "crypto";
import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import { getDb } from "../queries/connection";
import { users } from "@db/schema";

const GOOGLE_OAUTH_AUTHORIZE_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_DRIVE_UPLOAD_URL = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink,webContentLink,mimeType,name";
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_OAUTH_SCOPES = ["openid", "email", "profile", DRIVE_SCOPE];
const GOOGLE_OAUTH_STATE_SECRET = process.env.APP_SECRET || "studyam-secret-key";

type GoogleOAuthPurpose = "auth" | "drive-connect";

type GoogleOAuthState = {
  purpose: GoogleOAuthPurpose;
  userId?: number;
};

type GoogleDriveConfig = {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  folderId: string;
};

type GoogleOAuthTokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope?: string;
  token_type?: string;
  id_token?: string;
};

type DriveUploadResult = {
  id: string;
  webViewLink?: string;
  webContentLink?: string;
  mimeType?: string;
  name?: string;
};

function base64UrlEncode(input: Buffer | string): string {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function getDriveConfig(): GoogleDriveConfig {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_OAUTH_REDIRECT_URI;
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!clientId || !clientSecret || !redirectUri || !folderId) {
    throw new Error("Missing Google Drive configuration");
  }

  return {
    clientId,
    clientSecret,
    redirectUri,
    folderId,
  };
}

function buildOAuthState(state: GoogleOAuthState): string {
  return jwt.sign(state, GOOGLE_OAUTH_STATE_SECRET, {
    expiresIn: "10m",
  });
}

export function buildGoogleOAuthUrl(state: GoogleOAuthState): string {
  const { clientId, redirectUri } = getDriveConfig();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_OAUTH_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state: buildOAuthState(state),
  });

  return `${GOOGLE_OAUTH_AUTHORIZE_URL}?${params.toString()}`;
}

export function verifyGoogleOAuthState(state: string): GoogleOAuthState {
  const payload = jwt.verify(state, GOOGLE_OAUTH_STATE_SECRET) as GoogleOAuthState;
  if (!payload.purpose) {
    throw new Error("Invalid Google OAuth state");
  }

  return payload;
}

export async function exchangeGoogleOAuthCode(code: string): Promise<GoogleOAuthTokenResponse> {
  const { clientId, clientSecret, redirectUri } = getDriveConfig();
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to exchange Google OAuth code: ${details}`);
  }

  return (await response.json()) as GoogleOAuthTokenResponse;
}

async function refreshGoogleAccessToken(refreshToken: string): Promise<GoogleOAuthTokenResponse> {
  const { clientId, clientSecret } = getDriveConfig();
  const response = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to refresh Google access token: ${details}`);
  }

  return (await response.json()) as GoogleOAuthTokenResponse;
}

export async function fetchGoogleUserInfo(accessToken: string): Promise<{ email?: string; name?: string; picture?: string }> {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return {};
  }

  return (await response.json()) as { email?: string; name?: string; picture?: string };
}

export async function connectGoogleDriveAccount(userId: number, code: string): Promise<void> {
  const db = getDb();
  const existing = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!existing) {
    throw new Error("User not found");
  }

  const tokens = await exchangeGoogleOAuthCode(code);
  const refreshToken = tokens.refresh_token || existing.googleRefreshToken;

  if (!refreshToken) {
    throw new Error("Google did not return a refresh token. Reconnect and approve offline access.");
  }

  const userInfo = await fetchGoogleUserInfo(tokens.access_token);
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);

  await db.update(users).set({
    googleEmail: userInfo.email || existing.googleEmail || null,
    googleRefreshToken: refreshToken,
    googleAccessToken: tokens.access_token,
    googleTokenExpiresAt: expiresAt,
    googleConnectedAt: new Date(),
  }).where(eq(users.id, userId));
}

export async function disconnectGoogleDriveAccount(userId: number): Promise<void> {
  const db = getDb();
  await db.update(users).set({
    googleEmail: null,
    googleRefreshToken: null,
    googleAccessToken: null,
    googleTokenExpiresAt: null,
    googleConnectedAt: null,
  }).where(eq(users.id, userId));
}

async function getGoogleAccessTokenForUser(userId: number): Promise<string> {
  const db = getDb();
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

  if (!user?.googleRefreshToken) {
    throw new Error("Google account is not connected. Connect Google Drive first.");
  }

  if (user.googleAccessToken && user.googleTokenExpiresAt && user.googleTokenExpiresAt.getTime() > Date.now() + 60_000) {
    return user.googleAccessToken;
  }

  const refreshed = await refreshGoogleAccessToken(user.googleRefreshToken);
  const expiresAt = new Date(Date.now() + refreshed.expires_in * 1000);

  await db.update(users).set({
    googleAccessToken: refreshed.access_token,
    googleTokenExpiresAt: expiresAt,
  }).where(eq(users.id, userId));

  return refreshed.access_token;
}

export async function uploadFileToDriveForUser(userId: number, input: {
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}): Promise<DriveUploadResult> {
  const { folderId } = getDriveConfig();
  const accessToken = await getGoogleAccessTokenForUser(userId);

  const boundary = `----studyam-${createHash("sha1").update(`${input.fileName}:${Date.now()}`).digest("hex")}`;
  const metadata = JSON.stringify({
    name: input.fileName,
    parents: [folderId],
  });

  const multipartBody = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${input.mimeType}\r\n\r\n`),
    input.buffer,
    Buffer.from(`\r\n--${boundary}--`),
  ]);

  const response = await fetch(GOOGLE_DRIVE_UPLOAD_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Failed to upload file to Google Drive: ${details}`);
  }

  return (await response.json()) as DriveUploadResult;
}

// `exchangeGoogleOAuthCode` is already exported where it's declared.
// The explicit re-export below caused a duplicate export error and was removed.