import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Table, MenuItem, Inventory, Payment, User } from "./types";




dotenv.config();

let connectionPool: mysql.Pool | null = null;
let dbAvailable = false;
const JSON_DB_DIR = path.join(process.cwd(), "src", "database");
const JSON_DB_PATH = path.join(JSON_DB_DIR, "db.json");

const ensurePool = (): mysql.Pool => {
  if (!connectionPool) {
    throw new Error("Database connection pool is not initialized.");
  }
  return connectionPool;
};

export const query = async <T = any>(sql: string, params: any[] = []): Promise<T> => {
  const pool = ensurePool();
  const [rows] = await pool.query(sql, params);
  return rows as T;
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
  amount: Number(row.amount),
  discountAmount: row.discountAmount !== null ? Number(row.discountAmount) : undefined,
});

const normalizeOrder = (row: any): Order => ({
  ...row,
  items: JSON.parse(row.items),
  guestCount: Number(row.guestCount),
});

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
        INSERT INTO restaurant_info (id, name, address, hotline, hotline_hours, email, opening_hours, happy_hour, tax_rate, service_fee_rate, default_payment_method, timezone)
        VALUES (1, 'ResManager Bistro', '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM', '028 3829 4000', 'Hỗ trợ 10:00–22:00 hàng ngày', 'contact@resmanager.vn', 'Thứ 2 – Chủ nhật: 10:00 – 22:00', 'Happy Hour: 17:00 – 19:00', 10.00, 5.00, 'cash', 'GMT+07:00')
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

    const colsUpdatedAt = await query<any[]>(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'order_items' AND COLUMN_NAME = 'updated_at'`,
    );
    if (colsUpdatedAt.length === 0) {
      await query(`ALTER TABLE order_items ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`);
      console.log("✅ Migration: added order_items.updated_at");
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

    // Đồng bộ bàn reserved với booking pending/confirmed còn hiệu lực
    await query(`
      UPDATE tables t
      SET t.status = 'reserved'
      WHERE t.status = 'empty' AND t.is_deleted = 0
        AND EXISTS (
          SELECT 1 FROM bookings b
          WHERE b.table_id = t.id AND b.status IN ('pending', 'confirmed')
        )
    `);
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
      { menuItemId: "m1", name: "Gỏi hải sản", price: 185, quantity: 1 },
      { menuItemId: "m3", name: "Bò lúc lắc", price: 265, quantity: 1 },
      { menuItemId: "m9", name: "Trà đào cam sả", price: 45, quantity: 2 },
    ],
    status: "served",
    totalAmount: 540,
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
      { menuItemId: "m6", name: "Lẩu Thái chua cay", price: 380, quantity: 1 },
      { menuItemId: "m10", name: "Nước ép dưa hấu", price: 40, quantity: 2 },
    ],
    status: "in_kitchen",
    totalAmount: 460,
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
      { menuItemId: "m4", name: "Cá hồi sốt chanh leo", price: 285, quantity: 1 },
      { menuItemId: "m11", name: "Sinh tố bơ", price: 55, quantity: 1 },
    ],
    status: "served",
    totalAmount: 340,
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
      { menuItemId: "m5", name: "Sườn sụn nướng BBQ", price: 245, quantity: 1 },
      { menuItemId: "m8", name: "Bánh tiramisu", price: 60, quantity: 1 },
    ],
    status: "paid",
    totalAmount: 305,
    createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    orderType: "dine_in",
  },
];

export const getOrders = async (): Promise<Order[]> => {
  if (!dbAvailable) {
    return MOCK_ORDERS;
  }
  const rows = await query<any[]>("SELECT * FROM orders ORDER BY createdAt DESC");
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
      { id: 1, name: "Tầng 1", is_active: 1 },
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
    const rows = await query<any[]>(
      `SELECT t.*, a.name AS area_name 
       FROM tables t 
       LEFT JOIN table_areas a ON t.area_id = a.id 
       WHERE t.id = ?`,
      [id]
    );
    return rows[0] ? mapTable(rows[0]) : null;
  } catch (err) {
    const rows = await query<any[]>("SELECT * FROM tables WHERE id = ?", [id]);
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
  const rows = await query<Payment[]>("SELECT * FROM payments ORDER BY createdAt DESC");
  return rows.map(normalizePayment);
};

export const getPaymentById = async (id: string): Promise<Payment | null> => {
  if (!dbAvailable) return MOCK_PAYMENTS.find((p) => p.id === id) || null;
  const rows = await query<Payment[]>("SELECT * FROM payments WHERE id = ?", [id]);
  return rows[0] ? normalizePayment(rows[0]) : null;
};

export const getPaymentsByOrderId = async (orderId: string): Promise<Payment[]> => {
  if (!dbAvailable) return MOCK_PAYMENTS.filter((p) => p.orderId === orderId);
  const rows = await query<Payment[]>("SELECT * FROM payments WHERE orderId = ? ORDER BY createdAt DESC", [orderId]);
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
  await query(
    "INSERT INTO payments (id, orderId, amount, paymentMethod, status, discountAmount, discountReason, notes, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, payment.orderId, payment.amount, payment.paymentMethod, payment.status, payment.discountAmount || 0, payment.discountReason || null, payment.notes || null, createdAt, payment.completedAt || null],
  );
  return newPayment;
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
  await query("UPDATE payments SET status = ?, completedAt = ? WHERE id = ?", [status, completedAt || null, id]);
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
  await query(
    "UPDATE payments SET amount = ?, discountAmount = ?, discountReason = ? WHERE id = ?",
    [newAmount, discountAmount, discountReason || null, id],
  );
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
    conditions.push("createdAt >= ?");
    params.push(startDate);
  }
  if (endDate) {
    conditions.push("createdAt <= ?");
    params.push(endDate);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rows = await query<any[]>(
    `SELECT
      COUNT(*) AS totalPayments,
      SUM(amount) AS totalAmount,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completedCount,
      SUM(CASE WHEN status = 'completed' THEN amount ELSE 0 END) AS completedAmount,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pendingCount,
      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS pendingAmount,
      SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failedCount,
      SUM(CASE WHEN status = 'failed' THEN amount ELSE 0 END) AS failedAmount
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

export const getResmanagerTableById = async (id: number): Promise<any | null> => {
  const rows = await query<any[]>(
    `SELECT t.*, ta.name AS area_name
     FROM tables t
     JOIN table_areas ta ON t.area_id = ta.id
     WHERE t.id = ? AND t.is_deleted = 0`,
    [id],
  );
  return rows[0] || null;
};

export const updateResmanagerTableStatus = async (
  id: number,
  status: "empty" | "reserved" | "serving" | "pending_payment" | "cleaning" | "maintenance",
  maintenanceNote?: string,
): Promise<boolean> => {
  let result;

  try {
    if (status === "maintenance" && maintenanceNote) {
      // Cập nhật status + lý do bảo trì
      result = await query<any>(
        "UPDATE tables SET status = ?, maintenance_note = ? WHERE id = ? AND is_deleted = 0",
        [status, maintenanceNote, id]
      );
    } else if (status === "empty") {
      // Xóa note khi bàn được đưa về trống
      result = await query<any>(
        "UPDATE tables SET status = ?, maintenance_note = NULL WHERE id = ? AND is_deleted = 0",
        [status, id]
      );
    } else {
      result = await query<any>("UPDATE tables SET status = ? WHERE id = ? AND is_deleted = 0", [status, id]);
    }
  } catch (err: any) {
    // Fallback: nếu cột maintenance_note chưa tồn tại → chỉ update status
    const isUnknownColumn =
      err?.message?.includes("Unknown column") || err?.code === "ER_BAD_FIELD_ERROR";
    if (isUnknownColumn) {
      console.warn("[db] maintenance_note column not found, falling back to status-only update. Run: ALTER TABLE tables ADD COLUMN maintenance_note TEXT DEFAULT NULL;");
      result = await query<any>("UPDATE tables SET status = ? WHERE id = ? AND is_deleted = 0", [status, id]);
    } else {
      throw err;
    }
  }

  if (result.affectedRows > 0) {
    if (status === "empty") {
      // Hủy bỏ các booking liên quan đến bàn này nếu chuyển về trống
      await query<any>(
        `UPDATE bookings SET status = 'cancelled'
         WHERE table_id = ? AND status IN ('pending', 'confirmed')`,
        [id]
      );
    } else if (status === "serving") {
      // Hoàn thành các booking liên quan đến bàn này nếu đã nhận bàn (serving)
      await query<any>(
        `UPDATE bookings SET status = 'completed'
         WHERE table_id = ? AND status IN ('pending', 'confirmed')`,
        [id]
      );
    }
    return true;
  }
  return false;
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
  const rows = await query<any[]>(
    `SELECT 1 FROM bookings WHERE table_id = ? AND status IN ('pending', 'confirmed') LIMIT 1`,
    [tableId]
  );
  return rows.length > 0;
};

// ============================================================================
//  RESMANAGER SCHEMA — Bookings
// ============================================================================

export const getBookings = async (status?: string): Promise<any[]> => {
  if (status) {
    return query<any[]>(
      `SELECT b.*, t.name AS table_name, ta.name AS area_name
       FROM bookings b
       LEFT JOIN tables t ON b.table_id = t.id
       LEFT JOIN table_areas ta ON t.area_id = ta.id
       WHERE b.status = ?
       ORDER BY b.start_time DESC`,
      [status],
    );
  }
  return query<any[]>(
    `SELECT b.*, t.name AS table_name, ta.name AS area_name
     FROM bookings b
     LEFT JOIN tables t ON b.table_id = t.id
     LEFT JOIN table_areas ta ON t.area_id = ta.id
     ORDER BY b.start_time DESC`,
  );
};

export const getBookingById = async (id: number): Promise<any | null> => {
  const rows = await query(`
    SELECT b.*, t.name AS table_name, a.name AS area_name
    FROM bookings b
    LEFT JOIN tables t ON b.table_id = t.id
    LEFT JOIN table_areas a ON t.area_id = a.id
    WHERE b.id = ?
  `, [id]);
  return rows[0] || null;
};

export const createBooking = async (data: any): Promise<any> => {
  // Kiểm tra trùng lịch đặt bàn (Overbooking prevention)
  const overlaps = await query<any[]>(`
    SELECT id FROM bookings
    WHERE table_id = ? AND status IN ('pending', 'confirmed')
      AND start_time < ? AND end_time > ?
    LIMIT 1
  `, [data.table_id, data.end_time, data.start_time]);

  if (overlaps.length > 0) {
    throw new Error("Khung giờ đặt bàn này đã bị trùng với lịch đặt khác trên cùng bàn!");
  }

  const code = `BK${new Date().toISOString().slice(0, 10).replace(/-/g, "")}${Math.floor(1000 + Math.random() * 9000)}`;
  const result = await query(`
    INSERT INTO bookings (table_id, customer_id, promotion_id, guest_name, guest_phone, party_size, start_time, end_time, confirmation_code, status, guest_note, note)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)
  `, [
    data.table_id,
    data.customer_id || null,
    data.promotion_id || null,
    data.guest_name,
    data.guest_phone,
    data.party_size,
    data.start_time,
    data.end_time,
    code,
    data.guest_note || null,
    data.note || null
  ]);
  const insertId = result.insertId;

  // Chỉ khóa bàn (chuyển sang reserved) nếu lịch đặt diễn ra trong vòng 2 giờ tới
  const bookingTime = new Date(data.start_time).getTime();
  const now = Date.now();
  if (bookingTime - now <= 2 * 60 * 60 * 1000) {
    await query("UPDATE tables SET status = 'reserved' WHERE id = ?", [data.table_id]);
  }

  return { id: insertId, confirmation_code: code, ...data, status: 'pending' };
};


export const updateBookingStatus = async (id: number, status: string, userId?: number): Promise<boolean> => {
  const booking = await getBookingById(id);
  if (!booking) return false;

  await query(`
    UPDATE bookings SET status = ?, note = COALESCE(?, note) WHERE id = ?
  `, [status, userId ? `Updated by staff id: ${userId}` : null, id]);

  // Update table status accordingly
  if (status === 'cancelled' || status === 'completed') {
    await query("UPDATE tables SET status = 'empty' WHERE id = ?", [booking.table_id]);
  } else if (status === 'confirmed') {
    await query("UPDATE tables SET status = 'reserved' WHERE id = ?", [booking.table_id]);
  }
  return true;
};

export const deleteCancelledBooking = async (id: number): Promise<boolean> => {
  const result = await query(`
    DELETE FROM bookings WHERE id = ? AND status = 'cancelled'
  `, [id]);
  return result.affectedRows > 0;
};

// ===== RESMANAGER TABLE DATABASE OPERATIONS =====
export const getResmanagerTablesWithExtra = async (areaId?: number): Promise<any[]> => {
  let sql = `
    SELECT t.*, a.name AS area_name,
           COALESCE(o.guest_name, b.guest_name) AS guest_name,
           COALESCE(o.guest_phone, b.guest_phone) AS guest_phone,
           COALESCE(o.guest_count, b.party_size) AS guest_count,
           DATE_FORMAT(COALESCE(o.created_at, b.start_time), '%H:%i %d/%m/%Y') AS start_time
    FROM tables t
    LEFT JOIN table_areas a ON t.area_id = a.id
    LEFT JOIN orders o ON o.id = (
      SELECT id FROM orders
      WHERE table_id = t.id AND status IN ('open', 'serving', 'pending_payment')
      ORDER BY created_at DESC, id DESC
      LIMIT 1
    )
    LEFT JOIN bookings b ON b.id = (
      SELECT id FROM bookings
      WHERE table_id = t.id AND (
        status IN ('pending', 'confirmed') OR 
        (t.status IN ('serving', 'pending_payment') AND status = 'completed')
      )
      ORDER BY FIELD(status, 'pending', 'confirmed', 'completed'), start_time DESC
      LIMIT 1
    )
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
    const mergedTo = await query("SELECT primary_table_id FROM table_merges WHERE merged_table_id = ?", [r.id]);
    const mergedChildren = await query("SELECT merged_table_id FROM table_merges WHERE primary_table_id = ?", [r.id]);
    const splits = await query("SELECT child_label FROM table_splits WHERE parent_table_id = ?", [r.id]);

    results.push({
      ...r,
      is_merged_child: mergedTo.length > 0,
      merged_into: mergedTo.length > 0 ? mergedTo[0].primary_table_id : null,
      is_merged_primary: mergedChildren.length > 0,
      merged_tables: mergedChildren.map((c: any) => c.merged_table_id),
      is_split: splits.length > 0,
      split_labels: splits.map((s: any) => s.child_label)
    });
  }
  return results;
};

export const getEmptyTablesForBooking = async (startTime?: string): Promise<any[]> => {
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



export const transferResmanagerOrder = async (sourceTableId: number, targetTableId: number): Promise<boolean> => {
  const rows = await query("SELECT id FROM orders WHERE table_id = ? AND status IN ('open', 'serving')", [sourceTableId]);
  if (rows.length === 0) return false;
  const orderId = rows[0].id;

  await query("UPDATE orders SET table_id = ? WHERE id = ?", [targetTableId, orderId]);
  await query("UPDATE tables SET status = 'empty' WHERE id = ?", [sourceTableId]);
  await query("UPDATE tables SET status = 'serving' WHERE id = ?", [targetTableId]);
  return true;
};

export const mergeResmanagerTables = async (primaryTableId: number, mergedTableIds: number[]): Promise<boolean> => {
  // Tìm order đang phục vụ của bàn chính
  let primaryOrders = await query<any[]>("SELECT id FROM orders WHERE table_id = ? AND status IN ('open', 'serving') LIMIT 1", [primaryTableId]);
  let primaryOrderId = primaryOrders.length > 0 ? primaryOrders[0].id : null;

  for (const mergedId of mergedTableIds) {
    await query("INSERT INTO table_merges (primary_table_id, merged_table_id) VALUES (?, ?)", [primaryTableId, mergedId]);
    await query("UPDATE tables SET status = 'serving' WHERE id = ?", [mergedId]);

    // Xử lý gộp đơn hàng / món ăn từ bàn phụ sang bàn chính
    const mergedOrders = await query<any[]>("SELECT id FROM orders WHERE table_id = ? AND status IN ('open', 'serving')", [mergedId]);
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


export const splitResmanagerTable = async (
  parentTableId: number,
  childLabel: string,
  targetTableId: number,
  itemIds: number[]
): Promise<{ success: boolean; newOrderId?: number }> => {
  const rows = await query("SELECT * FROM orders WHERE table_id = ? AND status IN ('open', 'serving') LIMIT 1", [parentTableId]);
  if (rows.length === 0) return { success: false };
  const originalOrder = rows[0];


  const result = await query(`
    INSERT INTO orders (table_id, customer_id, created_by, order_type, split_label, status, guest_name, guest_phone)
    VALUES (?, ?, ?, ?, ?, 'serving', ?, ?)
  `, [
    targetTableId,
    originalOrder.customer_id,
    originalOrder.created_by,
    originalOrder.order_type,
    childLabel,
    originalOrder.guest_name,
    originalOrder.guest_phone
  ]);
  const newOrderId = result.insertId;

  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => "?").join(", ");
    await query(`
      UPDATE order_items 
      SET order_id = ? 
      WHERE id IN (${placeholders})
    `, [newOrderId, ...itemIds]);
  }

  await query("INSERT INTO table_splits (parent_table_id, child_label) VALUES (?, ?)", [parentTableId, childLabel]);
  await query("UPDATE tables SET status = 'serving' WHERE id = ?", [targetTableId]);

  return { success: true, newOrderId };
};

// ===== WAITER/MENU DATABASE OPERATIONS =====
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
  return query(sql, params);
};

export const getResmanagerCategories = async (): Promise<any[]> => {
  return query("SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC");
};

export const getResmanagerOrdersByTable = async (tableId: number): Promise<any[]> => {
  return query("SELECT * FROM orders WHERE table_id = ? AND status IN ('open', 'serving', 'pending_payment')", [tableId]);
};

export const getAllResmanagerOrders = async (status?: string): Promise<any[]> => {
  let sql = `
    SELECT o.*, t.name AS table_name, t.area_id,
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
    order.items = await getResmanagerOrderItems(order.id);
    order.totalAmount = order.items.reduce(
      (sum: number, item: any) => sum + Number(item.unit_price) * item.quantity,
      0
    );
  }
  return orders;
};

