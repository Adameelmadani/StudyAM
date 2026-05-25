import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value ?? "";
}

export const env = {
  appId: required("APP_ID"),
  appSecret: required("APP_SECRET"),
  isProduction: process.env.NODE_ENV === "production",
  databaseUrl: required("DATABASE_URL"),
  googleOauthClientId: process.env.GOOGLE_OAUTH_CLIENT_ID ?? "",
  googleOauthClientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET ?? "",
  googleOauthRedirectUri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
  googleDriveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID ?? "",
  ownerUnionId: process.env.OWNER_UNION_ID ?? "",
  adminCode: process.env.ADMIN_CODE ?? "",
  adminName: process.env.ADMIN_NAME ?? "",
  adminEmail: process.env.ADMIN_EMAIL ?? "",
  adminPassword: process.env.ADMIN_PASSWORD ?? "",
};
