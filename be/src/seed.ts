/**
 * ============================================================================
 *  SEED DATABASE SCRIPT
 *  Đọc file SQLQuery1.sql và thực thi toàn bộ vào MySQL
 * 
 *  Cách dùng: npm run seed
 *  - Drop toàn bộ DB cũ → tạo lại bảng → chèn data mới
 *  - Mỗi khi sửa SQLQuery1.sql, chạy lại lệnh này là DB tự cập nhật
 * ============================================================================
 */

import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// ─── Cấu hình kết nối từ .env ───────────────────────────────────────────────
const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  multipleStatements: true, // cho phép chạy nhiều câu SQL cùng lúc
};

const DB_NAME = process.env.DB_NAME || "resmanager";

// ─── Đường dẫn tới file SQL seed ────────────────────────────────────────────
const SQL_FILE_PATH = path.resolve(__dirname, "../../SQLQuery1.sql");

/**
 * Tách file SQL thành từng câu lệnh riêng biệt.
 * Xử lý: bỏ comment (--), bỏ dòng trống, tách theo dấu ;
 */
const parseSqlStatements = (sqlContent: string): string[] => {
  // Loại bỏ dòng comment (-- ...)
  const lines = sqlContent
    .split("\n")
    .map((line) => {
      // Giữ lại nội dung trước comment (nếu comment không nằm trong string)
      const commentIndex = line.indexOf("--");
      if (commentIndex === -1) return line;
      // Kiểm tra đơn giản: nếu -- nằm ngoài quotes thì cắt
      const beforeComment = line.substring(0, commentIndex);
      const singleQuotes = (beforeComment.match(/'/g) || []).length;
      if (singleQuotes % 2 === 0) {
        return beforeComment;
      }
      return line; // -- nằm trong string, giữ nguyên
    })
    .join("\n");

  // Tách theo dấu ; và lọc câu lệnh rỗng
  const statements = lines
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    // Bỏ qua lệnh CREATE DATABASE và USE (seed sẽ tự xử lý)
    .filter((s) => {
      const upper = s.toUpperCase();
      return !upper.startsWith("CREATE DATABASE") && !upper.startsWith("USE ");
    });

  return statements;
};

/**
 * Lấy danh sách tất cả bảng trong database
 */
const getAllTables = async (connection: mysql.Connection): Promise<string[]> => {
  const [rows] = await connection.query(
    `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'`,
    [DB_NAME]
  );
  return (rows as any[]).map((row) => row.TABLE_NAME);
};

/**
 * Drop toàn bộ bảng trong database (xử lý FK dependencies)
 */
const dropAllTables = async (connection: mysql.Connection): Promise<void> => {
  await connection.query("SET FOREIGN_KEY_CHECKS = 0");
  
  const tables = await getAllTables(connection);
  
  for (const table of tables) {
    await connection.query(`DROP TABLE IF EXISTS \`${table}\``);
    console.log(`   🗑️  Dropped table: ${table}`);
  }
  
  await connection.query("SET FOREIGN_KEY_CHECKS = 1");
};

/**
 * Hàm chính: Seed database
 */
const seed = async (): Promise<void> => {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║           🌱 SEED DATABASE - ResManager                ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
  console.log();

  // 1. Kiểm tra file SQL có tồn tại không
  if (!fs.existsSync(SQL_FILE_PATH)) {
    console.error(`❌ Không tìm thấy file SQL: ${SQL_FILE_PATH}`);
    console.error(`   Hãy đảm bảo file SQLQuery1.sql nằm ở thư mục gốc dự án.`);
    process.exit(1);
  }

  console.log(`📄 File SQL: ${SQL_FILE_PATH}`);
  console.log(`🗄️  Database: ${DB_NAME} @ ${DB_CONFIG.host}:${DB_CONFIG.port}`);
  console.log();

  // 2. Kết nối MySQL (không chọn database cụ thể)
  let connection: mysql.Connection;
  try {
    connection = await mysql.createConnection(DB_CONFIG);
    console.log("✅ Kết nối MySQL thành công");
  } catch (err: any) {
    console.error("❌ Không thể kết nối MySQL:", err.message);
    console.error("   Kiểm tra lại DB_HOST, DB_PORT, DB_USER, DB_PASSWORD trong file .env");
    process.exit(1);
  }

  try {
    // 3. Tạo database nếu chưa có
    console.log(`\n📦 Tạo database "${DB_NAME}" nếu chưa tồn tại...`);
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` 
       CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    await connection.query(`USE \`${DB_NAME}\``);

    // 4. Drop toàn bộ bảng cũ
    console.log("\n🗑️  Xóa toàn bộ bảng cũ...");
    await dropAllTables(connection);

    // 5. Đọc và parse file SQL
    console.log("\n📖 Đọc file SQL...");
    const sqlContent = fs.readFileSync(SQL_FILE_PATH, "utf8");
    const statements = parseSqlStatements(sqlContent);
    console.log(`   Tìm thấy ${statements.length} câu lệnh SQL`);

    // 6. Thực thi từng câu lệnh
    console.log("\n⚡ Đang thực thi...\n");
    let successCount = 0;
    let errorCount = 0;

    // Tắt FK check trước khi chạy
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.substring(0, 80).replace(/\s+/g, " ");

      try {
        await connection.query(stmt);
        successCount++;

        // Hiển thị loại câu lệnh
        const upper = stmt.toUpperCase().trimStart();
        if (upper.startsWith("CREATE TABLE")) {
          const tableName = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i)?.[1];
          console.log(`   ✅ [${i + 1}/${statements.length}] CREATE TABLE ${tableName}`);
        } else if (upper.startsWith("INSERT INTO")) {
          const tableName = stmt.match(/INSERT\s+INTO\s+(\w+)/i)?.[1];
          console.log(`   📝 [${i + 1}/${statements.length}] INSERT INTO ${tableName}`);
        } else if (upper.startsWith("ALTER TABLE")) {
          const tableName = stmt.match(/ALTER\s+TABLE\s+(\w+)/i)?.[1];
          console.log(`   🔧 [${i + 1}/${statements.length}] ALTER TABLE ${tableName}`);
        } else if (upper.startsWith("UPDATE")) {
          const tableName = stmt.match(/UPDATE\s+(\w+)/i)?.[1];
          console.log(`   🔄 [${i + 1}/${statements.length}] UPDATE ${tableName}`);
        } else if (upper.startsWith("SET")) {
          console.log(`   ⚙️  [${i + 1}/${statements.length}] SET ...`);
        } else {
          console.log(`   ▶️  [${i + 1}/${statements.length}] ${preview}...`);
        }
      } catch (err: any) {
        errorCount++;
        console.error(`   ❌ [${i + 1}/${statements.length}] LỖI: ${err.message}`);
        console.error(`      SQL: ${preview}...`);
      }
    }

    // Bật lại FK check
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    // 7. Hiển thị kết quả
    console.log("\n╔══════════════════════════════════════════════════════════╗");
    console.log("║                    📊 KẾT QUẢ SEED                     ║");
    console.log("╠══════════════════════════════════════════════════════════╣");
    console.log(`║  ✅ Thành công: ${String(successCount).padStart(4)} câu lệnh                        ║`);
    console.log(`║  ❌ Thất bại:   ${String(errorCount).padStart(4)} câu lệnh                        ║`);
    console.log("╚══════════════════════════════════════════════════════════╝");

    // 8. Hiển thị danh sách bảng đã tạo
    const finalTables = await getAllTables(connection);
    console.log(`\n📋 Danh sách ${finalTables.length} bảng trong database:`);
    finalTables.forEach((t, i) => {
      console.log(`   ${i + 1}. ${t}`);
    });

    if (errorCount === 0) {
      console.log("\n🎉 Seed database thành công! Database đã sẵn sàng sử dụng.");
    } else {
      console.log(`\n⚠️  Seed hoàn tất với ${errorCount} lỗi. Kiểm tra lại file SQL.`);
    }
  } catch (err: any) {
    console.error("\n💥 Lỗi nghiêm trọng:", err.message);
    process.exit(1);
  } finally {
    await connection.end();
    console.log("\n🔌 Đã đóng kết nối MySQL.");
  }
};

// ─── Chạy seed ──────────────────────────────────────────────────────────────
seed().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
