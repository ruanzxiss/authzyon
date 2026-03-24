import "dotenv/config";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  console.log("Starting migration process...");
  
  // Use a fresh read of process.env at runtime
  const env = process.env;
  const dbUrl = env.DATABASE_URL || env.MYSQL_URL || env.MYSQL_PRIVATE_URL;
  
  if (!dbUrl || dbUrl.trim() === "") {
    const keys = Object.keys(env).filter(k => !k.includes("SECRET") && !k.includes("KEY") && !k.includes("PASSWORD"));
    console.error("Available env keys at runtime:", keys);
    console.error("Value of DATABASE_URL key exists?", !!env.DATABASE_URL);
    throw new Error("DATABASE_URL is missing or empty at runtime.");
  }

  console.log("Database URL found. Connecting...");
  
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
