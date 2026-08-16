import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'resmanager',
  });

  try {
    console.log("Altering bookings...");
    await pool.query("ALTER TABLE bookings ADD COLUMN deposit_amount DECIMAL(12,2) DEFAULT 0");
    console.log("Success bookings");
  } catch (e: any) {
    console.log("Bookings err:", e.message);
  }

  try {
    console.log("Altering orders...");
    await pool.query("ALTER TABLE orders ADD COLUMN deposit_amount DECIMAL(12,2) DEFAULT 0");
    console.log("Success orders");
  } catch (e: any) {
    console.log("Orders err:", e.message);
  }

  process.exit(0);
}
run();
