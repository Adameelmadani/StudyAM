import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { getAuthenticatedUserFromRequest } from "./lib/auth";
import { getDb } from "./queries/connection";
import { activityLog, documents, elements, modules } from "@db/schema";
import { eq } from "drizzle-orm";
import { detectFileTypeFromName, validateFileType, type FileType } from "./lib/fileTypeDetection";
import { uploadFileToDriveForUser } from "./lib/googleDrive";
import { buildGoogleLoginUrl, handleGoogleAuthCallback, handleGoogleDriveConnectCallback, verifyGoogleOAuthState } from "./lib/googleAuth";

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.get("/api/google/auth/start", (c) => {
  return c.redirect(buildGoogleLoginUrl());
});

app.get("/api/google/oauth/callback", async (c) => {
  const code = c.req.query("code");
  const state = c.req.query("state");
  const error = c.req.query("error");

  if (error) {
    return c.redirect(new URL(`/admin?googleDrive=error&reason=${encodeURIComponent(error)}`, c.req.url).toString());
  }

  if (!code || !state) {
    return c.redirect(new URL("/admin?googleDrive=error", c.req.url).toString());
  }

  try {
    const oauthState = verifyGoogleOAuthState(state);

    if (oauthState.purpose === "auth") {
      const result = await handleGoogleAuthCallback(code);
      return c.redirect(new URL(`/login?googleAuthToken=${encodeURIComponent(result.token)}&destination=${encodeURIComponent(result.destination)}`, c.req.url).toString());
    }

    if (!oauthState.userId) {
      return c.redirect(new URL("/admin?googleDrive=error", c.req.url).toString());
    }

    await handleGoogleDriveConnectCallback(oauthState.userId, code);
    return c.redirect(new URL("/admin?googleDrive=connected", c.req.url).toString());
  } catch (callbackError) {
    const message = callbackError instanceof Error ? callbackError.message : "OAuth connection failed";
    return c.redirect(new URL(`/admin?googleDrive=error&reason=${encodeURIComponent(message)}`, c.req.url).toString());
  }
});

app.post("/api/documents/upload", async (c) => {
  const user = await getAuthenticatedUserFromRequest(c.req.raw);
  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const isRepresentative = user.role === "representative";
  const isPromoRepresentative = user.role === "promo_representative";
  const isAdmin = user.role === "admin";
  const isApprovedRep = (isRepresentative || isPromoRepresentative) && user.isApproved;

  if (!isAdmin && !isApprovedRep) {
    return c.json({ error: "Only approved representatives or admins can upload documents" }, 403);
  }

  const formData = await c.req.formData();
  const fileEntry = formData.get("file");
  if (!(fileEntry instanceof File)) {
    return c.json({ error: "A file is required" }, 400);
  }

  const title = String(formData.get("title") || fileEntry.name).trim();
  const type = String(formData.get("type") || "");
  const elementIdValue = Number(formData.get("elementId"));
  const fileTypeValue = String(formData.get("fileType") || "");
  if (!title) {
    return c.json({ error: "Document title is required" }, 400);
  }

  const validTypes = ["cours", "exam", "test", "tp", "resume"] as const;
  if (!validTypes.includes(type as (typeof validTypes)[number])) {
    return c.json({ error: "Invalid document type" }, 400);
  }

  const validFileTypes = ["spreadsheets", "presentation", "file", "video"] as const;
  if (fileTypeValue && !validFileTypes.includes(fileTypeValue as (typeof validFileTypes)[number])) {
    return c.json({ error: "Invalid file type" }, 400);
  }

  if (!Number.isInteger(elementIdValue) || elementIdValue <= 0) {
    return c.json({ error: "Invalid element" }, 400);
  }

  const db = getDb();
  const element = await db.query.elements.findFirst({
    where: eq(elements.id, elementIdValue),
  });

  if (!element) {
    return c.json({ error: "Element not found" }, 404);
  }

  const mod = await db.query.modules.findFirst({
    where: eq(modules.id, element.moduleId),
  });

  if (!mod) {
    return c.json({ error: "Module not found" }, 404);
  }

  if (user.role !== "admin") {
    if (mod.yearId !== user.yearId) {
      return c.json({ error: "You can only upload for your assigned year" }, 403);
    }
    if (isRepresentative && mod.sectorId && mod.sectorId !== user.sectorId) {
      return c.json({ error: "You can only upload for your assigned sector" }, 403);
    }
  }

  const detectedFileType = detectFileTypeFromName(fileEntry.name, fileEntry.type);
  const selectedFileType = (fileTypeValue || detectedFileType || "file") as FileType;
  if (!validateFileType(detectedFileType, selectedFileType)) {
    return c.json({
      error: `File type mismatch. Detected: ${detectedFileType || "unknown"}, Selected: ${selectedFileType}`,
    }, 400);
  }

  const uploadedBuffer = Buffer.from(await fileEntry.arrayBuffer());
  const driveFile = await uploadFileToDriveForUser(user.id, {
    fileName: fileEntry.name,
    mimeType: fileEntry.type || "application/octet-stream",
    buffer: uploadedBuffer,
  });

  const url = driveFile.webViewLink || `https://drive.google.com/file/d/${driveFile.id}/view`;
  const result = await db.insert(documents).values({
    title,
    type: type as "cours" | "exam" | "test" | "tp" | "resume",
    fileType: selectedFileType,
    url,
    elementId: elementIdValue,
    uploadedBy: user.id,
  });

  const docId = Number(result[0].insertId);

  await db.insert(activityLog).values({
    action: "upload",
    entityType: "document",
    entityId: docId,
    yearId: mod.yearId,
    sectorId: mod.sectorId,
    description: `Uploaded document: ${title}`,
    performedBy: user.id,
  });

  const createdDocument = await db.query.documents.findFirst({
    where: eq(documents.id, docId),
  });

  return c.json({
    success: true,
    document: createdDocument,
  });
});
app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}
