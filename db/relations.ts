import { relations } from "drizzle-orm";
import {
  users,
  years,
  sectors,
  yearSectors,
  modules,
  elements,
  documents,
  activityLog,
} from "./schema";

export const usersRelations = relations(users, ({ one }) => ({
  year: one(years, { fields: [users.yearId], references: [years.id] }),
  sector: one(sectors, { fields: [users.sectorId], references: [sectors.id] }),
}));

export const yearsRelations = relations(years, ({ many }) => ({
  yearSectors: many(yearSectors),
  modules: many(modules),
}));

export const sectorsRelations = relations(sectors, ({ many }) => ({
  yearSectors: many(yearSectors),
}));

export const yearSectorsRelations = relations(yearSectors, ({ one }) => ({
  year: one(years, { fields: [yearSectors.yearId], references: [years.id] }),
  sector: one(sectors, { fields: [yearSectors.sectorId], references: [sectors.id] }),
}));

export const modulesRelations = relations(modules, ({ one, many }) => ({
  year: one(years, { fields: [modules.yearId], references: [years.id] }),
  sector: one(sectors, { fields: [modules.sectorId], references: [sectors.id] }),
  elements: many(elements),
}));

export const elementsRelations = relations(elements, ({ one, many }) => ({
  module: one(modules, { fields: [elements.moduleId], references: [modules.id] }),
  documents: many(documents),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  element: one(elements, { fields: [documents.elementId], references: [elements.id] }),
  uploader: one(users, { fields: [documents.uploadedBy], references: [users.id] }),
}));

export const activityLogRelations = relations(activityLog, ({ one }) => ({
  performer: one(users, { fields: [activityLog.performedBy], references: [users.id] }),
}));