export const getResmanagerPayments = async (): Promise<any[]> => {
  return query(`
    SELECT p.*, o.table_id, t.name AS table_name, o.guest_name, o.guest_phone, o.order_type
    FROM payments p
    LEFT JOIN orders o ON p.orderId = o.id
    LEFT JOIN tables t ON o.table_id = t.id
    ORDER BY p.createdAt DESC
  `);
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
  const result = await query(`
    INSERT INTO orders (table_id, customer_id, created_by, order_type, note, guest_name, guest_phone, guest_count, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open')
  `, [
    data.table_id,
    data.customer_id || null,
    data.created_by,
    data.order_type || 'dine_in',
    data.note || null,
    data.guest_name || null,
    data.guest_phone || null,
    data.guest_count || null
  ]);
  return { id: result.insertId, ...data, status: 'open' };
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

    await query(`
      UPDATE order_items 
      SET quantity = ?, kitchen_note = ? 
      WHERE id = ?
    `, [newQuantity, newNote, existing.id]);

    return { 
      id: existing.id, 
      ...data, 
      quantity: newQuantity, 
      kitchen_note: newNote, 
      status: 'pending', 
      merged: true 
    };
  }

  const result = await query(`
    INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, seat_number, course_number, kitchen_note, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
  `, [
    data.order_id,
    data.menu_item_id,
    data.quantity,
    data.unit_price,
    data.seat_number || null,
    data.course_number || 1,
    data.kitchen_note || null
  ]);
  return { id: result.insertId, ...data, status: 'pending', merged: false };
};

