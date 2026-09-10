import fs from "fs";
import path from "path";
import { query, closePool } from "../config/database";

const migrate = async (): Promise<void> => {
  try {
    const migrationPath = path.join(__dirname, "../../migrations/001_initial.sql");
    const sql = fs.readFileSync(migrationPath, "utf8");

    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const statement of statements) {
      await query(statement + ";");
    }

    console.log("Migration completed successfully");
  } catch (error) {
    console.error("Migration failed:", error);
    throw error;
  } finally {
    await closePool();
  }
};

migrate();
