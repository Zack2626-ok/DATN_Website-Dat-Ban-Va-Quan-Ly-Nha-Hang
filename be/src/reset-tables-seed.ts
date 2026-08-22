import mysql from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

async function resetTables() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "resmanager",
    port: Number(process.env.DB_PORT || 3306),
  });

  try {
    await connection.query("UPDATE table_merges SET status = 'resolved' WHERE status = 'active'");
    await connection.query("UPDATE table_group_seatings SET status = 'resolved' WHERE status = 'active'");
    await connection.query("UPDATE tables SET status = 'empty', merged_into_table_id = NULL, maintenance_note = NULL");
    await connection.query("UPDATE tables SET status = 'serving' WHERE id = 4 OR name = 'B04'");
    await connection.query("UPDATE orders SET status = 'completed', closed_at = NOW() WHERE status IN ('open', 'serving', 'pending_payment') AND (table_id IS NULL OR table_id != 4)");
    await connection.query("UPDATE bookings SET status = 'completed' WHERE status IN ('pending', 'confirmed', 'reserved', 'arrived')");

    console.log("✅ RESET SUCCESS: All tables set to EMPTY except B04 (Serving). Old bookings cleared.");
  } catch (error) {
    console.error("❌ Reset error:", error);
  } finally {
    await connection.end();
  }
}

resetTables();
