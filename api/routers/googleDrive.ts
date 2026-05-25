import { createRouter, authedQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { users } from "@db/schema";
import { disconnectGoogleDriveAccount } from "../lib/googleDrive";
import { buildGoogleDriveConnectUrl } from "../lib/googleAuth";
import { eq } from "drizzle-orm";

export const googleDriveRouter = createRouter({
  status: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const user = await db.query.users.findFirst({
      where: eq(users.id, ctx.user.id),
    });

    return {
      connected: !!user?.googleRefreshToken,
      email: user?.googleEmail ?? null,
      connectedAt: user?.googleConnectedAt ?? null,
    };
  }),

  connectUrl: authedQuery.mutation(({ ctx }) => {
    return {
      url: buildGoogleDriveConnectUrl(ctx.user.id),
    };
  }),

  disconnect: authedQuery.mutation(async ({ ctx }) => {
    await disconnectGoogleDriveAccount(ctx.user.id);
    return { success: true };
  }),
});