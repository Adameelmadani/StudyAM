import { getDb } from "../api/queries/connection";
import { years, sectors, yearSectors, users } from "./schema";
import { eq } from "drizzle-orm";
import type { Year, Sector } from "./schema";

async function seed() {
  const db = getDb();
  console.log("Seeding database...");

  // ─── Seed Years ──────────────────────────────────────────────
  const existingYears = await db.select().from(years);
  if (existingYears.length === 0) {
    await db.insert(years).values([
      { name: "1A", hasSectors: false, sortOrder: 1 },
      { name: "2A", hasSectors: false, sortOrder: 2 },
      { name: "3A", hasSectors: true, sortOrder: 3 },
      { name: "4A", hasSectors: true, sortOrder: 4 },
      { name: "5A", hasSectors: true, sortOrder: 5 },
    ]);
    console.log("Years seeded");
  } else {
    console.log("Years already exist");
  }

  // ─── Seed Sectors ────────────────────────────────────────────
  const existingSectors = await db.select().from(sectors);
  if (existingSectors.length === 0) {
    await db.insert(sectors).values([
      { name: "Mécanique et Structures", description: "Mechanical engineering and structural analysis" },
      { name: "Électrotechnique et Électronique de Puissance", description: "Electrical engineering and power electronics" },
      { name: "Informatique et Automatique", description: "Computer science and automation" },
      { name: "Génie des Procédés et Energétique", description: "Process engineering and energy" },
      { name: "Génie Civil et Construction", description: "Civil engineering and construction" },
      { name: "Industriel et Management", description: "Industrial engineering and management" },
    ]);
    console.log("Sectors seeded");
  } else {
    console.log("Sectors already exist");
  }

  // ─── Seed Year Sectors (3A, 4A, 5A × 6 sectors) ─────────────
  const existingJunctions = await db.select().from(yearSectors);
  if (existingJunctions.length === 0) {
    const yearRows = await db.select().from(years);
    const sectorRows = await db.select().from(sectors);

    const sectorYears = yearRows.filter((y: Year) => y.hasSectors);
    const junctionData: { yearId: number; sectorId: number }[] = [];

    for (const year of sectorYears as Year[]) {
      for (const sector of sectorRows as Sector[]) {
        junctionData.push({ yearId: year.id, sectorId: sector.id });
      }
    }

    await db.insert(yearSectors).values(junctionData);
    console.log(`YearSectors seeded (${junctionData.length} junctions)`);
  } else {
    console.log("YearSectors already exist");
  }

  // ─── Seed Admin User ─────────────────────────────────────────
  const existingAdmin = await db.select().from(users).where(eq(users.ensamCode, "ADMIN001"));
  if (existingAdmin.length === 0) {
    await db.insert(users).values({
      ensamCode: "ADMIN001",
      name: "System Administrator",
      email: "admin@ensam.ac.ma",
      passwordHash: "$2b$10$p3KVF2FyjJz44sL0/v7DMe9E9o4Fd55vHnlSE3pjo7wgx/hYUpQTy",
      role: "admin",
      isApproved: true,
    });
    console.log("Admin user created");
  } else {
    await db.update(users)
      .set({ passwordHash: "$2b$10$p3KVF2FyjJz44sL0/v7DMe9E9o4Fd55vHnlSE3pjo7wgx/hYUpQTy" })
      .where(eq(users.ensamCode, "ADMIN001"));
    console.log("Admin password updated");
  }

  console.log("Seeding complete!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
