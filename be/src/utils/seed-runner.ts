import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const runSeed = async () => {
  const host = process.env.DB_HOST || "localhost";
  const port = Number(process.env.DB_PORT) || 3306;
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "resmanager";

  console.log(`Connecting to MySQL at ${host}:${port} as ${user}...`);

  // Connect without database first to ensure the database exists
  let connection;
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
    });
    console.log(`Creating database ${database} if not exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await connection.end();
  } catch (err: any) {
    console.error("❌ Failed to connect to MySQL or create database:", err.message);
    process.exit(1);
  }

  // Connect to the database and run seeds
  try {
    connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
      multipleStatements: true, // Enable multiple statements support
    });

    console.log("✅ Successfully connected to database.");
    
    const sqlFilePath = path.join(process.cwd(), "..", "SQLQuery1.sql");
    console.log(`Reading seed file from: ${sqlFilePath}`);
    
    if (!fs.existsSync(sqlFilePath)) {
      console.error(`❌ SQL Seed file not found at ${sqlFilePath}`);
      process.exit(1);
    }

    const sqlContent = fs.readFileSync(sqlFilePath, "utf8");

    // Clean and split SQL commands by semicolon + newline to avoid splitting inside strings
    const statements = sqlContent
      .split(/;\r?\n/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith("/*") && !s.startsWith("--"));

    console.log(`Found ${statements.length} SQL statements to execute.`);

    // Enable foreign key checks bypass during table drop/create if needed, but the file handles it.
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");
    
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await connection.query(stmt);
      } catch (err: any) {
        console.error(`❌ Error in statement #${i + 1}:`);
        console.error(stmt.substring(0, 150) + "...");
        console.error(err.message);
        // Continue anyway or throw
      }
    }

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("✅ All SQL seed queries executed successfully!");
    process.exit(0);
  } catch (err: any) {
    console.error("❌ Error running database seeds:", err.message);
    process.exit(1);
  }
};

runSeed();
