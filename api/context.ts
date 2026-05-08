import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import type { User } from "@db/schema";
import jwt from "jsonwebtoken";
import { getDb } from "./queries/connection";
import { users } from "@db/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.APP_SECRET || "studyam-secret-key";

export type TrpcContext = {
  req: Request;
  resHeaders: Headers;
  user?: User;
};

export async function createContext(
  opts: FetchCreateContextFnOptions,
): Promise<TrpcContext> {
  const ctx: TrpcContext = { req: opts.req, resHeaders: opts.resHeaders };
  try {
    const authHeader = opts.req.headers.get("x-local-auth-token");
    if (authHeader) {
      const decoded = jwt.verify(authHeader, JWT_SECRET) as {
        userId: number;
        role: string;
        ensamCode: string;
      };

      const db = getDb();
      const user = await db.query.users.findFirst({
        where: eq(users.id, decoded.userId),
      });
      if (user) {
        ctx.user = user;
      }
    }
  } catch {
    // Authentication is optional here
  }
  return ctx;
}
