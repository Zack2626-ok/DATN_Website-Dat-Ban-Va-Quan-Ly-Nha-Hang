import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Table, MenuItem, Inventory, Payment, User } from "./types";
import {
  BOOKING_STATUS,
  BOOKING_DURATION_MINUTES,
  BOOKING_CHECK_IN_EARLY_MINUTES,
  BOOKING_SCHEDULE_MODE,
  MAX_BOOKING_ALLOCATION_TABLES,
  type BookingScheduleMode,
} from "../constants/booking";
import { TABLE_STATUS, type TableStatus } from "../constants/table";
import {
  ACTIVE_ORDER_STATUSES,
  GROUP_SEATING_CODE_PREFIX,
  GROUP_SEATING_STATUS,
  MERGE_BOOKING_LOOKAHEAD_MINUTES,
  ORDER_TYPE,
  ORDER_STATUS,
  TABLE_MERGE_STATUS,
} from "../constants/order";
import {
  getMemberLevelFromPoints,
  MEMBER_LEVEL_RANK,
  normalizeMemberLevel,
  TIER_REWARD_VOUCHERS,
  type MemberLevel,
} from "../constants/loyalty";
import { formatVietnamBookingDateTime } from "./bookingTime";




dotenv.config();

let connectionPool: mysql.Pool | null = null;
let dbAvailable = false;
let isInitializing = false;
const JSON_DB_DIR = path.join(process.cwd(), "src", "database");
const JSON_DB_PATH = path.join(JSON_DB_DIR, "db.json");

interface SchemaMetadataRow {
  COLUMN_NAME?: string;
  COLUMN_TYPE?: string;
  TABLE_NAME?: string;
  CONSTRAINT_NAME?: string;
}

interface TableMergeDisplayRow {
  id: number;
  name: string;
  capacity: number;
}

interface GroupSeatingDisplayRow extends TableMergeDisplayRow {
  group_code: string;
  area_name?: string;
}

interface TableIdRow extends mysql.RowDataPacket {
  id: number;
}

interface BookingTableAssignmentRow extends mysql.RowDataPacket {
  table_id: number;
}

interface GroupSeatingTableRow extends mysql.RowDataPacket {
  id: number;
  name: string;
  capacity: number;
  area_id: number;
  area_name?: string;
  row_pos: string;
  col_pos: number;
  status: TableStatus;
  merged_into_table_id: number | null;
}

interface GroupSeatingGuestCountRow extends mysql.RowDataPacket {
  guest_count: number | null;
}

export interface GroupSeatingResult {
  primaryTableId: number;
  assignedTableIds: number[];
  groupCode: string;
  totalCapacity: number;
  guestCount: number;
}

export interface ResmanagerTableStatusUpdateResult {
  primaryTableId: number;
  updatedTableIds: number[];
}

const ensurePool = (): mysql.Pool => {
  if (!connectionPool) {
    throw new Error("Database connection pool is not initialized.");
  }
  return connectionPool;
};

export const query = async <T = any>(sql: string, params: any[] = []): Promise<T> => {
  if (!connectionPool && !isInitializing) {
    isInitializing = true;
    try {
      console.log("Database connection pool is not initialized. Attempting auto-initialization...");
      await initDb();
    } catch (err) {
      console.error("Failed to auto-initialize database pool:", err);
    } finally {
      isInitializing = false;
    }
  }
  const pool = ensurePool();
  const [rows] = await pool.query(sql, params);
  return rows as T;
};