export const voidResmanagerOrderItem = async (itemId: number, reason: string): Promise<boolean> => {
  const result = await query(`
    UPDATE order_items 
    SET status = 'voided', void_reason = ?, voided_at = NOW() 
    WHERE id = ?
  `, [reason, itemId]);
  return result.affectedRows > 0;
};

export const sendResmanagerOrderItemsToKitchen = async (orderItemIds: number[]): Promise<boolean> => {
  if (orderItemIds.length === 0) return false;
  const placeholders = orderItemIds.map(() => "?").join(",");
  const result = await query<any>(
    `UPDATE order_items SET status = 'pending', is_held = 0
     WHERE id IN (${placeholders})`,
    orderItemIds,
  );
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
    UPDATE order_items SET status = 'served' WHERE id = ? AND status = 'done'
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
export const findCustomerByEmail = async (email: string): Promise<any | null> => {
  const rows = await query("SELECT * FROM customers WHERE email = ? AND is_deleted = 0", [email]);
  return rows[0] || null;
};

export const findCustomerById = async (id: number | string): Promise<any | null> => {
  const rows = await query("SELECT * FROM customers WHERE id = ? AND is_deleted = 0", [id]);
  return rows[0] || null;
};

export const createCustomer = async (data: any): Promise<any> => {
  const result = await query(`
    INSERT INTO customers (name, email, phone, password_hash, member_level, loyalty_points)
    VALUES (?, ?, ?, ?, 'bronze', 0)
  `, [data.name, data.email, data.phone || null, data.password_hash]);
  return { id: result.insertId, name: data.name, email: data.email, phone: data.phone || null, member_level: 'bronze', loyalty_points: 0 };
};

export const updateCustomerProfile = async (id: number | string, data: any): Promise<boolean> => {
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
  const result = await query(`
    INSERT INTO event_contracts (
      hall_id, customer_id, package_id, contact_name, contact_phone,
      event_date, guest_count, table_count, total_amount, deposit_amount,
      remaining, status, note, created_by
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0.00, ?, 'draft', ?, 1)
  `, [
    data.hall_id, data.customer_id, data.package_id || null, data.contact_name, data.contact_phone,
    data.event_date, data.guest_count, data.table_count, data.total_amount, data.total_amount,
    data.note || null
  ]);
  return { id: result.insertId, ...data, status: 'draft', deposit_amount: 0, remaining: data.total_amount };
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
