import { authRouter } from "./auth-router";
import { localAuthRouter } from "./routers/localAuth";
import { yearRouter } from "./routers/year";
import { sectorRouter } from "./routers/sector";
import { moduleRouter } from "./routers/module";
import { elementRouter } from "./routers/element";
import { documentRouter } from "./routers/document";
import { userRouter } from "./routers/user";
import { activityRouter } from "./routers/activity";
import { createRouter, publicQuery } from "./middleware";

export const appRouter = createRouter({
  ping: publicQuery.query(() => ({ ok: true, ts: Date.now() })),
  auth: authRouter,
  localAuth: localAuthRouter,
  year: yearRouter,
  sector: sectorRouter,
  module: moduleRouter,
  element: elementRouter,
  document: documentRouter,
  user: userRouter,
  activity: activityRouter,
});

export type AppRouter = typeof appRouter;
