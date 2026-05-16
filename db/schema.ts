import {
  mysqlTable,
  mysqlEnum,
  serial,
  bigint,
  varchar,
  text,
  timestamp,
  boolean,
  int,
} from "drizzle-orm/mysql-core";

// ─── Users ───────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  unionId: varchar("unionId", { length: 255 }).unique(),
  ensamCode: varchar("ensamCode", { length: 50 }).unique(),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 320 }).unique(),
  avatar: text("avatar"),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["student", "representative", "promo_representative", "admin"]).default("student").notNull(),
  yearId: bigint("yearId", { mode: "number", unsigned: true }),
  sectorId: bigint("sectorId", { mode: "number", unsigned: true }),
  isApproved: boolean("isApproved").default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull().$onUpdate(() => new Date()),
  lastSignInAt: timestamp("lastSignInAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Years ───────────────────────────────────────────────────────
export const years = mysqlTable("years", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 10 }).notNull(),
  hasSectors: boolean("hasSectors").notNull(),
  sortOrder: int("sortOrder").notNull(),
});

export type Year = typeof years.$inferSelect;
export type InsertYear = typeof years.$inferInsert;

// ─── Sectors ─────────────────────────────────────────────────────
export const sectors = mysqlTable("sectors", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
});

export type Sector = typeof sectors.$inferSelect;
export type InsertSector = typeof sectors.$inferInsert;

// ─── Year Sectors (junction) ─────────────────────────────────────
export const yearSectors = mysqlTable("yearSectors", {
  id: serial("id").primaryKey(),
  yearId: bigint("yearId", { mode: "number", unsigned: true }).notNull(),
  sectorId: bigint("sectorId", { mode: "number", unsigned: true }).notNull(),
});

export type YearSector = typeof yearSectors.$inferSelect;

// ─── Modules ─────────────────────────────────────────────────────
export const modules = mysqlTable("modules", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  yearId: bigint("yearId", { mode: "number", unsigned: true }).notNull(),
  // Keep sectorId for backward compatibility or as the primary sector
  sectorId: bigint("sectorId", { mode: "number", unsigned: true }),
  semester: int("semester").default(1).notNull(),
  icon: varchar("icon", { length: 50 }).default("book"),
  color: varchar("color", { length: 7 }).default("#b24760"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Module = typeof modules.$inferSelect;
export type InsertModule = typeof modules.$inferInsert;

// ─── Module Sectors (junction) ───────────────────────────────────
export const moduleSectors = mysqlTable("moduleSectors", {
  id: serial("id").primaryKey(),
  moduleId: bigint("moduleId", { mode: "number", unsigned: true }).notNull(),
  sectorId: bigint("sectorId", { mode: "number", unsigned: true }).notNull(),
});

export type ModuleSector = typeof moduleSectors.$inferSelect;

// ─── Elements ────────────────────────────────────────────────────
export const elements = mysqlTable("elements", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  moduleId: bigint("moduleId", { mode: "number", unsigned: true }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#b24760"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Element = typeof elements.$inferSelect;
export type InsertElement = typeof elements.$inferInsert;

// ─── Documents ───────────────────────────────────────────────────
export const documents = mysqlTable("documents", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 200 }).notNull(),
  type: mysqlEnum("type", ["cours", "exam", "test", "tp", "resume"]).notNull(),
  url: varchar("url", { length: 500 }).notNull(),
  fileType: mysqlEnum("fileType", ["spreadsheets", "presentation", "file", "video"]).notNull(),
  elementId: bigint("elementId", { mode: "number", unsigned: true }).notNull(),
  uploadedBy: bigint("uploadedBy", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ─── Activity Log ────────────────────────────────────────────────
export const activityLog = mysqlTable("activityLog", {
  id: serial("id").primaryKey(),
  action: mysqlEnum("action", [
    "upload",
    "edit",
    "delete",
    "grant_access",
    "revoke_access",
    "delete_student",
    "delete_document",
    "add_module",
    "add_element",
    "edit_module",
    "edit_element",
    "delete_module",
    "delete_element",
    "edit_document",
  ]).notNull(),
  entityType: mysqlEnum("entityType", ["document", "user", "module", "element"]).notNull(),
  entityId: bigint("entityId", { mode: "number", unsigned: true }),
  yearId: bigint("yearId", { mode: "number", unsigned: true }),
  sectorId: bigint("sectorId", { mode: "number", unsigned: true }),
  description: text("description").notNull(),
  performedBy: bigint("performedBy", { mode: "number", unsigned: true }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ActivityLog = typeof activityLog.$inferSelect;
