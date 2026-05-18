import { getDb } from "../api/queries/connection";
import { years, sectors, yearSectors } from "./schema";
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
      { name: "GE-DI", description: "Génie Electromécanique : Digitalisation Industrielle" },
      { name: "GE-MCI", description: "Génie Electromécanique : Maintenance et Commande Industrielles" },
      { name: "GIEO", description: "Génie Industriel : Excellence Opérationnelle" },
      { name: "GIP", description: "Génie Industriel et Productique" },
      { name: "GM-CISM", description: "Génie Mécanique : Conception et Industrialisation des Systèmes Mécaniques" },
      { name: "GM-IMS", description: "Génie Mécanique : Ingénierie Mécanique et Structures" },
      { name: "GM-MPF", description: "Génie Mécanique : Matériaux et Procédés de Fabrication" },
      { name: "GME", description: "Génie Mécanique : Energétique" },
      { name: "GI-ILSI", description: "Génie Informatique : Ingénierie Logicielle et Systèmes Intelligents" },
      { name: "IATD-SI", description: "Intelligence Artificielle et Technologies de Données : Systèmes Industriels" },
      { name: "GC", description: "Génie Civil" },
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

  console.log("Seeding complete!");
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
