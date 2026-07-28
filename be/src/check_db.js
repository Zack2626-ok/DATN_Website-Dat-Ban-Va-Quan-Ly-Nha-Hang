const mysql = require("mysql2/promise");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.join(__dirname, "../.env") });

async function main() {
  const host = process.env.DB_HOST || "localhost";
  const port = parseInt(process.env.DB_PORT || "3306", 10);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "resmanager";

  try {
    const connection = await mysql.createConnection({
      host,
      port,
      user,
      password,
      database,
    });

    console.log("Connected to MySQL!");

    const [payments] = await connection.query("SELECT * FROM payments");
    console.log("ALL PAYMENTS:");
    console.log(JSON.stringify(payments, null, 2));

    await connection.end();
  } catch (err) {
    console.error("Error connecting or querying:", err);
  }
}

main();
