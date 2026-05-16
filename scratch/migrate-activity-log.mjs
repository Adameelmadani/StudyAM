import "dotenv/config";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL not set");
  process.exit(1);
}

async function run() {
  const connection = await mysql.createConnection(url);

  console.log("Connected to database. Applying activity log migration...");

  // 1. Add new columns if they don't exist
  try {
    await connection.execute(`
      ALTER TABLE activityLog
      ADD COLUMN yearId BIGINT UNSIGNED NULL,
      ADD COLUMN sectorId BIGINT UNSIGNED NULL
    `);
    console.log("✓ Added yearId and sectorId columns");
  } catch (e) {
    if (e.code === "ER_DUP_FIELDNAME") {
      console.log("✓ yearId/sectorId columns already exist");
    } else {
      console.error("Error adding columns:", e.message);
    }
  }

  // 2. Update the action enum to include new values
  try {
    await connection.execute(`
      ALTER TABLE activityLog
      MODIFY COLUMN action ENUM(
        'upload', 'edit', 'delete', 'grant_access', 'revoke_access',
        'delete_student', 'delete_document', 'add_module', 'add_element',
        'edit_module', 'edit_element', 'delete_module', 'delete_element', 'edit_document'
      ) NOT NULL
    `);
    console.log("✓ Updated action enum with new values");
  } catch (e) {
    console.error("Error updating action enum:", e.message);
  }

  await connection.end();
  console.log("Migration complete!");
}

run().catch(console.error);
