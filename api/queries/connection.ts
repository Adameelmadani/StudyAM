import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { env } from "../lib/env";
import * as schema from "@db/schema";
import * as relations from "@db/relations";

const fullSchema = { ...schema, ...relations };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let instance: any;

export function getDb() {
  if (!instance) {
    const pool = mysql.createPool(env.databaseUrl);
    instance = drizzle(pool, {
      mode: "planetscale",
      schema: fullSchema,
    });
  }
  return instance as ReturnType<typeof drizzle<typeof fullSchema>>;
}
