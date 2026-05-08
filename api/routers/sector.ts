import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { sectors, yearSectors } from "@db/schema";
import { eq } from "drizzle-orm";
import type { YearSector, Sector } from "@db/schema";

export const sectorRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(sectors);
  }),

  byYear: publicQuery
    .input(z.object({ yearId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getDb();
      const junctions: YearSector[] = await db
        .select()
        .from(yearSectors)
        .where(eq(yearSectors.yearId, input.yearId));

      if (junctions.length === 0) return [];

      const sectorIds = junctions.map((j: YearSector) => j.sectorId);
      const allSectors: Sector[] = await db.select().from(sectors);
      return allSectors.filter((s: Sector) => sectorIds.includes(s.id));
    }),
});
