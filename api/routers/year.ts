import { z } from "zod";
import { createRouter, publicQuery } from "../middleware";
import { getDb } from "../queries/connection";
import { years, yearSectors, sectors } from "@db/schema";
import { eq } from "drizzle-orm";
import type { YearSector, Sector } from "@db/schema";

export const yearRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(years).orderBy(years.sortOrder);
  }),

  getById: publicQuery
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      const db = getDb();
      const year = await db.query.years.findFirst({
        where: eq(years.id, input.id),
      });
      if (!year) return null;

      if (year.hasSectors) {
        const junctions: YearSector[] = await db
          .select()
          .from(yearSectors)
          .where(eq(yearSectors.yearId, input.id));
        const sectorIds = junctions.map((j: YearSector) => j.sectorId);
        const sectorList: Sector[] = await db.select().from(sectors);
        return {
          ...year,
          sectors: sectorList.filter((s: Sector) => sectorIds.includes(s.id)),
        };
      }

      return year;
    }),
});
