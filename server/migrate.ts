import "dotenv/config";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  // Debug log for environment variables (safely)
  const dbUrl = process.env.DATABASE_URL || process.env.MYSQL_URL || process.env.MYSQL_PRIVATE_URL;
  
  if (!dbUrl) {
    console.error("Available env keys:", Object.keys(process.env).filter(k => !k.includes("SECRET") && !k.includes("KEY") && !k.includes("PASSWORD")));
    throw new Error("DATABASE_URL is not set (checked DATABASE_URL, MYSQL_URL, and MYSQL_PRIVATE_URL)");
  }

  console.log("Running migrations with database URL...");
  
  const connection = await mysql.createConnection(dbUrl);
  const db = drizzle(connection);
  
  const migrationsFolder = path.resolve(__dirname, "../drizzle");
  
  await migrate(db, { migrationsFolder });
  
  console.log("Migrations applied successfully!");
  
  await connection.end();
  process.exit(0);
}

runMigrations().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
