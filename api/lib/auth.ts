import jwt from "jsonwebtoken";
import { eq } from "drizzle-orm";
import type { User } from "@db/schema";
import { users } from "@db/schema";
import { getDb } from "../queries/connection";

const JWT_SECRET = process.env.APP_SECRET || "studyam-secret-key";

export async function getAuthenticatedUserFromRequest(req: Request): Promise<User | null> {
  try {
    const authHeader = req.headers.get("x-local-auth-token");
    if (!authHeader) return null;

    const decoded = jwt.verify(authHeader, JWT_SECRET) as { userId: number };
    const db = getDb();
    return await db.query.users.findFirst({
      where: eq(users.id, decoded.userId),
    });
  } catch {
    return null;
  }
}