/** Executes related MySQL mutations atomically and releases the connection in every outcome. */
export const withTransaction = async <T>(
  callback: (connection: mysql.PoolConnection) => Promise<T>,
): Promise<T> => {
  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const isDbAvailable = (): boolean => dbAvailable;

const MOCK_USERS: User[] = [
  { id: "1", full_name: "System Admin", email: "admin@gmail.com", password: "$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa", role_name: "admin", phone: "0900000001", createdAt: new Date().toISOString() },
  { id: "2", full_name: "Restaurant Manager", email: "manager@gmail.com", password: "$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa", role_name: "manager", phone: "0900000002", createdAt: new Date().toISOString() },
  { id: "3", full_name: "Cashier 1", email: "cashier@gmail.com", password: "$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa", role_name: "cashier", phone: "0900000003", createdAt: new Date().toISOString() },
  { id: "4", full_name: "Waiter 1", email: "waiter1@gmail.com", password: "$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa", role_name: "waiter", phone: "0900000004", createdAt: new Date().toISOString() },
  { id: "5", full_name: "Waiter 2", email: "waiter2@gmail.com", password: "$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa", role_name: "waiter", phone: "0900000005", createdAt: new Date().toISOString() },
  { id: "6", full_name: "Chef 1", email: "chef1@gmail.com", password: "$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa", role_name: "chef", phone: "0900000006", createdAt: new Date().toISOString() },
  { id: "7", full_name: "Sales Event 1", email: "sales@gmail.com", password: "$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa", role_name: "sales_event", phone: "0900000007", createdAt: new Date().toISOString() },
];

export interface Order {
  id: string;
  tableId?: string;
  tableName?: string;
  items: any[];
  status: string;
  totalAmount: number;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  guestCount: number;
  deliveryAddress?: string;
  orderType?: "dine_in" | "delivery" | "takeaway";
}

export let useFallback = false;
const normalizeMenuItem = (row: any): MenuItem => ({
  ...row,
  available: Boolean(row.available),
  is_active: row.is_active !== undefined ? Boolean(row.is_active) : Boolean(row.available),
});

const normalizeTable = (row: any): Table => ({
  ...row,
  tableNumber: Number(row.tableNumber),
  capacity: Number(row.capacity),
});

// Helper to load fallback JSON database
export const loadJsonDb = (): { orders: Order[] } => {
  if (!fs.existsSync(JSON_DB_DIR)) {
    fs.mkdirSync(JSON_DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(JSON_DB_PATH)) {
    fs.writeFileSync(JSON_DB_PATH, JSON.stringify({ orders: [] }, null, 2));
    return { orders: [] };
  }
  try {
    const content = fs.readFileSync(JSON_DB_PATH, "utf8");
    return JSON.parse(content);
  } catch (err) {
    console.error("Error reading JSON DB file, returning empty state:", err);
    return { orders: [] };
  }
};

// Helper to save fallback JSON database
export const saveJsonDb = (data: { orders: Order[] }) => {
  if (!fs.existsSync(JSON_DB_DIR)) {
    fs.mkdirSync(JSON_DB_DIR, { recursive: true });
  }
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
};

// Initialize DB (MySQL or Fallback JSON)
const normalizeInventory = (row: any): Inventory => ({
  ...row,
  quantity: Number(row.quantity),
  minQuantity: Number(row.minQuantity),
});


const normalizePayment = (row: any): Payment => ({
  ...row,
  amount: Number(row.amount || 0),
  discountAmount: row.discountAmount !== null && row.discountAmount !== undefined ? Number(row.discountAmount) : undefined,
});

const normalizeOrder = (row: any): Order => {
  let parsedItems = [];
  try {
    if (row.items && row.items !== "undefined") {
      parsedItems = typeof row.items === "string" ? JSON.parse(row.items) : row.items;
    }
  } catch (err) {
    console.error("Lỗi khi phân tích JSON items cho order:", row.id, row.items, err);
  }
  return {
    ...row,
    items: Array.isArray(parsedItems) ? parsedItems : [],
    guestCount: Number(row.guestCount || 0),
  };
};

const createDatabaseTables = async (): Promise<void> => {
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      full_name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      role_name VARCHAR(50) NOT NULL DEFAULT 'WAITER',
      phone VARCHAR(20) NOT NULL,
      createdAt VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS orders (
      id VARCHAR(50) PRIMARY KEY,
      tableId VARCHAR(50),
      tableName VARCHAR(100),
      items TEXT NOT NULL,
      status VARCHAR(50) NOT NULL,
      totalAmount DOUBLE NOT NULL,
      createdAt VARCHAR(50) NOT NULL,
      customerName VARCHAR(255),
      customerPhone VARCHAR(50),
      customerEmail VARCHAR(255),
      guestCount INT NOT NULL,
      deliveryAddress VARCHAR(500),
      orderType VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS tables (
      id VARCHAR(50) PRIMARY KEY,
      tableNumber INT NOT NULL UNIQUE,
      capacity INT NOT NULL,
      status VARCHAR(50) NOT NULL,
      location VARCHAR(255),
      qrCode VARCHAR(255),
      createdAt VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS menu_items (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      category VARCHAR(100) NOT NULL,
      price DOUBLE NOT NULL,
      image VARCHAR(255),
      available TINYINT(1) NOT NULL DEFAULT 1,
      preparationTime INT,
      createdAt VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS inventory_items (
      id VARCHAR(50) PRIMARY KEY,
      itemName VARCHAR(255) NOT NULL,
      itemCode VARCHAR(100) NOT NULL UNIQUE,
      category VARCHAR(100),
      quantity INT NOT NULL,
      unit VARCHAR(50),
      minQuantity INT NOT NULL,
      supplier VARCHAR(255),
      lastRestocked VARCHAR(50),
      createdAt VARCHAR(50) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS payments (
      id VARCHAR(50) PRIMARY KEY,
      orderId VARCHAR(50) NOT NULL,
      amount DOUBLE NOT NULL,
      paymentMethod VARCHAR(50) NOT NULL,
      status VARCHAR(50) NOT NULL,
      discountAmount DOUBLE DEFAULT 0,
      discountReason VARCHAR(255),
      notes TEXT,
      createdAt VARCHAR(50) NOT NULL,
      completedAt VARCHAR(50),
      FOREIGN KEY (orderId) REFERENCES orders(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      message VARCHAR(500) NOT NULL,
      type VARCHAR(50) NOT NULL DEFAULT 'info',
      role VARCHAR(50) DEFAULT 'waiter',
      is_read TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS events (
      id INT AUTO_INCREMENT PRIMARY KEY,
      customer_name VARCHAR(255) NOT NULL,
      customer_phone VARCHAR(50) NOT NULL,
      event_type VARCHAR(100),
      guest_count INT NOT NULL,
      event_date DATE NOT NULL,
      start_time TIME NOT NULL,
      end_time TIME NOT NULL,
      area_id INT,
      deposit_amount DOUBLE DEFAULT 0,
      total_estimated_amount DOUBLE DEFAULT 0,
      status VARCHAR(50) NOT NULL DEFAULT 'lead',
      sales_id INT,
      notes TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS event_menu_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_id INT NOT NULL,
      menu_item_id VARCHAR(50) NOT NULL,
      quantity INT NOT NULL DEFAULT 1,
      price DOUBLE NOT NULL,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS event_services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      event_id INT NOT NULL,
      service_name VARCHAR(255) NOT NULL,
      price DOUBLE NOT NULL,
      vendor_name VARCHAR(255),
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS promotions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(200) NOT NULL,
      description TEXT DEFAULT NULL,
      discount_type ENUM('percent','fixed') NOT NULL,
      discount_value DOUBLE NOT NULL DEFAULT 0.00,
      image_url VARCHAR(255) DEFAULT NULL,
      start_date VARCHAR(50) NOT NULL,
      end_date VARCHAR(50) NOT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  await query(`
    CREATE TABLE IF NOT EXISTS restaurant_info (
      id INT NOT NULL DEFAULT 1,
      name VARCHAR(200) NOT NULL DEFAULT 'ResManager Bistro',
      address VARCHAR(500) NOT NULL DEFAULT '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM',
      hotline VARCHAR(50) NOT NULL DEFAULT '028 3829 4000',
      hotline_hours VARCHAR(200) NOT NULL DEFAULT 'Hỗ trợ 10:00–22:00 hàng ngày',
      email VARCHAR(150) DEFAULT 'contact@resmanager.vn',
      opening_hours VARCHAR(200) DEFAULT 'Thứ 2 – Chủ nhật: 10:00 – 22:00',
      happy_hour VARCHAR(200) DEFAULT 'Happy Hour: 17:00 – 19:00',
      map_url TEXT DEFAULT NULL,
      tax_rate DOUBLE NOT NULL DEFAULT 10.00,
      service_fee_rate DOUBLE NOT NULL DEFAULT 5.00,
      default_payment_method VARCHAR(50) NOT NULL DEFAULT 'cash',
      timezone VARCHAR(50) NOT NULL DEFAULT 'GMT+07:00',
      bank_code VARCHAR(20) DEFAULT 'VCB',
      bank_account VARCHAR(30) DEFAULT '1234567890',
      bank_name VARCHAR(100) DEFAULT 'Ngân hàng TMCP Ngoại thương Việt Nam',
      bank_account_name VARCHAR(150) DEFAULT 'CONG TY TNHH RESMANAGER',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
};

export const initDb = async (): Promise<boolean> => {
  const host = process.env.DB_HOST || "localhost";
  const port = parseInt(process.env.DB_PORT || "3306", 10);
  const user = process.env.DB_USER || "root";
  const password = process.env.DB_PASSWORD || "";
  const database = process.env.DB_NAME || "resmanager";

  if (!process.env.DB_NAME) {
    throw new Error("DB_NAME is not defined in .env");
  }

  connectionPool = mysql.createPool({
    host,
    port,
    user,
    password,
    database,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });

  const conn = await connectionPool.getConnection();
  conn.release();
  console.log(`🚀 Connected to MySQL ${host}:${port}/${database}`);
  await createDatabaseTables();
  await runSchemaMigrations();
  console.log("✅ MySQL tables verified/created successfully.");

  // Chuẩn hóa số tiền các thanh toán/hóa đơn lịch sử quá lớn (> 100 triệu) về đúng đơn vị VND
  try {
    await query("UPDATE payments SET amount = amount / 1000 WHERE amount > 100000000");
    await query("UPDATE invoices SET subtotal = subtotal / 1000, tax = tax / 1000, discount = discount / 1000, total = total / 1000 WHERE total > 100000000");
    console.log("✅ Đã chuẩn hóa số tiền các thanh toán/hóa đơn lịch sử (> 100 triệu) về đơn vị gốc.");
  } catch (errCleanup: any) {
    console.warn("⚠️ Không thể tự động dọn dẹp số tiền lịch sử:", errCleanup.message);
  }

  // Tự động seed dữ liệu ưu đãi mẫu nếu bảng promotions đang trống
  try {
    const promoCount = await query("SELECT COUNT(*) as count FROM promotions");
    if (promoCount[0].count === 0) {
      await query(`
        INSERT INTO promotions (title, description, discount_type, discount_value, image_url, start_date, end_date, is_active) VALUES
        ('Giảm giá khai vị', 'Giảm 15% cho tất cả món khai vị', 'percent', 15.00, 'promo_khai_vi.jpg', '2026-06-01 00:00:00', '2026-12-31 23:59:59', 1),
        ('Tiệc trưa tiết kiệm', 'Tiệc trưa 11h–14h giảm 10%', 'percent', 10.00, 'promo_tiec_trua.jpg', '2026-06-01 00:00:00', '2026-12-31 23:59:59', 1)
      `);
      console.log("✅ Seeded default promotions into promotions table.");
    }
  } catch (err: any) {
    console.warn("Seeding promotions skipped:", err.message);
  }

  // Seed restaurant_info nếu chưa có
  try {
    const infoCount = await query("SELECT COUNT(*) as count FROM restaurant_info");
    if (infoCount[0].count === 0) {
      await query(`
        INSERT INTO restaurant_info (id, name, address, hotline, hotline_hours, email, opening_hours, happy_hour, tax_rate, service_fee_rate, default_payment_method, timezone, bank_code, bank_account, bank_name, bank_account_name)
        VALUES (1, 'ResManager Bistro', '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', '028 3829 4000', 'Hỗ trợ 10:00–22:00 hàng ngày', 'contact@resmanager.vn', 'Thứ 2 – Chủ nhật: 10:00 – 22:00', 'Happy Hour: 17:00 – 19:00', 10.00, 5.00, 'cash', 'GMT+07:00', 'VCB', '1234567890', 'Ngân hàng TMCP Ngoại thương Việt Nam', 'CONG TY TNHH RESMANAGER')
      `);
      console.log("✅ Seeded default restaurant_info.");
    }
  } catch (err: any) {
    console.warn("Seeding restaurant_info skipped:", err.message);
  }

  dbAvailable = true;
  return true;
};

/** Lightweight migrations for resmanager schema columns */
const runSchemaMigrations = async (): Promise<void> => {
  try {
    const cols = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'is_held'`,
    );
    if (cols.length === 0) {
      await query(`ALTER TABLE order_items ADD COLUMN is_held TINYINT(1) NOT NULL DEFAULT 0 AFTER status`);
      console.log("✅ Migration: added order_items.is_held");
    }

    const statusCol = await query<any[]>(
      `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'status'`,
    );
    if (statusCol.length > 0 && !statusCol[0].COLUMN_TYPE.includes("served")) {
      await query(`
        ALTER TABLE order_items 
        MODIFY COLUMN status ENUM('pending','cooking','done','cancelled','voided','served','delivered') 
        NOT NULL DEFAULT 'pending'
      `);
      console.log("✅ Migration: updated order_items.status ENUM to include served and delivered");
    }

    const colsUpdatedAt = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'updated_at'`,
    );
    if (colsUpdatedAt.length === 0) {
      await query(`ALTER TABLE order_items ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
      console.log("✅ Migration: added order_items.updated_at");
    }

    const colsDismissed = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'chef_dismissed'`,
    );
    if (colsDismissed.length === 0) {
      await query(`ALTER TABLE order_items ADD COLUMN chef_dismissed TINYINT(1) NOT NULL DEFAULT 0 AFTER is_held`);
      console.log("✅ Migration: added order_items.chef_dismissed");
    }

    const colsCreatedBy = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'created_by'`,
    );
    if (colsCreatedBy.length === 0) {
      await query(`ALTER TABLE order_items ADD COLUMN created_by VARCHAR(50) DEFAULT NULL`);
      await query(`UPDATE order_items oi JOIN orders o ON oi.order_id = o.id SET oi.created_by = o.created_by WHERE oi.created_by IS NULL`);
      console.log("✅ Migration: added order_items.created_by");
    }

    // Add employee_code if not exists
    const empCols = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'employee_code'`,
    );
    if (empCols.length === 0) {
      await query(`ALTER TABLE users ADD COLUMN employee_code VARCHAR(20) DEFAULT NULL AFTER role_id`);
      await query(`UPDATE users SET employee_code = CONCAT('NV', LPAD(id, 3, '0')) WHERE employee_code IS NULL`);
      console.log("✅ Migration: added users.employee_code");
    }

    // Ensure tables.status includes 'cleaning' and 'maintenance'
    await query(`ALTER TABLE tables MODIFY COLUMN status ENUM('empty','reserved','serving','pending_payment','cleaning','maintenance') NOT NULL DEFAULT 'empty'`);

    // Add guest_count to orders if not exists
    const guestCountCols = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'guest_count'`,
    );
    if (guestCountCols.length === 0) {
      await query(`ALTER TABLE orders ADD COLUMN guest_count INT DEFAULT NULL AFTER guest_phone`);
      console.log("✅ Migration: added orders.guest_count");
    }

    const orderBookingIdColumn = await query<SchemaMetadataRow[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'booking_id'`,
    );
    if (orderBookingIdColumn.length === 0) {
      await query(`ALTER TABLE orders ADD COLUMN booking_id INT NULL AFTER table_id`);
      await query(`ALTER TABLE orders ADD INDEX idx_orders_booking_id (booking_id)`);
      await query(`ALTER TABLE orders ADD CONSTRAINT fk_orders_booking
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL`);
      console.log("Migration: added orders.booking_id");
    }

    // A booking belongs to the calendar. It must never leave a physical table stuck in
    // "reserved" before the customer actually arrives and service begins.
    await query(`
      UPDATE tables t
      SET t.status = ?
      WHERE t.status = ? AND t.is_deleted = 0
        AND NOT EXISTS (
          SELECT 1
          FROM orders o
          WHERE o.table_id = t.id AND o.status IN (?, ?, ?)
        )
    `, [
      TABLE_STATUS.EMPTY,
      TABLE_STATUS.RESERVED,
      ORDER_STATUS.OPEN,
      ORDER_STATUS.SERVING,
      ORDER_STATUS.PENDING_PAYMENT,
    ]);

    // Migration: Thêm các cột cọc tiền và guest_email vào bookings nếu chưa có
    // Table merge schema: direct root reference, order traceability and immutable audit rows.
    const mergedIntoTableColumn = await query<SchemaMetadataRow[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tables' AND COLUMN_NAME = 'merged_into_table_id'`,
    );
    if (mergedIntoTableColumn.length === 0) {
      await query(`ALTER TABLE tables ADD COLUMN merged_into_table_id INT NULL AFTER maintenance_note`);
      await query(`ALTER TABLE tables ADD INDEX idx_tables_merged_into (merged_into_table_id)`);
      await query(`ALTER TABLE tables ADD CONSTRAINT fk_tables_merged_into
        FOREIGN KEY (merged_into_table_id) REFERENCES tables(id) ON DELETE SET NULL`);
      console.log("Migration: added tables.merged_into_table_id");
    }

    const mergedIntoOrderColumn = await query<SchemaMetadataRow[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'merged_into_order_id'`,
    );
    if (mergedIntoOrderColumn.length === 0) {
      await query(`ALTER TABLE orders ADD COLUMN merged_into_order_id INT NULL AFTER closed_at`);
      await query(`ALTER TABLE orders ADD INDEX idx_orders_merged_into (merged_into_order_id)`);
      await query(`ALTER TABLE orders ADD CONSTRAINT fk_orders_merged_into
        FOREIGN KEY (merged_into_order_id) REFERENCES orders(id) ON DELETE SET NULL`);
      console.log("Migration: added orders.merged_into_order_id");
    }

    try {
      const orderStatusColumn = await query<SchemaMetadataRow[]>(
        `SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'status'`,
      );
      if (orderStatusColumn.length > 0 && !String(orderStatusColumn[0].COLUMN_TYPE).includes(ORDER_STATUS.MERGED)) {
        await query(`ALTER TABLE orders MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'open'`).catch(() => {});
        console.log("Migration: updated orders.status to VARCHAR(50)");
      }
    } catch (err: any) {
      console.warn("Schema migration warning for orders.status:", err.message);
    }

    const earlyPaymentColumn = await query<SchemaMetadataRow[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'is_early_payment'`,
    );
    if (earlyPaymentColumn.length === 0) {
      await query(`ALTER TABLE orders ADD COLUMN is_early_payment TINYINT(1) NOT NULL DEFAULT 0 AFTER status`);
      await query(`ALTER TABLE orders ADD COLUMN is_early_paid TINYINT(1) NOT NULL DEFAULT 0 AFTER is_early_payment`);
      console.log("Migration: added orders.is_early_payment and orders.is_early_paid");
    }

    const sourceOrderColumn = await query<SchemaMetadataRow[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'source_order_id'`,
    );
    if (sourceOrderColumn.length === 0) {
      await query(`ALTER TABLE order_items ADD COLUMN source_order_id INT NULL AFTER order_id`);
      await query(`ALTER TABLE order_items ADD INDEX idx_order_items_source_order (source_order_id)`);
      await query(`ALTER TABLE order_items ADD CONSTRAINT fk_order_items_source_order
        FOREIGN KEY (source_order_id) REFERENCES orders(id) ON DELETE SET NULL`);
      console.log("Migration: added order_items.source_order_id");
    }

    const colsIsCookedCancelled = await query<SchemaMetadataRow[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'is_cooked_cancelled'`,
    );
    if (colsIsCookedCancelled.length === 0) {
      await query(`ALTER TABLE order_items ADD COLUMN is_cooked_cancelled TINYINT(1) NOT NULL DEFAULT 0`);
      console.log("✅ Migration: added order_items.is_cooked_cancelled");
    }

    const colsWasReused = await query<SchemaMetadataRow[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'was_reused'`,
    );
    if (colsWasReused.length === 0) {
      await query(`ALTER TABLE order_items ADD COLUMN was_reused TINYINT(1) NOT NULL DEFAULT 0`);
      console.log("✅ Migration: added order_items.was_reused");
    }

    const colsReusedBy = await query<SchemaMetadataRow[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'reused_by_order_item_id'`,
    );
    if (colsReusedBy.length === 0) {
      await query(`ALTER TABLE order_items ADD COLUMN reused_by_order_item_id INT DEFAULT NULL`);
      console.log("✅ Migration: added order_items.reused_by_order_item_id");
    }

    const colsIsReused = await query<SchemaMetadataRow[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'is_reused'`,
    );
    if (colsIsReused.length === 0) {
      await query(`ALTER TABLE order_items ADD COLUMN is_reused TINYINT(1) NOT NULL DEFAULT 0`);
      console.log("✅ Migration: added order_items.is_reused");
    }

    const mergeTableExists = await query<SchemaMetadataRow[]>(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'table_merges'`,
    );
    if (mergeTableExists.length === 0) {
      await query(`
        CREATE TABLE table_merges (
          id INT NOT NULL AUTO_INCREMENT,
          primary_table_id INT NOT NULL,
          merged_table_id INT NOT NULL,
          primary_order_id INT NULL,
          merged_order_id INT NULL,
          merged_by INT NULL,
          status ENUM('active','resolved') NOT NULL DEFAULT 'active',
          merged_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          resolved_at DATETIME NULL,
          PRIMARY KEY (id),
          INDEX idx_table_merges_primary_status (primary_table_id, status),
          INDEX idx_table_merges_merged_status (merged_table_id, status),
          CONSTRAINT fk_merge_primary FOREIGN KEY (primary_table_id) REFERENCES tables(id) ON DELETE RESTRICT,
          CONSTRAINT fk_merge_merged FOREIGN KEY (merged_table_id) REFERENCES tables(id) ON DELETE RESTRICT,
          CONSTRAINT fk_merge_primary_order FOREIGN KEY (primary_order_id) REFERENCES orders(id) ON DELETE SET NULL,
          CONSTRAINT fk_merge_merged_order FOREIGN KEY (merged_order_id) REFERENCES orders(id) ON DELETE SET NULL,
          CONSTRAINT fk_merge_user FOREIGN KEY (merged_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("Migration: created table_merges audit table");
    } else {
      const mergeColumns = await query<SchemaMetadataRow[]>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'table_merges'`,
      );
      const mergeColumnNames = new Set(mergeColumns.map((column) => String(column.COLUMN_NAME)));
      if (!mergeColumnNames.has("primary_order_id")) await query(`ALTER TABLE table_merges ADD COLUMN primary_order_id INT NULL AFTER merged_table_id`);
      if (!mergeColumnNames.has("merged_order_id")) await query(`ALTER TABLE table_merges ADD COLUMN merged_order_id INT NULL AFTER primary_order_id`);
      if (!mergeColumnNames.has("merged_by")) await query(`ALTER TABLE table_merges ADD COLUMN merged_by INT NULL AFTER merged_order_id`);
      if (!mergeColumnNames.has("status")) await query(`ALTER TABLE table_merges ADD COLUMN status ENUM('active','resolved') NOT NULL DEFAULT 'active' AFTER merged_by`);
      if (!mergeColumnNames.has("resolved_at")) await query(`ALTER TABLE table_merges ADD COLUMN resolved_at DATETIME NULL AFTER merged_at`);
    }

    const mergeConstraints = await query<SchemaMetadataRow[]>(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'table_merges' AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    );
    const mergeConstraintNames = new Set(mergeConstraints.map((constraint) => String(constraint.CONSTRAINT_NAME)));
    if (!mergeConstraintNames.has("fk_merge_primary_order")) {
      await query(`ALTER TABLE table_merges ADD CONSTRAINT fk_merge_primary_order
        FOREIGN KEY (primary_order_id) REFERENCES orders(id) ON DELETE SET NULL`);
    }
    if (!mergeConstraintNames.has("fk_merge_merged_order")) {
      await query(`ALTER TABLE table_merges ADD CONSTRAINT fk_merge_merged_order
        FOREIGN KEY (merged_order_id) REFERENCES orders(id) ON DELETE SET NULL`);
    }
    if (!mergeConstraintNames.has("fk_merge_user")) {
      await query(`ALTER TABLE table_merges ADD CONSTRAINT fk_merge_user
        FOREIGN KEY (merged_by) REFERENCES users(id) ON DELETE SET NULL`);
    }

    await query(`
      UPDATE tables t
      JOIN table_merges tm ON tm.merged_table_id = t.id AND tm.status = ?
      SET t.merged_into_table_id = tm.primary_table_id
      WHERE t.merged_into_table_id IS NULL
    `, [TABLE_MERGE_STATUS.ACTIVE]);

    // Party seating is deliberately separate from physical table merging: one order can serve tables in different zones.
    await query(`
      CREATE TABLE IF NOT EXISTS table_group_seatings (
        id INT NOT NULL AUTO_INCREMENT,
        group_code VARCHAR(40) NOT NULL,
        primary_table_id INT NOT NULL,
        assigned_table_id INT NOT NULL,
        guest_count INT NOT NULL,
        created_by INT NULL,
        status ENUM('active','resolved') NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME NULL,
        PRIMARY KEY (id),
        INDEX idx_group_seatings_primary_status (primary_table_id, status),
        INDEX idx_group_seatings_assigned_status (assigned_table_id, status),
        CONSTRAINT fk_group_seatings_primary FOREIGN KEY (primary_table_id) REFERENCES tables(id) ON DELETE RESTRICT,
        CONSTRAINT fk_group_seatings_assigned FOREIGN KEY (assigned_table_id) REFERENCES tables(id) ON DELETE RESTRICT,
        CONSTRAINT fk_group_seatings_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // A transfer changes where an active order is served, not the table stored on
    // the booking calendar. Keep an immutable audit trail for operational review.
    await query(`
      CREATE TABLE IF NOT EXISTS table_transfer_logs (
        id INT NOT NULL AUTO_INCREMENT,
        order_id INT NOT NULL,
        booking_id INT NULL,
        from_table_id INT NOT NULL,
        to_table_id INT NOT NULL,
        transferred_by INT NULL,
        reason VARCHAR(500) NULL,
        transferred_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_transfer_logs_order (order_id),
        INDEX idx_transfer_logs_booking (booking_id),
        INDEX idx_transfer_logs_from_table (from_table_id),
        INDEX idx_transfer_logs_to_table (to_table_id),
        CONSTRAINT fk_transfer_log_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT,
        CONSTRAINT fk_transfer_log_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE SET NULL,
        CONSTRAINT fk_transfer_log_from_table FOREIGN KEY (from_table_id) REFERENCES tables(id) ON DELETE RESTRICT,
        CONSTRAINT fk_transfer_log_to_table FOREIGN KEY (to_table_id) REFERENCES tables(id) ON DELETE RESTRICT,
        CONSTRAINT fk_transfer_log_user FOREIGN KEY (transferred_by) REFERENCES users(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Future reservations use a separate allocation record. This must never be confused with a live merge.
    await query(`
      CREATE TABLE IF NOT EXISTS booking_table_assignments (
        id INT NOT NULL AUTO_INCREMENT,
        booking_id INT NOT NULL,
        table_id INT NOT NULL,
        is_primary TINYINT(1) NOT NULL DEFAULT 0,
        allocated_capacity INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY uq_booking_table_assignments (booking_id, table_id),
        INDEX idx_booking_table_assignments_table (table_id),
        CONSTRAINT fk_booking_assignment_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        CONSTRAINT fk_booking_assignment_table FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    // Active reservations created before the unified three-hour policy are normalized once.
    await query(
      `UPDATE bookings
       SET end_time = DATE_ADD(start_time, INTERVAL ? MINUTE)
       WHERE status IN (?, ?)
         AND TIMESTAMPDIFF(MINUTE, start_time, end_time) <> ?`,
      [
        BOOKING_DURATION_MINUTES,
        BOOKING_STATUS.PENDING,
        BOOKING_STATUS.CONFIRMED,
        BOOKING_DURATION_MINUTES,
      ],
    );

    const bookingCols = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'deposit_amount'`,
    );
    if (bookingCols.length === 0) {
      await query(`
        ALTER TABLE bookings 
        ADD COLUMN pre_order_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        ADD COLUMN deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        ADD COLUMN deposit_status ENUM('none', 'unpaid', 'paid', 'refunded', 'completed') NOT NULL DEFAULT 'none'
      `);
      console.log("✅ Migration: added bookings deposit columns");
    }

    const bookingEmailCols = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'guest_email'`,
    );
    if (bookingEmailCols.length === 0) {
      await query(`ALTER TABLE bookings ADD COLUMN guest_email VARCHAR(255) DEFAULT NULL AFTER guest_phone`);
      console.log("✅ Migration: added bookings.guest_email");
    }
    const bookingMenuItemsTable = await query<any[]>(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'booking_menu_items'`,
    );
    if (bookingMenuItemsTable.length === 0) {
      await query(`
        CREATE TABLE booking_menu_items (
            id INT AUTO_INCREMENT PRIMARY KEY,
            booking_id INT NOT NULL,
            menu_item_id VARCHAR(50) NOT NULL,
            quantity INT NOT NULL DEFAULT 1,
            unit_price DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("✅ Migration: created booking_menu_items table");
    }

    // Migration: đảm bảo order_type trong bảng orders và status trong bảng order_items là VARCHAR(50) để hỗ trợ 'pre_order'
    await query("ALTER TABLE orders MODIFY COLUMN order_type VARCHAR(50) NOT NULL DEFAULT 'dine_in'").catch(() => {});
    await query("ALTER TABLE order_items MODIFY COLUMN status VARCHAR(50) NOT NULL DEFAULT 'pending'").catch(() => {});

    const voucherCostCol = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vouchers' AND COLUMN_NAME = 'points_cost'`,
    );
    if (voucherCostCol.length === 0) {
      await query(`ALTER TABLE vouchers ADD COLUMN points_cost INT NOT NULL DEFAULT 0 AFTER value`);
      await query(`UPDATE vouchers SET points_cost = 100 WHERE code = 'SAVE10'`);
      await query(`UPDATE vouchers SET points_cost = 300 WHERE code = 'FIXED50'`);
      await query(`UPDATE vouchers SET points_cost = 200 WHERE code = 'NEW20'`);
      await query(`UPDATE vouchers SET points_cost = 150 WHERE code = 'SILVER15'`);
      await query(`UPDATE vouchers SET points_cost = 250 WHERE code = 'GOLD25'`);
      await query(`UPDATE vouchers SET points_cost = 400 WHERE code = 'VIP30'`);
      console.log("✅ Migration: added points_cost column to vouchers table");
    }

    const voucherTierCol = await query<SchemaMetadataRow[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'vouchers' AND COLUMN_NAME = 'required_member_level'`,
    );
    if (voucherTierCol.length === 0) {
      await query(`ALTER TABLE vouchers ADD COLUMN required_member_level VARCHAR(20) NULL AFTER points_cost`);
      console.log("✅ Migration: added required_member_level column to vouchers table");
    }

    for (const reward of TIER_REWARD_VOUCHERS) {
      const existingReward = await query<TableIdRow[]>("SELECT id FROM vouchers WHERE code = ? LIMIT 1", [reward.code]);
      if (existingReward.length === 0) {
        await query(
          `INSERT INTO vouchers (code, type, value, min_order, max_uses, used_count, points_cost, required_member_level, expired_at, is_active, created_at)
           VALUES (?, ?, ?, ?, NULL, 0, ?, ?, NULL, 1, NOW())`,
          [reward.code, reward.type, reward.value, reward.minOrder, reward.pointsCost, reward.requiredMemberLevel],
        );
      } else {
        await query(
          "UPDATE vouchers SET type = ?, value = ?, min_order = ?, points_cost = ?, required_member_level = ? WHERE id = ?",
          [reward.type, reward.value, reward.minOrder, reward.pointsCost, reward.requiredMemberLevel, existingReward[0].id],
        );
      }
    }

    const customerVouchersTable = await query<any[]>(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'customer_vouchers'`,
    );
    if (customerVouchersTable.length === 0) {
      await query(`
        CREATE TABLE customer_vouchers (
            id INT AUTO_INCREMENT PRIMARY KEY,
            customer_id INT NOT NULL,
            voucher_id INT NOT NULL,
            is_used TINYINT(1) NOT NULL DEFAULT 0,
            redeemed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP NULL DEFAULT NULL,
            FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
            FOREIGN KEY (voucher_id) REFERENCES vouchers(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
      `);
      console.log("✅ Migration: created customer_vouchers table");
    }
    // Migration: recalculate member_level for all customers based on new tier thresholds
    // Bronze: 0-1999 | Silver: 2000-7999 | Gold: 8000-19999 | VIP: 20000+
    await query(`
      UPDATE customers
      SET member_level = CASE
        WHEN loyalty_points >= 20000 THEN 'vip'
        WHEN loyalty_points >= 8000  THEN 'gold'
        WHEN loyalty_points >= 2000  THEN 'silver'
        ELSE 'bronze'
      END
    `);
    console.log("✅ Migration: recalculated all customer member_level with new tier thresholds");

    // Migration: Add batch_code, expiry_date, remaining_quantity, is_credit, due_date to stock_in
    const stockInCols = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_in' AND COLUMN_NAME = 'batch_code'`
    );
    if (stockInCols.length === 0) {
      await query(`
        ALTER TABLE stock_in 
        ADD COLUMN batch_code VARCHAR(50) NOT NULL DEFAULT 'LOT-OLD' AFTER ingredient_id,
        ADD COLUMN remaining_quantity DECIMAL(10,3) NOT NULL DEFAULT 0 AFTER quantity,
        ADD COLUMN expiry_date DATE DEFAULT NULL AFTER supplier_id,
        ADD COLUMN is_credit TINYINT(1) NOT NULL DEFAULT 0,
        ADD COLUMN due_date DATE DEFAULT NULL
      `);
      await query(`UPDATE stock_in SET remaining_quantity = quantity WHERE remaining_quantity = 0`);
      console.log("✅ Migration: added batch_code, expiry_date, remaining_quantity to stock_in table");
    }

    // Migration: Add stock_in_id and update reason ENUM in stock_out
    await ensureRefundColumns();
    const stockOutCols = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'stock_out' AND COLUMN_NAME = 'stock_in_id'`
    );
    if (stockOutCols.length === 0) {
      await query(`
        ALTER TABLE stock_out 
        ADD COLUMN stock_in_id INT DEFAULT NULL AFTER ingredient_id,
        MODIFY COLUMN reason ENUM('waste','internal_use','expired','sale_deduction','return_to_supplier','other') NOT NULL DEFAULT 'other'
      `);
      console.log("✅ Migration: added stock_in_id to stock_out table");
    }
    await ensureRefundColumns();
    await ensureEarlyPaymentColumns();

    // Ensure table_split_sessions table exists
    const splitSessionsExists = await query<any[]>(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'table_split_sessions'`
    );
    if (splitSessionsExists.length === 0) {
      await query(`
        CREATE TABLE table_split_sessions (
          id INT NOT NULL AUTO_INCREMENT,
          parent_table_id INT NOT NULL,
          parent_order_id INT NOT NULL,
          status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          closed_at DATETIME NULL,
          PRIMARY KEY (id),
          CONSTRAINT fk_split_session_table FOREIGN KEY (parent_table_id) REFERENCES tables(id) ON DELETE RESTRICT,
          CONSTRAINT fk_split_session_order FOREIGN KEY (parent_order_id) REFERENCES orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✅ Migration: created table_split_sessions table");
    }

    // Ensure table_splits exists and has the correct columns
    const splitsExists = await query<any[]>(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'table_splits'`
    );
    let recreateSplits = false;
    if (splitsExists.length > 0) {
      const splitCols = await query<any[]>(
        `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'table_splits' AND COLUMN_NAME = 'status'`
      );
      if (splitCols.length === 0) {
        recreateSplits = true;
      }
    } else {
      recreateSplits = true;
    }

    if (recreateSplits) {
      await query(`DROP TABLE IF EXISTS table_splits`).catch(() => {});
      await query(`
        CREATE TABLE table_splits (
          id INT NOT NULL AUTO_INCREMENT,
          split_session_id INT NOT NULL,
          parent_table_id INT NOT NULL,
          parent_order_id INT NOT NULL,
          child_order_id INT NOT NULL,
          child_label VARCHAR(100) NOT NULL,
          guest_count INT NOT NULL DEFAULT 1,
          status ENUM('active', 'paid', 'cancelled') NOT NULL DEFAULT 'active',
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          closed_at DATETIME NULL,
          PRIMARY KEY (id),
          CONSTRAINT fk_splits_session FOREIGN KEY (split_session_id) REFERENCES table_split_sessions(id) ON DELETE CASCADE,
          CONSTRAINT fk_splits_parent_table FOREIGN KEY (parent_table_id) REFERENCES tables(id) ON DELETE RESTRICT,
          CONSTRAINT fk_splits_parent_order FOREIGN KEY (parent_order_id) REFERENCES orders(id) ON DELETE CASCADE,
          CONSTRAINT fk_splits_child_order FOREIGN KEY (child_order_id) REFERENCES orders(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✅ Migration: created/recreated table_splits table with correct schema");
    }

    // Ensure invoice_item_splits exists
    const itemSplitsExists = await query<any[]>(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoice_item_splits'`
    );
    if (itemSplitsExists.length === 0) {
      await query(`
        CREATE TABLE invoice_item_splits (
          id INT NOT NULL AUTO_INCREMENT,
          parent_invoice_id INT NOT NULL,
          child_invoice_id INT NOT NULL,
          order_item_id INT NOT NULL,
          quantity INT NOT NULL,
          amount DECIMAL(12,2) NOT NULL,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          CONSTRAINT fk_item_splits_parent FOREIGN KEY (parent_invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
          CONSTRAINT fk_item_splits_child FOREIGN KEY (child_invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
          CONSTRAINT fk_item_splits_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      console.log("✅ Migration: created invoice_item_splits table");
    }

    // Migration: Ensure debt_payments table exists and has proof_image column
    await query(`
      CREATE TABLE IF NOT EXISTS debt_payments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        supplier_id INT NOT NULL,
        amount DECIMAL(14,2) NOT NULL,
        method VARCHAR(50) NOT NULL DEFAULT 'transfer',
        note TEXT NULL,
        proof_image LONGTEXT NULL,
        paid_by INT NULL,
        paid_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_debt_payments_supplier (supplier_id),
        CONSTRAINT fk_debt_payments_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `).catch(() => {});

    await query(`ALTER TABLE debt_payments ADD COLUMN proof_image LONGTEXT NULL`).catch(() => {});
    await query(`ALTER TABLE debt_payments MODIFY COLUMN paid_by INT NULL`).catch(() => {});
  } catch (err) {
    console.warn("Schema migration skipped:", (err as Error).message);
  }
};

const mapRoleName = (roleId: any): string => {
  const id = Number(roleId);
  switch (id) {
    case 1: return "admin";
    case 2: return "manager";
    case 3: return "waiter";
    case 4: return "cashier";
    case 5: return "chef";
    case 6: return "sales_event";
    default: return "waiter";
  }
};

const mapUserRow = (user: any): User => {
  const roleName = user.role_name || mapRoleName(user.role_id);
  const empCode = user.employee_code || `NV${String(user.id).padStart(3, "0")}`;
  return {
    ...user,
    id: String(user.id),
    employee_code: empCode,
    password: user.password || user.password_hash,
    role: roleName,
    role_name: roleName,
    createdAt: user.createdAt || user.created_at || new Date().toISOString(),
  };
};

// ===== User operations =====
export const findUserByEmail = async (email: string): Promise<User | null> => {
  if (!dbAvailable) {
    return MOCK_USERS.find((u) => u.email === email) || null;
  }
  const rows = await query<any[]>(
    `SELECT u.id, u.full_name, u.email, u.password_hash AS password, r.name AS role_name, u.phone, u.created_at AS createdAt
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.email = ? AND u.is_deleted = 0`,
    [email],
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
};

export const findUserById = async (id: string): Promise<User | null> => {
  if (!dbAvailable) {
    return MOCK_USERS.find((u) => u.id === id) || null;
  }
  const rows = await query<any[]>(
    `SELECT u.id, u.full_name, u.email, u.password_hash AS password, r.name AS role_name, u.phone, u.created_at AS createdAt
     FROM users u
     JOIN roles r ON u.role_id = r.id
     WHERE u.id = ? AND u.is_deleted = 0`,
    [id],
  );
  return rows[0] ? mapUserRow(rows[0]) : null;
};

const getRoleId = (roleName: string): number => {
  const roles: Record<string, number> = {
    admin: 1,
    manager: 2,
    waiter: 3,
    cashier: 4,
    chef: 5,
    sales_event: 6,
  };
  return roles[roleName.toLowerCase()] || 3; // fallback to waiter
};

export const createUser = async (user: Omit<User, "id" | "createdAt">): Promise<User> => {
  try {
    const roleId = getRoleId(user.role_name);
    const result = await query<any>(
      "INSERT INTO users (role_id, full_name, email, password_hash, phone) VALUES (?, ?, ?, ?, ?)",
      [roleId, user.full_name, user.email, user.password, user.phone],
    );
    const insertId = result.insertId;
    return {
      id: String(insertId),
      createdAt: new Date().toISOString(),
      ...user,
    };
  } catch (err) {
    const id = `user_${Date.now()}`;
    const createdAt = new Date().toISOString();
    await query(
      "INSERT INTO users (id, full_name, email, password, role_name, phone, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [id, user.full_name, user.email, user.password, user.role_name, user.phone, createdAt],
    );
    return { id, createdAt, ...user };
  }
};

// ===== Order operations =====
const MOCK_ORDERS: Order[] = [
  {
    id: "o_figma_4",
    tableId: "t3",
    tableName: "B03",
    customerName: "Nguyễn Văn A",
    customerPhone: "0904445556",
    customerEmail: "an@gmail.com",
    guestCount: 2,
    items: [
      { menuItemId: "m1", name: "Gỏi hải sản", price: 185000, quantity: 1 },
      { menuItemId: "m3", name: "Bò lúc lắc", price: 265000, quantity: 1 },
      { menuItemId: "m9", name: "Trà đào cam sả", price: 45000, quantity: 2 },
    ],
    status: "served",
    totalAmount: 540000,
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    orderType: "dine_in",
  },
  {
    id: "o1",
    tableId: "t5",
    tableName: "B05",
    customerName: "Alex Mercer",
    customerPhone: "0901234567",
    customerEmail: "alex@example.com",
    guestCount: 2,
    items: [
      { menuItemId: "m6", name: "Lẩu Thái chua cay", price: 380000, quantity: 1 },
      { menuItemId: "m10", name: "Nước ép dưa hấu", price: 40000, quantity: 2 },
    ],
    status: "in_kitchen",
    totalAmount: 460000,
    createdAt: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    orderType: "dine_in",
  },
  {
    id: "o2",
    tableId: "t1",
    tableName: "B01",
    customerName: "Elena Rostova",
    customerPhone: "0987654321",
    customerEmail: "elena@yahoo.com",
    guestCount: 3,
    items: [
      { menuItemId: "m4", name: "Cá hồi sốt chanh leo", price: 285000, quantity: 1 },
      { menuItemId: "m11", name: "Sinh tố bơ", price: 55000, quantity: 1 },
    ],
    status: "served",
    totalAmount: 340000,
    createdAt: new Date(Date.now() - 65 * 60 * 1000).toISOString(),
    orderType: "dine_in",
  },
  {
    id: "o_past_1",
    tableId: "t5",
    tableName: "B05",
    customerName: "Marcus Aurelius",
    customerPhone: "0900111222",
    customerEmail: "marcus@philosophy.org",
    guestCount: 2,
    items: [
      { menuItemId: "m5", name: "Sườn sụn nướng BBQ", price: 245000, quantity: 1 },
      { menuItemId: "m8", name: "Bánh tiramisu", price: 60000, quantity: 1 },
    ],
    status: "paid",
    totalAmount: 305000,
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    orderType: "dine_in",
  },
];

export const getOrders = async (): Promise<Order[]> => {
  if (!dbAvailable) {
    return MOCK_ORDERS;
  }
  const rows = await query<any[]>("SELECT * FROM orders ORDER BY created_at DESC");
  return rows.map(normalizeOrder);
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  if (!dbAvailable) {
    return MOCK_ORDERS.find((o) => o.id === id) || null;
  }
  const rows = await query<any[]>("SELECT * FROM orders WHERE id = ?", [id]);
  return rows[0] ? normalizeOrder(rows[0]) : null;
};

export const saveOrder = async (order: Order): Promise<Order> => {
  if (!dbAvailable) {
    MOCK_ORDERS.push(order);
    return order;
  }
  await query(
    `INSERT INTO orders (
      id, tableId, tableName, items, status, totalAmount, createdAt,
      customerName, customerPhone, customerEmail, guestCount, deliveryAddress, orderType
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
    [
      order.id,
      order.tableId || null,
      order.tableName || null,
      JSON.stringify(order.items),
      order.status,
      order.totalAmount,
      order.createdAt,
      order.customerName || null,
      order.customerPhone || null,
      order.customerEmail || null,
      order.guestCount,
      order.deliveryAddress || null,
      order.orderType || "delivery",
    ],
  );
  return order;
};

export const updateOrderStatus = async (id: string, status: string): Promise<boolean> => {
  if (!dbAvailable) {
    const order = MOCK_ORDERS.find((o) => o.id === id);
    if (order) {
      order.status = status;
      return true;
    }
    return false;
  }
  const isClosed = status === "completed" || status === "paid" || status === "cancelled";
  if (isClosed) {
    const result = await query<any>("UPDATE orders SET status = ?, closed_at = NOW() WHERE id = ?", [status, id]);
    if (result.affectedRows > 0 && status === ORDER_STATUS.COMPLETED) {
      await query(
        `UPDATE bookings b
         JOIN orders o ON o.booking_id = b.id
         SET b.status = ?
         WHERE o.id = ? AND b.status IN (?, ?)`,
        [
          BOOKING_STATUS.COMPLETED,
          id,
          BOOKING_STATUS.PENDING,
          BOOKING_STATUS.CONFIRMED,
        ],
      );
    }
    return result.affectedRows > 0;
  }
  const result = await query<any>("UPDATE orders SET status = ? WHERE id = ?", [status, id]);
  return result.affectedRows > 0;
};

export interface TableArea {
  id: number;
  name: string;
  is_active: number;
}

export const getTableAreas = async (): Promise<TableArea[]> => {
  try {
    const rows = await query<any[]>("SELECT * FROM table_areas WHERE is_active = 1 ORDER BY id ASC");
    return rows.map(row => ({
      id: Number(row.id),
      name: row.name,
      is_active: Number(row.is_active),
    }));
  } catch (err) {
    return [
      { id: 1, name: "Tầng 2", is_active: 1 },
      { id: 2, name: "Tầng 2", is_active: 1 },
      { id: 3, name: "Sân vườn", is_active: 1 },
    ];
  }
};

const mapTable = (row: any): any => {
  return {
    ...row,
    id: row.id,
    area_id: row.area_id,
    area_name: row.area_name,
    name: row.name || String(row.tableNumber),
    tableNumber: row.tableNumber !== undefined ? Number(row.tableNumber) : undefined,
    capacity: Number(row.capacity),
    status: row.status,
  };
};

// ===== Table operations =====
export const getTables = async (areaId?: number): Promise<any[]> => {
  try {
    let sql = `
      SELECT t.*, a.name AS area_name 
      FROM tables t 
      LEFT JOIN table_areas a ON t.area_id = a.id 
      WHERE t.is_deleted = 0
    `;
    const params: any[] = [];
    if (areaId !== undefined) {
      sql += " AND t.area_id = ?";
      params.push(areaId);
    }
    sql += " ORDER BY t.name ASC";
    const rows = await query<any[]>(sql, params);
    return rows.map(mapTable);
  } catch (err) {
    let sql = "SELECT * FROM tables";
    sql += " ORDER BY tableNumber ASC";
    const rows = await query<any[]>(sql);
    return rows.map(mapTable);
  }
};

export const getTableById = async (id: string): Promise<any | null> => {
  try {
    let targetId: any = id;
    const num = Number(id);
    if (!isNaN(num) && num > 0) targetId = num;
    else if (typeof id === "string" && id.startsWith("t")) {
      const n = Number(id.slice(1));
      if (!isNaN(n) && n > 0) targetId = n;
    }
    const rows = await query<any[]>(
      `SELECT t.*, a.name AS area_name 
       FROM tables t 
       LEFT JOIN table_areas a ON t.area_id = a.id 
       WHERE t.id = ? OR t.name = ?`,
      [targetId, id]
    );
    return rows[0] ? mapTable(rows[0]) : null;
  } catch (err) {
    const rows = await query<any[]>("SELECT * FROM tables WHERE id = ? OR name = ?", [id, id]);
    return rows[0] ? mapTable(rows[0]) : null;
  }
};

export const createTable = async (table: Omit<Table, "id" | "createdAt">): Promise<Table> => {
  const id = `table_${Date.now()}`;
  const createdAt = new Date().toISOString();
  await query(
    "INSERT INTO tables (id, tableNumber, capacity, status, location, qrCode, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, table.tableNumber, table.capacity, table.status, table.location || null, table.qrCode || null, createdAt],
  );
  return { id, createdAt, ...table };
};

export const updateTable = async (id: string, data: Partial<Table>): Promise<Table | null> => {
  const existing = await getTableById(id);
  if (!existing) return null;
  const updated = { ...existing, ...data };
  if (!dbAvailable) return updated;
  await query(
    "UPDATE tables SET tableNumber = ?, capacity = ?, status = ?, location = ?, qrCode = ? WHERE id = ?",
    [updated.tableNumber, updated.capacity, updated.status, updated.location || null, updated.qrCode || null, id],
  );
  return updated;
};

export const deleteTable = async (id: string): Promise<boolean> => {
  const result = await query<any>("DELETE FROM tables WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

export const getTablesByStatus = async (status: string): Promise<Table[]> => {
  const rows = await query<any[]>("SELECT * FROM tables WHERE status = ? ORDER BY tableNumber ASC", [status]);
  return rows.map(normalizeTable);
};

// ===== Menu operations =====
export const getMenuItems = async (): Promise<MenuItem[]> => {
  const rows = await query<any[]>(
    `SELECT m.id, m.name, m.description, m.price, m.image_url, m.image_url AS image, 
            m.is_active AS available, m.category_id, c.name AS category,
            m.kitchen_station, m.is_featured, m.is_deleted, m.created_at AS createdAt
     FROM menu_items m
     LEFT JOIN categories c ON m.category_id = c.id
     WHERE m.is_deleted = 0
     ORDER BY m.created_at DESC`
  );
  return rows.map(normalizeMenuItem);
};

export const getMenuItemById = async (id: string): Promise<MenuItem | null> => {
  const rows = await query<any[]>(
    `SELECT m.id, m.name, m.description, m.price, m.image_url, m.image_url AS image, 
            m.is_active AS available, m.category_id, c.name AS category,
            m.kitchen_station, m.is_featured, m.is_deleted, m.created_at AS createdAt
     FROM menu_items m
     LEFT JOIN categories c ON m.category_id = c.id
     WHERE m.id = ? AND m.is_deleted = 0`,
    [id]
  );
  return rows[0] ? normalizeMenuItem(rows[0]) : null;
};

export const getMenuItemsByCategory = async (category: string): Promise<MenuItem[]> => {
  const rows = await query<any[]>(
    `SELECT m.id, m.name, m.description, m.price, m.image_url, m.image_url AS image, 
            m.is_active AS available, m.category_id, c.name AS category,
            m.kitchen_station, m.is_featured, m.is_deleted, m.created_at AS createdAt
     FROM menu_items m
     LEFT JOIN categories c ON m.category_id = c.id
     WHERE c.name = ? AND m.is_deleted = 0
     ORDER BY m.created_at DESC`,
    [category]
  );
  return rows.map(normalizeMenuItem);
};

export const createMenuItem = async (item: Omit<MenuItem, "id" | "createdAt"> & { category_id?: number | string, kitchen_station?: string, is_featured?: boolean }): Promise<MenuItem> => {
  let categoryId = Number(item.category_id);
  if (!categoryId && item.category) {
    const catRows = await query<any[]>("SELECT id FROM categories WHERE name = ?", [item.category]);
    categoryId = catRows[0]?.id || 2; // fallback to Món chính
  } else if (!categoryId) {
    categoryId = 2; // fallback to Món chính
  }

  const result = await query<any>(
    `INSERT INTO menu_items (category_id, name, description, price, image_url, kitchen_station, is_featured, is_active, is_deleted)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0)`,
    [
      categoryId,
      item.name,
      item.description || null,
      item.price,
      item.image || null,
      item.kitchen_station || "hot_kitchen",
      item.is_featured ? 1 : 0,
      item.available ? 1 : 0
    ]
  );

  const insertId = result.insertId ? result.insertId.toString() : `dish_${Date.now()}`;
  const createdAt = new Date().toISOString();

  return {
    id: insertId,
    name: item.name,
    description: item.description,
    category: item.category || "Món chính",
    category_id: categoryId,
    price: item.price,
    image: item.image || (item as any).image_url,
    image_url: (item as any).image_url || item.image,
    available: item.available,
    kitchen_station: item.kitchen_station || "hot_kitchen",
    is_featured: item.is_featured || false,
    createdAt
  } as any;
};

export const updateMenuItem = async (id: string, data: Partial<MenuItem> & { category_id?: number | string, is_deleted?: number | boolean, deleted_at?: string, kitchen_station?: string, is_featured?: boolean }): Promise<MenuItem | null> => {
  const existing = await getMenuItemById(id);
  if (!existing) return null;

  // Filter out undefined keys from data to prevent spreading undefined over existing values
  const cleanData: any = {};
  const dataAsAny = data as any;
  for (const key of Object.keys(data)) {
    if (dataAsAny[key] !== undefined) {
      cleanData[key] = dataAsAny[key];
    }
  }

  const updated = { ...existing, ...cleanData };

  // Keep both fields synced in the returned object
  if (data.image !== undefined) {
    updated.image_url = data.image;
  } else if ((data as any).image_url !== undefined) {
    updated.image = (data as any).image_url;
  } else if (existing.image_url) {
    updated.image = existing.image_url;
  } else if (existing.image) {
    updated.image_url = existing.image;
  }

  let categoryId = Number(data.category_id || (updated as any).category_id);
  if (!categoryId && data.category) {
    const catRows = await query<any[]>("SELECT id FROM categories WHERE name = ?", [data.category]);
    categoryId = catRows[0]?.id || 2;
  } else if (!categoryId) {
    categoryId = 2;
  }

  const isDeleted = data.is_deleted !== undefined
    ? (data.is_deleted ? 1 : 0)
    : (existing.is_deleted ? 1 : 0);

  const deletedAt = isDeleted ? (data.deleted_at || new Date().toISOString()) : null;

  await query(
    `UPDATE menu_items 
     SET category_id = ?, name = ?, description = ?, price = ?, image_url = ?, 
         kitchen_station = ?, is_featured = ?, is_active = ?, is_deleted = ?, deleted_at = ?
     WHERE id = ?`,
    [
      categoryId,
      updated.name,
      updated.description || null,
      updated.price,
      updated.image || updated.image_url || null,
      updated.kitchen_station || "hot_kitchen",
      updated.is_featured ? 1 : 0,
      updated.available ? 1 : 0,
      isDeleted,
      deletedAt,
      id
    ]
  );

  return {
    ...updated,
    image: updated.image || updated.image_url,
    image_url: updated.image_url || updated.image,
    category_id: categoryId,
    is_deleted: Boolean(isDeleted),
    deleted_at: deletedAt
  } as any;
};

export const deleteMenuItem = async (id: string): Promise<boolean> => {
  const result = await query<any>("DELETE FROM menu_items WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

export const toggleMenuItemAvailability = async (id: string, available: boolean): Promise<MenuItem | null> => {
  const item = await getMenuItemById(id);
  if (!item) return null;
  await query("UPDATE menu_items SET available = ? WHERE id = ?", [available ? 1 : 0, id]);
  return { ...item, available };
};

// ===== Inventory operations =====
export const getInventory = async (): Promise<Inventory[]> => {
  const rows = await query<any[]>("SELECT * FROM inventory_items ORDER BY itemName ASC");
  return rows.map(normalizeInventory);
};

export const getIngredients = async (): Promise<any[]> => {
  const rows = await query<any[]>("SELECT id, name, unit, current_stock as stock, min_stock as threshold FROM ingredients WHERE is_deleted = 0 ORDER BY name ASC");
  return rows.map(r => ({
    id: String(r.id),
    name: r.name,
    unit: r.unit,
    stock: Number(r.stock),
    threshold: Number(r.threshold)
  }));
};

export const getInventoryTransactions = async (): Promise<any[]> => {
  const stockIn = await query<any[]>(`
    SELECT
      CONCAT('in_', t.id) as id,
      'import' as type,
      i.name as ingredientName,
      t.quantity,
      i.unit,
      t.note as reasonOrSupplier,
      t.created_at as timestamp
    FROM stock_in t
    JOIN ingredients i ON t.ingredient_id = i.id
  `);

  const stockOut = await query<any[]>(`
    SELECT
      CONCAT('out_', t.id) as id,
      'export' as type,
      i.name as ingredientName,
      t.quantity,
      i.unit,
      t.note as reasonOrSupplier,
      t.created_at as timestamp
    FROM stock_out t
    JOIN ingredients i ON t.ingredient_id = i.id
  `);

  const all = [...stockIn, ...stockOut];
  all.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  
  return all.map(tx => ({
    ...tx,
    quantity: Number(tx.quantity),
    timestamp: new Date(tx.timestamp).toISOString().replace("T", " ").slice(0, 16)
  }));
};


export const getInventoryById = async (id: string): Promise<Inventory | null> => {
  const rows = await query<any[]>("SELECT * FROM inventory_items WHERE id = ?", [id]);
  return rows[0] ? normalizeInventory(rows[0]) : null;
};

export const createInventoryItem = async (
  item: Omit<Inventory, "id" | "createdAt">,
): Promise<Inventory> => {
  const id = `inv_${Date.now()}`;
  const createdAt = new Date().toISOString();
  await query(
    "INSERT INTO inventory_items (id, itemName, itemCode, category, quantity, unit, minQuantity, supplier, lastRestocked, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, item.itemName, item.itemCode, item.category || null, item.quantity, item.unit, item.minQuantity, item.supplier || null, item.lastRestocked || null, createdAt],
  );
  return { id, createdAt, ...item };
};

export const updateInventoryItem = async (id: string, data: Partial<Inventory>): Promise<Inventory | null> => {
  const existing = await getInventoryById(id);
  if (!existing) return null;
  const updated = { ...existing, ...data };
  await query(
    "UPDATE inventory_items SET itemName = ?, itemCode = ?, category = ?, quantity = ?, unit = ?, minQuantity = ?, supplier = ?, lastRestocked = ? WHERE id = ?",
    [updated.itemName, updated.itemCode, updated.category || null, updated.quantity, updated.unit, updated.minQuantity, updated.supplier || null, updated.lastRestocked || null, id],
  );
  return updated;
};

export const deleteInventoryItem = async (id: string): Promise<boolean> => {
  const result = await query<any>("DELETE FROM inventory_items WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

export const updateInventoryQuantity = async (id: string, quantity: number, type: "add" | "subtract"): Promise<Inventory | null> => {
  const item = await getInventoryById(id);
  if (!item) return null;
  const newQuantity = type === "add" ? item.quantity + quantity : item.quantity - quantity;
  if (newQuantity < 0) return null;
  const lastRestocked = new Date().toISOString();
  await query("UPDATE inventory_items SET quantity = ?, lastRestocked = ? WHERE id = ?", [newQuantity, lastRestocked, id]);
  return { ...item, quantity: newQuantity, lastRestocked };
};

export const getLowStockItems = async (): Promise<Inventory[]> => {
  const rows = await query<any[]>("SELECT * FROM inventory_items WHERE quantity <= minQuantity ORDER BY itemName ASC");
  return rows.map(normalizeInventory);
};

// ===== Payment operations =====
const MOCK_PAYMENTS: Payment[] = [];

export const getPayments = async (): Promise<Payment[]> => {
  if (!dbAvailable) return MOCK_PAYMENTS;
  const rows = await query<any[]>(`
    SELECT p.id,
           COALESCE(i.order_id, p.invoice_id) AS orderId,
           p.amount,
           CASE 
             WHEN p.method = 'bank_transfer' THEN 'transfer'
             WHEN p.method IN ('momo', 'vnpay') THEN 'wallet'
             ELSE p.method 
           END AS paymentMethod,
           'completed' AS status,
           p.note AS notes,
           p.paid_at AS createdAt,
           p.paid_at AS completedAt
    FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    ORDER BY p.paid_at DESC
  `);
  return rows.map(normalizePayment);
};

export const getPaymentById = async (id: string): Promise<Payment | null> => {
  if (!dbAvailable) return MOCK_PAYMENTS.find((p) => String(p.id) === String(id)) || null;
  const rows = await query<any[]>(`
    SELECT p.id,
           COALESCE(i.order_id, p.invoice_id) AS orderId,
           p.amount,
           CASE 
             WHEN p.method = 'bank_transfer' THEN 'transfer'
             WHEN p.method IN ('momo', 'vnpay') THEN 'wallet'
             ELSE p.method 
           END AS paymentMethod,
           'completed' AS status,
           p.note AS notes,
           p.paid_at AS createdAt,
           p.paid_at AS completedAt
    FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    WHERE p.id = ?
  `, [id]);
  return rows[0] ? normalizePayment(rows[0]) : null;
};

export const getPaymentsByOrderId = async (orderId: string): Promise<Payment[]> => {
  if (!dbAvailable) return MOCK_PAYMENTS.filter((p) => String(p.orderId) === String(orderId));
  const rows = await query<any[]>(`
    SELECT p.id,
           COALESCE(i.order_id, p.invoice_id) AS orderId,
           p.amount,
           CASE 
             WHEN p.method = 'bank_transfer' THEN 'transfer'
             WHEN p.method IN ('momo', 'vnpay') THEN 'wallet'
             ELSE p.method 
           END AS paymentMethod,
           'completed' AS status,
           p.note AS notes,
           p.paid_at AS createdAt,
           p.paid_at AS completedAt
    FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    WHERE i.order_id = ? OR p.invoice_id = ?
    ORDER BY p.paid_at DESC
  `, [orderId, orderId]);
  return rows.map(normalizePayment);
};

export const createPayment = async (payment: Omit<Payment, "id" | "createdAt">): Promise<Payment> => {
  const id = `pay_${Date.now()}`;
  const createdAt = new Date().toISOString();
  const newPayment: Payment = { id, createdAt, ...payment };
  if (!dbAvailable) {
    MOCK_PAYMENTS.push(newPayment);
    return newPayment;
  }

  let invoiceId = Number(payment.orderId);
  try {
    let notesData: any = {};
    if (payment.notes && typeof payment.notes === "string" && payment.notes.startsWith("{")) {
      try { notesData = JSON.parse(payment.notes); } catch {}
    }
    const subVal = Number(notesData.subtotal !== undefined ? notesData.subtotal : payment.amount || 0);
    const taxVal = Number(notesData.vat !== undefined ? notesData.vat : 0);
    const discVal = (Number(notesData.voucher || 0) + Number(notesData.pointsDiscount || 0)) || Number(payment.discountAmount || 0);
    const totVal = Number(notesData.finalAmount !== undefined ? notesData.finalAmount : payment.amount || 0);

    const invRows = await query<any[]>("SELECT id FROM invoices WHERE order_id = ? ORDER BY id DESC LIMIT 1", [payment.orderId]);
    if (invRows && invRows.length > 0) {
      invoiceId = invRows[0].id;
      await query(
        "UPDATE invoices SET status = 'paid', paid_at = NOW(), subtotal = ?, tax = ?, discount = ?, total = ? WHERE id = ?",
        [subVal, taxVal, discVal, totVal, invoiceId]
      ).catch(() => {});
    } else {
      const resInv = await query<any>(
        `INSERT INTO invoices (order_id, subtotal, discount, tax, service_fee, tips, total, status, paid_at, created_by)
         VALUES (?, ?, ?, ?, 0, 0, ?, 'paid', NOW(), 1)`,
        [
          Number(payment.orderId) || null,
          subVal,
          discVal,
          taxVal,
          totVal
        ]
      );
      if (resInv && resInv.insertId) {
        invoiceId = resInv.insertId;
      }
    }
  } catch (errInv) {
    console.warn("[createPayment] fallback invoice logic error:", (errInv as Error).message);
  }

  let methodEnum = payment.paymentMethod as string || "cash";
  if (methodEnum === "transfer") methodEnum = "bank_transfer";
  if (methodEnum === "wallet") methodEnum = "momo";
  if (!["cash", "bank_transfer", "card", "momo", "vnpay"].includes(methodEnum)) {
    methodEnum = "cash";
  }

  const resPay = await query<any>(
    "INSERT INTO payments (invoice_id, method, amount, note, paid_at) VALUES (?, ?, ?, ?, NOW())",
    [invoiceId || Number(payment.orderId) || 1, methodEnum, Number(payment.amount) || 0, payment.notes || null]
  );
  const newId = resPay && resPay.insertId ? String(resPay.insertId) : id;
  return { id: newId, createdAt, ...payment };
};

export const updatePaymentStatus = async (id: string, status: Payment["status"]): Promise<Payment | null> => {
  const payment = await getPaymentById(id);
  if (!payment) return null;
  const completedAt = status === "completed" ? new Date().toISOString() : undefined;
  if (!dbAvailable) {
    payment.status = status;
    payment.completedAt = completedAt;
    return payment;
  }
  return { ...payment, status, completedAt };
};

export const applyDiscount = async (id: string, discountAmount: number, discountReason?: string): Promise<Payment | null> => {
  const payment = await getPaymentById(id);
  if (!payment) return null;
  const newAmount = payment.amount - discountAmount;
  if (newAmount < 0) return null;
  if (!dbAvailable) {
    payment.amount = newAmount;
    payment.discountAmount = discountAmount;
    payment.discountReason = discountReason;
    return payment;
  }
  await query("UPDATE payments SET amount = ? WHERE id = ?", [newAmount, id]);
  return { ...payment, amount: newAmount, discountAmount, discountReason };
};

export const getPaymentDetails = async (orderId: string) => {
  const order = await getOrderById(orderId);
  if (!order) return null;
  const itemsAmount = order.totalAmount;
  const discountAmount = 0;
  const taxAmount = Math.round(itemsAmount * 0.1);
  const totalAmount = itemsAmount - discountAmount + taxAmount;
  return { orderId, itemsAmount, discountAmount, taxAmount, totalAmount, finalAmount: totalAmount };
};

export const getPaymentStatistics = async (startDate?: string, endDate?: string): Promise<any> => {
  if (!dbAvailable) {
    return { totalPayments: MOCK_PAYMENTS.length, totalAmount: 0, completedCount: 0, completedAmount: 0, pendingCount: 0, pendingAmount: 0, failedCount: 0, failedAmount: 0, averageAmount: 0, dateRange: { startDate: startDate || null, endDate: endDate || null } };
  }
  const conditions: string[] = [];
  const params: any[] = [];
  if (startDate) {
    conditions.push("paid_at >= ?");
    params.push(startDate);
  }
  if (endDate) {
    conditions.push("paid_at <= ?");
    params.push(endDate);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<any[]>(
    `SELECT
      COUNT(*) AS totalPayments,
      COALESCE(SUM(amount), 0) AS totalAmount,
      COUNT(*) AS completedCount,
      COALESCE(SUM(amount), 0) AS completedAmount,
      0 AS pendingCount,
      0 AS pendingAmount,
      0 AS failedCount,
      0 AS failedAmount
    FROM payments ${whereClause}`,
    params,
  );

  const result = rows[0] || {};
  const averageAmount = result.totalPayments > 0 ? result.totalAmount / result.totalPayments : 0;
  return { ...result, averageAmount, dateRange: { startDate: startDate || null, endDate: endDate || null } };
};

// ============================================================================
//  RESMANAGER SCHEMA — Table Areas & Tables (khớp với SQLQuery1.sql)
// ============================================================================

// Removed duplicate getTableAreas function

export const getResmanagerTables = async (areaId?: number): Promise<any[]> => {
  const sql = areaId
    ? `SELECT t.*, ta.name AS area_name
       FROM tables t
       JOIN table_areas ta ON t.area_id = ta.id
       WHERE t.is_deleted = 0 AND t.area_id = ?
       ORDER BY t.area_id, t.row_pos, t.col_pos`
    : `SELECT t.*, ta.name AS area_name
       FROM tables t
       JOIN table_areas ta ON t.area_id = ta.id
       WHERE t.is_deleted = 0
       ORDER BY t.area_id, t.row_pos, t.col_pos`;
  return areaId ? query<any[]>(sql, [areaId]) : query<any[]>(sql);
};

export const getResmanagerTableById = async (id: number | string): Promise<any | null> => {
  let targetId: any = id;
  const num = Number(id);
  if (!isNaN(num) && num > 0) targetId = num;
  else if (typeof id === "string") {
    const n = Number(id.replace(/^t/i, ""));
    if (!isNaN(n) && n > 0) targetId = n;
  }
  const rows = await query<any[]>(
    `SELECT t.*, ta.name AS area_name
     FROM tables t
     JOIN table_areas ta ON t.area_id = ta.id
     WHERE (t.id = ? OR t.name = ?) AND t.is_deleted = 0`,
    [targetId, String(id)],
  );
  return rows[0] || null;
};

export const updateResmanagerTableStatus = async (
  id: number | string,
  status: TableStatus,
  maintenanceNote?: string,
): Promise<ResmanagerTableStatusUpdateResult | null> => {
  let targetId: number | string = id;
  const num = Number(id);
  if (!isNaN(num) && num > 0) targetId = num;
  else if (typeof id === "string") {
    const n = Number(id.replace(/^t/i, ""));
    if (!isNaN(n) && n > 0) targetId = n;
  }

  // Luôn kiểm tra bàn có tồn tại không trước khi update
  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();
    const [selectedRows] = await connection.query<TableIdRow[]>(
      `SELECT id FROM tables
       WHERE (id = ? OR name = ?) AND is_deleted = 0
       FOR UPDATE`,
      [targetId, String(id)],
    );
    const selectedTable = selectedRows[0];
    if (!selectedTable) {
      await connection.rollback();
      return null;
    }

    const mergedPrimaryTableId = await resolveMergedTableRootInTransaction(connection, selectedTable.id);
    const [groupOwnerRows] = await connection.query<TableIdRow[]>(
      `SELECT primary_table_id AS id
       FROM table_group_seatings
       WHERE assigned_table_id = ? AND status = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1`,
      [mergedPrimaryTableId, GROUP_SEATING_STATUS.ACTIVE],
    );
    const primaryTableId = groupOwnerRows[0]?.id ?? mergedPrimaryTableId;
    const [clusterRows] = await connection.query<TableIdRow[]>(
      `SELECT id FROM tables
       WHERE (id = ? OR merged_into_table_id = ?) AND is_deleted = 0
       FOR UPDATE`,
      [primaryTableId, primaryTableId],
    );
    const [groupRows] = await connection.query<TableIdRow[]>(
      `SELECT assigned_table_id AS id
       FROM table_group_seatings
       WHERE primary_table_id = ? AND status = ?
       FOR UPDATE`,
      [primaryTableId, GROUP_SEATING_STATUS.ACTIVE],
    );
    const updatedTableIds = [...new Set([...clusterRows, ...groupRows].map((table) => table.id))];
    if (updatedTableIds.length === 0) {
      throw new TableMergeValidationError("Không tìm thấy cụm bàn cần cập nhật.");
    }
    const tablePlaceholders = updatedTableIds.map(() => "?").join(", ");

    if (status === TABLE_STATUS.MAINTENANCE && maintenanceNote) {
      await connection.query(
        `UPDATE tables SET status = ?, maintenance_note = ?
         WHERE id IN (${tablePlaceholders}) AND is_deleted = 0`,
        [status, maintenanceNote, ...updatedTableIds],
      );
    } else if (status === TABLE_STATUS.EMPTY) {
      await connection.query(
        `UPDATE tables
         SET status = ?, maintenance_note = NULL, merged_into_table_id = NULL
         WHERE id IN (${tablePlaceholders}) AND is_deleted = 0`,
        [status, ...updatedTableIds],
      );
      await connection.query(
        `UPDATE orders
         SET is_early_payment = 0, is_early_paid = 0
         WHERE table_id IN (${tablePlaceholders})`,
        [...updatedTableIds],
      ).catch(() => {});
    } else {
      await connection.query(
        `UPDATE tables SET status = ?
         WHERE id IN (${tablePlaceholders}) AND is_deleted = 0`,
        [status, ...updatedTableIds],
      );
    }

    if (status === TABLE_STATUS.PENDING_PAYMENT) {
      const [splitRows] = await connection.query<any[]>(
        "SELECT id FROM table_split_sessions WHERE parent_table_id = ? AND status = 'active'",
        [primaryTableId]
      );
      if (!splitRows || splitRows.length === 0) {
        await connection.query(
          `UPDATE orders SET status = ?
           WHERE table_id = ? AND status IN (?, ?)`,
          [ORDER_STATUS.PENDING_PAYMENT, primaryTableId, ORDER_STATUS.OPEN, ORDER_STATUS.SERVING],
        );
      }
    } else if (status === TABLE_STATUS.SERVING) {
      const [splitRows] = await connection.query<any[]>(
        "SELECT id FROM table_split_sessions WHERE parent_table_id = ? AND status = 'active'",
        [primaryTableId]
      );
      if (!splitRows || splitRows.length === 0) {
        await connection.query(
          `UPDATE orders SET status = ?
           WHERE table_id = ? AND status = ?`,
          [ORDER_STATUS.SERVING, primaryTableId, ORDER_STATUS.PENDING_PAYMENT],
        );
      }
    } else if (status === TABLE_STATUS.EMPTY) {
      await connection.query(
        `UPDATE table_merges
         SET status = ?, resolved_at = NOW()
         WHERE primary_table_id = ? AND status = ?`,
        [TABLE_MERGE_STATUS.RESOLVED, primaryTableId, TABLE_MERGE_STATUS.ACTIVE],
      );
      await connection.query(
        `UPDATE table_group_seatings
         SET status = ?, resolved_at = NOW()
         WHERE primary_table_id = ? AND status = ?`,
        [GROUP_SEATING_STATUS.RESOLVED, primaryTableId, GROUP_SEATING_STATUS.ACTIVE],
      );
    }

    await connection.commit();
    return { primaryTableId, updatedTableIds };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const createResmanagerTable = async (table: {
  area_id: number;
  name: string;
  capacity: number;
  row_pos: string;
  col_pos: number;
}): Promise<any> => {
  const result = await query<any>(
    `INSERT INTO tables (area_id, name, capacity, row_pos, col_pos, status, is_deleted)
     VALUES (?, ?, ?, ?, ?, 'empty', 0)`,
    [table.area_id, table.name, table.capacity, table.row_pos.toUpperCase(), table.col_pos]
  );
  return { id: result.insertId, ...table, status: "empty", is_deleted: 0 };
};

export const updateResmanagerTable = async (
  id: number,
  table: {
    area_id?: number;
    name?: string;
    capacity?: number;
    row_pos?: string;
    col_pos?: number;
  }
): Promise<boolean> => {
  const fields: string[] = [];
  const params: any[] = [];
  
  if (table.area_id !== undefined) { fields.push("area_id = ?"); params.push(table.area_id); }
  if (table.name !== undefined) { fields.push("name = ?"); params.push(table.name); }
  if (table.capacity !== undefined) { fields.push("capacity = ?"); params.push(table.capacity); }
  if (table.row_pos !== undefined) { fields.push("row_pos = ?"); params.push(table.row_pos.toUpperCase()); }
  if (table.col_pos !== undefined) { fields.push("col_pos = ?"); params.push(table.col_pos); }
  
  if (fields.length === 0) return false;
  
  params.push(id);
  const result = await query<any>(
    `UPDATE tables SET ${fields.join(", ")} WHERE id = ? AND is_deleted = 0`,
    params
  );
  return result.affectedRows > 0;
};

export const checkTableCoordinatesOccupied = async (
  areaId: number,
  rowPos: string,
  colPos: number,
  excludeTableId?: number
): Promise<{ id: number; name: string } | null> => {
  const queryStr = excludeTableId
    ? `SELECT id, name FROM tables WHERE area_id = ? AND row_pos = ? AND col_pos = ? AND is_deleted = 0 AND id != ? LIMIT 1`
    : `SELECT id, name FROM tables WHERE area_id = ? AND row_pos = ? AND col_pos = ? AND is_deleted = 0 LIMIT 1`;
  const params = excludeTableId
    ? [areaId, rowPos.toUpperCase(), colPos, excludeTableId]
    : [areaId, rowPos.toUpperCase(), colPos];
  const rows = await query<any[]>(queryStr, params);
  return rows.length > 0 ? rows[0] : null;
};

export const getResmanagerTableCoordinates = async (
  id: number
): Promise<{ area_id: number; row_pos: string; col_pos: number } | null> => {
  const rows = await query<any[]>(
    `SELECT area_id, row_pos, col_pos FROM tables WHERE id = ? AND is_deleted = 0 LIMIT 1`,
    [id]
  );
  return rows.length > 0 ? rows[0] : null;
};

export const deleteResmanagerTable = async (id: number): Promise<boolean> => {
  const result = await query<any>(
    `UPDATE tables SET is_deleted = 1, deleted_at = CURRENT_TIMESTAMP WHERE id = ? AND is_deleted = 0`,
    [id]
  );
  return result.affectedRows > 0;
};

export const hasActiveOrdersForTable = async (tableId: number): Promise<boolean> => {
  const rows = await query<any[]>(
    `SELECT 1 FROM orders WHERE table_id = ? AND status NOT IN ('completed', 'cancelled') LIMIT 1`,
    [tableId]
  );
  return rows.length > 0;
};

export const hasActiveBookingsForTable = async (tableId: number): Promise<boolean> => {
  const rows = await query<{ id: number }[]>(
    `SELECT b.id
     FROM bookings b
     WHERE b.status IN (?, ?)
       AND (
         b.table_id = ?
         OR EXISTS (
           SELECT 1
           FROM booking_table_assignments bta
           WHERE bta.booking_id = b.id AND bta.table_id = ?
         )
       )
     LIMIT 1`,
    [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, tableId, tableId]
  );
  return rows.length > 0;
};

interface ActiveTableBookingRow {
  id: number;
}

interface LoyaltyCustomerRow extends mysql.RowDataPacket {
  id: number;
  loyalty_points: number;
  member_level: string;
}

interface TierVoucherRow extends mysql.RowDataPacket {
  id: number;
  code: string;
  type: "percent" | "fixed";
  value: number;
  min_order: number;
  points_cost: number;
  required_member_level: MemberLevel;
  is_redeemed: number;
}

interface VoucherRedemptionRow extends mysql.RowDataPacket {
  id: number;
  code: string;
  points_cost: number;
  max_uses: number | null;
  used_count: number;
  required_member_level: MemberLevel | null;
}

interface CustomerVoucherRow extends mysql.RowDataPacket {
  id: number;
}

/** Represents a controlled business error returned by loyalty voucher redemption. */
export class LoyaltyVoucherRedemptionError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = "LoyaltyVoucherRedemptionError";
    this.statusCode = statusCode;
  }
}

interface WalkInBookingConflictRow {
  id: number;
  booking_clock: string;
}

/** Checks whether a table belongs to a booking whose three-hour service window is in progress. */
export const hasBookingInProgressForTable = async (
  tableId: number,
  currentTime: string,
): Promise<boolean> => {
  const rows = await query<ActiveTableBookingRow[]>(
    `SELECT b.id
     FROM bookings b
     WHERE b.status IN (?, ?)
       AND b.start_time <= ?
       AND b.end_time > ?
       AND (
         b.table_id = ?
         OR EXISTS (
           SELECT 1
           FROM booking_table_assignments bta
           WHERE bta.booking_id = b.id AND bta.table_id = ?
         )
       )
     LIMIT 1`,
    [
      BOOKING_STATUS.PENDING,
      BOOKING_STATUS.CONFIRMED,
      currentTime,
      currentTime,
      tableId,
      tableId,
    ],
  );
  return rows.length > 0;
};

/**
 * Finds a scheduled booking that overlaps the full service window of a walk-in.
 * A walk-in occupies the table for the standard booking duration, so a future
 * booking in that period must be protected before an order is opened.
 */
export const getWalkInBookingConflictForTable = async (
  tableId: number,
  currentTime: string,
): Promise<WalkInBookingConflictRow | null> => {
  const rows = await query<WalkInBookingConflictRow[]>(
    `SELECT b.id, DATE_FORMAT(b.start_time, '%H:%i') AS booking_clock
     FROM bookings b
     WHERE b.status IN (?, ?)
       AND b.start_time < DATE_ADD(?, INTERVAL ${BOOKING_DURATION_MINUTES} MINUTE)
       AND b.end_time > ?
       AND (
         b.table_id = ?
         OR EXISTS (
           SELECT 1
           FROM booking_table_assignments bta
           WHERE bta.booking_id = b.id AND bta.table_id = ?
         )
       )
     ORDER BY b.start_time ASC, b.id ASC
     LIMIT 1`,
    [
      BOOKING_STATUS.PENDING,
      BOOKING_STATUS.CONFIRMED,
      currentTime,
      currentTime,
      tableId,
      tableId,
    ],
  );
  return rows[0] ?? null;
};

// ============================================================================
//  RESMANAGER SCHEMA — Bookings
// ============================================================================

export interface AvailableBookingTable {
  id: number;
  name: string;
  capacity: number;
  area_name: string | null;
}

interface BookingAllocationTable extends AvailableBookingTable {
  status: TableStatus;
  area_id: number | null;
  row_pos: string | null;
  col_pos: number | null;
}

export const BOOKING_ALLOCATION_KIND = {
  SINGLE: "single",
  ADJACENT: "adjacent",
  SEPARATE: "separate",
} as const;

export type BookingAllocationKind = (typeof BOOKING_ALLOCATION_KIND)[keyof typeof BOOKING_ALLOCATION_KIND];

export interface BookingTableAllocationOption {
  primaryTable: AvailableBookingTable;
  tables: AvailableBookingTable[];
  totalCapacity: number;
  allocationKind: BookingAllocationKind;
}

/** Returns tables free for the whole requested interval, including multi-table booking conflicts. */
const getBookingTablesFreeForInterval = async (
  startTime: string,
  endTime: string,
): Promise<BookingAllocationTable[]> => {
  const rows = await query<BookingAllocationTable[]>(
    `SELECT t.id, t.name, t.capacity, t.status, t.area_id, t.row_pos, t.col_pos, a.name AS area_name
     FROM tables t
     LEFT JOIN table_areas a ON a.id = t.area_id
     WHERE t.is_deleted = 0
       AND t.status <> ?
       AND NOT EXISTS (
         SELECT 1
         FROM bookings b
         WHERE b.table_id = t.id
           AND b.status IN (?, ?)
           AND b.start_time < ?
           AND b.end_time > ?
       )
       AND NOT EXISTS (
         SELECT 1
         FROM booking_table_assignments bta
         JOIN bookings b ON b.id = bta.booking_id
         WHERE bta.table_id = t.id
           AND b.status IN (?, ?)
           AND b.start_time < ?
           AND b.end_time > ?
       )
     ORDER BY t.capacity ASC, t.name ASC`,
    [
      TABLE_STATUS.MAINTENANCE,
      BOOKING_STATUS.PENDING,
      BOOKING_STATUS.CONFIRMED,
      endTime,
      startTime,
      BOOKING_STATUS.PENDING,
      BOOKING_STATUS.CONFIRMED,
      endTime,
      startTime,
    ],
  );

  return rows.map((row) => ({
    ...row,
    id: Number(row.id),
    capacity: Number(row.capacity),
    area_id: row.area_id === null ? null : Number(row.area_id),
    col_pos: row.col_pos === null ? null : Number(row.col_pos),
  }));
};

/** Converts internal allocation rows into the public booking table shape. */
const toAvailableBookingTable = (table: BookingAllocationTable): AvailableBookingTable => ({
  id: table.id,
  name: table.name,
  capacity: table.capacity,
  area_name: table.area_name,
});

/** Builds a stable unique key for a table allocation candidate. */
const getBookingAllocationKey = (tables: AvailableBookingTable[]): string =>
  tables.map((table) => table.id).sort((left, right) => left - right).join(",");

/** Adds one allocation option if it serves the party and was not already generated. */
const addBookingAllocationOption = (
  options: BookingTableAllocationOption[],
  uniqueKeys: Set<string>,
  tables: BookingAllocationTable[],
  partySize: number,
  allocationKind: BookingAllocationKind,
): void => {
  const totalCapacity = tables.reduce((total, table) => total + table.capacity, 0);
  const publicTables = tables.map(toAvailableBookingTable);
  const key = getBookingAllocationKey(publicTables);
  if (tables.length === 0 || totalCapacity < partySize || uniqueKeys.has(key)) return;

  uniqueKeys.add(key);
  options.push({
    primaryTable: publicTables[0],
    tables: publicTables,
    totalCapacity,
    allocationKind,
  });
};

/** Selects the smallest-capacity non-adjacent table combination that can serve the booking party. */
const getBestSeparateBookingAllocation = (
  tables: BookingAllocationTable[],
  partySize: number,
): BookingAllocationTable[] => {
  const largestTableCapacity = Math.max(...tables.map((table) => table.capacity));
  const maximumRelevantCapacity = partySize + largestTableCapacity - 1;
  const combinationsByCapacity = new Map<number, BookingAllocationTable[]>([[0, []]]);

  for (const table of [...tables].sort((left, right) => right.capacity - left.capacity || left.name.localeCompare(right.name))) {
    const currentCombinations = [...combinationsByCapacity.entries()];
    for (const [capacity, combination] of currentCombinations) {
      if (combination.length >= MAX_BOOKING_ALLOCATION_TABLES) continue;

      const nextCapacity = capacity + table.capacity;
      if (nextCapacity > maximumRelevantCapacity) continue;

      const nextCombination = [...combination, table];
      const existingCombination = combinationsByCapacity.get(nextCapacity);
      if (!existingCombination || nextCombination.length < existingCombination.length) {
        combinationsByCapacity.set(nextCapacity, nextCombination);
      }
    }
  }

  const bestMatch = [...combinationsByCapacity.entries()]
    .filter(([capacity]) => capacity >= partySize)
    .sort(([leftCapacity, leftTables], [rightCapacity, rightTables]) =>
      leftCapacity - rightCapacity || leftTables.length - rightTables.length,
    )[0];

  return bestMatch?.[1] ?? [];
};

/** Finds allocation options, preferring one table then physically adjacent tables before separate zones. */
export const getAvailableBookingTableOptions = async (
  partySize: number,
  startTime: string,
  endTime: string,
): Promise<BookingTableAllocationOption[]> => {
  const tables = await getBookingTablesFreeForInterval(startTime, endTime);
  const options: BookingTableAllocationOption[] = [];
  const uniqueKeys = new Set<string>();

  for (const table of tables.filter((item) => item.capacity >= partySize)) {
    addBookingAllocationOption(options, uniqueKeys, [table], partySize, BOOKING_ALLOCATION_KIND.SINGLE);
  }

  const tablesByRow = new Map<string, BookingAllocationTable[]>();
  for (const table of tables) {
    if (table.area_id === null || table.row_pos === null || table.col_pos === null) continue;
    const rowKey = `${table.area_id}:${table.row_pos}`;
    const rowTables = tablesByRow.get(rowKey) ?? [];
    rowTables.push(table);
    tablesByRow.set(rowKey, rowTables);
  }

  for (const rowTables of tablesByRow.values()) {
    const sortedTables = [...rowTables].sort((left, right) => (left.col_pos ?? 0) - (right.col_pos ?? 0));
    for (let startIndex = 0; startIndex < sortedTables.length; startIndex += 1) {
      const candidate: BookingAllocationTable[] = [];
      for (let index = startIndex; index < sortedTables.length; index += 1) {
        const previous = candidate[candidate.length - 1];
        const current = sortedTables[index];
        if (previous && (current.col_pos ?? 0) - (previous.col_pos ?? 0) > 1) break;
        candidate.push(current);
        addBookingAllocationOption(options, uniqueKeys, candidate, partySize, BOOKING_ALLOCATION_KIND.ADJACENT);
        if (candidate.length >= MAX_BOOKING_ALLOCATION_TABLES) break;
      }
    }
  }

  const separateCandidate = getBestSeparateBookingAllocation(tables, partySize);
  addBookingAllocationOption(options, uniqueKeys, separateCandidate, partySize, BOOKING_ALLOCATION_KIND.SEPARATE);

  return options.sort((left, right) => {
    const kindRank = {
      [BOOKING_ALLOCATION_KIND.SINGLE]: 0,
      [BOOKING_ALLOCATION_KIND.ADJACENT]: 1,
      [BOOKING_ALLOCATION_KIND.SEPARATE]: 2,
    } as const;
    return kindRank[left.allocationKind] - kindRank[right.allocationKind]
      || left.tables.length - right.tables.length
      || left.totalCapacity - right.totalCapacity;
  });
};

/**
 * Returns tables that can accommodate a party and have no overlapping active booking.
 * This is the single availability source used by both web booking and Telegram.
 */
export const getAvailableBookingTables = async (
  partySize: number,
  startTime: string,
  endTime: string,
): Promise<AvailableBookingTable[]> => {
  const tables = await getBookingTablesFreeForInterval(startTime, endTime);
  return tables.filter((table) => table.capacity >= partySize).map(toAvailableBookingTable);
};

export const getBookings = async (status?: string): Promise<any[]> => {
  const rows = status
    ? await query<any[]>(
        `SELECT b.*, t.name AS table_name, a.name AS area_name
         FROM bookings b
         LEFT JOIN tables t ON b.table_id = t.id
         LEFT JOIN table_areas a ON t.area_id = a.id
         WHERE b.status = ?
         ORDER BY b.start_time DESC`,
        [status],
      )
    : await query<any[]>(
        `SELECT b.*, t.name AS table_name, a.name AS area_name
         FROM bookings b
         LEFT JOIN tables t ON b.table_id = t.id
         LEFT JOIN table_areas a ON t.area_id = a.id
         ORDER BY b.start_time DESC`,
      );

  if (rows.length === 0) return [];

  const bookingIds = rows.map((b) => b.id);
  const placeholders = bookingIds.map(() => "?").join(",");
  const items = await query<any[]>(
    `SELECT bmi.*, mi.name AS menu_item_name
     FROM booking_menu_items bmi
     JOIN menu_items mi ON bmi.menu_item_id = mi.id
     WHERE bmi.booking_id IN (${placeholders})`,
    bookingIds,
  );
  const assignments = await query<{ booking_id: number; table_id: number; table_name: string; allocated_capacity: number }[]>(
    `SELECT bta.booking_id, bta.table_id, t.name AS table_name, bta.allocated_capacity
     FROM booking_table_assignments bta
     JOIN tables t ON t.id = bta.table_id
     WHERE bta.booking_id IN (${placeholders})
     ORDER BY bta.is_primary DESC, t.name ASC`,
    bookingIds,
  );

  const itemMap = new Map<number, any[]>();
  const assignmentMap = new Map<number, { table_id: number; table_name: string; allocated_capacity: number }[]>();
  for (const item of items) {
    if (!itemMap.has(item.booking_id)) {
      itemMap.set(item.booking_id, []);
    }
    itemMap.get(item.booking_id)!.push(item);
  }
  for (const assignment of assignments) {
    const currentAssignments = assignmentMap.get(Number(assignment.booking_id)) ?? [];
    currentAssignments.push(assignment);
    assignmentMap.set(Number(assignment.booking_id), currentAssignments);
  }

  for (const row of rows) {
    row.pre_ordered_items = itemMap.get(row.id) || [];
    const tableAssignments = assignmentMap.get(Number(row.id)) ?? [];
    if (tableAssignments.length > 0) {
      row.table_ids = tableAssignments.map((assignment) => assignment.table_id);
      row.table_names = tableAssignments.map((assignment) => assignment.table_name).join(", ");
      row.total_capacity = tableAssignments.reduce(
        (total, assignment) => total + Number(assignment.allocated_capacity),
        0,
      );
    }
  }

  return rows;
};

/** Input used to filter the staff booking calendar without mixing it with table status. */
export interface BookingScheduleFilters {
  tableId?: number;
  startDate?: string;
  endDate?: string;
  includeCancelled?: boolean;
  mode?: BookingScheduleMode;
}

/** Calendar row returned to staff screens for one booking and all tables allocated to it. */
export interface BookingScheduleRow {
  id: number;
  confirmation_code: string;
  guest_name: string;
  guest_phone: string;
  guest_email: string | null;
  party_size: number;
  start_time: string;
  end_time: string;
  status: string;
  guest_note: string | null;
  note: string | null;
  primary_table_id: number;
  primary_table_name: string;
  table_names: string;
  table_ids: string;
  total_capacity: number;
  check_in_open_at: string;
  check_in_close_at: string;
}

/** A confirmed or pending booking interval that blocks a table's calendar. */
export interface BookingTableBookedInterval {
  start_time: string;
  end_time: string;
}

/** Calendar availability data for one named table on one restaurant-local day. */
export interface BookingTableAvailability {
  id: number;
  name: string;
  capacity: number;
  bookedIntervals: BookingTableBookedInterval[];
}

/** Returns bookings in a date range, including every table allocated to a group booking. */
export const getBookingSchedule = async (
  filters: BookingScheduleFilters = {},
): Promise<BookingScheduleRow[]> => {
  const conditions: string[] = [];
  const params: Array<string | number> = [];

  if (filters.mode === BOOKING_SCHEDULE_MODE.CURRENT) {
    conditions.push("b.status IN (?, ?)");
    params.push(BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED);
  } else if (filters.mode === BOOKING_SCHEDULE_MODE.HISTORY) {
    conditions.push("b.status IN (?, ?)");
    params.push(BOOKING_STATUS.COMPLETED, BOOKING_STATUS.CANCELLED);
  } else if (!filters.includeCancelled) {
    conditions.push("b.status <> ?");
    params.push(BOOKING_STATUS.CANCELLED);
  }
  if (filters.startDate) {
    conditions.push("b.start_time >= ?");
    params.push(`${filters.startDate} 00:00:00`);
  }
  if (filters.endDate) {
    conditions.push("b.start_time < DATE_ADD(?, INTERVAL 1 DAY)");
    params.push(`${filters.endDate} 00:00:00`);
  }
  if (filters.tableId !== undefined) {
    conditions.push("(bta.table_id = ? OR (bta.booking_id IS NULL AND b.table_id = ?))");
    params.push(filters.tableId, filters.tableId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const orderByClause = filters.mode === BOOKING_SCHEDULE_MODE.HISTORY
    ? "ORDER BY b.end_time DESC, b.id DESC"
    : "ORDER BY b.start_time ASC, b.id ASC";
  return query<BookingScheduleRow[]>(
    `SELECT b.id, b.confirmation_code, b.guest_name, b.guest_phone, b.guest_email,
            b.party_size, b.start_time, b.end_time, b.status, b.guest_note, b.note,
            b.table_id AS primary_table_id, primary_table.name AS primary_table_name,
            COALESCE(agg.table_names, primary_table.name) AS table_names,
            COALESCE(agg.table_ids, CAST(b.table_id AS CHAR)) AS table_ids,
            COALESCE(agg.total_capacity, primary_table.capacity) AS total_capacity,
            DATE_SUB(b.start_time, INTERVAL ${BOOKING_CHECK_IN_EARLY_MINUTES} MINUTE) AS check_in_open_at,
            DATE_SUB(b.end_time, INTERVAL ${BOOKING_CHECK_IN_EARLY_MINUTES} MINUTE) AS check_in_close_at
     FROM bookings b
     LEFT JOIN tables primary_table ON primary_table.id = b.table_id
     /* Dùng subquery thay vì double-JOIN để tránh Cartesian product và lỗi SUM(DISTINCT) */
     LEFT JOIN (
       SELECT bta_agg.booking_id,
              GROUP_CONCAT(t_agg.name ORDER BY bta_agg.is_primary DESC, t_agg.name SEPARATOR ', ') AS table_names,
              GROUP_CONCAT(CAST(t_agg.id AS CHAR) ORDER BY bta_agg.is_primary DESC, t_agg.name) AS table_ids,
              SUM(bta_agg.allocated_capacity) AS total_capacity
       FROM booking_table_assignments bta_agg
       JOIN tables t_agg ON t_agg.id = bta_agg.table_id
       GROUP BY bta_agg.booking_id
     ) AS agg ON agg.booking_id = b.id
     /* Chỉ dùng bta để lọc theo tableId (không ảnh hưởng đến SELECT) */
     LEFT JOIN booking_table_assignments bta ON bta.booking_id = b.id
     ${whereClause}
     GROUP BY b.id
     ${orderByClause}`,
    params,
  );
};


/** Returns a table's booking intervals that overlap the requested restaurant-local day. */
export const getBookingTableAvailabilityForDate = async (
  tableName: string,
  date: string,
): Promise<BookingTableAvailability | null> => {
  const normalizedTableName = tableName.trim().toUpperCase();
  const tableRows = await query<AvailableBookingTable[]>(
    `SELECT t.id, t.name, t.capacity, a.name AS area_name
     FROM tables t
     LEFT JOIN table_areas a ON a.id = t.area_id
     WHERE UPPER(t.name) = ? AND t.is_deleted = 0
     LIMIT 1`,
    [normalizedTableName],
  );
  const table = tableRows[0];
  if (!table) return null;

  const dayStart = `${date} 00:00:00`;
  const bookedIntervals = await query<BookingTableBookedInterval[]>(
    `SELECT DATE_FORMAT(GREATEST(b.start_time, ?), '%H:%i') AS start_time,
            DATE_FORMAT(LEAST(b.end_time, DATE_ADD(?, INTERVAL 1 DAY)), '%H:%i') AS end_time
     FROM bookings b
     WHERE b.status IN (?, ?)
       AND b.start_time < DATE_ADD(?, INTERVAL 1 DAY)
       AND b.end_time > ?
       AND (
         b.table_id = ?
         OR EXISTS (
           SELECT 1
           FROM booking_table_assignments bta
           WHERE bta.booking_id = b.id AND bta.table_id = ?
         )
       )
     ORDER BY b.start_time ASC, b.id ASC`,
    [
      dayStart,
      dayStart,
      BOOKING_STATUS.PENDING,
      BOOKING_STATUS.CONFIRMED,
      dayStart,
      dayStart,
      table.id,
      table.id,
    ],
  );

  return {
    id: Number(table.id),
    name: table.name,
    capacity: Number(table.capacity),
    bookedIntervals,
  };
};

export const getBookingById = async (id: number): Promise<any | null> => {
  const rows = await query(`
    SELECT b.*, t.name AS table_name, a.name AS area_name
    FROM bookings b
    LEFT JOIN tables t ON b.table_id = t.id
    LEFT JOIN table_areas a ON t.area_id = a.id
    WHERE b.id = ?
  `, [id]);
  if (!rows[0]) return null;

  const booking = rows[0];
  const items = await query(`
    SELECT bmi.*, mi.name AS menu_item_name
    FROM booking_menu_items bmi
    JOIN menu_items mi ON bmi.menu_item_id = mi.id
    WHERE bmi.booking_id = ?
  `, [id]);
  booking.pre_ordered_items = items;
  booking.table_assignments = await query(
    `SELECT bta.table_id, bta.is_primary, bta.allocated_capacity, t.name AS table_name, a.name AS area_name
     FROM booking_table_assignments bta
     JOIN tables t ON t.id = bta.table_id
     LEFT JOIN table_areas a ON a.id = t.area_id
     WHERE bta.booking_id = ?
     ORDER BY bta.is_primary DESC, t.name ASC`,
    [id],
  );
  return booking;
};

export const createBooking = async (data: any): Promise<any> => {
  const requestedPartySize = Number(data.party_size);
  const rawTableIds: unknown[] = Array.isArray(data.table_ids) ? data.table_ids : [data.table_id];
  const requestedTableIds = [...new Set(
    rawTableIds
      .map((tableId) => Number(tableId))
      .filter((tableId): tableId is number => Number.isInteger(tableId)),
  )];
  const requestedPrimaryTableId = Number(data.table_id);
  if (!Number.isInteger(requestedPrimaryTableId) || !requestedTableIds.includes(requestedPrimaryTableId)) {
    throw new Error("Cụm bàn đặt trước không hợp lệ.");
  }
  const isOnlineBooking = !data.booking_channel || data.booking_channel === "online" || data.booking_channel === "ONLINE";
  if (!isOnlineBooking) {
    const availableOptions = await getAvailableBookingTableOptions(
      requestedPartySize,
      data.start_time,
      data.end_time,
    );
    const requestedOptionKey = requestedTableIds.sort((left, right) => left - right).join(",");
    const selectedTableIsAvailable = availableOptions.some(
      (option) => option.primaryTable.id === requestedPrimaryTableId
        && getBookingAllocationKey(option.tables) === requestedOptionKey,
    );
    if (!selectedTableIsAvailable) {
      throw new Error("Bàn không còn trống hoặc không đủ sức chứa trong khung giờ đã chọn.");
    }
  }

  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();

    // Lock requested tables to prevent concurrent bookings
    const tablePlaceholders = requestedTableIds.map(() => "?").join(",");
    await connection.query(`SELECT id FROM tables WHERE id IN (${tablePlaceholders}) FOR UPDATE`, requestedTableIds);

    // Kiểm tra trùng lịch đặt bàn (Overbooking prevention - bỏ qua nếu là đặt online)
    if (!isOnlineBooking) {
      const [overlaps] = await connection.query<any[]>(`
        SELECT b.id FROM bookings b
        WHERE b.table_id IN (${tablePlaceholders}) AND b.status IN (?, ?)
          AND b.start_time < ? AND b.end_time > ?
        UNION
        SELECT b.id FROM booking_table_assignments bta
        JOIN bookings b ON b.id = bta.booking_id
        WHERE bta.table_id IN (${tablePlaceholders}) AND b.status IN (?, ?)
          AND b.start_time < ? AND b.end_time > ?
        LIMIT 1
      `, [
        ...requestedTableIds,
        BOOKING_STATUS.PENDING,
        BOOKING_STATUS.CONFIRMED,
        data.end_time,
        data.start_time,
        ...requestedTableIds,
        BOOKING_STATUS.PENDING,
        BOOKING_STATUS.CONFIRMED,
        data.end_time,
        data.start_time,
      ]);

      if (overlaps.length > 0) {
        throw new Error("Khung giờ đặt bàn này đã bị trùng với lịch đặt khác trên cùng bàn!");
      }
    }

    // Validate customer_id to prevent foreign key constraint failure
    let validCustomerId: number | null = null;
    if (data.customer_id) {
      const [custRows] = await connection.query<any[]>("SELECT id FROM customers WHERE id = ? AND is_deleted = 0 LIMIT 1", [data.customer_id]);
      if (custRows.length > 0) {
        validCustomerId = Number(custRows[0].id);
      }
    }
    if (!validCustomerId && data.guest_phone) {
      const [custByPhone] = await connection.query<any[]>("SELECT id FROM customers WHERE phone = ? AND is_deleted = 0 LIMIT 1", [data.guest_phone]);
      if (custByPhone.length > 0) {
        validCustomerId = Number(custByPhone[0].id);
      }
    }

    // Validate promotion_id to prevent foreign key constraint failure
    let validPromotionId: number | null = null;
    if (data.promotion_id) {
      const [promoRows] = await connection.query<any[]>("SELECT id FROM promotions WHERE id = ? LIMIT 1", [data.promotion_id]);
      if (promoRows.length > 0) {
        validPromotionId = Number(promoRows[0].id);
      }
    }

    const code = `BK${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${Math.floor(1000 + Math.random() * 9000)}`;
    
    let preOrderTotal = 0;
    let depositAmount = 0;
    let depositStatus = 'none';
    const preOrderedItems = data.pre_ordered_items || data.items || [];

    if (preOrderedItems.length > 0) {
      const itemIds = preOrderedItems.map((item: any) => item.menu_item_id);
      const placeholders = itemIds.map(() => "?").join(",");
      const [menuItems] = await connection.query<any[]>(
        `SELECT id, price FROM menu_items WHERE id IN (${placeholders})`,
        itemIds
      );
      
      const priceMap = new Map<string, number>();
      menuItems.forEach((item: any) => {
        priceMap.set(String(item.id), Number(item.price));
      });

      preOrderedItems.forEach((item: any) => {
        const price = priceMap.get(String(item.menu_item_id)) || 0;
        preOrderTotal += price * item.quantity;
      });

      depositAmount = preOrderTotal * 0.20;
      depositStatus = 'unpaid';
    }

    const [result] = await connection.query<mysql.ResultSetHeader>(`
      INSERT INTO bookings (
        table_id, customer_id, promotion_id, guest_name, guest_phone, guest_email,
        party_size, start_time, end_time, confirmation_code, status, 
        guest_note, note, pre_order_total, deposit_amount, deposit_status
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
    `, [
      data.table_id,
      validCustomerId,
      validPromotionId,
      data.guest_name,
      data.guest_phone,
      data.guest_email || data.email || null,
      data.party_size,
      data.start_time,
      data.end_time,
      code,
      data.guest_note || null,
      data.note || null,
      preOrderTotal,
      depositAmount,
      depositStatus
    ]);
    const insertId = result.insertId;

    const [assignedTables] = await connection.query<any[]>(
      `SELECT id, name, capacity, NULL AS area_name FROM tables WHERE id IN (${tablePlaceholders})`,
      requestedTableIds,
    );
    const assignmentPlaceholders = assignedTables.map(() => "(?, ?, ?, ?)").join(",");
    const assignmentValues: number[] = [];
    for (const table of assignedTables) {
      assignmentValues.push(
        insertId,
        Number(table.id),
        Number(table.id) === requestedPrimaryTableId ? 1 : 0,
        Number(table.capacity),
      );
    }
    await connection.query(
      `INSERT INTO booking_table_assignments (booking_id, table_id, is_primary, allocated_capacity) VALUES ${assignmentPlaceholders}`,
      assignmentValues,
    );

    if (preOrderedItems.length > 0) {
      const placeholders = preOrderedItems.map(() => "(?, ?, ?, ?)").join(",");
      const insertParams: any[] = [];
      
      const itemIds = preOrderedItems.map((item: any) => item.menu_item_id);
      const [menuItems] = await connection.query<any[]>(
        `SELECT id, price FROM menu_items WHERE id IN (${itemIds.map(() => "?").join(",")})`,
        itemIds
      );
      const priceMap = new Map<string, number>();
      menuItems.forEach((item: any) => {
        priceMap.set(String(item.id), Number(item.price));
      });

      preOrderedItems.forEach((item: any) => {
        const price = priceMap.get(String(item.menu_item_id)) || 0;
        insertParams.push(insertId, item.menu_item_id, item.quantity, price);
      });

      await connection.query(
        `INSERT INTO booking_menu_items (booking_id, menu_item_id, quantity, unit_price) VALUES ${placeholders}`,
        insertParams
      );

      const [orderResult] = await connection.query<mysql.ResultSetHeader>(`
        INSERT INTO orders (table_id, booking_id, customer_id, created_by, order_type, note, guest_name, guest_phone, guest_count, status)
        VALUES (?, ?, ?, ?, 'pre_order', ?, ?, ?, ?, 'open')
      `, [
        data.table_id,
        insertId,
        validCustomerId || null,
        1,
        data.guest_note ? `[Booking ${code}] ${data.guest_note}` : `[Booking ${code}] Đơn đặt món trước`,
        data.guest_name,
        data.guest_phone,
        data.party_size
      ]);
      const preOrderId = orderResult.insertId;

      for (const item of preOrderedItems) {
        if (!item.menu_item_id || !item.quantity) continue;
        const price = priceMap.get(String(item.menu_item_id)) || 0;
        await connection.query(`
          INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, kitchen_note, status)
          VALUES (?, ?, ?, ?, ?, 'pre_order')
        `, [
          preOrderId,
          item.menu_item_id,
          item.quantity,
          price,
          data.note || `Món đặt trước - Booking ${code}`
        ]);
      }
    }

    await connection.commit();
    const bookingDetails = await getBookingById(insertId);
    return bookingDetails;
  } catch (err) {
    await connection.rollback();
    throw err;
  } finally {
    connection.release();
  }
};

export const transferBookingItemsToOrder = async (tableId: number, orderId: string): Promise<void> => {
  const activeBookings = await query<any[]>(
    `SELECT id FROM bookings WHERE table_id = ? AND status IN ('pending', 'confirmed') ORDER BY start_time ASC LIMIT 1`,
    [tableId]
  );
  if (activeBookings.length === 0) return;
  const bookingId = activeBookings[0].id;

  const items = await query<any[]>(
    `SELECT menu_item_id, quantity, unit_price FROM booking_menu_items WHERE booking_id = ?`,
    [bookingId]
  );

  if (items.length > 0) {
    const insertedIds: number[] = [];
    for (const item of items) {
      const insertResult = await query<any>(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, status) VALUES (?, ?, ?, ?, 'waiting_kitchen')`,
        [orderId, item.menu_item_id, item.quantity, item.unit_price]
      );
      insertedIds.push(insertResult.insertId);
    }
    console.log(`✅ Transferred ${items.length} items from booking ${bookingId} to order ${orderId}`);
    if (insertedIds.length > 0) {
      await processReuseForOrderItems(insertedIds);
    }
  }
};

interface BookingCheckInRow extends mysql.RowDataPacket {
  id: number;
  table_id: number;
  customer_id: number | null;
  guest_name: string;
  guest_phone: string;
  party_size: number;
  guest_note: string | null;
  status: string;
}

interface BookingCheckInTableRow extends mysql.RowDataPacket {
  id: number;
}

interface BookingCheckInPhysicalTableRow extends mysql.RowDataPacket {
  id: number;
  name: string;
  status: string;
}

interface BookingCheckInOrderRow extends mysql.RowDataPacket {
  id: number;
}

interface BookingCheckInResult {
  orderId: number;
  bookingId: number;
  primaryTableId: number;
  updatedTableIds: number[];
}

/**
 * Seats a booked party only inside its operational arrival window and preserves the booking
 * as an active calendar record until the linked order is paid.
 */
export const checkInScheduledBooking = async (
  requestedTableId: number,
  bookingId: number,
  createdBy: number,
): Promise<BookingCheckInResult> => {
  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();
    const now = formatVietnamBookingDateTime();
    const [bookingRows] = await connection.query<BookingCheckInRow[]>(
      `SELECT b.id, b.table_id, b.customer_id, b.guest_name, b.guest_phone,
              b.party_size, b.guest_note, b.status
       FROM bookings b
       WHERE b.id = ?
         AND (b.table_id = ? OR EXISTS (
           SELECT 1 FROM booking_table_assignments bta
           WHERE bta.booking_id = b.id AND bta.table_id = ?
         ))
       FOR UPDATE`,
      [bookingId, requestedTableId, requestedTableId],
    );
    const booking = bookingRows[0];
    if (!booking) {
      throw new Error("Không tìm thấy lịch đặt cho bàn này.");
    }
    if (booking.status !== BOOKING_STATUS.PENDING && booking.status !== BOOKING_STATUS.CONFIRMED) {
      throw new Error("Lịch đặt này không còn có thể nhận khách.");
    }

    const [checkInWindowRows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT CASE
         WHEN ? < DATE_SUB(start_time, INTERVAL ${BOOKING_CHECK_IN_EARLY_MINUTES} MINUTE) THEN 'before'
         WHEN ? > DATE_SUB(end_time, INTERVAL ${BOOKING_CHECK_IN_EARLY_MINUTES} MINUTE) THEN 'expired'
         ELSE 'open'
       END AS check_in_state
       FROM bookings WHERE id = ?`,
      [now, now, bookingId],
    );
    const checkInState = String(checkInWindowRows[0]?.check_in_state ?? "expired");
    if (checkInState === "before") {
      throw new Error(`Chỉ có thể mở bàn trước giờ đặt ${BOOKING_CHECK_IN_EARLY_MINUTES} phút.`);
    }
    if (checkInState === "expired") {
      throw new Error("Đã quá thời gian nhận khách của lịch đặt này. Vui lòng tạo booking mới hoặc liên hệ quản lý.");
    }

    const [bookingTableRows] = await connection.query<BookingCheckInTableRow[]>(
      `SELECT table_id AS id FROM booking_table_assignments WHERE booking_id = ?
       UNION SELECT table_id AS id FROM bookings WHERE id = ?`,
      [bookingId, bookingId],
    );
    const bookingTableIds = [...new Set(bookingTableRows.map((row) => Number(row.id)))];
    if (bookingTableIds.length === 0) {
      throw new Error("Lịch đặt chưa được gán bàn.");
    }
    const tablePlaceholders = bookingTableIds.map(() => "?").join(", ");
    const [physicalTableRows] = await connection.query<BookingCheckInPhysicalTableRow[]>(
      `SELECT id, name, status FROM tables WHERE id IN (${tablePlaceholders}) FOR UPDATE`,
      bookingTableIds,
    );
    if (physicalTableRows.length !== bookingTableIds.length) {
      throw new Error("Không thể xác định đầy đủ các bàn đã gán cho lịch đặt.");
    }
    const unavailableTables = physicalTableRows.filter((table) => table.status !== TABLE_STATUS.EMPTY);
    if (unavailableTables.length > 0) {
      const tableNames = unavailableTables.map((table) => table.name).join(", ");
      throw new Error(`Bàn ${tableNames} chưa sẵn sàng để nhận khách mới.`);
    }
    const [activeOrderRows] = await connection.query<BookingCheckInOrderRow[]>(
      `SELECT id FROM orders
       WHERE table_id IN (${tablePlaceholders})
         AND status IN (?, ?, ?)
         AND order_type <> 'pre_order'
       FOR UPDATE`,
      [
        ...bookingTableIds,
        ORDER_STATUS.OPEN,
        ORDER_STATUS.SERVING,
        ORDER_STATUS.PENDING_PAYMENT,
      ],
    );
    if (activeOrderRows.length > 0) {
      throw new Error("Bàn vẫn đang phục vụ khách trước. Không thể mở lịch đặt kế tiếp cho đến khi bàn được thanh toán và dọn xong.");
    }

    const [preOrderRows] = await connection.query<BookingCheckInOrderRow[]>(
      `SELECT id FROM orders
       WHERE booking_id = ? AND order_type = 'pre_order'
         AND status IN (?, ?)
       ORDER BY created_at DESC, id DESC LIMIT 1
       FOR UPDATE`,
      [bookingId, ORDER_STATUS.OPEN, ORDER_STATUS.SERVING],
    );
    const preOrder = preOrderRows[0];
    let orderId: number;
    const insertedItemIds: number[] = [];
    if (preOrder) {
      orderId = Number(preOrder.id);
      await connection.query(
        `UPDATE orders
         SET table_id = ?, created_by = ?, order_type = ?, status = ?,
             guest_name = ?, guest_phone = ?, guest_count = ?
         WHERE id = ?`,
        [
          booking.table_id,
          createdBy,
          "dine_in",
          ORDER_STATUS.OPEN,
          booking.guest_name,
          booking.guest_phone,
          booking.party_size,
          orderId,
        ],
      );
      await connection.query(
        `UPDATE order_items SET status = 'pending', is_held = 0
         WHERE order_id = ? AND status = 'pre_order'`,
        [orderId],
      );
    } else {
      const [orderResult] = await connection.query<mysql.ResultSetHeader>(
        `INSERT INTO orders (
          table_id, booking_id, customer_id, created_by, order_type, note,
          guest_name, guest_phone, guest_count, status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          booking.table_id,
          booking.id,
          booking.customer_id,
          createdBy,
          "dine_in",
          booking.guest_note,
          booking.guest_name,
          booking.guest_phone,
          booking.party_size,
          ORDER_STATUS.OPEN,
        ],
      );
      orderId = Number(orderResult.insertId);
      const [preOrderedItemRows] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT menu_item_id, quantity, unit_price
         FROM booking_menu_items WHERE booking_id = ?`,
        [bookingId],
      );
      for (const item of preOrderedItemRows) {
        const [insertResult] = await connection.query<mysql.ResultSetHeader>(
          `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, status)
           VALUES (?, ?, ?, ?, 'waiting_kitchen')`,
          [orderId, item.menu_item_id, item.quantity, item.unit_price],
        );
        insertedItemIds.push(insertResult.insertId);
      }
    }

    await connection.query(
      `UPDATE tables SET status = ? WHERE id IN (${tablePlaceholders})`,
      [TABLE_STATUS.SERVING, ...bookingTableIds],
    );
    await connection.commit();

    if (insertedItemIds.length > 0) {
      await processReuseForOrderItems(insertedItemIds);
    }
    return {
      orderId,
      bookingId,
      primaryTableId: Number(booking.table_id),
      updatedTableIds: bookingTableIds,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};


export const updateBookingStatus = async (
  id: number,
  status: string,
  userId?: number,
  cancelReason?: string
): Promise<boolean> => {
  const booking = await getBookingById(id);
  if (!booking) return false;

  let noteValue: string | null = null;
  if (status === 'cancelled' && cancelReason) {
    noteValue = cancelReason;
  } else if (userId) {
    noteValue = `Updated by staff id: ${userId}`;
  }

  if (noteValue !== null) {
    await query(`
      UPDATE bookings SET status = ?, note = ? WHERE id = ?
    `, [status, noteValue, id]);
  } else {
    await query(`
      UPDATE bookings SET status = ? WHERE id = ?
    `, [status, id]);
  }

  // Booking status is a calendar state. Physical table status changes only when staff seats,
  // serves, cleans, or closes a table, so future schedules never reserve a physical table all day.
  return true;
};

export const deleteCancelledBooking = async (id: number): Promise<boolean> => {
  const result = await query(`
    DELETE FROM bookings WHERE id = ? AND status = 'cancelled'
  `, [id]);
  return result.affectedRows > 0;
};

export const payBookingDeposit = async (id: number): Promise<boolean> => {
  const booking = await getBookingById(id);
  if (!booking) return false;

  await query(`
    UPDATE bookings 
    SET deposit_status = 'paid' 
    WHERE id = ?
  `, [id]);
  return true;
};

export const ensureEarlyPaymentColumns = async (): Promise<void> => {
  try {
    const earlyPaymentColumn = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'is_early_payment'`,
    ).catch(() => []);
    if (!earlyPaymentColumn || earlyPaymentColumn.length === 0) {
      await query(`ALTER TABLE orders ADD COLUMN is_early_payment TINYINT(1) NOT NULL DEFAULT 0`).catch(() => {});
      await query(`ALTER TABLE orders ADD COLUMN is_early_paid TINYINT(1) NOT NULL DEFAULT 0`).catch(() => {});
      console.log("Migration: added orders.is_early_payment and orders.is_early_paid");
    }
  } catch (err) {
    console.error("Error ensuring early payment columns:", err);
  }
};

export const ensureRefundColumns = async (): Promise<void> => {
  try {
    const colOrderItems = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'is_refunded'`,
    ).catch(() => []);
    if (!colOrderItems || colOrderItems.length === 0) {
      await query(`ALTER TABLE order_items ADD COLUMN is_refunded TINYINT(1) NOT NULL DEFAULT 0`).catch(() => {});
      await query(`ALTER TABLE order_items ADD COLUMN refunded_at DATETIME NULL`).catch(() => {});
      await query(`ALTER TABLE order_items ADD COLUMN refund_reason VARCHAR(255) NULL`).catch(() => {});
      await query(`ALTER TABLE order_items ADD COLUMN refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0`).catch(() => {});
      console.log("Migration: added order_items refund columns");
    }

    const colOrders = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders' AND COLUMN_NAME = 'refunded_total'`,
    ).catch(() => []);
    if (!colOrders || colOrders.length === 0) {
      await query(`ALTER TABLE orders ADD COLUMN refunded_total DECIMAL(12,2) NOT NULL DEFAULT 0`).catch(() => {});
      await query(`ALTER TABLE orders ADD COLUMN has_refund TINYINT(1) NOT NULL DEFAULT 0`).catch(() => {});
      console.log("Migration: added orders refund columns");
    }
  } catch (err) {
    console.error("Error ensuring refund columns:", err);
  }
};

export const ensureResmanagerTablesSchema = async (): Promise<void> => {
  try {
    await ensureEarlyPaymentColumns();
    await ensureRefundColumns();

    // 1. Ensure table_merges.status and extra columns
    const tmCols = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'table_merges'`,
    ).catch(() => []);
    if (tmCols && tmCols.length > 0) {
      const tmSet = new Set(tmCols.map((c) => String(c.COLUMN_NAME)));
      if (!tmSet.has("status")) {
        await query(`ALTER TABLE table_merges ADD COLUMN status ENUM('active','resolved') NOT NULL DEFAULT 'active'`).catch(() => {});
      }
      if (!tmSet.has("primary_order_id")) {
        await query(`ALTER TABLE table_merges ADD COLUMN primary_order_id INT NULL`).catch(() => {});
      }
      if (!tmSet.has("merged_order_id")) {
        await query(`ALTER TABLE table_merges ADD COLUMN merged_order_id INT NULL`).catch(() => {});
      }
      if (!tmSet.has("merged_by")) {
        await query(`ALTER TABLE table_merges ADD COLUMN merged_by INT NULL`).catch(() => {});
      }
      if (!tmSet.has("resolved_at")) {
        await query(`ALTER TABLE table_merges ADD COLUMN resolved_at DATETIME NULL`).catch(() => {});
      }
    }

    // 2. Ensure tables.merged_into_table_id
    const tCols = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tables' AND COLUMN_NAME = 'merged_into_table_id'`,
    ).catch(() => []);
    if (!tCols || tCols.length === 0) {
      await query(`ALTER TABLE tables ADD COLUMN merged_into_table_id INT NULL`).catch(() => {});
    }

    // 3. Ensure orders.merged_into_order_id & booking_id & guest_count
    const oCols = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'orders'`,
    ).catch(() => []);
    if (oCols && oCols.length > 0) {
      const oSet = new Set(oCols.map((c) => String(c.COLUMN_NAME)));
      if (!oSet.has("merged_into_order_id")) {
        await query(`ALTER TABLE orders ADD COLUMN merged_into_order_id INT NULL`).catch(() => {});
      }
      if (!oSet.has("booking_id")) {
        await query(`ALTER TABLE orders ADD COLUMN booking_id INT NULL`).catch(() => {});
      }
      if (!oSet.has("guest_count")) {
        await query(`ALTER TABLE orders ADD COLUMN guest_count INT NULL`).catch(() => {});
      }
    }

    // 4. Ensure bookings deposit columns
    const bCols = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'deposit_amount'`,
    ).catch(() => []);
    if (!bCols || bCols.length === 0) {
      await query(`
        ALTER TABLE bookings 
        ADD COLUMN pre_order_total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        ADD COLUMN deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        ADD COLUMN deposit_status ENUM('none', 'unpaid', 'paid', 'refunded', 'completed') NOT NULL DEFAULT 'none'
      `).catch(() => {});
    }

    // 5. Ensure table_splits.status and extra columns
    const tsCols = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'table_splits'`,
    ).catch(() => []);
    if (tsCols && tsCols.length > 0) {
      const tsSet = new Set(tsCols.map((c) => String(c.COLUMN_NAME)));
      if (!tsSet.has("status")) {
        await query(`ALTER TABLE table_splits ADD COLUMN status ENUM('active', 'paid', 'cancelled') NOT NULL DEFAULT 'active'`).catch(() => {});
      }
      if (!tsSet.has("split_session_id")) {
        await query(`ALTER TABLE table_splits ADD COLUMN split_session_id INT NULL`).catch(() => {});
      }
      if (!tsSet.has("guest_count")) {
        await query(`ALTER TABLE table_splits ADD COLUMN guest_count INT NOT NULL DEFAULT 1`).catch(() => {});
      }
      if (!tsSet.has("closed_at")) {
        await query(`ALTER TABLE table_splits ADD COLUMN closed_at DATETIME NULL`).catch(() => {});
      }
    }
  } catch (err) {
    console.error("Error in ensureResmanagerTablesSchema:", err);
  }
};

// ===== RESMANAGER TABLE DATABASE OPERATIONS =====
export const getResmanagerTablesWithExtra = async (areaId?: number): Promise<any[]> => {
  await ensureResmanagerTablesSchema();
  let sql = `
    SELECT t.*, a.name AS area_name,
           COALESCE(NULLIF(o.guest_name, ''), b.guest_name) AS guest_name,
           COALESCE(NULLIF(o.guest_phone, ''), b.guest_phone) AS guest_phone,
           COALESCE(NULLIF(o.guest_count, 0), b.party_size, (SELECT party_size FROM bookings WHERE table_id = t.id AND status IN ('pending', 'confirmed') ORDER BY start_time ASC LIMIT 1)) AS guest_count,
           DATE_FORMAT(COALESCE(o.created_at, b.start_time), '%H:%i %d/%m/%Y') AS start_time,
           COALESCE(NULLIF(o.note, ''), b.guest_note) AS guest_note,
           b.confirmation_code AS booking_code,
           b.id AS booking_id,
           COALESCE(b.deposit_amount, 0) AS deposit_amount,
           o.id AS active_order_id,
           o.order_type AS active_order_type,
           COALESCE(o.is_early_payment, 0) AS is_early_payment,
           COALESCE(o.is_early_paid, 0) AS is_early_paid
    FROM tables t
    LEFT JOIN table_areas a ON t.area_id = a.id
    LEFT JOIN orders o ON o.id = (
      SELECT id FROM orders
      WHERE table_id = t.id AND (status IN ('open', 'serving', 'pending_payment') OR (status = 'completed' AND is_early_paid = 1)) AND order_type <> 'pre_order'
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    )
    LEFT JOIN bookings b ON b.id = o.booking_id
    WHERE t.is_deleted = 0
  `;
  const params: any[] = [];
  if (areaId !== undefined) {
    sql += " AND t.area_id = ?";
    params.push(areaId);
  }
  sql += " ORDER BY t.name ASC";
  const rows = await query<any[]>(sql, params);

  const results = [];
  for (const r of rows) {
    const mergedTo = await query<TableMergeDisplayRow[]>(
      `SELECT t.id, t.name, t.capacity
       FROM tables t
       WHERE t.id = COALESCE(?, (
         SELECT primary_table_id
         FROM table_merges
         WHERE merged_table_id = ? AND status = ?
         ORDER BY merged_at DESC, id DESC
         LIMIT 1
       ))`,
      [r.merged_into_table_id, r.id, TABLE_MERGE_STATUS.ACTIVE],
    );
    const mergedChildren = await query<TableMergeDisplayRow[]>(
      `SELECT t.id, t.name, t.capacity
       FROM tables t
       WHERE t.merged_into_table_id = ? AND t.is_deleted = 0
       ORDER BY t.name ASC`,
      [r.id],
    );
    const clusterPrimaryTableId = mergedTo[0]?.id ?? Number(r.id);
    const clusterTables = await query<TableMergeDisplayRow[]>(
      `SELECT t.id, t.name, t.capacity
       FROM tables t
       WHERE (t.id = ? OR t.merged_into_table_id = ?) AND t.is_deleted = 0
       ORDER BY t.name ASC`,
      [clusterPrimaryTableId, clusterPrimaryTableId],
    );
    const clusterCapacity = clusterTables.reduce((total, table) => total + Number(table.capacity), 0);
    const groupOwner = await query<GroupSeatingDisplayRow[]>(
      `SELECT p.id, p.name, p.capacity, gs.group_code
       FROM table_group_seatings gs
       JOIN tables p ON p.id = gs.primary_table_id
       WHERE gs.assigned_table_id = ? AND gs.status = ?
       ORDER BY gs.created_at DESC, gs.id DESC
       LIMIT 1`,
      [r.id, GROUP_SEATING_STATUS.ACTIVE],
    );
    const groupPrimaryTableId = groupOwner[0]?.id ?? Number(r.id);
    const groupChildren = await query<GroupSeatingDisplayRow[]>(
      `SELECT t.id, t.name, t.capacity, gs.group_code, a.name AS area_name
       FROM table_group_seatings gs
       JOIN tables t ON t.id = gs.assigned_table_id
       LEFT JOIN table_areas a ON a.id = t.area_id
       WHERE gs.primary_table_id = ? AND gs.status = ?
       ORDER BY t.area_id, t.row_pos, t.col_pos`,
      [groupPrimaryTableId, GROUP_SEATING_STATUS.ACTIVE],
    );
    const groupPrimaryCluster = await query<TableMergeDisplayRow[]>(
      `SELECT id, name, capacity
       FROM tables
       WHERE (id = ? OR merged_into_table_id = ?) AND is_deleted = 0`,
      [groupPrimaryTableId, groupPrimaryTableId],
    );
    const groupCapacity = groupPrimaryCluster.reduce((total, table) => total + Number(table.capacity), 0)
      + groupChildren.reduce((total, table) => total + Number(table.capacity), 0);
    const splits = await query("SELECT child_label FROM table_splits WHERE parent_table_id = ? AND status = 'active'", [r.id]);

    let preOrderedItems: any[] = [];
    if (r.active_order_id && r.active_order_type === 'pre_order') {
      preOrderedItems = await query(`
        SELECT oi.id, oi.menu_item_id, m.name, oi.quantity, oi.unit_price, oi.kitchen_note, oi.status
        FROM order_items oi
        JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = ? AND oi.status != 'voided'
      `, [r.active_order_id]);
    } else if (r.booking_id && (!r.active_order_id || r.active_order_type !== 'pre_order')) {
      const preOrders = await query(`
        SELECT id FROM orders WHERE table_id = ? AND order_type = 'pre_order' AND status IN ('open', 'serving') LIMIT 1
      `, [r.id]);
      if (preOrders.length > 0) {
        preOrderedItems = await query(`
          SELECT oi.id, oi.menu_item_id, m.name, oi.quantity, oi.unit_price, oi.kitchen_note, oi.status
          FROM order_items oi
          JOIN menu_items m ON oi.menu_item_id = m.id
          WHERE oi.order_id = ? AND oi.status != 'voided'
        `, [preOrders[0].id]);
      }
    }

    results.push({
      ...r,
      // A booking is calendar data; do not turn an otherwise empty physical table into reserved.
      status: r.status,
      deposit_amount: Number(r.deposit_amount || 0),
      pre_ordered_items: preOrderedItems,
      is_merged_child: mergedTo.length > 0,
      merged_into: mergedTo.length > 0 ? mergedTo[0] : null,
       is_merged_primary: mergedChildren.length > 0,
       merged_tables: mergedChildren,
       cluster_capacity: clusterCapacity || Number(r.capacity),
       is_group_seating_child: groupOwner.length > 0,
       group_seating_into: groupOwner.length > 0 ? groupOwner[0] : null,
       is_group_seating_primary: groupChildren.length > 0,
       group_seating_tables: groupChildren,
       group_seating_code: groupOwner[0]?.group_code ?? groupChildren[0]?.group_code ?? null,
       group_seating_capacity: groupChildren.length > 0 || groupOwner.length > 0
         ? groupCapacity
         : null,
       is_split: splits.length > 0,
      split_labels: splits.map((s: any) => s.child_label)
    });
  }
  return results;
};

export const getEmptyTablesForBooking = async (startTime?: string, endTime?: string): Promise<any[]> => {
  if (startTime && endTime) {
    return getBookingTablesFreeForInterval(startTime, endTime);
  }
  let sql = `
    SELECT t.*, a.name AS area_name
    FROM tables t
    LEFT JOIN table_areas a ON t.area_id = a.id
    WHERE t.status = 'empty' AND t.is_deleted = 0
  `;
  const params: any[] = [];
  if (startTime) {
    sql += `
      AND t.id NOT IN (
        SELECT table_id FROM bookings 
        WHERE status IN ('pending', 'confirmed') 
          AND ? BETWEEN start_time AND end_time
      )
    `;
    params.push(startTime);
  }
  sql += " ORDER BY t.name ASC";
  return query(sql, params);
};



interface TableTransferTableRow extends mysql.RowDataPacket {
  id: number;
  name: string;
  status: TableStatus;
  merged_into_table_id: number | null;
}

interface TableTransferOrderRow extends mysql.RowDataPacket {
  id: number;
  table_id: number;
  booking_id: number | null;
  status: string;
}

interface TableTransferBookingRow extends mysql.RowDataPacket {
  start_time: Date;
  table_name: string;
}

interface TableTransferClusterRow extends mysql.RowDataPacket {
  id: number;
}

export interface TableTransferResult {
  orderId: number;
  bookingId: number | null;
  sourceTableId: number;
  targetTableId: number;
  sourceTableName: string;
  targetTableName: string;
  sourceStatus: TableStatus;
  targetStatus: TableStatus;
}

/** Error raised when an operational table transfer violates a business rule. */
export class TableTransferValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TableTransferValidationError";
  }
}

/** Return a printable time label for a conflicting scheduled booking. */
const formatTransferBookingTime = (startTime: Date | string): string => new Date(startTime).toLocaleTimeString("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
});

/** Transfer one standalone active order while retaining booking data and an immutable audit record. */
export const transferResmanagerOrder = async (
  sourceTableId: number,
  targetTableId: number,
  transferredBy: number | null,
  reason?: string,
): Promise<TableTransferResult> => {
  if (!Number.isInteger(sourceTableId) || sourceTableId <= 0
    || !Number.isInteger(targetTableId) || targetTableId <= 0) {
    throw new TableTransferValidationError("ID bàn nguồn và bàn đích phải hợp lệ.");
  }
  if (sourceTableId === targetTableId) {
    throw new TableTransferValidationError("Bàn nguồn và bàn đích phải khác nhau.");
  }

  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();
    const [tableRows] = await connection.query<TableTransferTableRow[]>(
      `SELECT id, name, status, merged_into_table_id
       FROM tables
       WHERE id IN (?, ?) AND is_deleted = 0
       FOR UPDATE`,
      [sourceTableId, targetTableId],
    );
    if (tableRows.length !== 2) {
      throw new TableTransferValidationError("Không tìm thấy bàn nguồn hoặc bàn đích.");
    }

    const sourceTable = tableRows.find((table) => table.id === sourceTableId);
    const targetTable = tableRows.find((table) => table.id === targetTableId);
    if (!sourceTable || !targetTable) {
      throw new TableTransferValidationError("Không thể xác định bàn nguồn hoặc bàn đích.");
    }
    if (targetTable.status !== TABLE_STATUS.EMPTY) {
      throw new TableTransferValidationError(`Bàn ${targetTable.name} không trống, không thể chuyển khách vào.`);
    }

    const [mergeRows] = await connection.query<TableTransferClusterRow[]>(
      `SELECT id
       FROM table_merges
       WHERE status = ?
         AND (primary_table_id IN (?, ?) OR merged_table_id IN (?, ?))
       FOR UPDATE`,
      [TABLE_MERGE_STATUS.ACTIVE, sourceTableId, targetTableId, sourceTableId, targetTableId],
    );
    const [groupRows] = await connection.query<TableTransferClusterRow[]>(
      `SELECT id
       FROM table_group_seatings
       WHERE status = ?
         AND (primary_table_id IN (?, ?) OR assigned_table_id IN (?, ?))
       FOR UPDATE`,
      [GROUP_SEATING_STATUS.ACTIVE, sourceTableId, targetTableId, sourceTableId, targetTableId],
    );
    if (sourceTable.merged_into_table_id !== null || targetTable.merged_into_table_id !== null
      || mergeRows.length > 0 || groupRows.length > 0) {
      throw new TableTransferValidationError("Không thể chuyển bàn đang thuộc cụm gộp hoặc đoàn. Hãy tách/hoàn tất cụm trước.");
    }

    const [sourceOrders] = await connection.query<TableTransferOrderRow[]>(
      `SELECT id, table_id, booking_id, status
       FROM orders
       WHERE table_id = ?
         AND status IN (?, ?)
         AND (order_type IS NULL OR order_type <> ?)
       ORDER BY created_at DESC, id DESC
       FOR UPDATE`,
      [sourceTableId, ORDER_STATUS.OPEN, ORDER_STATUS.SERVING, ORDER_TYPE.PRE_ORDER],
    );
    if (sourceOrders.length === 0) {
      throw new TableTransferValidationError(`Bàn ${sourceTable.name} không có order đang phục vụ để chuyển.`);
    }
    if (sourceOrders.length > 1) {
      throw new TableTransferValidationError(`Bàn ${sourceTable.name} có nhiều order đang hoạt động, cần xử lý dữ liệu trước khi chuyển.`);
    }

    const [targetOrders] = await connection.query<TableTransferOrderRow[]>(
      `SELECT id
       FROM orders
       WHERE table_id = ?
         AND status IN (?, ?, ?)
         AND (order_type IS NULL OR order_type <> ?)
       FOR UPDATE`,
      [targetTableId, ...ACTIVE_ORDER_STATUSES, ORDER_TYPE.PRE_ORDER],
    );
    if (targetOrders.length > 0) {
      throw new TableTransferValidationError(`Bàn ${targetTable.name} đang có order hoạt động, không thể chuyển khách vào.`);
    }

    const bookingWindowEnd = new Date(Date.now() + MERGE_BOOKING_LOOKAHEAD_MINUTES * 60 * 1000);
    const [upcomingBookings] = await connection.query<TableTransferBookingRow[]>(
      `SELECT b.start_time, t.name AS table_name
       FROM bookings b
       JOIN tables t ON t.id = b.table_id
       WHERE b.status IN (?, ?)
         AND b.start_time >= NOW()
         AND b.start_time < ?
         AND (
           b.table_id = ?
           OR EXISTS (
             SELECT 1
             FROM booking_table_assignments bta
             WHERE bta.booking_id = b.id AND bta.table_id = ?
           )
         )
       ORDER BY b.start_time ASC, b.id ASC
       LIMIT 1
       FOR UPDATE`,
      [BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED, bookingWindowEnd, targetTableId, targetTableId],
    );
    const blockingBooking = upcomingBookings[0];
    if (blockingBooking) {
      throw new TableTransferValidationError(
        `Bàn ${blockingBooking.table_name} có lịch khách đặt lúc ${formatTransferBookingTime(blockingBooking.start_time)}.`,
      );
    }

    const sourceOrder = sourceOrders[0];
    if (!sourceOrder) {
      throw new TableTransferValidationError("Không xác định được order cần chuyển.");
    }
    // Chuyển toàn bộ orders (bao gồm tất cả sub-orders thuộc bàn nếu có split session)
    for (const sOrder of sourceOrders) {
      await connection.query(
        `UPDATE orders SET table_id = ? WHERE id = ?`,
        [targetTableId, sOrder.id],
      );
    }
    await connection.query(
      `UPDATE table_splits SET parent_table_id = ? WHERE parent_table_id = ? AND status = 'active'`,
      [targetTableId, sourceTableId],
    );
    await connection.query(
      `UPDATE table_split_sessions SET parent_table_id = ? WHERE parent_table_id = ? AND status = 'active'`,
      [targetTableId, sourceTableId],
    );
    await connection.query(
      `UPDATE tables SET status = ? WHERE id = ?`,
      [TABLE_STATUS.CLEANING, sourceTableId],
    );
    await connection.query(
      `UPDATE tables SET status = ? WHERE id = ?`,
      [TABLE_STATUS.SERVING, targetTableId],
    );
    await connection.query(
      `INSERT INTO table_transfer_logs (
        order_id, booking_id, from_table_id, to_table_id, transferred_by, reason
      ) VALUES (?, ?, ?, ?, ?, ?)`,
      [sourceOrder.id, sourceOrder.booking_id, sourceTableId, targetTableId, transferredBy, reason ?? null],
    );

    await connection.commit();
    return {
      orderId: sourceOrder.id,
      bookingId: sourceOrder.booking_id,
      sourceTableId,
      targetTableId,
      sourceTableName: sourceTable.name,
      targetTableName: targetTable.name,
      sourceStatus: TABLE_STATUS.CLEANING,
      targetStatus: TABLE_STATUS.SERVING,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const mergeResmanagerTables = async (primaryTableId: number, mergedTableIds: number[]): Promise<boolean> => {
  // Tìm order đang phục vụ hoặc mở của bàn chính
  let primaryOrders = await query<any[]>("SELECT id FROM orders WHERE table_id = ? AND status IN ('open', 'serving', 'pending_payment') ORDER BY id DESC LIMIT 1", [primaryTableId]);
  let primaryOrderId = primaryOrders.length > 0 ? primaryOrders[0].id : null;

  for (const mergedId of mergedTableIds) {
    await query("INSERT INTO table_merges (primary_table_id, merged_table_id) VALUES (?, ?)", [primaryTableId, mergedId]);
    await query("UPDATE tables SET status = 'serving' WHERE id = ?", [mergedId]);

    // Lấy thông tin khách tốt nhất từ bàn phụ (từ order đang mở hoặc từ booking gần nhất)
    const mOrdersInfo = await query<any[]>(
      "SELECT * FROM orders WHERE table_id = ? AND status IN ('open', 'serving', 'pending_payment') ORDER BY id DESC LIMIT 1",
      [mergedId]
    );
    const mBookingsInfo = await query<any[]>(
      "SELECT guest_name, guest_phone, party_size AS guest_count, customer_id, guest_note AS note FROM bookings WHERE table_id = ? AND status IN ('pending', 'confirmed', 'completed') ORDER BY id DESC LIMIT 1",
      [mergedId]
    );
    const mOrderInfo = mOrdersInfo.length > 0 ? mOrdersInfo[0] : null;
    const mBookingInfo = mBookingsInfo.length > 0 ? mBookingsInfo[0] : null;

    const sourceGuestName = mOrderInfo?.guest_name || mBookingInfo?.guest_name || null;
    const sourceGuestPhone = mOrderInfo?.guest_phone || mBookingInfo?.guest_phone || null;
    const sourceGuestCount = Number(mOrderInfo?.guest_count || mBookingInfo?.guest_count || 0);
    const sourceCustomerId = mOrderInfo?.customer_id || mBookingInfo?.customer_id || null;
    const sourceNote = mOrderInfo?.note || mBookingInfo?.note || null;

    // Xử lý gộp đơn hàng / món ăn từ bàn phụ sang bàn chính
    const mergedOrders = await query<any[]>("SELECT id FROM orders WHERE table_id = ? AND status IN ('open', 'serving', 'pending_payment')", [mergedId]);
    for (const mOrder of mergedOrders) {
      if (!primaryOrderId) {
        // Nếu bàn chính chưa có order, chuyển order của bàn phụ thành order của bàn chính
        await query("UPDATE orders SET table_id = ? WHERE id = ?", [primaryTableId, mOrder.id]);
        primaryOrderId = mOrder.id;
      } else if (primaryOrderId !== mOrder.id) {
        // Nếu bàn chính đã có order, gộp tất cả món từ order bàn phụ sang order bàn chính
        await query("UPDATE order_items SET order_id = ? WHERE order_id = ?", [primaryOrderId, mOrder.id]);
        await query("UPDATE orders SET status = 'cancelled', note = CONCAT(COALESCE(note, ''), ' [Gộp vào bàn chính #${primaryTableId}]') WHERE id = ?", [mOrder.id]);
      }
    }

    // Nếu bàn phụ không có order nào nhưng có thông tin khách (ví dụ booking), mà bàn chính cũng chưa có order -> tạo order mới cho bàn chính mang thông tin khách
    if (!primaryOrderId && (sourceGuestName || sourceGuestPhone || sourceGuestCount > 0)) {
      const insertRes = await query<any>(
        `INSERT INTO orders (table_id, status, order_type, guest_name, guest_phone, guest_count, customer_id, note)
         VALUES (?, 'serving', 'dine_in', ?, ?, ?, ?, ?)`,
        [primaryTableId, sourceGuestName || null, sourceGuestPhone || null, sourceGuestCount || 0, sourceCustomerId || null, sourceNote || null]
      );
      primaryOrderId = insertRes.insertId;
    }

    // Nếu bàn chính đã có order (hoặc vừa được tạo/chuyển), cập nhật/bổ sung thông tin khách từ bàn phụ vào bàn chính
    if (primaryOrderId && (sourceGuestName || sourceGuestPhone || sourceGuestCount > 0 || sourceNote)) {
      const [currentPrimary] = await query<any[]>("SELECT * FROM orders WHERE id = ?", [primaryOrderId]);
      if (currentPrimary) {
        const isDefaultName = !currentPrimary.guest_name || currentPrimary.guest_name === 'Khách tại bàn' || currentPrimary.guest_name === 'Khách lẻ';
        const updatedGuestName = isDefaultName ? sourceGuestName : currentPrimary.guest_name;
        const updatedGuestPhone = currentPrimary.guest_phone || sourceGuestPhone;
        const updatedCustomerId = currentPrimary.customer_id || sourceCustomerId;
        const updatedGuestCount = (Number(currentPrimary.guest_count || 0) + sourceGuestCount) || sourceGuestCount || Number(currentPrimary.guest_count || 0);
        const updatedNote = [currentPrimary.note, sourceNote].filter(Boolean).join(" | ");

        await query(
          "UPDATE orders SET guest_name = ?, guest_phone = ?, customer_id = ?, guest_count = ?, note = ? WHERE id = ?",
          [updatedGuestName || null, updatedGuestPhone || null, updatedCustomerId || null, updatedGuestCount || 0, updatedNote || null, primaryOrderId]
        );
      }
    }
  }

  // Đảm bảo bàn chính cũng sang trạng thái serving
  await query("UPDATE tables SET status = 'serving' WHERE id = ?", [primaryTableId]);
  return true;
};

export const unmergeResmanagerTable = async (primaryTableId: number): Promise<boolean> => {
  const mergedTables = await query("SELECT merged_table_id FROM table_merges WHERE primary_table_id = ?", [primaryTableId]);
  for (const m of mergedTables) {
    // Chỉ trả bàn phụ về empty nếu trên bàn phụ không còn order nào active
    const activeOrders = await query<any[]>("SELECT id FROM orders WHERE table_id = ? AND status IN ('open', 'serving')", [m.merged_table_id]);
    if (activeOrders.length === 0) {
      await query("UPDATE tables SET status = 'empty' WHERE id = ?", [m.merged_table_id]);
    }
  }
  await query("DELETE FROM table_merges WHERE primary_table_id = ?", [primaryTableId]);
  return true;
};


interface MergeTableRow extends mysql.RowDataPacket {
  id: number;
  name: string;
  area_id: number;
  row_pos: string;
  col_pos: number;
  capacity: number;
  status: string;
  merged_into_table_id: number | null;
}

interface MergeOrderRow extends mysql.RowDataPacket {
  id: number;
  table_id: number;
  customer_id: number | null;
  created_by: number;
  order_type: string;
  status: string;
  note: string | null;
  guest_name: string | null;
  guest_phone: string | null;
  guest_count: number | null;
}

interface MergeBookingRow extends mysql.RowDataPacket {
  table_id: number;
  start_time: Date | string;
  table_name: string;
}

interface MergeGuestCountRow extends mysql.RowDataPacket {
  total_guest_count: number | null;
}

interface MergeInsertResult extends mysql.ResultSetHeader {
  insertId: number;
}

export interface TableMergeResult {
  primaryTableId: number;
  mergedTableIds: number[];
  primaryOrderId: number | null;
}

export interface ActiveOrderResolution {
  requestedTableId: number;
  primaryTableId: number;
  redirected: boolean;
  activeOrderId: number | null;
  activeOrder: ActiveOrderSummary | null;
}

/** Public operational fields for the current order of a merged-table cluster. */
export interface ActiveOrderSummary {
  id: number;
  tableId: number;
  status: string;
  guestName: string | null;
  guestPhone: string | null;
  guestCount: number | null;
}

/** Error raised for an invalid operational table merge without changing persisted data. */
export class TableMergeValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TableMergeValidationError";
  }
}

const ADJACENT_TABLE_GRID_DISTANCE = 1;

/** Return whether two tables share a physical edge in the same restaurant area. */
const areTablesPhysicallyAdjacent = (firstTable: MergeTableRow, secondTable: MergeTableRow): boolean => {
  if (firstTable.area_id !== secondTable.area_id) {
    return false;
  }

  const sameRow = firstTable.row_pos === secondTable.row_pos;
  const sameColumn = firstTable.col_pos === secondTable.col_pos;
  const rowDistance = Math.abs(firstTable.row_pos.charCodeAt(0) - secondTable.row_pos.charCodeAt(0));
  const columnDistance = Math.abs(firstTable.col_pos - secondTable.col_pos);

  return (sameRow && columnDistance === ADJACENT_TABLE_GRID_DISTANCE)
    || (sameColumn && rowDistance === ADJACENT_TABLE_GRID_DISTANCE);
};

/** Validate that new physical tables can connect to the existing primary-table cluster. */
const assertMergeTablesAreContiguous = (
  primaryTable: MergeTableRow,
  existingMergedTables: MergeTableRow[],
  requestedMergedTables: MergeTableRow[],
): void => {
  const connectedTables = [primaryTable, ...existingMergedTables];
  const pendingTables = [...requestedMergedTables];

  while (pendingTables.length > 0) {
    const nextTableIndex = pendingTables.findIndex((candidateTable) =>
      connectedTables.some((connectedTable) => areTablesPhysicallyAdjacent(connectedTable, candidateTable)),
    );
    if (nextTableIndex < 0) {
      const disconnectedNames = pendingTables.map((table) => table.name).join(", ");
      throw new TableMergeValidationError(
        `Chỉ có thể gộp các bàn liền kề. ${disconnectedNames} không nối liền với cụm ${primaryTable.name}.`,
      );
    }
    const [nextTable] = pendingTables.splice(nextTableIndex, 1);
    connectedTables.push(nextTable);
  }
};

/** Resolve a table to its direct merge root while rejecting corrupt cyclic chains. */
const resolveMergedTableRootInTransaction = async (
  connection: mysql.PoolConnection,
  tableId: number,
): Promise<number> => {
  let currentTableId = tableId;
  const visitedTableIds = new Set<number>();

  while (true) {
    if (visitedTableIds.has(currentTableId)) {
      throw new TableMergeValidationError("Phát hiện vòng lặp dữ liệu gộp bàn. Vui lòng liên hệ quản lý.");
    }
    visitedTableIds.add(currentTableId);

    const [rows] = await connection.query<MergeTableRow[]>(
      `SELECT id, merged_into_table_id
       FROM tables
       WHERE id = ? AND is_deleted = 0
       FOR UPDATE`,
      [currentTableId],
    );
    const currentTable = rows[0];
    if (!currentTable) {
      throw new TableMergeValidationError("Không tìm thấy bàn cần thao tác.");
    }
    if (currentTable.merged_into_table_id === null) {
      return currentTable.id;
    }
    currentTableId = Number(currentTable.merged_into_table_id);
  }
};

/** Resolve a table root for read flows such as opening an order from a merged child table. */
export const resolveResmanagerPrimaryTableId = async (tableId: number): Promise<number> => {
  let currentTableId = tableId;
  const visitedTableIds = new Set<number>();

  while (true) {
    if (visitedTableIds.has(currentTableId)) {
      throw new TableMergeValidationError("Phát hiện vòng lặp dữ liệu gộp bàn. Vui lòng liên hệ quản lý.");
    }
    visitedTableIds.add(currentTableId);

    const rows = await query<MergeTableRow[]>(
      `SELECT id, merged_into_table_id
       FROM tables
       WHERE id = ? AND is_deleted = 0`,
      [currentTableId],
    );
    const currentTable = rows[0];
    if (!currentTable) {
      throw new TableMergeValidationError("Không tìm thấy bàn cần thao tác.");
    }
    if (currentTable.merged_into_table_id === null) {
      return currentTable.id;
    }
    currentTableId = Number(currentTable.merged_into_table_id);
  }
};

/** Return the shared active order for a table or redirect a merged child to its root. */
export const getResmanagerActiveOrderForTable = async (tableId: number): Promise<ActiveOrderResolution> => {
  const mergedPrimaryTableId = await resolveResmanagerPrimaryTableId(tableId);
  const groupOwner = await query<TableIdRow[]>(
    `SELECT primary_table_id AS id
     FROM table_group_seatings
     WHERE assigned_table_id = ? AND status = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [mergedPrimaryTableId, GROUP_SEATING_STATUS.ACTIVE],
  );
  const primaryTableId = groupOwner[0]?.id ?? mergedPrimaryTableId;
  const statusPlaceholders = ACTIVE_ORDER_STATUSES.map(() => "?").join(", ");
  const orders = await query<MergeOrderRow[]>(
    `SELECT id, table_id, customer_id, created_by, order_type, status, note, guest_name, guest_phone, guest_count
     FROM orders
     WHERE table_id = ? AND (status IN (${statusPlaceholders}) OR (status = 'completed' AND is_early_paid = 1))
     ORDER BY created_at DESC, id DESC
     LIMIT 1`,
    [primaryTableId, ...ACTIVE_ORDER_STATUSES],
  );

  return {
    requestedTableId: tableId,
    primaryTableId,
    redirected: primaryTableId !== tableId,
    activeOrderId: orders[0]?.id ?? null,
    activeOrder: orders[0]
      ? {
          id: orders[0].id,
          tableId: orders[0].table_id,
          status: orders[0].status,
          guestName: orders[0].guest_name,
          guestPhone: orders[0].guest_phone,
          guestCount: orders[0].guest_count,
        }
      : null,
  };
};

/**
 * Allocate a large party across separate, available tables while keeping one root order and invoice.
 * Unlike a physical merge, assigned tables may be remote and remain individually visible on the map.
 */
export const arrangeGroupSeatingTransactionally = async (
  requestedPrimaryTableId: number,
  requestedAssignedTableIds: number[],
  createdBy: number | null,
): Promise<GroupSeatingResult> => {
  const assignedTableIds = [...new Set(requestedAssignedTableIds.map(Number))];
  if (assignedTableIds.length === 0 || assignedTableIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new TableMergeValidationError("Danh sách bàn xếp cho đoàn không hợp lệ.");
  }

  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();
    const primaryTableId = await resolveMergedTableRootInTransaction(connection, requestedPrimaryTableId);
    if (assignedTableIds.includes(primaryTableId) || assignedTableIds.includes(requestedPrimaryTableId)) {
      throw new TableMergeValidationError("Không thể xếp bàn chính vào chính đoàn của nó.");
    }

    const primaryClusterIdsRows = await connection.query<GroupSeatingTableRow[]>(
      `SELECT id, capacity
       FROM tables
       WHERE (id = ? OR merged_into_table_id = ?) AND is_deleted = 0
       FOR UPDATE`,
      [primaryTableId, primaryTableId],
    );
    const [primaryClusterRows] = primaryClusterIdsRows;
    const primaryClusterIds = primaryClusterRows.map((table) => table.id);

    const [primaryRows] = await connection.query<MergeTableRow[]>(
      `SELECT id, name, area_id, row_pos, col_pos, capacity, status, merged_into_table_id
       FROM tables
       WHERE id = ? AND is_deleted = 0
       FOR UPDATE`,
      [primaryTableId],
    );
    const primaryTable = primaryRows[0];
    if (!primaryTable) {
      throw new TableMergeValidationError("Không tìm thấy bàn chính của đoàn.");
    }
    const allowedPrimaryStatuses = new Set<string>([TABLE_STATUS.SERVING, TABLE_STATUS.RESERVED]);
    if (!allowedPrimaryStatuses.has(primaryTable.status)) {
      throw new TableMergeValidationError(`Bàn ${primaryTable.name} phải đang phục vụ hoặc đã đặt trước để xếp bàn đoàn.`);
    }

    const assignedPlaceholders = assignedTableIds.map(() => "?").join(", ");
    const [assignedTables] = await connection.query<MergeTableRow[]>(
      `SELECT id, name, area_id, row_pos, col_pos, capacity, status, merged_into_table_id
       FROM tables
       WHERE id IN (${assignedPlaceholders}) AND is_deleted = 0
       FOR UPDATE`,
      assignedTableIds,
    );
    if (assignedTables.length !== assignedTableIds.length) {
      throw new TableMergeValidationError("Có bàn xếp cho đoàn không tồn tại hoặc đã bị xóa.");
    }

    const [physicalMergeRows] = await connection.query<TableIdRow[]>(
      `SELECT id
       FROM tables
       WHERE merged_into_table_id IN (${assignedPlaceholders})
          OR (id IN (${assignedPlaceholders}) AND merged_into_table_id IS NOT NULL)
       FOR UPDATE`,
      [...assignedTableIds, ...assignedTableIds],
    );
    if (physicalMergeRows.length > 0) {
      throw new TableMergeValidationError("Bàn đã thuộc một cụm gộp vật lý không thể được xếp riêng cho đoàn.");
    }

    const involvedPlaceholders = [...primaryClusterIds, ...assignedTableIds].map(() => "?").join(", ");
    const [existingGroupRows] = await connection.query<TableIdRow[]>(
      `SELECT assigned_table_id AS id
       FROM table_group_seatings
       WHERE status = ?
         AND (primary_table_id IN (${involvedPlaceholders}) OR assigned_table_id IN (${involvedPlaceholders}))
       FOR UPDATE`,
      [GROUP_SEATING_STATUS.ACTIVE, ...primaryClusterIds, ...assignedTableIds, ...primaryClusterIds, ...assignedTableIds],
    );
    if (existingGroupRows.length > 0) {
      throw new TableMergeValidationError("Một trong các bàn đã thuộc đoàn khác. Hãy hoàn tất hoặc tách đoàn hiện tại trước.");
    }

    for (const assignedTable of assignedTables) {
      if (assignedTable.status !== TABLE_STATUS.EMPTY) {
        throw new TableMergeValidationError(`Bàn ${assignedTable.name} phải ở trạng thái trống để xếp cho đoàn.`);
      }
    }

    const activeOrderStatusPlaceholders = ACTIVE_ORDER_STATUSES.map(() => "?").join(", ");
    const [guestCountRows] = await connection.query<GroupSeatingGuestCountRow[]>(
      `SELECT guest_count
       FROM orders
       WHERE table_id = ? AND status IN (${activeOrderStatusPlaceholders})
       ORDER BY created_at DESC, id DESC
       LIMIT 1
       FOR UPDATE`,
      [primaryTableId, ...ACTIVE_ORDER_STATUSES],
    );
    let guestCount = Number(guestCountRows[0]?.guest_count ?? 0);
    if (guestCount <= 0) {
      const [bookingGuestRows] = await connection.query<GroupSeatingGuestCountRow[]>(
        `SELECT party_size AS guest_count
         FROM bookings
         WHERE table_id = ? AND status IN (?, ?)
         ORDER BY start_time DESC, id DESC
         LIMIT 1
         FOR UPDATE`,
        [primaryTableId, BOOKING_STATUS.PENDING, BOOKING_STATUS.CONFIRMED],
      );
      guestCount = Number(bookingGuestRows[0]?.guest_count ?? 0);
    }
    if (!Number.isInteger(guestCount) || guestCount <= 0) {
      throw new TableMergeValidationError("Chưa có số lượng khách hợp lệ trên bàn chính nên chưa thể xếp bàn đoàn.");
    }

    const totalCapacity = [...primaryClusterRows, ...assignedTables]
      .reduce((total, table) => total + Number(table.capacity), 0);
    if (guestCount > totalCapacity) {
      throw new TableMergeValidationError(`Tổng sức chứa ${totalCapacity} chỗ vẫn không đủ cho đoàn ${guestCount} khách.`);
    }

    const groupCode = `${GROUP_SEATING_CODE_PREFIX}-${Date.now()}`;
    for (const assignedTableId of assignedTableIds) {
      await connection.query(
        `INSERT INTO table_group_seatings (
          group_code, primary_table_id, assigned_table_id, guest_count, created_by, status
        ) VALUES (?, ?, ?, ?, ?, ?)`,
        [groupCode, primaryTableId, assignedTableId, guestCount, createdBy, GROUP_SEATING_STATUS.ACTIVE],
      );
    }
    await connection.query(
      `UPDATE tables SET status = ? WHERE id IN (${assignedPlaceholders})`,
      [primaryTable.status, ...assignedTableIds],
    );

    await connection.commit();
    return { primaryTableId, assignedTableIds, groupCode, totalCapacity, guestCount };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/** Merge one or more adjacent operational tables into a single flattened root inside one ACID transaction. */
export const mergeResmanagerTablesTransactionally = async (
  requestedPrimaryTableId: number,
  requestedMergedTableIds: number[],
  mergedBy: number | null,
): Promise<TableMergeResult> => {
  const uniqueMergedTableIds = [...new Set(requestedMergedTableIds.map(Number))];
  if (uniqueMergedTableIds.length === 0 || uniqueMergedTableIds.some((id) => !Number.isInteger(id) || id <= 0)) {
    throw new TableMergeValidationError("Danh sách bàn cần gộp không hợp lệ.");
  }

  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();
    const primaryTableId = await resolveMergedTableRootInTransaction(connection, requestedPrimaryTableId);

    if (uniqueMergedTableIds.includes(primaryTableId) || uniqueMergedTableIds.includes(requestedPrimaryTableId)) {
      throw new TableMergeValidationError("Bàn chính không thể gộp vào chính nó.");
    }

    const tableIds = [primaryTableId, ...uniqueMergedTableIds];
    const placeholders = tableIds.map(() => "?").join(", ");
    const [tableRows] = await connection.query<MergeTableRow[]>(
      `SELECT id, name, area_id, row_pos, col_pos, capacity, status, merged_into_table_id
       FROM tables
       WHERE id IN (${placeholders}) AND is_deleted = 0
       FOR UPDATE`,
      tableIds,
    );
    if (tableRows.length !== tableIds.length) {
      throw new TableMergeValidationError("Có bàn không tồn tại hoặc đã bị xóa.");
    }

    const primaryTable = tableRows.find((table) => table.id === primaryTableId);
    if (!primaryTable) {
      throw new TableMergeValidationError("Không tìm thấy bàn chính.");
    }

    const [existingMergedTables] = await connection.query<MergeTableRow[]>(
      `SELECT id, name, area_id, row_pos, col_pos, capacity, status, merged_into_table_id
       FROM tables
       WHERE merged_into_table_id = ? AND is_deleted = 0
       FOR UPDATE`,
      [primaryTableId],
    );

    const allowedStatuses = new Set<string>([TABLE_STATUS.EMPTY, TABLE_STATUS.SERVING]);
    if (!allowedStatuses.has(primaryTable.status)) {
      throw new TableMergeValidationError(`Bàn ${primaryTable.name} đang ở trạng thái không thể gộp.`);
    }

    const checkSplitIds = [primaryTableId, ...uniqueMergedTableIds];
    const [splitSessions] = await connection.query<any[]>(
      `SELECT id FROM table_split_sessions WHERE parent_table_id IN (${checkSplitIds.map(() => "?").join(", ")}) AND status = 'active' FOR UPDATE`,
      checkSplitIds
    );
    if (splitSessions.length > 0) {
      throw new TableMergeValidationError("Không thể gộp bàn đang có phiên tách bàn (Sub-Orders) hoạt động.");
    }

    const mergedTables = uniqueMergedTableIds.map((tableId) => {
      const table = tableRows.find((candidate) => candidate.id === tableId);
      if (!table) {
        throw new TableMergeValidationError("Không tìm thấy bàn cần gộp.");
      }
      return table;
    });
    for (const mergedTable of mergedTables) {
      if (mergedTable.area_id !== primaryTable.area_id) {
        throw new TableMergeValidationError("Chỉ có thể gộp các bàn trong cùng khu vực.");
      }
      if (!allowedStatuses.has(mergedTable.status)) {
        throw new TableMergeValidationError(`Bàn ${mergedTable.name} đang ở trạng thái không thể gộp.`);
      }
      if (mergedTable.merged_into_table_id !== null) {
        throw new TableMergeValidationError(`Bàn ${mergedTable.name} đã thuộc một cụm bàn khác.`);
      }
    }

    assertMergeTablesAreContiguous(primaryTable, existingMergedTables, mergedTables);

    const bookingWindowEnd = new Date(Date.now() + MERGE_BOOKING_LOOKAHEAD_MINUTES * 60 * 1000);
    const [upcomingBookings] = await connection.query<MergeBookingRow[]>(
      `SELECT b.table_id, b.start_time, t.name AS table_name
       FROM bookings b
       JOIN tables t ON t.id = b.table_id
       WHERE b.table_id IN (${uniqueMergedTableIds.map(() => "?").join(", ")})
         AND b.status = ?
         AND b.start_time >= NOW()
         AND b.start_time < ?
       FOR UPDATE`,
      [...uniqueMergedTableIds, BOOKING_STATUS.CONFIRMED, bookingWindowEnd],
    );
    const blockingBooking = upcomingBookings[0];
    if (blockingBooking) {
      const bookingTime = new Date(blockingBooking.start_time).toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
      throw new TableMergeValidationError(`Bàn ${blockingBooking.table_name} có lịch khách đặt lúc ${bookingTime}.`);
    }

    const statusPlaceholders = ACTIVE_ORDER_STATUSES.map(() => "?").join(", ");
    const [primaryOrders] = await connection.query<MergeOrderRow[]>(
      `SELECT id, table_id, customer_id, created_by, order_type, status, note, guest_name, guest_phone, guest_count
       FROM orders
       WHERE table_id = ? AND status IN (${statusPlaceholders})
       ORDER BY created_at DESC, id DESC
       FOR UPDATE`,
      [primaryTableId, ...ACTIVE_ORDER_STATUSES],
    );
    if (primaryOrders.some((order) => order.status === ORDER_STATUS.PENDING_PAYMENT)) {
      throw new TableMergeValidationError("Không thể gộp bàn chính đang chờ thanh toán.");
    }

    const mergedClusterCapacity = [primaryTable, ...existingMergedTables, ...mergedTables]
      .reduce((total, table) => total + Number(table.capacity), 0);
    const guestCountScopeTableIds = [primaryTableId, ...uniqueMergedTableIds];
    const guestCountScopePlaceholders = guestCountScopeTableIds.map(() => "?").join(", ");
    const [guestCountRows] = await connection.query<MergeGuestCountRow[]>(
      `SELECT COALESCE(SUM(COALESCE(guest_count, 0)), 0) AS total_guest_count
       FROM orders
       WHERE table_id IN (${guestCountScopePlaceholders})
         AND status IN (${statusPlaceholders})
       FOR UPDATE`,
      [...guestCountScopeTableIds, ...ACTIVE_ORDER_STATUSES],
    );
    const mergedGuestCount = Number(guestCountRows[0]?.total_guest_count ?? 0);
    if (mergedGuestCount > mergedClusterCapacity) {
      throw new TableMergeValidationError(
        `Cụm bàn sau khi gộp chỉ có ${mergedClusterCapacity} chỗ, không đủ cho ${mergedGuestCount} khách.`,
      );
    }

    let primaryOrderId = primaryOrders[0]?.id ?? null;
    let guestCountToAdd = 0;
    for (const mergedTable of mergedTables) {
      const [sourceOrders] = await connection.query<MergeOrderRow[]>(
        `SELECT id, table_id, customer_id, created_by, order_type, status, note, guest_name, guest_phone, guest_count
         FROM orders
         WHERE table_id = ? AND status IN (${statusPlaceholders})
         ORDER BY created_at ASC, id ASC
         FOR UPDATE`,
        [mergedTable.id, ...ACTIVE_ORDER_STATUSES],
      );
      if (sourceOrders.some((order) => order.status === ORDER_STATUS.PENDING_PAYMENT)) {
        throw new TableMergeValidationError(`Bàn ${mergedTable.name} đang chờ thanh toán nên không thể gộp.`);
      }

      for (const sourceOrder of sourceOrders) {
        const sourceGuestCount = Number(sourceOrder.guest_count ?? 0);
        if (primaryOrderId === null) {
          const [insertResult] = await connection.query<MergeInsertResult>(
            `INSERT INTO orders (
              table_id, customer_id, created_by, order_type, status, note,
              guest_name, guest_phone, guest_count
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              primaryTableId,
              sourceOrder.customer_id,
              sourceOrder.created_by,
              sourceOrder.order_type,
              ORDER_STATUS.SERVING,
              sourceOrder.note,
              sourceOrder.guest_name,
              sourceOrder.guest_phone,
              sourceGuestCount || null,
            ],
          );
          primaryOrderId = insertResult.insertId;
        } else {
          guestCountToAdd += sourceGuestCount;
        }

        await connection.query(
          `UPDATE order_items
           SET source_order_id = COALESCE(source_order_id, order_id), order_id = ?
           WHERE order_id = ?`,
          [primaryOrderId, sourceOrder.id],
        );
        await connection.query(
          `UPDATE orders
           SET status = ?, merged_into_order_id = ?, closed_at = NOW(),
               note = CONCAT_WS(' | ', note, ?)
           WHERE id = ?`,
          [ORDER_STATUS.MERGED, primaryOrderId, `Đã gộp vào order #${primaryOrderId}`, sourceOrder.id],
        );

        await connection.query(
          `UPDATE table_merges
           SET status = ?, resolved_at = NOW()
           WHERE merged_table_id = ? AND status = ?`,
          [TABLE_MERGE_STATUS.RESOLVED, mergedTable.id, TABLE_MERGE_STATUS.ACTIVE],
        );
        await connection.query(
          `INSERT INTO table_merges (
            primary_table_id, merged_table_id, primary_order_id, merged_order_id, merged_by, status
          ) VALUES (?, ?, ?, ?, ?, ?)`,
          [
            primaryTableId,
            mergedTable.id,
            primaryOrderId,
            sourceOrder.id,
            mergedBy,
            TABLE_MERGE_STATUS.ACTIVE,
          ],
        );
      }

      if (sourceOrders.length === 0) {
        await connection.query(
          `UPDATE table_merges
           SET status = ?, resolved_at = NOW()
           WHERE merged_table_id = ? AND status = ?`,
          [TABLE_MERGE_STATUS.RESOLVED, mergedTable.id, TABLE_MERGE_STATUS.ACTIVE],
        );
        await connection.query(
          `INSERT INTO table_merges (
            primary_table_id, merged_table_id, primary_order_id, merged_order_id, merged_by, status
          ) VALUES (?, ?, ?, NULL, ?, ?)`,
          [primaryTableId, mergedTable.id, primaryOrderId, mergedBy, TABLE_MERGE_STATUS.ACTIVE],
        );
      }
    }

    if (primaryOrderId !== null && guestCountToAdd > 0) {
      await connection.query(
        `UPDATE orders
         SET guest_count = COALESCE(guest_count, 0) + ?
         WHERE id = ?`,
        [guestCountToAdd, primaryOrderId],
      );
    }

    await connection.query(
      `UPDATE tables
       SET status = ?, merged_into_table_id = CASE WHEN id = ? THEN NULL ELSE ? END
       WHERE id IN (${tableIds.map(() => "?").join(", ")})`,
      [TABLE_STATUS.SERVING, primaryTableId, primaryTableId, ...tableIds],
    );

    await connection.commit();
    return { primaryTableId, mergedTableIds: uniqueMergedTableIds, primaryOrderId };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/** Release the root and every merged child after a successful payment. */
export const releaseMergedTableClusterAfterPayment = async (tableId: number): Promise<number[]> => {
  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();
    const mergedPrimaryTableId = await resolveMergedTableRootInTransaction(connection, tableId);
    const [groupOwnerRows] = await connection.query<TableIdRow[]>(
      `SELECT primary_table_id AS id
       FROM table_group_seatings
       WHERE assigned_table_id = ? AND status = ?
       ORDER BY created_at DESC, id DESC
       LIMIT 1
       FOR UPDATE`,
      [mergedPrimaryTableId, GROUP_SEATING_STATUS.ACTIVE],
    );
    const primaryTableId = groupOwnerRows[0]?.id ?? mergedPrimaryTableId;
    const [clusterRows] = await connection.query<MergeTableRow[]>(
      `SELECT id, name, area_id, status, merged_into_table_id
       FROM tables
       WHERE id = ? OR merged_into_table_id = ?
       FOR UPDATE`,
      [primaryTableId, primaryTableId],
    );
    const [groupRows] = await connection.query<TableIdRow[]>(
      `SELECT assigned_table_id AS id
       FROM table_group_seatings
       WHERE primary_table_id = ? AND status = ?
       FOR UPDATE`,
      [primaryTableId, GROUP_SEATING_STATUS.ACTIVE],
    );
    const clusterTableIds = [...new Set([...clusterRows, ...groupRows].map((table) => table.id))];
    if (clusterTableIds.length === 0) {
      throw new TableMergeValidationError("Không tìm thấy cụm bàn cần giải phóng.");
    }

    await connection.query(
      `UPDATE tables
       SET status = ?, merged_into_table_id = NULL
       WHERE id IN (${clusterTableIds.map(() => "?").join(", ")})`,
      [TABLE_STATUS.CLEANING, ...clusterTableIds],
    );
    await connection.query(
      `UPDATE table_merges
       SET status = ?, resolved_at = NOW()
       WHERE primary_table_id = ? AND status = ?`,
      [TABLE_MERGE_STATUS.RESOLVED, primaryTableId, TABLE_MERGE_STATUS.ACTIVE],
    );
    await connection.query(
      `UPDATE table_group_seatings
       SET status = ?, resolved_at = NOW()
       WHERE primary_table_id = ? AND status = ?`,
      [GROUP_SEATING_STATUS.RESOLVED, primaryTableId, GROUP_SEATING_STATUS.ACTIVE],
    );

    await connection.commit();
    return clusterTableIds;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/** Undo a merge only before any active root order exists, preserving the audit trail. */
export const unmergeResmanagerTablesTransactionally = async (tableId: number): Promise<number[]> => {
  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();
    const primaryTableId = await resolveMergedTableRootInTransaction(connection, tableId);
    const statusPlaceholders = ACTIVE_ORDER_STATUSES.map(() => "?").join(", ");
    const [activeOrders] = await connection.query<MergeOrderRow[]>(
      `SELECT id, table_id, customer_id, created_by, order_type, status, note, guest_name, guest_phone, guest_count
       FROM orders
       WHERE table_id = ? AND status IN (${statusPlaceholders})
       FOR UPDATE`,
      [primaryTableId, ...ACTIVE_ORDER_STATUSES],
    );
    if (activeOrders.length > 0) {
      throw new TableMergeValidationError("Không thể bỏ gộp sau khi đã phát sinh order. Hãy tách món theo nghiệp vụ.");
    }

    const [mergedTables] = await connection.query<MergeTableRow[]>(
      `SELECT id, name, area_id, status, merged_into_table_id
       FROM tables
       WHERE merged_into_table_id = ?
       FOR UPDATE`,
      [primaryTableId],
    );
    const mergedTableIds = mergedTables.map((table) => table.id);
    if (mergedTableIds.length === 0) {
      throw new TableMergeValidationError("Bàn này không có cụm bàn phụ để bỏ gộp.");
    }

    await connection.query(
      `UPDATE tables
       SET status = ?, merged_into_table_id = NULL
       WHERE id IN (${mergedTableIds.map(() => "?").join(", ")})`,
      [TABLE_STATUS.EMPTY, ...mergedTableIds],
    );
    await connection.query(
      `UPDATE tables SET status = ?, merged_into_table_id = NULL WHERE id = ?`,
      [TABLE_STATUS.EMPTY, primaryTableId],
    );
    await connection.query(
      `UPDATE table_merges
       SET status = ?, resolved_at = NOW()
       WHERE primary_table_id = ? AND status = ?`,
      [TABLE_MERGE_STATUS.RESOLVED, primaryTableId, TABLE_MERGE_STATUS.ACTIVE],
    );

    await connection.commit();
    return mergedTableIds;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};



// ===== WAITER/MENU DATABASE OPERATIONS =====
export const checkMenuItemAvailability = async (menuItemId: number): Promise<{ available: boolean; reason?: string; is_expired?: boolean; out_of_stock?: boolean }> => {
  const menuCheck = await query<any[]>(`
    SELECT id, name, is_active FROM menu_items WHERE id = ? AND is_deleted = 0
  `, [menuItemId]).catch(() => []);

  if (!menuCheck || menuCheck.length === 0) {
    return { available: false, reason: "Món ăn không tồn tại hoặc đã bị xóa!" };
  }

  const menuItemName = menuCheck[0].name;

  if (!menuCheck[0].is_active) {
    return { available: false, reason: `Món '${menuItemName}' đang tạm ngưng phục vụ!` };
  }

  // 1. Kiểm tra nguyên liệu qua công thức recipe_items
  const recipeIngredients = await query<any[]>(`
    SELECT 
      i.id as ingredient_id, 
      i.name as ingredient_name, 
      i.current_stock
    FROM recipes r
    JOIN recipe_items ri ON r.id = ri.recipe_id
    JOIN ingredients i ON ri.ingredient_id = i.id
    WHERE r.menu_item_id = ? AND i.is_deleted = 0
  `, [menuItemId]).catch(() => []);

  if (recipeIngredients && recipeIngredients.length > 0) {
    for (const ing of recipeIngredients) {
      if (Number(ing.current_stock) <= 0) {
        return {
          available: false,
          out_of_stock: true,
          reason: `Không thể thêm món '${menuItemName}': Nguyên liệu '${ing.ingredient_name}' đã HẾT HÀNG trong kho (Tồn kho = 0)!`
        };
      }

      const validBatches = await query<any[]>(`
        SELECT id FROM stock_in
        WHERE ingredient_id = ? AND remaining_quantity > 0
          AND (expiry_date IS NULL OR expiry_date >= CURDATE())
      `, [ing.ingredient_id]).catch(() => []);

      const expiredBatches = await query<any[]>(`
        SELECT id FROM stock_in
        WHERE ingredient_id = ? AND remaining_quantity > 0
          AND expiry_date IS NOT NULL AND expiry_date < CURDATE()
      `, [ing.ingredient_id]).catch(() => []);

      if (validBatches.length === 0 && expiredBatches.length > 0) {
        return {
          available: false,
          is_expired: true,
          reason: `Không thể thêm món '${menuItemName}': Nguyên liệu '${ing.ingredient_name}' trong kho đã HẾT HẠN SỬ DỤNG!`
        };
      }
    }
  } else {
    // 2. Fallback: đối chiếu từ khóa tên nguyên liệu với tên món ăn
    const matchedIngredients = await query<any[]>(`
      SELECT id, name, current_stock
      FROM ingredients
      WHERE is_deleted = 0 AND ? LIKE CONCAT('%', name, '%')
    `, [menuItemName]).catch(() => []);

    for (const ing of matchedIngredients) {
      if (Number(ing.current_stock) <= 0) {
        return {
          available: false,
          out_of_stock: true,
          reason: `Không thể thêm món '${menuItemName}': Nguyên liệu '${ing.name}' đã HẾT HÀNG trong kho!`
        };
      }

      const validBatches = await query<any[]>(`
        SELECT id FROM stock_in
        WHERE ingredient_id = ? AND remaining_quantity > 0
          AND (expiry_date IS NULL OR expiry_date >= CURDATE())
      `, [ing.id]).catch(() => []);

      const expiredBatches = await query<any[]>(`
        SELECT id FROM stock_in
        WHERE ingredient_id = ? AND remaining_quantity > 0
          AND expiry_date IS NOT NULL AND expiry_date < CURDATE()
      `, [ing.id]).catch(() => []);

      if (validBatches.length === 0 && expiredBatches.length > 0) {
        return {
          available: false,
          is_expired: true,
          reason: `Không thể thêm món '${menuItemName}': Nguyên liệu '${ing.name}' trong kho đã HẾT HẠN SỬ DỤNG!`
        };
      }
    }
  }

  return { available: true };
};

export const getResmanagerMenuItems = async (categoryId?: number): Promise<any[]> => {
  let sql = `
    SELECT m.*, c.name AS category_name
    FROM menu_items m
    LEFT JOIN categories c ON m.category_id = c.id
    WHERE m.is_deleted = 0
  `;
  const params: any[] = [];
  if (categoryId !== undefined) {
    sql += " AND m.category_id = ?";
    params.push(categoryId);
  }
  const items = await query<any[]>(sql, params);

  for (const item of items) {
    const avail = await checkMenuItemAvailability(item.id);
    item.available = avail.available;
    item.out_of_stock = avail.out_of_stock || false;
    item.is_expired = avail.is_expired || false;
    item.stock_status_reason = avail.reason || null;
  }

  return items;
};

export const getResmanagerCategories = async (): Promise<any[]> => {
  return query("SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC");
};

export const getResmanagerOrdersByTable = async (tableId: number): Promise<any[]> => {
  const primaryTableId = await resolveResmanagerPrimaryTableId(tableId);
  const statusPlaceholders = ACTIVE_ORDER_STATUSES.map(() => "?").join(", ");
  const orders = await query<any[]>(
    `SELECT * FROM orders
     WHERE table_id = ? AND (status IN (${statusPlaceholders}) OR (status = 'completed' AND is_early_paid = 1))
     ORDER BY id DESC`,
    [primaryTableId, ...ACTIVE_ORDER_STATUSES],
  );
  for (const order of orders) {
    const allItems = await getResmanagerOrderItems(order.id);
    order.items = allItems.filter(
      (i: any) => (i.status !== "voided" && i.status !== "cancelled") || Boolean(i.is_refunded)
    );
    const activeItems = order.items.filter((i: any) => !i.is_refunded);
    const subtotal = activeItems.reduce((sum: number, item: any) => sum + Number(item.unit_price) * item.quantity, 0);
    order.subtotal = subtotal;

    let depositAmount = 0;
    const bRows = await query<any[]>(
      "SELECT deposit_amount FROM bookings WHERE table_id = ? AND deposit_status IN ('paid', 'completed') ORDER BY created_at DESC LIMIT 1",
      [order.table_id]
    ).catch(() => []);
    if (bRows && bRows.length > 0) {
      depositAmount = Number(bRows[0].deposit_amount || 0);
    }
    order.depositAmount = depositAmount;
    order.vatRate = 10;
    order.tax = Math.round(subtotal * 0.10);
    order.discount = 0;
    order.totalAmount = Math.max(0, subtotal + order.tax - depositAmount);
  }
  return orders;
};

export const getAllResmanagerOrders = async (status?: string): Promise<any[]> => {
  let sql = `
    SELECT o.*, COALESCE(o.split_label, t.name) AS table_name, t.area_id, t.status AS table_status,
           u.full_name AS staff_name,
           c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
    FROM orders o
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN users u ON o.created_by = u.id
    LEFT JOIN customers c ON o.customer_id = c.id
  `;
  const params: any[] = [];
  if (status && status !== "all") {
    sql += " WHERE o.status = ?";
    params.push(status);
  }
  sql += " ORDER BY o.created_at DESC";
  const orders = await query<any[]>(sql, params);

  for (const order of orders) {
    const allItems = await getResmanagerOrderItems(order.id);
    order.items = allItems.filter(
      (item: any) => (item.status !== "voided" && item.status !== "cancelled") || Boolean(item.is_refunded)
    );
    const activeItems = order.items.filter((item: any) => !item.is_refunded);
    const subtotal = activeItems.reduce(
      (sum: number, item: any) => sum + Number(item.unit_price) * item.quantity,
      0
    );
    order.subtotal = subtotal;
    order.totalAmount = subtotal;

    // Check deposit from bookings table (where deposit_status is paid or completed)
    let depositAmount = 0;
    if (order.table_id) {
      const bRows = await query<any[]>(
        "SELECT deposit_amount, deposit_status FROM bookings WHERE table_id = ? AND deposit_status IN ('paid', 'completed') ORDER BY created_at DESC LIMIT 1",
        [order.table_id]
      ).catch(() => []);
      if (bRows && bRows.length > 0) {
        depositAmount = Number(bRows[0].deposit_amount || 0);
      }
    }
    order.depositAmount = depositAmount;

    const isPaidOrder = order.status === "completed" || order.status === "paid";
    if (isPaidOrder) {
      const payRows = await query<any[]>(
        "SELECT p.amount, p.note, p.method, i.tax, i.discount, i.total FROM payments p LEFT JOIN invoices i ON p.invoice_id = i.id WHERE i.order_id = ? OR p.invoice_id = ? ORDER BY p.paid_at DESC LIMIT 1",
        [order.id, order.id]
      ).catch(() => []);
      if (payRows && payRows.length > 0) {
        const pRow = payRows[0];
        order.paymentMethod = pRow.method;
        let notesData: any = {};
        try {
          if (pRow.note && typeof pRow.note === "string" && pRow.note.startsWith("{")) {
            notesData = JSON.parse(pRow.note);
          }
        } catch {}
        order.tax = Number(notesData.vat !== undefined ? notesData.vat : pRow.tax || 0);
        order.voucherDiscount = Number(notesData.voucher !== undefined ? notesData.voucher : pRow.discount || 0);
        order.pointsDiscount = Number(notesData.pointsDiscount || 0);
        order.discount = order.voucherDiscount + order.pointsDiscount;
        order.vatRate = Number(notesData.vatRate !== undefined ? notesData.vatRate : (order.tax > 0 ? Math.round((order.tax / (notesData.subtotal || subtotal || 1)) * 100) : 10));
        if (notesData.depositAmount !== undefined) {
          order.depositAmount = Number(notesData.depositAmount || 0);
        }
        order.totalAmount = Number(notesData.finalAmount !== undefined ? notesData.finalAmount : pRow.total || pRow.amount || subtotal);
      } else {
        const invRows = await query<any[]>(
          "SELECT tax, discount, total FROM invoices WHERE order_id = ? ORDER BY id DESC LIMIT 1",
          [order.id]
        ).catch(() => []);
        if (invRows && invRows.length > 0) {
          const iRow = invRows[0];
          order.tax = Number(iRow.tax || 0);
          order.discount = Number(iRow.discount || 0);
          if (Number(iRow.total) > 0) order.totalAmount = Number(iRow.total);
        }
      }
    } else {
      // Đơn chưa thanh toán (open, serving, pending_payment): tính toán chuẩn từ subtotal và khấu trừ cọc
      order.vatRate = 10;
      order.tax = Math.round(subtotal * 0.10);
      order.discount = 0;
      order.totalAmount = Math.max(0, subtotal + order.tax - order.depositAmount - order.discount);
    }
  }
  return orders;
};

export const deductInventoryForItem = async (
  orderItemId: string | number,
  reason: "sale_deduction" | "waste" = "sale_deduction",
  customNote?: string
): Promise<void> => {
  try {
    if (!dbAvailable) return;
    
    // 1. Get the item
    const items = await query<any[]>(
      `SELECT menu_item_id, quantity, is_reused FROM order_items WHERE id = ?`,
      [orderItemId]
    );

    if (!items || items.length === 0) return;
    const item = items[0];

    // Bỏ qua nếu món này là món tái sử dụng (đã trừ kho từ bàn trước)
    if (item.is_reused) {
      console.log(`[Inventory] Bỏ qua trừ kho cho món tái sử dụng (ID: ${orderItemId})`);
      return;
    }

    // 2. Get recipes for this menu_item
    const recipeItems = await query<any[]>(
      `SELECT r.ingredient_id, r.quantity
       FROM recipe_items r
       JOIN recipes m ON r.recipe_id = m.id
       WHERE m.menu_item_id = ?`,
      [item.menu_item_id]
    );

    if (!recipeItems || recipeItems.length === 0) return;

    for (const recipe of recipeItems) {
      const totalUsed = Number(item.quantity) * Number(recipe.quantity);
      
      // 3. Update ingredients current_stock
      await query(
        `UPDATE ingredients SET current_stock = GREATEST(0, current_stock - ?) WHERE id = ?`,
        [totalUsed, recipe.ingredient_id]
      );

      // 4. FEFO Deduction logic
      let remainingToDeduct = totalUsed;
      const batches = await query<any[]>(
        `SELECT id, remaining_quantity FROM stock_in 
         WHERE ingredient_id = ? AND remaining_quantity > 0 
           AND (expiry_date >= CURDATE() OR expiry_date IS NULL)
         ORDER BY expiry_date ASC, created_at ASC`,
        [recipe.ingredient_id]
      );

      for (const batch of batches) {
        if (remainingToDeduct <= 0) break;
        const deductQty = Math.min(batch.remaining_quantity, remainingToDeduct);
        
        await query(
          `UPDATE stock_in SET remaining_quantity = remaining_quantity - ? WHERE id = ?`,
          [deductQty, batch.id]
        );

        const defaultNote = reason === "waste" ? "Hao hụt do hủy món (nấu món)" : "Trừ kho tự động theo FEFO (nấu món)";
        await query(
          `INSERT INTO stock_out (ingredient_id, stock_in_id, quantity, reason, note, created_at)
           VALUES (?, ?, ?, ?, ?, NOW())`,
          [recipe.ingredient_id, batch.id, deductQty, reason, customNote || defaultNote]
        );

        remainingToDeduct -= deductQty;
      }

      // If still remaining (negative stock theoretically), just record generic stock out
      if (remainingToDeduct > 0) {
        const defaultGenericNote = reason === "waste" ? "Hao hụt tự động (âm kho/không rõ lô)" : "Trừ kho tự động (âm kho/không rõ lô)";
        await query(
          `INSERT INTO stock_out (ingredient_id, quantity, reason, note, created_at)
           VALUES (?, ?, ?, ?, NOW())`,
          [recipe.ingredient_id, remainingToDeduct, reason, customNote || defaultGenericNote]
        );
      }
    }
  } catch (error: any) {
    console.error(`❌ Error deducting inventory for item ${orderItemId}:`, error.message);
  }
};

export const refundInventoryForItem = async (orderItemId: string | number): Promise<void> => {
  try {
    if (!dbAvailable) return;
    
    // 1. Get the item
    const items = await query<any[]>(
      `SELECT menu_item_id, quantity FROM order_items WHERE id = ?`,
      [orderItemId]
    );

    if (!items || items.length === 0) return;
    const item = items[0];

    // 2. Get recipes for this menu_item
    const recipeItems = await query<any[]>(
      `SELECT r.ingredient_id, r.quantity
       FROM recipe_items r
       JOIN recipes m ON r.recipe_id = m.id
       WHERE m.menu_item_id = ?`,
      [item.menu_item_id]
    );

    if (!recipeItems || recipeItems.length === 0) return;

    for (const recipe of recipeItems) {
      const totalUsed = Number(item.quantity) * Number(recipe.quantity);
      
      // 3. Update ingredients current_stock
      await query(
        `UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?`,
        [totalUsed, recipe.ingredient_id]
      );

      // 4. Insert into stock_in to record the refund (or delete the exact stock_out if preferred, 
      // but inserting a refund record is safer for audit)
      await query(
        `INSERT INTO stock_in (ingredient_id, quantity, unit_cost, note, created_by, created_at)
         VALUES (?, ?, 0, 'Hoàn lại kho do món bị hủy/hoàn tác', 1, NOW())`,
        [recipe.ingredient_id, totalUsed]
      );
    }
  } catch (error: any) {
    console.error(`❌ Error refunding inventory for item ${orderItemId}:`, error.message);
  }
};

/**
 * processReuseForOrderItems - Tự động tái sử dụng các món đã nấu bị hủy trùng khớp
 * cho các món mới gửi xuống bếp. Splitting món tự động nếu số lượng khác biệt.
 */
export const processReuseForOrderItems = async (orderItemIds: number[]): Promise<void> => {
  try {
    if (orderItemIds.length === 0) return;
    const placeholders = orderItemIds.map(() => "?").join(",");

    const items = await query<any[]>(
      `SELECT oi.id, oi.order_id, oi.menu_item_id, oi.quantity, oi.unit_price, m.name AS item_name, COALESCE(o.split_label, t.name) AS table_name, oi.created_by
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       JOIN orders o ON oi.order_id = o.id
       LEFT JOIN tables t ON o.table_id = t.id
       WHERE oi.id IN (${placeholders}) AND oi.status = 'waiting_kitchen'`,
      orderItemIds
    );

    for (const item of items) {
      // Luôn luôn tạo thông báo nấu món mới bình thường, không tự động đi đơn ngầm
      await createNewDishNotification(item.order_id, item.menu_item_id, item.quantity);
    }
  } catch (err: any) {
    console.error("❌ Error in processReuseForOrderItems:", err.message);
  }
};


/**
 * reuseCancelledKdsItem - Tái sử dụng thủ công một món hủy đã nấu xong/đang nấu
 * cho một món chờ nấu khác cùng món. Có tính toán tách số lượng (split) nếu lệch.
 */
export const reuseCancelledKdsItem = async (
  cancelledItemId: number,
  targetItemId: number
): Promise<boolean> => {
  // 1. Lấy thông tin hai món
  const cancelledItems = await query<any[]>(
    `SELECT id, order_id, menu_item_id, quantity, is_cooked_cancelled, was_reused, status FROM order_items WHERE id = ?`,
    [cancelledItemId]
  );
  const targetItems = await query<any[]>(
    `SELECT id, order_id, menu_item_id, quantity, unit_price, status, created_by FROM order_items WHERE id = ?`,
    [targetItemId]
  );

  if (cancelledItems.length === 0 || targetItems.length === 0) {
    throw new Error("Không tìm thấy món ăn nguồn (hủy) hoặc món ăn đích (chờ).");
  }

  const cItem = cancelledItems[0];
  const tItem = targetItems[0];

  if (cItem.menu_item_id !== tItem.menu_item_id) {
    throw new Error("Món ăn nguồn và món ăn đích không cùng loại món.");
  }

  if (cItem.was_reused) {
    throw new Error("Món hủy này đã được tái sử dụng trước đó.");
  }

  if (!cItem.is_cooked_cancelled) {
    throw new Error("Món ăn nguồn chưa được đánh dấu là đã nấu/đang nấu bị hủy.");
  }

  // 2. Thực hiện nghiệp vụ tái sử dụng món ăn
  const CQ = Number(cItem.quantity);
  const TQ = Number(tItem.quantity);

  if (CQ <= TQ) {
    // Tái sử dụng toàn bộ số lượng món hủy
    await query(
      `UPDATE order_items SET was_reused = 1, chef_dismissed = 1, reused_by_order_item_id = ? WHERE id = ?`,
      [tItem.id, cItem.id]
    );

    if (CQ === TQ) {
      // Số lượng khớp hoàn toàn
      await query(
        `UPDATE order_items SET status = 'done', is_reused = 1 WHERE id = ?`,
        [tItem.id]
      );
    } else {
      // Món đích có số lượng lớn hơn, cần nấu thêm (TQ - CQ) phần
      const remainQty = TQ - CQ;
      await query(
        `UPDATE order_items SET quantity = ? WHERE id = ?`,
        [remainQty, tItem.id]
      );
      
      // Tạo món mới đã hoàn thành (done) đại diện cho phần được tái sử dụng
      await query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, status, is_reused, is_held, created_by)
         VALUES (?, ?, ?, ?, 'done', 1, 0, ?)`,
        [tItem.order_id, tItem.menu_item_id, CQ, tItem.unit_price, tItem.created_by]
      );
    }
  } else {
    // Món hủy có số lượng nhiều hơn nhu cầu mới (CQ > TQ)
    const remainCancelQty = CQ - TQ;
    
    // Giảm bớt số lượng món hủy hiện tại
    await query(
      `UPDATE order_items SET quantity = ? WHERE id = ?`,
      [remainCancelQty, cItem.id]
    );
    
    // Ghi nhận bản ghi món hủy đã được dùng cho món đích
    await query(
      `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, status, is_cooked_cancelled, was_reused, chef_dismissed, void_reason, voided_at, reused_by_order_item_id)
       VALUES (?, ?, ?, ?, 'voided', 1, 1, 1, 'Tách món để tái sử dụng', NOW(), ?)`,
      [cItem.order_id, cItem.menu_item_id, TQ, cItem.unit_price, tItem.id]
    );

    // Món đích được hoàn thành hoàn toàn
    await query(
      `UPDATE order_items SET status = 'done', is_reused = 1 WHERE id = ?`,
      [tItem.id]
    );
  }

  // 3. Gửi thông báo đến waiter của bàn nhận món
  const targetInfo = await query<any[]>(
    `SELECT oi.quantity, m.name, COALESCE(o.split_label, t.name) AS tableName 
     FROM order_items oi
     JOIN menu_items m ON oi.menu_item_id = m.id
     JOIN orders o ON oi.order_id = o.id
     LEFT JOIN tables t ON o.table_id = t.id
     WHERE oi.id = ?`,
    [tItem.id]
  );
  if (targetInfo.length > 0) {
    const info = targetInfo[0];
    const displayTableName = info.tableName || "Mang về";
    await createNotification(
      "Món ăn có sẵn (Sử dụng lại)",
      `Món "${info.name}" (x${CQ <= TQ ? CQ : TQ}) của Bàn ${displayTableName} đã có sẵn từ món hủy trước đó! Vui lòng bưng ra luôn.`,
      "success",
      "waiter"
    );
  }

  return true;
};


export const getResmanagerPayments = async (): Promise<any[]> => {
  await ensureRefundColumns();
  const rows = await query<any[]>(`
    SELECT p.id,
           COALESCE(i.order_id, p.invoice_id) AS orderId,
           GREATEST(0, p.amount - COALESCE(o.refunded_total, 0)) AS amount,
           p.amount AS originalAmount,
           COALESCE(o.refunded_total, 0) AS refunded_total,
           CASE 
             WHEN p.method = 'bank_transfer' THEN 'transfer'
             WHEN p.method IN ('momo', 'vnpay') THEN 'wallet'
             ELSE p.method 
           END AS paymentMethod,
           CASE
             WHEN o.has_refund = 1 THEN 'refunded'
             ELSE 'completed'
           END AS status,
           o.has_refund,
           p.note AS notes,
           p.paid_at AS createdAt,
           p.paid_at AS completedAt,
           t.name AS table_name,
           COALESCE(c.name, o.guest_name) AS guest_name,
           COALESCE(c.phone, o.guest_phone) AS guest_phone,
           o.order_type
    FROM payments p
    LEFT JOIN invoices i ON p.invoice_id = i.id
    LEFT JOIN orders o ON i.order_id = o.id
    LEFT JOIN tables t ON o.table_id = t.id
    LEFT JOIN customers c ON o.customer_id = c.id
    ORDER BY p.paid_at DESC
  `);
  return rows.map((row) => ({
    ...row,
    amount: Number(row.amount || 0),
    originalAmount: Number(row.originalAmount || 0),
    refunded_total: Number(row.refunded_total || 0),
    has_refund: Boolean(row.has_refund),
  }));
};

export const getResmanagerOrderItems = async (orderId: number): Promise<any[]> => {
  return query(`
    SELECT oi.*,
           m.name AS item_name,
           m.price AS menu_price,
           m.image_url,
           m.kitchen_station
    FROM order_items oi
    JOIN menu_items m ON oi.menu_item_id = m.id
    WHERE oi.order_id = ?
  `, [orderId]);
};

export const createResmanagerOrder = async (data: any): Promise<any> => {
  if (data.table_id) {
    data.table_id = await resolveResmanagerPrimaryTableId(Number(data.table_id));
  }

  let validCustomerId: number | null = null;
  if (data.customer_id) {
    const custRows = await query<any[]>("SELECT id FROM customers WHERE id = ? AND is_deleted = 0 LIMIT 1", [data.customer_id]);
    if (custRows.length > 0) {
      validCustomerId = Number(custRows[0].id);
    }
  }
  if (!validCustomerId && data.guest_phone) {
    const custByPhone = await query<any[]>("SELECT id FROM customers WHERE phone = ? AND is_deleted = 0 LIMIT 1", [data.guest_phone]);
    if (custByPhone.length > 0) {
      validCustomerId = Number(custByPhone[0].id);
    }
  }

  const bookingIdNum = data.booking_id ? Number(data.booking_id) : null;

  if (data.table_id) {
    const existingPreOrders = await query<any[]>(`
      SELECT id FROM orders 
      WHERE table_id = ? AND status IN ('open', 'serving') AND order_type = 'pre_order'
        AND booking_id IS NULL
      ORDER BY created_at DESC LIMIT 1
    `, [data.table_id]);

    if (existingPreOrders.length > 0) {
      const preOrderId = existingPreOrders[0].id;
      await query(`
        UPDATE orders 
        SET order_type = ?, status = 'open', created_by = COALESCE(?, created_by), guest_name = COALESCE(?, guest_name), guest_phone = COALESCE(?, guest_phone), guest_count = COALESCE(?, guest_count), booking_id = COALESCE(?, booking_id)
        WHERE id = ?
      `, [
        data.order_type || 'dine_in',
        data.created_by || 1,
        data.guest_name || null,
        data.guest_phone || null,
        data.guest_count || null,
        bookingIdNum,
        preOrderId
      ]);
      // Khi mở bàn, chuyển trạng thái các món đặt trước từ 'pre_order' sang 'pending' (chờ nấu) để gửi xuống bếp (KDS nhận được ngay mà không cần chỉnh sửa KDS)
      await query(`
        UPDATE order_items 
        SET status = 'pending', is_held = 0 
        WHERE order_id = ? AND status = 'pre_order'
      `, [preOrderId]);
      if (bookingIdNum) {
        await query("UPDATE bookings SET status = 'arrived' WHERE id = ?", [bookingIdNum]).catch(() => {});
      }
      return { id: preOrderId, ...data, status: 'open', customer_id: validCustomerId };
    }
  }

  const result = await query(`
    INSERT INTO orders (table_id, booking_id, customer_id, created_by, order_type, note, guest_name, guest_phone, guest_count, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open')
  `, [
    data.table_id,
    bookingIdNum,
    validCustomerId,
    data.created_by,
    data.order_type || 'dine_in',
    data.note || null,
    data.guest_name || null,
    data.guest_phone || null,
    data.guest_count || null
  ]);

  if (bookingIdNum) {
    await query("UPDATE bookings SET status = 'arrived' WHERE id = ?", [bookingIdNum]).catch(() => {});
  }

  return { id: result.insertId, ...data, status: 'open', customer_id: validCustomerId };
};

export const completeActiveBookingForTable = async (tableId: number): Promise<boolean> => {
  const result = await query(`
    UPDATE bookings 
    SET status = 'completed' 
    WHERE table_id = ? AND status IN ('pending', 'confirmed')
  `, [tableId]);
  return result.affectedRows > 0;
};

export const addResmanagerOrderItem = async (data: any): Promise<any> => {
  if (data.menu_item_id) {
    const availCheck = await checkMenuItemAvailability(Number(data.menu_item_id));
    if (!availCheck.available) {
      throw new Error(availCheck.reason || "Món ăn đã hết hàng hoặc nguyên liệu trong kho đã hết hạn!");
    }
  }

  if (!data.bypass_status_check && data.order_id) {
    const orderCheck = await query<any[]>(`
      SELECT o.status as order_status, t.status as table_status
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.id = ?
      LIMIT 1
    `, [data.order_id]).catch(() => []);
    if (orderCheck && orderCheck.length > 0) {
      const { order_status, table_status } = orderCheck[0];
      if (order_status === "completed" || order_status === "paid") {
        throw new Error("Đơn hàng đã được thanh toán, không thể gọi thêm món!");
      }
      if (order_status === "cancelled") {
        throw new Error("Đơn hàng đã bị hủy, không thể gọi thêm món!");
      }
      if (order_status === "pending_payment" || table_status === "pending_payment") {
        throw new Error("Bàn đang yêu cầu thanh toán (Chờ thanh toán). Hệ thống đã khóa gọi thêm món để tránh sai lệch hóa đơn!");
      }
    }
  }

  // Kiểm tra món đã có trong order với trạng thái pending và chưa hold hay chưa
  const existingRows = await query<any>(`
    SELECT id, quantity, kitchen_note 
    FROM order_items 
    WHERE order_id = ? AND menu_item_id = ? AND status = 'pending' AND (is_held = 0 OR is_held IS NULL)
    LIMIT 1
  `, [data.order_id, data.menu_item_id]);

  if (existingRows.length > 0) {
    const existing = existingRows[0];
    const newQuantity = Number(existing.quantity) + Number(data.quantity);
    let newNote = existing.kitchen_note;
    if (data.kitchen_note && data.kitchen_note.trim()) {
      const trimmedNew = data.kitchen_note.trim();
      if (!existing.kitchen_note || !existing.kitchen_note.trim()) {
        newNote = trimmedNew;
      } else if (!existing.kitchen_note.includes(trimmedNew)) {
        newNote = `${existing.kitchen_note}; ${trimmedNew}`;
      }
    }

    let itemCreator = data.created_by;
    if (!itemCreator && data.order_id) {
      try {
        const parentOrder = await query<any[]>(`SELECT created_by FROM orders WHERE id = ? LIMIT 1`, [data.order_id]);
        if (parentOrder && parentOrder.length > 0) {
          itemCreator = parentOrder[0].created_by;
        }
      } catch (err) {
        console.warn("Failed to fetch parent order creator:", err);
      }
    }

    await query(`
      UPDATE order_items 
      SET quantity = ?, kitchen_note = ?, created_by = COALESCE(?, created_by) 
      WHERE id = ?
    `, [newQuantity, newNote, itemCreator || null, existing.id]);

    return { 
      id: existing.id, 
      ...data, 
      quantity: newQuantity, 
      kitchen_note: newNote, 
      status: 'pending', 
      merged: true 
    };
  }

  let itemCreator = data.created_by;
  if (!itemCreator && data.order_id) {
    try {
      const parentOrder = await query<any[]>(`SELECT created_by FROM orders WHERE id = ? LIMIT 1`, [data.order_id]);
      if (parentOrder && parentOrder.length > 0) {
        itemCreator = parentOrder[0].created_by;
      }
    } catch (err) {
      console.warn("Failed to fetch parent order creator:", err);
    }
  }

  const result = await query(`
    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, seat_number, course_number, kitchen_note, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?)
  `, [
    data.order_id,
    data.menu_item_id,
    data.quantity,
    data.unit_price,
    data.seat_number || null,
    data.course_number || 1,
    data.kitchen_note || null,
    itemCreator || null
  ]);
  return { id: result.insertId, ...data, status: 'pending', merged: false };
};

export const voidResmanagerOrderItem = async (itemId: number, reason: string): Promise<boolean> => {
  // Lấy trạng thái hiện tại trước khi hủy
  const items = await query<any[]>(`SELECT status FROM order_items WHERE id = ?`, [itemId]);
  if (items.length === 0) return false;
  const currentStatus = items[0].status;
  
  // Nếu món đã nấu xong, đang nấu, hoặc đã phục vụ bị hủy
  const isCookedCancelled = (currentStatus === "done" || currentStatus === "cooking" || currentStatus === "served") ? 1 : 0;

  // Nếu món đang nấu (chưa chạy done nên chưa trừ kho), ta tiến hành trừ kho hao hụt (waste)
  if (currentStatus === "cooking") {
    await deductInventoryForItem(itemId, "waste", "Hao hụt do hủy món đang nấu");
  }

  const result = await query(`
    UPDATE order_items 
    SET status = 'voided', void_reason = ?, voided_at = NOW(), is_cooked_cancelled = ?
    WHERE id = ?
  `, [reason, isCookedCancelled, itemId]);
  return result.affectedRows > 0;
};

export const sendResmanagerOrderItemsToKitchen = async (orderItemIds: number[]): Promise<boolean> => {
  if (orderItemIds.length === 0) return false;
  const placeholders = orderItemIds.map(() => "?").join(",");
  
  // Lấy chi tiết các món trước khi cập nhật để kiểm tra tình trạng tồn kho
  const items = await query<any[]>(
    `SELECT oi.id, oi.order_id, oi.menu_item_id, oi.quantity, m.name AS item_name
     FROM order_items oi
     JOIN menu_items m ON oi.menu_item_id = m.id
     WHERE oi.id IN (${placeholders})`,
    orderItemIds
  );

  for (const item of items) {
    const availCheck = await checkMenuItemAvailability(Number(item.menu_item_id));
    if (!availCheck.available) {
      throw new Error(availCheck.reason || `Không thể gửi món '${item.item_name}' xuống bếp do hết hàng hoặc nguyên liệu đã hết hạn!`);
    }
  }

  const result = await query<any>(
    `UPDATE order_items SET status = 'waiting_kitchen', is_held = 0
     WHERE id IN (${placeholders})`,
    orderItemIds,
  );

  if (result.affectedRows > 0) {
    // Tự động kiểm tra tái sử dụng món đã nấu bị hủy và tạo thông báo tương ứng
    await processReuseForOrderItems(orderItemIds);
  }

  return result.affectedRows > 0;
};

export const holdResmanagerOrderItems = async (itemIds: number[], held: boolean): Promise<boolean> => {
  if (itemIds.length === 0) return false;
  const placeholders = itemIds.map(() => "?").join(", ");
  const result = await query(`
    UPDATE order_items 
    SET is_held = ? 
    WHERE id IN (${placeholders})
  `, [held ? 1 : 0, ...itemIds]);
  return result.affectedRows > 0;
};

export const getWaiterDoneNotifications = async (): Promise<any[]> => {
  return query(`
    SELECT oi.*, t.name AS table_name, m.name AS dish_name
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    JOIN tables t ON o.table_id = t.id
    JOIN menu_items m ON oi.menu_item_id = m.id
    WHERE oi.status = 'done'
  `);
};

export const markOrderItemServed = async (itemId: number): Promise<boolean> => {
  const result = await query(`
    UPDATE order_items SET status = 'served' WHERE id = ? AND status IN ('done', 'served')
  `, [itemId]);
  return result.affectedRows > 0;
};

// ===== EVENT CONFIG DATABASE OPERATIONS =====
export const getHalls = async (): Promise<any[]> => {
  return query("SELECT * FROM halls WHERE is_active = 1");
};

export const createHall = async (data: any): Promise<any> => {
  const result = await query(`
    INSERT INTO halls (name, capacity, description, is_active)
    VALUES (?, ?, ?, 1)
  `, [data.name, data.capacity, data.description || null]);
  return { id: result.insertId, ...data, is_active: 1 };
};

export const updateHall = async (id: number | string, data: any): Promise<boolean> => {
  const fields: string[] = [];
  const values: any[] = [];
  Object.keys(data).forEach((key) => {
    fields.push(`\`${key}\` = ?`);
    values.push(data[key]);
  });
  values.push(id);
  const result = await query(`UPDATE halls SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.affectedRows > 0;
};

export const getEventPackages = async (): Promise<any[]> => {
  const pkgs = await query<any[]>("SELECT * FROM event_packages WHERE is_active = 1");
  for (const p of pkgs) {
    p.items = await query(`
      SELECT pi.*, m.name, m.price
      FROM event_package_items pi
      JOIN menu_items m ON pi.menu_item_id = m.id
      WHERE pi.package_id = ?
    `, [p.id]);
  }
  return pkgs;
};

export const createEventPackage = async (data: any): Promise<any> => {
  const result = await query(`
    INSERT INTO event_packages (name, price_per_person, description, is_active)
    VALUES (?, ?, ?, 1)
  `, [data.name, data.price_per_person, data.description || null]);
  const packageId = result.insertId;

  if (data.items && data.items.length > 0) {
    for (const item of data.items) {
      await query(`
        INSERT INTO event_package_items (package_id, menu_item_id, quantity)
        VALUES (?, ?, ?)
      `, [packageId, item.menu_item_id, item.quantity || 1]);
    }
  }
  return { id: packageId, ...data, is_active: 1 };
};

export const updateEventPackage = async (id: number | string, data: any): Promise<boolean> => {
  const { items, ...pkgData } = data;
  const fields: string[] = [];
  const values: any[] = [];

  if (Object.keys(pkgData).length > 0) {
    Object.keys(pkgData).forEach((key) => {
      fields.push(`\`${key}\` = ?`);
      values.push(pkgData[key]);
    });
    values.push(id);
    await query(`UPDATE event_packages SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  if (items) {
    await query("DELETE FROM event_package_items WHERE package_id = ?", [id]);
    for (const item of items) {
      await query(`
        INSERT INTO event_package_items (package_id, menu_item_id, quantity)
        VALUES (?, ?, ?)
      `, [id, item.menu_item_id, item.quantity || 1]);
    }
  }
  return true;
};

// ===== EVENT BOOKING OPERATIONS =====
export const getEvents = async (): Promise<any[]> => {
  return query(`
    SELECT e.*, a.name AS area_name, u.full_name AS sales_name 
    FROM events e
    LEFT JOIN table_areas a ON e.area_id = a.id
    LEFT JOIN users u ON e.sales_id = u.id
    ORDER BY e.event_date ASC, e.start_time ASC
  `);
};

export const getEventById = async (id: number | string): Promise<any | null> => {
  const events = await query(`
    SELECT e.*, a.name AS area_name, u.full_name AS sales_name 
    FROM events e
    LEFT JOIN table_areas a ON e.area_id = a.id
    LEFT JOIN users u ON e.sales_id = u.id
    WHERE e.id = ?
  `, [id]);
  
  if (events.length === 0) return null;
  const event = events[0];

  event.menu_items = await query(`
    SELECT emi.*, m.name, m.image_url 
    FROM event_menu_items emi
    JOIN menu_items m ON emi.menu_item_id = m.id
    WHERE emi.event_id = ?
  `, [id]);

  event.services = await query("SELECT * FROM event_services WHERE event_id = ?", [id]);

  return event;
};

export const createEvent = async (data: any): Promise<any> => {
  const result = await query(`
    INSERT INTO events (
      customer_name, customer_phone, event_type, guest_count, 
      event_date, start_time, end_time, area_id, 
      deposit_amount, total_estimated_amount, status, sales_id, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.customer_name, data.customer_phone, data.event_type || null, data.guest_count,
    data.event_date, data.start_time, data.end_time, data.area_id || null,
    data.deposit_amount || 0, data.total_estimated_amount || 0, data.status || 'lead', data.sales_id || null, data.notes || null
  ]);
  const eventId = result.insertId;

  if (data.menu_items && data.menu_items.length > 0) {
    for (const item of data.menu_items) {
      await query(`
        INSERT INTO event_menu_items (event_id, menu_item_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `, [eventId, item.menu_item_id, item.quantity || 1, item.price]);
    }
  }

  if (data.services && data.services.length > 0) {
    for (const srv of data.services) {
      await query(`
        INSERT INTO event_services (event_id, service_name, price, vendor_name)
        VALUES (?, ?, ?, ?)
      `, [eventId, srv.service_name, srv.price, srv.vendor_name || null]);
    }
  }

  return getEventById(eventId);
};

export const updateEvent = async (id: number | string, data: any): Promise<boolean> => {
  const { menu_items, services, ...eventData } = data;
  const fields: string[] = [];
  const values: any[] = [];

  if (Object.keys(eventData).length > 0) {
    Object.keys(eventData).forEach((key) => {
      fields.push(`\`${key}\` = ?`);
      values.push(eventData[key]);
    });
    values.push(id);
    await query(`UPDATE events SET ${fields.join(", ")} WHERE id = ?`, values);
  }

  if (menu_items) {
    await query("DELETE FROM event_menu_items WHERE event_id = ?", [id]);
    for (const item of menu_items) {
      await query(`
        INSERT INTO event_menu_items (event_id, menu_item_id, quantity, price)
        VALUES (?, ?, ?, ?)
      `, [id, item.menu_item_id, item.quantity || 1, item.price]);
    }
  }

  if (services) {
    await query("DELETE FROM event_services WHERE event_id = ?", [id]);
    for (const srv of services) {
      await query(`
        INSERT INTO event_services (event_id, service_name, price, vendor_name)
        VALUES (?, ?, ?, ?)
      `, [id, srv.service_name, srv.price, srv.vendor_name || null]);
    }
  }

  return true;
};

// ===== USER ROLE & WORKSPACE OPERATIONS =====
export const getRoles = async (): Promise<any[]> => {
  return query("SELECT * FROM roles ORDER BY id ASC");
};

export const getUsers = async (): Promise<any[]> => {
  return query(`
    SELECT u.id, u.role_id, u.full_name, u.email, u.phone, u.avatar_url, u.status, u.is_deleted, u.created_at, r.name AS role_name
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.is_deleted = 0
    ORDER BY u.created_at DESC
  `);
};

export const createResmanagerUser = async (data: any): Promise<any> => {
  const result = await query(`
    INSERT INTO users (role_id, full_name, email, password_hash, phone, status, is_deleted)
    VALUES (?, ?, ?, ?, ?, ?, 0)
  `, [data.role_id, data.full_name, data.email, data.password, data.phone || null, data.status || 'active']);
  return { id: result.insertId, ...data, is_deleted: 0 };
};

export const updateResmanagerUser = async (id: number | string, data: any): Promise<boolean> => {
  const fields: string[] = [];
  const values: any[] = [];
  Object.keys(data).forEach((key) => {
    const dbKey = key === "password" ? "password_hash" : key;
    fields.push(`\`${dbKey}\` = ?`);
    values.push(data[key]);
  });
  values.push(id);
  const result = await query(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.affectedRows > 0;
};

// ===== WAITLIST OPERATIONS =====
export const getWaitlist = async (): Promise<any[]> => {
  return query("SELECT * FROM waitlist ORDER BY joined_at ASC");
};

export const addToWaitlist = async (data: any): Promise<any> => {
  const result = await query(`
    INSERT INTO waitlist (guest_name, party_size, phone, joined_at)
    VALUES (?, ?, ?, NOW())
  `, [data.guest_name, data.party_size, data.phone || null]);
  return { id: result.insertId, ...data, joined_at: new Date().toISOString() };
};

export const notifyWaitlistGuest = async (id: number): Promise<boolean> => {
  const result = await query("UPDATE waitlist SET notified_at = NOW() WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

export const removeFromWaitlist = async (id: number): Promise<boolean> => {
  const result = await query("DELETE FROM waitlist WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

// ===== CUSTOMER DATABASE OPERATIONS =====
const MOCK_CUSTOMERS: any[] = [];

export const findCustomerByEmail = async (email: string): Promise<any | null> => {
  if (!dbAvailable) return MOCK_CUSTOMERS.find((c) => c.email === email && !c.is_deleted) || null;
  const rows = await query("SELECT * FROM customers WHERE email = ? AND is_deleted = 0", [email]);
  return rows[0] || null;
};

export const findCustomerById = async (id: number | string): Promise<any | null> => {
  if (!dbAvailable) return MOCK_CUSTOMERS.find((c) => c.id === id && !c.is_deleted) || null;
  const rows = await query("SELECT * FROM customers WHERE id = ? AND is_deleted = 0", [id]);
  return rows[0] || null;
};

export const createCustomer = async (data: any): Promise<any> => {
  const newCustomer = {
    id: Date.now(),
    name: data.name,
    email: data.email,
    phone: data.phone || null,
    password_hash: data.password_hash,
    member_level: "bronze",
    loyalty_points: 0,
    is_deleted: 0,
    created_at: new Date().toISOString(),
  };
  if (!dbAvailable) {
    MOCK_CUSTOMERS.push(newCustomer);
    return newCustomer;
  }
  const result = await query(`
    INSERT INTO customers (name, email, phone, password_hash, member_level, loyalty_points)
    VALUES (?, ?, ?, ?, 'bronze', 0)
  `, [data.name, data.email, data.phone || null, data.password_hash]);
  return { id: result.insertId, name: data.name, email: data.email, phone: data.phone || null, member_level: 'bronze', loyalty_points: 0 };
};

export const updateCustomerProfile = async (id: number | string, data: any): Promise<boolean> => {
  if (!dbAvailable) {
    const customer = MOCK_CUSTOMERS.find((c) => c.id === id);
    if (!customer) return false;
    Object.assign(customer, data);
    return true;
  }
  const fields: string[] = [];
  const values: any[] = [];
  Object.keys(data).forEach((key) => {
    fields.push(`\`${key}\` = ?`);
    values.push(data[key]);
  });
  values.push(id);
  const result = await query(`UPDATE customers SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.affectedRows > 0;
};

export const getCustomerLoyaltyTransactions = async (customerId: number | string): Promise<any[]> => {
  return query("SELECT * FROM loyalty_transactions WHERE customer_id = ? ORDER BY created_at DESC", [customerId]);
};

export const getCustomerVouchers = async (): Promise<any[]> => {
  return query("SELECT * FROM vouchers WHERE is_active = 1 AND (expired_at IS NULL OR expired_at > NOW())");
};

/** Returns the tier reward catalogue, including the customer's unlock and redemption state. */
export const getTierRewardVouchersForCustomer = async (customerId: number): Promise<TierVoucherRow[]> => {
  return query<TierVoucherRow[]>(
    `SELECT
       v.id, v.code, v.type, v.value, v.min_order, v.points_cost, v.required_member_level,
       MAX(cv.id IS NOT NULL) AS is_redeemed
     FROM vouchers v
     LEFT JOIN customer_vouchers cv ON cv.voucher_id = v.id AND cv.customer_id = ?
     WHERE v.required_member_level IS NOT NULL
       AND v.is_active = 1
       AND (v.expired_at IS NULL OR v.expired_at > NOW())
     GROUP BY v.id, v.code, v.type, v.value, v.min_order, v.points_cost, v.required_member_level`,
    [customerId],
  );
};

/** Atomically exchanges one tier reward voucher and records its single-use ownership. */
export const redeemTierRewardVoucher = async (
  customerId: number,
  voucherId: number,
): Promise<{ loyaltyPoints: number; memberLevel: MemberLevel }> => {
  const connection = await ensurePool().getConnection();

  try {
    await connection.beginTransaction();
    const [customerRows] = await connection.query<LoyaltyCustomerRow[]>(
      "SELECT id, loyalty_points, member_level FROM customers WHERE id = ? AND is_deleted = 0 FOR UPDATE",
      [customerId],
    );
    const customer = customerRows[0];
    if (!customer) {
      throw new LoyaltyVoucherRedemptionError("Không tìm thấy thông tin khách hàng.", 404);
    }

    const [voucherRows] = await connection.query<VoucherRedemptionRow[]>(
      `SELECT id, code, points_cost, max_uses, used_count, required_member_level
       FROM vouchers
       WHERE id = ? AND is_active = 1 AND required_member_level IS NOT NULL
         AND (expired_at IS NULL OR expired_at > NOW())
       FOR UPDATE`,
      [voucherId],
    );
    const voucher = voucherRows[0];
    if (!voucher) {
      throw new LoyaltyVoucherRedemptionError("Voucher không tồn tại, không thuộc quà theo hạng hoặc đã hết hạn.", 404);
    }

    const customerLevel = normalizeMemberLevel(customer.member_level);
    const requiredLevel = normalizeMemberLevel(voucher.required_member_level);
    if (MEMBER_LEVEL_RANK[customerLevel] < MEMBER_LEVEL_RANK[requiredLevel]) {
      throw new LoyaltyVoucherRedemptionError("Hạng thành viên hiện tại chưa mở khóa voucher này.");
    }
    if (voucher.max_uses !== null && voucher.used_count >= voucher.max_uses) {
      throw new LoyaltyVoucherRedemptionError("Voucher này đã hết lượt sử dụng.");
    }

    const [ownedVoucherRows] = await connection.query<CustomerVoucherRow[]>(
      "SELECT id FROM customer_vouchers WHERE customer_id = ? AND voucher_id = ? LIMIT 1 FOR UPDATE",
      [customer.id, voucher.id],
    );
    if (ownedVoucherRows.length > 0) {
      throw new LoyaltyVoucherRedemptionError("Bạn đã đổi voucher quà tặng của hạng này rồi.");
    }

    const pointsCost = Number(voucher.points_cost);
    if (customer.loyalty_points < pointsCost) {
      throw new LoyaltyVoucherRedemptionError(
        `Không đủ điểm thưởng. Bạn cần ${pointsCost} điểm để đổi voucher này (hiện có ${customer.loyalty_points} điểm).`,
      );
    }

    const loyaltyPoints = customer.loyalty_points - pointsCost;
    const memberLevel = getMemberLevelFromPoints(loyaltyPoints);
    await connection.query(
      "UPDATE customers SET loyalty_points = ?, member_level = ? WHERE id = ?",
      [loyaltyPoints, memberLevel, customer.id],
    );
    await connection.query(
      "INSERT INTO loyalty_transactions (customer_id, points, type, note) VALUES (?, ?, 'redeem', ?)",
      [customer.id, pointsCost, `Đổi ${pointsCost} điểm nhận voucher ${voucher.code}`],
    );
    await connection.query(
      "INSERT INTO customer_vouchers (customer_id, voucher_id, is_used) VALUES (?, ?, 0)",
      [customer.id, voucher.id],
    );

    await connection.commit();
    return { loyaltyPoints, memberLevel };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const getPromotions = async (): Promise<any[]> => {
  return query("SELECT * FROM promotions WHERE is_active = 1 AND NOW() BETWEEN start_date AND end_date");
};

export const getCustomerBookings = async (customerId: number | string): Promise<any[]> => {
  return query(`
    SELECT b.*, t.name AS table_name, a.name AS area_name
    FROM bookings b
    LEFT JOIN tables t ON b.table_id = t.id
    LEFT JOIN table_areas a ON t.area_id = a.id
    WHERE b.customer_id = ?
    ORDER BY b.start_time DESC
  `, [customerId]);
};

export const createCustomerEventContract = async (data: any): Promise<any> => {
  let validCustomerId: number | null = null;
  if (data.customer_id) {
    const custRows = await query<any[]>("SELECT id FROM customers WHERE id = ? AND is_deleted = 0 LIMIT 1", [data.customer_id]);
    if (custRows.length > 0) {
      validCustomerId = Number(custRows[0].id);
    }
  }
  if (!validCustomerId && data.contact_phone) {
    const custByPhone = await query<any[]>("SELECT id FROM customers WHERE phone = ? AND is_deleted = 0 LIMIT 1", [data.contact_phone]);
    if (custByPhone.length > 0) {
      validCustomerId = Number(custByPhone[0].id);
    }
  }

  const result = await query(`
    INSERT INTO event_contracts (
      hall_id, customer_id, package_id, contact_name, contact_phone,
      event_date, guest_count, table_count, total_amount, deposit_amount,
      remaining, status, note, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'draft', ?, 1)
  `, [
    data.hall_id, validCustomerId, data.package_id || null, data.contact_name, data.contact_phone,
    data.event_date, data.guest_count, data.table_count, data.total_amount, data.total_amount,
    data.note || null
  ]);
  return { id: result.insertId, ...data, status: 'draft', deposit_amount: 0, remaining: data.total_amount, customer_id: validCustomerId };
};

export const getCustomerEventContracts = async (customerId: number | string): Promise<any[]> => {
  return query(`
    SELECT c.*, h.name AS hall_name, p.name AS package_name
    FROM event_contracts c
    LEFT JOIN halls h ON c.hall_id = h.id
    LEFT JOIN event_packages p ON c.package_id = p.id
    WHERE c.customer_id = ?
    ORDER BY c.event_date DESC
  `, [customerId]);
};

// ===== ATTENDANCE OPERATIONS =====
interface AttendanceRecordRow {
  id: number;
  employee_id: number;
  clock_in: string;
  clock_out: string | null;
  employee_name?: string;
  employee_role?: string;
  schedule_id?: number | null;
  is_late?: number;
  late_reason?: string | null;
  is_early?: number;
  early_reason?: string | null;
}

/** Metadata collected by the schedule-policy middleware at clock-in or clock-out. */
export interface AttendanceTimingInput {
  scheduleId?: number | null;
  isLate?: boolean;
  lateReason?: string | null;
  isEarly?: boolean;
  earlyReason?: string | null;
}

/** Gets attendance records with the staff member information required by managers. */
export const getAllAttendance = async (): Promise<AttendanceRecordRow[]> => {
  if (!dbAvailable) {
    const mockAttendance = ((globalThis as typeof globalThis & { __MOCK_ATTENDANCE?: AttendanceRecordRow[] }).__MOCK_ATTENDANCE ?? []);
    return mockAttendance
      .filter((record) => record.employee_role !== "sales_event")
      .sort((first, second) => (second.clock_out ?? second.clock_in).localeCompare(first.clock_out ?? first.clock_in));
  }

  return query<AttendanceRecordRow[]>(`
    SELECT
      a.id,
      a.employee_id,
      a.clock_in,
      a.clock_out,
      a.schedule_id,
      a.is_late,
      a.late_reason,
      a.is_early,
      a.early_reason,
      u.full_name AS employee_name,
      COALESCE(r.name, 'staff') AS employee_role
    FROM attendance a
    INNER JOIN users u ON u.id = a.employee_id
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE COALESCE(r.name, '') <> 'sales_event'
    ORDER BY COALESCE(a.clock_out, a.clock_in) DESC
  `);
};

/** Gets staff members available for manager attendance actions. */
export const getAttendanceEmployees = async (): Promise<Array<{ id: number; full_name: string; role_name: string }>> => {
  if (!dbAvailable) {
    return MOCK_USERS
      .filter((user) => user.role_name !== "sales_event")
      .map((user) => ({ id: Number(user.id), full_name: user.full_name, role_name: user.role_name }));
  }

  return query<Array<{ id: number; full_name: string; role_name: string }>>(`
    SELECT u.id, u.full_name, COALESCE(r.name, 'staff') AS role_name
    FROM users u
    LEFT JOIN roles r ON r.id = u.role_id
    WHERE u.is_deleted = 0
      AND u.status = 'active'
      AND COALESCE(r.name, '') <> 'sales_event'
    ORDER BY u.full_name ASC
  `);
};

export const getTodayAttendance = async (employeeId: number): Promise<any | null> => {
  if (!dbAvailable) {
    const MOCK_ATTENDANCE_STORE: any[] = (globalThis as any).__MOCK_ATTENDANCE || [];
    (globalThis as any).__MOCK_ATTENDANCE = MOCK_ATTENDANCE_STORE;
    const today = new Date().toISOString().slice(0, 10);
    return MOCK_ATTENDANCE_STORE.find(
      (a) => a.employee_id === employeeId && a.clock_in?.startsWith(today) && !a.clock_out
    ) || null;
  }
  const today = new Date().toISOString().slice(0, 10);
  const rows = await query<any[]>(
    "SELECT * FROM attendance WHERE employee_id = ? AND DATE(clock_in) = ? ORDER BY clock_in DESC LIMIT 1",
    [employeeId, today]
  );
  return rows[0] || null;
};

export const clockInEmployee = async (employeeId: number, timing: AttendanceTimingInput = {}): Promise<any> => {
  const now = new Date();
  if (!dbAvailable) {
    const MOCK_ATTENDANCE_STORE: any[] = (globalThis as any).__MOCK_ATTENDANCE || [];
    (globalThis as any).__MOCK_ATTENDANCE = MOCK_ATTENDANCE_STORE;
    const newRecord = {
      id: Date.now(), employee_id: employeeId, clock_in: now.toISOString(), clock_out: null,
      schedule_id: timing.scheduleId ?? null, is_late: timing.isLate ? 1 : 0,
      late_reason: timing.lateReason ?? null,
    };
    MOCK_ATTENDANCE_STORE.push(newRecord);
    return newRecord;
  }
  const result = await query(
    "INSERT INTO attendance (employee_id, clock_in, schedule_id, is_late, late_reason) VALUES (?, NOW(), ?, ?, ?)",
    [employeeId, timing.scheduleId ?? null, timing.isLate ? 1 : 0, timing.lateReason ?? null]
  );
  return { id: result.insertId, employee_id: employeeId, clock_in: now.toISOString(), clock_out: null };
};

export const clockOutEmployee = async (employeeId: number, timing: AttendanceTimingInput = {}): Promise<any | null> => {
  if (!dbAvailable) {
    const MOCK_ATTENDANCE_STORE: any[] = (globalThis as any).__MOCK_ATTENDANCE || [];
    (globalThis as any).__MOCK_ATTENDANCE = MOCK_ATTENDANCE_STORE;
    const today = new Date().toISOString().slice(0, 10);
    const record = MOCK_ATTENDANCE_STORE.find(
      (a) => a.employee_id === employeeId && a.clock_in?.startsWith(today) && !a.clock_out
    );
    if (record) {
      record.clock_out = new Date().toISOString();
      record.is_early = timing.isEarly ? 1 : 0;
      record.early_reason = timing.earlyReason ?? null;
      return record;
    }
    return null;
  }
  const today = new Date().toISOString().slice(0, 10);
  await query(
    "UPDATE attendance SET clock_out = NOW(), is_early = ?, early_reason = ? WHERE employee_id = ? AND DATE(clock_in) = ? AND clock_out IS NULL ORDER BY clock_in DESC LIMIT 1",
    [timing.isEarly ? 1 : 0, timing.earlyReason ?? null, employeeId, today]
  );
  return getTodayAttendance(employeeId);
};






// ============================================================================
//  RESMANAGER SCHEMA — Notifications
// ============================================================================

export const createNotification = async (
  title: string,
  message: string,
  type: string = "info",
  role: string = "waiter"
): Promise<any> => {
  const result = await query<any>(
    "INSERT INTO notifications (title, message, type, role, is_read) VALUES (?, ?, ?, ?, 0)",
    [title, message, type, role]
  );
  return {
    id: result.insertId,
    title,
    message,
    type,
    role,
    is_read: 0,
    created_at: new Date().toISOString()
  };
};

export const getNotifications = async (role?: string): Promise<any[]> => {
  if (role) {
    return query<any[]>(
      "SELECT * FROM notifications WHERE role = ? OR role IS NULL ORDER BY id DESC LIMIT 50",
      [role]
    );
  }
  return query<any[]>("SELECT * FROM notifications ORDER BY id DESC LIMIT 50");
};

export const markNotificationAsRead = async (id: number): Promise<boolean> => {
  const result = await query<any>("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

export const markAllNotificationsAsRead = async (role?: string): Promise<boolean> => {
  let result;
  if (role) {
    result = await query<any>(
      "UPDATE notifications SET is_read = 1 WHERE role = ? OR role IS NULL",
      [role]
    );
  } else {
    result = await query<any>("UPDATE notifications SET is_read = 1");
  }
  return result.affectedRows > 0;
};

export const createNewDishNotification = async (
  orderId: number,
  menuItemId: number | string,
  quantity: number
): Promise<void> => {
  try {
    // 1. Lấy tên món ăn từ database
    const menuItems = await query<any[]>("SELECT name FROM menu_items WHERE id = ?", [menuItemId]);
    const itemName = menuItems[0]?.name || `Món #${menuItemId}`;

    // 2. Lấy thông tin bàn/đơn hàng từ database
    const orders = await query<any[]>(
      `SELECT o.table_id, t.name AS table_name, o.guest_name, o.order_type
       FROM orders o
       LEFT JOIN tables t ON o.table_id = t.id
       WHERE o.id = ?`,
      [orderId]
    );

    let locationInfo = "";
    if (orders[0]) {
      const { table_name, guest_name, order_type } = orders[0];
      if (table_name) {
        locationInfo = `Bàn ${table_name}`;
      } else if (guest_name) {
        locationInfo = `${guest_name} (Mang về)`;
      } else {
        locationInfo = order_type === "delivery" ? "Giao hàng" : "Mang về";
      }
    } else {
      locationInfo = "Đơn mới";
    }

    const title = "Món ăn mới";
    const message = `Có món mới: "${itemName}" (x${quantity}) - ${locationInfo}`;

    // Tạo thông báo cho Đầu bếp (role: "chef")
    await createNotification(title, message, "info", "chef");
  } catch (err) {
    console.error("Lỗi tạo thông báo món ăn mới:", err);
  }
};

// ===== PROMOTION CRUD OPERATIONS =====
export const getAllPromotionsList = async (): Promise<any[]> => {
  return query("SELECT * FROM promotions ORDER BY created_at DESC");
};

export const getPromotionById = async (id: number | string): Promise<any | null> => {
  const rows = await query("SELECT * FROM promotions WHERE id = ?", [id]);
  return rows[0] || null;
};

export const createPromotion = async (data: any): Promise<any> => {
  const result = await query(`
    INSERT INTO promotions (title, description, discount_type, discount_value, image_url, start_date, end_date, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    data.title,
    data.description || null,
    data.discount_type,
    data.discount_value,
    data.image_url || null,
    data.start_date,
    data.end_date,
    data.is_active !== undefined ? data.is_active : 1
  ]);
  return { id: result.insertId, ...data };
};

export const updatePromotion = async (id: number | string, data: any): Promise<boolean> => {
  const fields: string[] = [];
  const values: any[] = [];
  Object.keys(data).forEach((key) => {
    fields.push(`\`${key}\` = ?`);
    values.push(data[key]);
  });
  values.push(id);
  const result = await query(`UPDATE promotions SET ${fields.join(", ")} WHERE id = ?`, values);
  return result.affectedRows > 0;
};

// ===== TABLE SPLIT & BILL SPLIT OPERATIONS =====
export interface SplitGroupInput {
  guest_count: number;
  item_allocations?: { order_item_id: number; quantity: number }[];
}

export interface TableSplitResult {
  splitSessionId: number;
  parentTableId: number;
  parentOrderId: number;
  subOrders: {
    splitId: number;
    childOrderId: number;
    childLabel: string;
    guestCount: number;
    totalAmount: number;
  }[];
}

export class TableSplitValidationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "TableSplitValidationError";
  }
}

/** Tách bàn vật lý thành các nhóm sub-orders theo phiên table_split_sessions */
export const splitResmanagerTable = async (
  parentTableId: number,
  groups: SplitGroupInput[],
  createdBy: number = 1
): Promise<TableSplitResult> => {
  if (!Number.isInteger(parentTableId) || parentTableId <= 0) {
    throw new TableSplitValidationError("Mã bàn không hợp lệ.");
  }
  if (!Array.isArray(groups) || groups.length < 2) {
    throw new TableSplitValidationError("Phải tách thành ít nhất 2 nhóm.");
  }

  for (let i = 0; i < groups.length; i++) {
    if (!Number.isInteger(groups[i].guest_count) || groups[i].guest_count <= 0) {
      throw new TableSplitValidationError(`Số lượng khách nhóm ${i + 1} phải lớn hơn 0.`);
    }
  }

  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();

    // 1. Lock bàn vật lý
    const [tables] = await connection.query<any[]>(
      "SELECT id, name, capacity, status, merged_into_table_id FROM tables WHERE id = ? AND is_deleted = 0 FOR UPDATE",
      [parentTableId]
    );
    if (tables.length === 0) {
      throw new TableSplitValidationError("Không tìm thấy bàn vật lý.");
    }
    const table = tables[0];

    if (table.status !== TABLE_STATUS.SERVING && table.status !== TABLE_STATUS.EMPTY) {
      throw new TableSplitValidationError(`Bàn ${table.name} đang ở trạng thái '${table.status}', không thể tách bàn.`);
    }

    const totalGuests = groups.reduce((sum, g) => sum + g.guest_count, 0);
    if (totalGuests > Number(table.capacity)) {
      throw new TableSplitValidationError(`Tổng số khách các nhóm (${totalGuests}) vượt quá sức chứa bàn vật lý (${table.capacity} chỗ).`);
    }

    // 2. Chặn nếu bàn đang thuộc cụm gộp
    const [merges] = await connection.query<any[]>(
      "SELECT id FROM table_merges WHERE status = ? AND (primary_table_id = ? OR merged_table_id = ?)",
      [TABLE_MERGE_STATUS.ACTIVE, parentTableId, parentTableId]
    );
    if (table.merged_into_table_id !== null || merges.length > 0) {
      throw new TableSplitValidationError("Không thể tách bàn đang thuộc cụm gộp. Vui lòng gỡ gộp bàn trước.");
    }

    // 3. Chặn nếu bàn đang có 1 split session active
    const [existingSessions] = await connection.query<any[]>(
      "SELECT id FROM table_split_sessions WHERE parent_table_id = ? AND status = 'active'",
      [parentTableId]
    );
    if (existingSessions.length > 0) {
      throw new TableSplitValidationError(`Bàn ${table.name} đang có phiên tách bàn hoạt động. Vui lòng hoàn tất phiên hiện tại trước.`);
    }

    // 4. Lấy đơn hàng active hiện tại (đơn vị order gốc)
    let parentOrderId: number;
    const [activeOrders] = await connection.query<any[]>(
      "SELECT id FROM orders WHERE table_id = ? AND status IN ('open', 'serving') ORDER BY id DESC LIMIT 1 FOR UPDATE",
      [parentTableId]
    );

    if (activeOrders.length === 0) {
      // Nếu bàn chưa có order, tạo order gốc
      const [newParentRes] = await connection.query<any>(
        "INSERT INTO orders (table_id, created_by, order_type, status, guest_count) VALUES (?, ?, 'dine_in', 'serving', ?)",
        [parentTableId, createdBy, groups[0].guest_count]
      );
      parentOrderId = newParentRes.insertId;
    } else {
      parentOrderId = activeOrders[0].id;
    }

    // 5. Kiểm tra ràng buộc món ăn với Kitchen status
    const [existingItems] = await connection.query<any[]>(
      `SELECT oi.id, oi.order_id, oi.menu_item_id, m.name AS item_name, oi.quantity, oi.unit_price, oi.status, oi.kitchen_note
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       WHERE oi.order_id = ? FOR UPDATE`,
      [parentOrderId]
    );

    // Kiểm tra xem có món cooking / served nào bị yêu cầu chuyển sang nhóm 2..N không
    for (let gIdx = 1; gIdx < groups.length; gIdx++) {
      const allocations = groups[gIdx].item_allocations || [];
      for (const alloc of allocations) {
        const item = existingItems.find((i) => i.id === alloc.order_item_id);
        if (item && (item.status === 'cooking' || item.status === 'served')) {
          throw new TableSplitValidationError(
            `Món '${item.item_name}' (đang ở trạng thái '${item.status}') không được chuyển sang nhóm khác. Món chế biến/phục vụ giữ nguyên ở nhóm ${table.name}:1.`
          );
        }
      }
    }

    // 6. Tạo phiên split_session
    const [sessionRes] = await connection.query<any>(
      "INSERT INTO table_split_sessions (parent_table_id, parent_order_id, status) VALUES (?, ?, 'active')",
      [parentTableId, parentOrderId]
    );
    const splitSessionId = sessionRes.insertId;

    // 7. Tạo nhóm 1 (Dùng order gốc)
    const label1 = `${table.name}:1`;
    await connection.query(
      "UPDATE orders SET split_label = ?, guest_count = ? WHERE id = ?",
      [label1, groups[0].guest_count, parentOrderId]
    );
    const [split1Res] = await connection.query<any>(
      "INSERT INTO table_splits (split_session_id, parent_table_id, parent_order_id, child_order_id, child_label, guest_count, status) VALUES (?, ?, ?, ?, ?, ?, 'active')",
      [splitSessionId, parentTableId, parentOrderId, parentOrderId, label1, groups[0].guest_count]
    );

    const subOrders = [
      {
        splitId: split1Res.insertId,
        childOrderId: parentOrderId,
        childLabel: label1,
        guestCount: groups[0].guest_count,
        totalAmount: 0,
      },
    ];

    // 8. Tạo nhóm 2..N (Tạo các child orders mới)
    for (let i = 1; i < groups.length; i++) {
      const childLabel = `${table.name}:${i + 1}`;
      const [childOrderRes] = await connection.query<any>(
        "INSERT INTO orders (table_id, created_by, order_type, status, split_label, guest_count) VALUES (?, ?, 'dine_in', 'serving', ?, ?)",
        [parentTableId, createdBy, childLabel, groups[i].guest_count]
      );
      const childOrderId = childOrderRes.insertId;

      const [splitRes] = await connection.query<any>(
        "INSERT INTO table_splits (split_session_id, parent_table_id, parent_order_id, child_order_id, child_label, guest_count, status) VALUES (?, ?, ?, ?, ?, ?, 'active')",
        [splitSessionId, parentTableId, parentOrderId, childOrderId, childLabel, groups[i].guest_count]
      );

      subOrders.push({
        splitId: splitRes.insertId,
        childOrderId,
        childLabel,
        guestCount: groups[i].guest_count,
        totalAmount: 0,
      });
    }

    // 9. Thực hiện phân bổ order_items cho từng nhóm
    for (let gIdx = 0; gIdx < groups.length; gIdx++) {
      const targetChildOrderId = subOrders[gIdx].childOrderId;
      const allocations = groups[gIdx].item_allocations || [];

      for (const alloc of allocations) {
        const item = existingItems.find((i) => i.id === alloc.order_item_id);
        if (!item) continue;
        if (alloc.quantity <= 0) continue;

        if (gIdx === 0) {
          // Nhóm 1 (Order gốc): Cập nhật lại số lượng nếu có tách bớt
          await connection.query(
            "UPDATE order_items SET quantity = ? WHERE id = ?",
            [alloc.quantity, item.id]
          );
        } else {
          // Nhóm 2..N: Chuyển toàn bộ hoặc tạo dòng mới với số lượng tách
          if (alloc.quantity === item.quantity) {
            // Chuyển toàn bộ món sang order mới
            await connection.query(
              "UPDATE order_items SET order_id = ? WHERE id = ?",
              [targetChildOrderId, item.id]
            );
          } else {
            // Tách một phần số lượng sang order mới
            const newChildQty = alloc.quantity;
            await connection.query(
              "INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, status, kitchen_note) VALUES (?, ?, ?, ?, ?, ?)",
              [targetChildOrderId, item.menu_item_id, newChildQty, item.unit_price, item.status, item.kitchen_note]
            );
            // Giảm số lượng ở order gốc
            const remainQty = item.quantity - newChildQty;
            await connection.query(
              "UPDATE order_items SET quantity = ? WHERE id = ?",
              [remainQty, item.id]
            );
          }
        }
      }
    }

    // 10. Tính toán lại tổng tiền cho tất cả sub-orders
    for (const sub of subOrders) {
      const [sumRows] = await connection.query<any[]>(
        "SELECT COALESCE(SUM(quantity * unit_price), 0) as total FROM order_items WHERE order_id = ?",
        [sub.childOrderId]
      );
      sub.totalAmount = Number(sumRows[0]?.total || 0);
    }

    // 11. Bàn vật lý giữ trạng thái SERVING
    await connection.query("UPDATE tables SET status = ? WHERE id = ?", [TABLE_STATUS.SERVING, parentTableId]);

    await connection.commit();

    return {
      splitSessionId,
      parentTableId,
      parentOrderId,
      subOrders,
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/** Lấy thông tin các nhóm sub-orders active của 1 bàn */
export const getTableActiveSplits = async (tableId: number): Promise<any> => {
  const sessions = await query<any[]>(
    "SELECT * FROM table_split_sessions WHERE parent_table_id = ? AND status = 'active' ORDER BY id DESC LIMIT 1",
    [tableId]
  );
  if (!sessions || sessions.length === 0) return null;

  const session = sessions[0];
  const splits = await query<any[]>(
    `SELECT ts.*, o.split_label, o.status AS order_status, o.created_at AS order_created_at
     FROM table_splits ts
     JOIN orders o ON o.id = ts.child_order_id
     WHERE ts.split_session_id = ?
     ORDER BY ts.id ASC`,
    [session.id]
  );

  for (const split of splits) {
    const items = await query<any[]>(
      `SELECT oi.id, oi.menu_item_id, m.name AS item_name, oi.quantity, oi.unit_price, (oi.quantity * oi.unit_price) AS subtotal, oi.status, oi.kitchen_note
       FROM order_items oi
       JOIN menu_items m ON oi.menu_item_id = m.id
       WHERE oi.order_id = ?`,
      [split.child_order_id]
    );
    split.items = items;
    split.total_amount = items.reduce((sum, item) => sum + Number(item.subtotal), 0);
  }

  return {
    sessionId: session.id,
    parentTableId: session.parent_table_id,
    parentOrderId: session.parent_order_id,
    sessionStatus: session.status,
    createdAt: session.created_at,
    splits,
  };
};

/** Chuyển món/tách số lượng giữa các nhóm sub-orders trong cùng 1 phiên split active */
export const moveSplitOrderItems = async (
  tableId: number,
  sourceChildOrderId: number,
  targetChildOrderId: number,
  orderItemId: number,
  moveQuantity: number
): Promise<boolean> => {
  if (sourceChildOrderId === targetChildOrderId) {
    throw new TableSplitValidationError("Nhóm nguồn và nhóm đích phải khác nhau.");
  }
  if (!Number.isInteger(moveQuantity) || moveQuantity <= 0) {
    throw new TableSplitValidationError("Số lượng chuyển phải lớn hơn 0.");
  }

  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();

    const [items] = await connection.query<any[]>(
      "SELECT id, order_id, menu_item_id, item_name, quantity, unit_price, status, notes FROM order_items WHERE id = ? AND order_id = ? FOR UPDATE",
      [orderItemId, sourceChildOrderId]
    );
    if (items.length === 0) {
      throw new TableSplitValidationError("Không tìm thấy món cần chuyển.");
    }
    const item = items[0];

    // Bắt buộc món phải ở trạng thái pending
    if (item.status !== 'pending') {
      throw new TableSplitValidationError(
        `Món '${item.item_name}' đang ở trạng thái '${item.status}'. Chỉ món ở trạng thái chờ ('pending') mới được phép chuyển giữa các nhóm.`
      );
    }

    if (moveQuantity > item.quantity) {
      throw new TableSplitValidationError(`Số lượng chuyển (${moveQuantity}) vượt quá số lượng hiện có (${item.quantity}).`);
    }

    if (moveQuantity === item.quantity) {
      await connection.query("UPDATE order_items SET order_id = ? WHERE id = ?", [targetChildOrderId, item.id]);
    } else {
      const remainQty = item.quantity - moveQuantity;
      await connection.query("UPDATE order_items SET quantity = ? WHERE id = ?", [remainQty, item.id]);

      await connection.query(
        "INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, status, kitchen_note) VALUES (?, ?, ?, ?, ?, ?)",
        [targetChildOrderId, item.menu_item_id, moveQuantity, item.unit_price, item.status, item.kitchen_note]
      );
    }

    await connection.commit();
    return true;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/** Đóng 1 nhóm sub-order khi thanh toán và kiểm tra hoàn tất phiên tách bàn để giải phóng bàn vật lý */
export const completeSubOrderPayment = async (childOrderId: number): Promise<{ isSplitOrder: boolean; sessionCompleted: boolean; tableReleased: boolean }> => {
  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();

    // 1. Cập nhật order status sang completed
    await connection.query("UPDATE orders SET status = 'completed' WHERE id = ?", [childOrderId]);

    // 2 & 3. Tìm thông tin split_session bằng JOIN với orders
    const [splits] = await connection.query<any[]>(
      `SELECT ts.id as split_id, ts.split_session_id, ts.parent_table_id 
       FROM table_splits ts 
       JOIN orders o ON ts.parent_table_id = o.table_id AND ts.child_label = o.split_label 
       WHERE o.id = ? LIMIT 1`,
      [childOrderId]
    );

    if (splits.length === 0) {
      await connection.commit();
      return { isSplitOrder: false, sessionCompleted: false, tableReleased: false };
    }

    const { split_id, split_session_id, parent_table_id } = splits[0];

    // Cập nhật table_splits tương ứng sang status = 'paid'
    await connection.query("UPDATE table_splits SET status = 'paid', closed_at = NOW() WHERE id = ?", [split_id]);

    // 4. Kiểm tra xem phiên còn nhóm nào 'active' không
    const [activeSplits] = await connection.query<any[]>(
      "SELECT id FROM table_splits WHERE split_session_id = ? AND status = 'active'",
      [split_session_id]
    );

    let sessionCompleted = false;
    let tableReleased = false;

    if (activeSplits.length === 0) {
      // Đã thanh toán HẾT các nhóm trong phiên
      sessionCompleted = true;
      await connection.query(
        "UPDATE table_split_sessions SET status = 'completed', closed_at = NOW() WHERE id = ?",
        [split_session_id]
      );

      // Kiểm tra xem bàn vật lý còn bất kỳ order active nào khác không
      const [otherActiveOrders] = await connection.query<any[]>(
        "SELECT id FROM orders WHERE table_id = ? AND status IN ('open', 'serving', 'pending_payment') LIMIT 1",
        [parent_table_id]
      );

      if (otherActiveOrders.length === 0) {
        tableReleased = true;
        await connection.query("UPDATE tables SET status = ? WHERE id = ?", [TABLE_STATUS.CLEANING, parent_table_id]);
      }
    }

    await connection.commit();
    return { isSplitOrder: true, sessionCompleted, tableReleased };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/** Tách hóa đơn theo món khi checkout và lưu vết invoice_item_splits */
export const splitInvoiceByItems = async (
  parentInvoiceId: number,
  childBills: { items: { order_item_id: number; quantity: number; amount: number }[] }[]
): Promise<number[]> => {
  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();

    const [parentInvoices] = await connection.query<any[]>("SELECT * FROM invoices WHERE id = ? FOR UPDATE", [parentInvoiceId]);
    if (parentInvoices.length === 0) {
      throw new Error("Không tìm thấy hóa đơn gốc.");
    }
    const parentInvoice = parentInvoices[0];

    const childInvoiceIds: number[] = [];

    for (let i = 0; i < childBills.length; i++) {
      const bill = childBills[i];
      const billTotal = bill.items.reduce((sum, item) => sum + Number(item.amount), 0);

      const [res] = await connection.query<any>(
        `INSERT INTO invoices (order_id, parent_invoice_id, subtotal, tax_amount, service_fee, discount_amount, final_amount, status, created_at)
         VALUES (?, ?, ?, 0, 0, 0, ?, 'unpaid', NOW())`,
        [parentInvoice.order_id, parentInvoiceId, billTotal, billTotal]
      );
      const childInvoiceId = res.insertId;
      childInvoiceIds.push(childInvoiceId);

      for (const item of bill.items) {
        await connection.query(
          `INSERT INTO invoice_item_splits (parent_invoice_id, child_invoice_id, order_item_id, quantity, amount)
           VALUES (?, ?, ?, ?, ?)`,
          [parentInvoiceId, childInvoiceId, item.order_item_id, item.quantity, item.amount]
        );
      }
    }

    await connection.commit();
    return childInvoiceIds;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

/** Chia đều hóa đơn khi checkout với xử lý phần dư làm tròn chính xác */
export const splitInvoiceEqually = async (
  parentInvoiceId: number,
  guestCount: number
): Promise<{ childInvoiceIds: number[]; amounts: number[] }> => {
  if (!Number.isInteger(guestCount) || guestCount <= 1) {
    throw new Error("Số người chia hóa đơn phải lớn hơn 1.");
  }

  const connection = await ensurePool().getConnection();
  try {
    await connection.beginTransaction();

    const [parentInvoices] = await connection.query<any[]>("SELECT * FROM invoices WHERE id = ? FOR UPDATE", [parentInvoiceId]);
    if (parentInvoices.length === 0) {
      throw new Error("Không tìm thấy hóa đơn gốc.");
    }
    const parentInvoice = parentInvoices[0];
    const totalAmount = Number(parentInvoice.final_amount || parentInvoice.subtotal);

    const baseAmount = Math.floor(totalAmount / guestCount);
    const remainder = totalAmount - (baseAmount * guestCount);

    const childInvoiceIds: number[] = [];
    const amounts: number[] = [];

    for (let i = 0; i < guestCount; i++) {
      const childAmount = i === guestCount - 1 ? baseAmount + remainder : baseAmount;
      amounts.push(childAmount);

      const [res] = await connection.query<any>(
        `INSERT INTO invoices (order_id, parent_invoice_id, subtotal, tax_amount, service_fee, discount_amount, final_amount, status, created_at)
         VALUES (?, ?, ?, 0, 0, 0, ?, 'unpaid', NOW())`,
        [parentInvoice.order_id, parentInvoiceId, childAmount, childAmount]
      );
      childInvoiceIds.push(res.insertId);
    }

    await connection.commit();
    return { childInvoiceIds, amounts };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};

export const deletePromotion = async (id: number | string): Promise<boolean> => {
  const result = await query("DELETE FROM promotions WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

// ===== RESTAURANT INFO OPERATIONS =====
export const getRestaurantInfo = async (): Promise<any> => {
  const rows = await query<any[]>("SELECT * FROM restaurant_info WHERE id = 1");
  if (rows[0]) return rows[0];
  // Fallback nếu chưa seed
  return {
    id: 1,
    name: "ResManager Bistro",
    address: "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM",
    hotline: "028 3829 4000",
    hotline_hours: "Hỗ trợ 10:00–22:00 hàng ngày",
    email: "contact@resmanager.vn",
    opening_hours: "Thứ 2 – Chủ nhật: 10:00 – 22:00",
    happy_hour: "Happy Hour: 17:00 – 19:00",
    map_url: null,
    tax_rate: 10.0,
    service_fee_rate: 5.0,
    default_payment_method: "cash",
    timezone: "GMT+07:00",
    bank_code: "VCB",
    bank_account: "1234567890",
    bank_name: "Ngân hàng TMCP Ngoại thương Việt Nam",
    bank_account_name: "CONG TY TNHH RESMANAGER",
  };
};

export const updateRestaurantInfo = async (data: any): Promise<any> => {
  const existing = await getRestaurantInfo();
  const fields: string[] = [];
  const values: any[] = [];

  const allowedKeys = [
    "name", "address", "hotline", "hotline_hours", "email",
    "opening_hours", "happy_hour", "map_url",
    "tax_rate", "service_fee_rate", "default_payment_method", "timezone",
    "bank_code", "bank_account", "bank_name", "bank_account_name",
  ];

  for (const key of allowedKeys) {
    if (data[key] !== undefined) {
      fields.push(`\`${key}\` = ?`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) return existing;

  values.push(1);
  await query(`UPDATE restaurant_info SET ${fields.join(", ")} WHERE id = ?`, values);
  return getRestaurantInfo();
};

export const processOrderItemRefund = async (data: {
  orderId: number;
  itemIds: number[];
  reason?: string;
  refundMethod?: string;
}): Promise<any> => {
  await ensureRefundColumns();
  const { orderId, itemIds, reason = "Khách yêu cầu hoàn tiền sau thanh toán", refundMethod = "cash" } = data;

  if (!itemIds || itemIds.length === 0) {
    throw new Error("Không có món ăn nào được chọn để hoàn tiền");
  }

  // Fetch current order items
  const allItems = await getResmanagerOrderItems(orderId);
  const targetItems = allItems.filter((i) => itemIds.includes(Number(i.id)) && !i.is_refunded);

  if (targetItems.length === 0) {
    throw new Error("Không tìm thấy món ăn phù hợp để hoàn tiền (có thể món đã được hoàn trước đó)");
  }

  let totalItemRefundAmount = 0;
  for (const item of targetItems) {
    const itemAmt = Number(item.unit_price) * item.quantity;
    totalItemRefundAmount += itemAmt;

    await query(
      `UPDATE order_items
       SET status = 'voided', is_refunded = 1, refunded_at = NOW(), refund_reason = ?, refund_amount = ?
       WHERE id = ?`,
      [reason, itemAmt, item.id],
    );
  }

  // Hoàn = giá món + VAT, không trừ discount/điểm tích lũy
  // (Discount là quyền lợi khách đã được hưởng khi thanh toán, giữ nguyên)
  const vatRefundAmount = Math.round(totalItemRefundAmount * 0.10);
  const netRefundAmount = totalItemRefundAmount + vatRefundAmount;

  // Cập nhật orders.refunded_total
  await query(
    `UPDATE orders
     SET refunded_total = refunded_total + ?, has_refund = 1
     WHERE id = ?`,
    [netRefundAmount, orderId],
  );

  // Trừ tiền hoàn vào invoice: cập nhật subtotal, tax và total
  // để DB nhất quán với số tiền thực tế sau hoàn
  await query(
    `UPDATE invoices
     SET subtotal = GREATEST(0, subtotal - ?),
         tax      = GREATEST(0, tax - ?),
         total    = GREATEST(0, total - ?)
     WHERE order_id = ?`,
    [totalItemRefundAmount, vatRefundAmount, netRefundAmount, orderId],
  );

  return {
    orderId,
    refundedItems: targetItems.map((i) => ({
      id: i.id,
      name: i.item_name,
      quantity: i.quantity,
      unitPrice: Number(i.unit_price),
      refundAmount: Number(i.unit_price) * i.quantity,
    })),
    totalItemRefundAmount,
    vatRefundAmount,
    proportionalDiscount: 0,
    netRefundAmount,
    refundMethod,
    reason,
    refundedAt: new Date().toISOString(),
  };
};
