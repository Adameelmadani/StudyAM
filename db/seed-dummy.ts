import { getDb } from "../api/queries/connection";
import { years, sectors, users, modules, elements, documents, activityLog } from "./schema";
import { eq } from "drizzle-orm";
import type { Year, Sector } from "./schema";

const DEFAULT_PASSWORD_HASH = "$2b$10$p3KVF2FyjJz44sL0/v7DMe9E9o4Fd55vHnlSE3pjo7wgx/hYUpQTy";

async function seedDummyData() {
  const db = getDb();
  console.log("Seeding dummy data...");

  const allYears = await db.select().from(years);
  const allSectors = await db.select().from(sectors);

  if (allYears.length === 0) {
    console.error("No years found. Please run db/seed.ts first.");
    process.exit(1);
  }

  // 1. Create a Promo Rep for 3A
  const year3A = allYears.find((y: Year) => y.name === "3A");
  const year1A = allYears.find((y: Year) => y.name === "1A");
  const sectorInfo = allSectors.find((s: Sector) => s.name === "Informatique et Automatique");
  const sectorMeca = allSectors.find((s: Sector) => s.name === "Mécanique et Structures");

  if (!year3A || !year1A || !sectorInfo || !sectorMeca) {
    console.error("Required years/sectors not found.");
    process.exit(1);
  }

  console.log("Creating dummy users...");
  // Check if promo rep exists
  let promoRep = await db.select().from(users).where(eq(users.ensamCode, "PROMO3A"));
  let promoRepId: number;
  if (promoRep.length === 0) {
    const res = await db.insert(users).values({
      ensamCode: "PROMO3A",
      name: "Promo Rep 3A",
      email: "promo3a@ensam.ac.ma",
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: "promo_representative",
      yearId: year3A.id,
      isApproved: true,
    });
    promoRepId = Number(res[0].insertId);
  } else {
    promoRepId = promoRep[0].id;
  }

  // Check if rep exists
  let repInfo = await db.select().from(users).where(eq(users.ensamCode, "REP3AINFO"));
  let repInfoId: number;
  if (repInfo.length === 0) {
    const res = await db.insert(users).values({
      ensamCode: "REP3AINFO",
      name: "Rep 3A Info",
      email: "rep3ainfo@ensam.ac.ma",
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: "representative",
      yearId: year3A.id,
      sectorId: sectorInfo.id,
      isApproved: true,
    });
    repInfoId = Number(res[0].insertId);
  } else {
    repInfoId = repInfo[0].id;
  }

  let student1A = await db.select().from(users).where(eq(users.ensamCode, "STUD1A"));
  let student1AId: number;
  if (student1A.length === 0) {
    const res = await db.insert(users).values({
      ensamCode: "STUD1A",
      name: "Student 1A",
      email: "stud1a@ensam.ac.ma",
      passwordHash: DEFAULT_PASSWORD_HASH,
      role: "student",
      yearId: year1A.id,
      isApproved: true,
    });
    student1AId = Number(res[0].insertId);
  } else {
    student1AId = student1A[0].id;
  }

  console.log("Creating dummy modules...");
  // 3A Info Modules
  let modAlgo = await db.select().from(modules).where(eq(modules.name, "Algorithmique Avancée"));
  let modAlgoId: number;
  if (modAlgo.length === 0) {
    const res = await db.insert(modules).values({
      name: "Algorithmique Avancée",
      description: "Structures de données et algorithmes",
      yearId: year3A.id,
      sectorId: sectorInfo.id,
      semester: 1,
      icon: "code",
      color: "#2563eb",
    });
    modAlgoId = Number(res[0].insertId);
  } else {
    modAlgoId = modAlgo[0].id;
  }

  let modReseau = await db.select().from(modules).where(eq(modules.name, "Réseaux Informatiques"));
  let modReseauId: number;
  if (modReseau.length === 0) {
    const res = await db.insert(modules).values({
      name: "Réseaux Informatiques",
      description: "Modèle OSI, TCP/IP",
      yearId: year3A.id,
      sectorId: sectorInfo.id,
      semester: 1,
      icon: "server",
      color: "#16a34a",
    });
    modReseauId = Number(res[0].insertId);
  } else {
    modReseauId = modReseau[0].id;
  }

  // 1A Modules
  let modMath = await db.select().from(modules).where(eq(modules.name, "Analyse Mathématique"));
  let modMathId: number;
  if (modMath.length === 0) {
    const res = await db.insert(modules).values({
      name: "Analyse Mathématique",
      description: "Analyse 1 et 2",
      yearId: year1A.id,
      semester: 1,
      icon: "calculator",
      color: "#dc2626",
    });
    modMathId = Number(res[0].insertId);
  } else {
    modMathId = modMath[0].id;
  }

  console.log("Creating dummy elements...");
  // Elements for Algorithmique Avancée
  let elemGraphes = await db.select().from(elements).where(eq(elements.name, "Théorie des Graphes"));
  let elemGraphesId: number;
  if (elemGraphes.length === 0) {
    const res = await db.insert(elements).values({
      name: "Théorie des Graphes",
      moduleId: modAlgoId,
      description: "Arbres, plus court chemin",
      color: "#2563eb",
    });
    elemGraphesId = Number(res[0].insertId);
  } else {
    elemGraphesId = elemGraphes[0].id;
  }

  let elemComplexite = await db.select().from(elements).where(eq(elements.name, "Complexité Algorithmique"));
  let elemComplexiteId: number;
  if (elemComplexite.length === 0) {
    const res = await db.insert(elements).values({
      name: "Complexité Algorithmique",
      moduleId: modAlgoId,
      description: "O(n), NP-Complet",
      color: "#3b82f6",
    });
    elemComplexiteId = Number(res[0].insertId);
  } else {
    elemComplexiteId = elemComplexite[0].id;
  }

  console.log("Creating dummy documents...");
  // Documents for Théorie des Graphes
  let existingDocs = await db.select().from(documents).where(eq(documents.elementId, elemGraphesId));
  if (existingDocs.length === 0) {
    await db.insert(documents).values([
      {
        title: "Cours Graphes - Chapitre 1",
        type: "cours",
        url: "https://docs.google.com/document/d/1BxiMVs0XCUZa5fA9hEOWTf4DqR_g0-XlA4i1sJ4sKzM/edit",
        fileType: "file",
        elementId: elemGraphesId,
        uploadedBy: repInfoId,
      },
      {
        title: "TD 1 - Graphes",
        type: "tp",
        url: "https://docs.google.com/document/d/1BxiMVs0XCUZa5fA9hEOWTf4DqR_g0-XlA4i1sJ4sKzM/edit",
        fileType: "file",
        elementId: elemGraphesId,
        uploadedBy: repInfoId,
      },
      {
        title: "Explication Dijkstra",
        type: "resume",
        url: "https://www.youtube.com/watch?v=_lHSawdgXpI",
        fileType: "video",
        elementId: elemGraphesId,
        uploadedBy: promoRepId,
      }
    ]);
  }

  console.log("Creating dummy activity logs...");
  await db.insert(activityLog).values([
    {
      action: "add_module",
      entityType: "module",
      entityId: modAlgoId,
      yearId: year3A.id,
      sectorId: sectorInfo.id,
      description: "Created module: Algorithmique Avancée",
      performedBy: promoRepId,
    },
    {
      action: "add_element",
      entityType: "element",
      entityId: elemGraphesId,
      yearId: year3A.id,
      sectorId: sectorInfo.id,
      description: "Created element: Théorie des Graphes",
      performedBy: repInfoId,
    },
    {
      action: "upload",
      entityType: "document",
      entityId: 1, // Dummy ID
      yearId: year3A.id,
      sectorId: sectorInfo.id,
      description: "Uploaded document: Cours Graphes - Chapitre 1",
      performedBy: repInfoId,
    }
  ]);

  console.log("Dummy data seeding complete!");
}

seedDummyData().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
