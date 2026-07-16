import mysql from "mysql2/promise";
import bcrypt from "bcrypt";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Table, MenuItem, Inventory, Payment, User } from "./types";

dotenv.config();

let dbAvailable = false;
export let connectionPool: mysql.Pool | null = null;

const JSON_DB_DIR = path.join(__dirname, "../database");
const JSON_DB_PATH = path.join(JSON_DB_DIR, "db.json");

const ensurePool = (): mysql.Pool => {
  if (!connectionPool) {
    throw new Error("Database connection pool is not initialized.");
  }
  return connectionPool;
};

const query = async <T = any>(sql: string, params: any[] = []): Promise<T> => {
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
  return {
    ...user,
    id: String(user.id),
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
  status: "empty" | "reserved" | "serving" | "pending_payment",
): Promise<boolean> => {
  const result = await query<any>("UPDATE tables SET status = ? WHERE id = ? AND is_deleted = 0", [status, id]);
  
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
  const rows = await query<any[]>(
    `SELECT b.*, t.name AS table_name, ta.name AS area_name
     FROM bookings b
     LEFT JOIN tables t ON b.table_id = t.id
     LEFT JOIN table_areas ta ON t.area_id = ta.id
     WHERE b.id = ?`,
    [id],
  );
  return rows[0] || null;
};

export const syncTableStatusWithBooking = async (
  tableId: number,
  bookingStatus: "pending" | "confirmed" | "cancelled" | "completed",
  userId?: number,
  booking?: any
): Promise<void> => {
  if (bookingStatus === "pending" || bookingStatus === "confirmed") {
    await query<any>(
      `UPDATE tables SET status = 'reserved'
       WHERE id = ? AND status = 'empty' AND is_deleted = 0`,
      [tableId],
    );
    return;
  }

  if (bookingStatus === "cancelled") {
    await query<any>(
      `UPDATE tables SET status = 'empty'
       WHERE id = ? AND status = 'reserved' AND is_deleted = 0
         AND NOT EXISTS (
           SELECT 1 FROM orders o
           WHERE o.table_id = ? AND o.status NOT IN ('completed', 'cancelled')
         )`,
      [tableId, tableId],
    );
  }

  if (bookingStatus === "completed") {
    await query<any>(
      `UPDATE tables SET status = 'serving'
       WHERE id = ? AND (status = 'reserved' OR status = 'empty') AND is_deleted = 0`,
      [tableId],
    );

    const existingOrders = await query<any[]>(
      `SELECT id FROM orders WHERE table_id = ? AND status NOT IN ('completed', 'cancelled')`,
      [tableId]
    );

    if (existingOrders.length === 0 && booking) {
       await createResmanagerOrder({
         table_id: tableId,
         created_by: userId || 4,
         order_type: "dine_in",
         guest_name: booking.guest_name || null,
         guest_phone: booking.guest_phone || null,
       });
    }
  }
};

export const createBooking = async (data: {
  table_id: number;
  customer_id?: number | null;
  guest_name: string;
  guest_phone: string;
  party_size: number;
  start_time: string;
  end_time: string;
  guest_note?: string;
  note?: string;
}): Promise<any> => {
  const code = "BK" + Date.now();
  const result = await query<any>(
    `INSERT INTO bookings (table_id, customer_id, guest_name, guest_phone, party_size, start_time, end_time, confirmation_code, status, guest_note, note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    [
      data.table_id,
      data.customer_id || null,
      data.guest_name,
      data.guest_phone,
      data.party_size,
      data.start_time,
      data.end_time,
      code,
      data.guest_note || null,
      data.note || null,
    ],
  );
  await syncTableStatusWithBooking(data.table_id, "pending");
  return { id: result.insertId, ...data, confirmation_code: code, status: "pending" };
};

export const updateBookingStatus = async (
  id: number,
  status: "pending" | "confirmed" | "cancelled" | "completed",
  userId?: number
): Promise<boolean> => {
  const booking = await getBookingById(id);
  if (!booking) return false;

  const result = await query<any>("UPDATE bookings SET status = ? WHERE id = ?", [status, id]);
  if (result.affectedRows > 0 && booking.table_id) {
    await syncTableStatusWithBooking(booking.table_id, status, userId, booking);
  }
  return result.affectedRows > 0;
};

export const completeActiveBookingForTable = async (tableId: number, userId?: number): Promise<void> => {
  const rows = await query<any[]>(
    `SELECT id FROM bookings WHERE table_id = ? AND status IN ('pending', 'confirmed') ORDER BY start_time ASC LIMIT 1`,
    [tableId],
  );
  if (rows.length > 0) {
    await updateBookingStatus(rows[0].id, "completed", userId);
  }
};

export const deleteCancelledBooking = async (id: number): Promise<boolean> => {
  const booking = await getBookingById(id);
  if (!booking || booking.status !== "cancelled") return false;

  const result = await query<any>("DELETE FROM bookings WHERE id = ? AND status = 'cancelled'", [id]);
  if (result.affectedRows > 0 && booking.table_id) {
    await syncTableStatusWithBooking(booking.table_id, "cancelled");
  }
  return result.affectedRows > 0;
};

// ============================================================================
//  RESMANAGER SCHEMA — Waitlist
// ============================================================================

export const getWaitlist = async (): Promise<any[]> => {
  return query<any[]>("SELECT * FROM waitlist ORDER BY joined_at ASC");
};

export const addToWaitlist = async (data: {
  guest_name: string;
  party_size: number;
  phone?: string;
}): Promise<any> => {
  const result = await query<any>(
    "INSERT INTO waitlist (guest_name, party_size, phone) VALUES (?, ?, ?)",
    [data.guest_name, data.party_size, data.phone || null],
  );
  return { id: result.insertId, ...data, joined_at: new Date().toISOString(), notified_at: null };
};

export const notifyWaitlistGuest = async (id: number): Promise<boolean> => {
  const result = await query<any>("UPDATE waitlist SET notified_at = NOW() WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

export const removeFromWaitlist = async (id: number): Promise<boolean> => {
  const result = await query<any>("DELETE FROM waitlist WHERE id = ?", [id]);
  return result.affectedRows > 0;
};

// ============================================================================
//  RESMANAGER SCHEMA — Menu Items & Categories
// ============================================================================

export const getResmanagerCategories = async (): Promise<any[]> => {
  return query<any[]>("SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC");
};

export const getResmanagerMenuItems = async (categoryId?: number): Promise<any[]> => {
  const sql = categoryId
    ? `SELECT m.*, c.name AS category_name
       FROM menu_items m
       JOIN categories c ON m.category_id = c.id
       WHERE m.is_deleted = 0 AND m.is_active = 1 AND m.category_id = ?
       ORDER BY c.sort_order, m.name`
    : `SELECT m.*, c.name AS category_name
       FROM menu_items m
       JOIN categories c ON m.category_id = c.id
       WHERE m.is_deleted = 0 AND m.is_active = 1
       ORDER BY c.sort_order, m.name`;
  return categoryId ? query<any[]>(sql, [categoryId]) : query<any[]>(sql);
};

// ============================================================================
//  RESMANAGER SCHEMA — Orders & Order Items
// ============================================================================

export const getResmanagerOrdersByTable = async (tableId: number): Promise<any[]> => {
  return query<any[]>(
    `SELECT o.*,
            u.full_name AS waiter_name
     FROM orders o
     LEFT JOIN users u ON o.created_by = u.id
     WHERE o.table_id = ? AND o.status NOT IN ('completed', 'cancelled')
     ORDER BY o.created_at DESC`,
    [tableId],
  );
};

export const getResmanagerOrderItems = async (orderId: number): Promise<any[]> => {
  return query<any[]>(
    `SELECT oi.*, m.name AS item_name, m.image_url, m.price AS unit_price_ref
     FROM order_items oi
     JOIN menu_items m ON oi.menu_item_id = m.id
     WHERE oi.order_id = ? AND oi.status != 'voided'
     ORDER BY oi.course_number, oi.created_at`,
    [orderId],
  );
};

export const createResmanagerOrder = async (data: {
  table_id: number | null;
  customer_id?: number | null;
  created_by: number;
  order_type?: "dine_in" | "takeaway" | "delivery";
  note?: string;
  guest_name?: string | null;
  guest_phone?: string | null;
}): Promise<any> => {
  const result = await query<any>(
    `INSERT INTO orders (table_id, customer_id, created_by, order_type, status, note, guest_name, guest_phone)
     VALUES (?, ?, ?, ?, 'open', ?, ?, ?)`,
    [
      data.table_id,
      data.customer_id || null,
      data.created_by,
      data.order_type || "dine_in",
      data.note || null,
      data.guest_name || null,
      data.guest_phone || null,
    ],
  );
  return { id: result.insertId, ...data, status: "open" };
};


export const addResmanagerOrderItem = async (data: {
  order_id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  seat_number?: number | null;
  course_number?: number;
  kitchen_note?: string;
}): Promise<any> => {
  const result = await query<any>(
    `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, seat_number, course_number, kitchen_note, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      data.order_id,
      data.menu_item_id,
      data.quantity,
      data.unit_price,
      data.seat_number || null,
      data.course_number || 1,
      data.kitchen_note || null,
    ],
  );
  return { id: result.insertId, ...data, status: "pending" };
};

export const voidResmanagerOrderItem = async (itemId: number, reason: string): Promise<boolean> => {
  const result = await query<any>(
    "UPDATE order_items SET status = 'voided', voided_at = NOW(), void_reason = ? WHERE id = ?",
    [reason, itemId],
  );
  return result.affectedRows > 0;
};

export const sendResmanagerOrderItemsToKitchen = async (orderItemIds: number[]): Promise<boolean> => {
  if (orderItemIds.length === 0) return false;
  const placeholders = orderItemIds.map(() => "?").join(",");
  const result = await query<any>(
    `UPDATE order_items SET status = 'cooking', is_held = 0
     WHERE id IN (${placeholders}) AND status = 'pending'`,
    orderItemIds,
  );
  return result.affectedRows > 0;
};

export const holdResmanagerOrderItems = async (orderItemIds: number[], held: boolean): Promise<boolean> => {
  if (orderItemIds.length === 0) return false;
  const placeholders = orderItemIds.map(() => "?").join(",");
  const result = await query<any>(
    `UPDATE order_items SET is_held = ?
     WHERE id IN (${placeholders}) AND status = 'pending'`,
    [held ? 1 : 0, ...orderItemIds],
  );
  return result.affectedRows > 0;
};

/**
 * Lấy danh sách món đã xong (status='done') thuộc các order đang mở,
 * để waiter biết cần mang ra bàn.
 * Chỉ lấy 'done' — khi đã served thì tự biến mất khỏi danh sách.
 */
export const getWaiterDoneNotifications = async (): Promise<any[]> => {
  return query<any[]>(
    `SELECT
       oi.id          AS item_id,
       oi.order_id,
       oi.status,
       oi.created_at  AS item_created_at,
       m.name         AS item_name,
       t.name         AS table_name,
       t.id           AS table_id
     FROM order_items oi
     JOIN orders o      ON oi.order_id     = o.id
     JOIN menu_items m  ON oi.menu_item_id = m.id
     LEFT JOIN tables t ON o.table_id      = t.id
     WHERE oi.status = 'done'
       AND o.status IN ('open', 'serving')
     ORDER BY oi.created_at DESC
     LIMIT 50`,
  );
};

/**
 * Waiter xác nhận đã mang món ra bàn: done → served
 */
export const markOrderItemServed = async (itemId: number): Promise<boolean> => {
  const result = await query<any>(
    `UPDATE order_items SET status = 'served' WHERE id = ? AND status = 'done'`,
    [itemId],
  );
  return result.affectedRows > 0;
};


// ============================================================================
//  RESMANAGER SCHEMA — Tables Enhanced (with guest + merge + split info)
// ============================================================================

/**
 * Lấy danh sách bàn kèm thông tin khách hàng, gộp bàn, tách bàn
 */
export const getResmanagerTablesWithExtra = async (areaId?: number): Promise<any[]> => {
  // 1) Lấy tất cả bàn cơ bản
  const tables = await getResmanagerTables(areaId);

  // 2) Lấy active orders kèm thông tin khách
  const activeOrders = await query<any[]>(
    `SELECT o.table_id, o.id AS order_id, o.customer_id,
            o.guest_name, o.guest_phone,
            c.name AS customer_name, c.phone AS customer_phone
     FROM orders o
     LEFT JOIN customers c ON o.customer_id = c.id
     WHERE o.status NOT IN ('completed', 'cancelled') AND o.table_id IS NOT NULL`,
  );

  // 3) Lấy booking sắp tới (pending/confirmed) cho bàn reserved
  const bookings = await query<any[]>(
    `SELECT b.table_id, b.guest_name, b.guest_phone, b.party_size, b.start_time
     FROM bookings b
     WHERE b.status IN ('pending', 'confirmed')
     ORDER BY b.start_time ASC`,
  );

  // 4) Lấy tất cả merge records
  const merges = await query<any[]>(
    `SELECT tm.primary_table_id, tm.merged_table_id,
            tp.name AS primary_name, tm2.name AS merged_name
     FROM table_merges tm
     JOIN tables tp  ON tp.id  = tm.primary_table_id
     JOIN tables tm2 ON tm2.id = tm.merged_table_id`,
  );

  // 5) Lấy tất cả split records
  const splits = await query<any[]>(
    `SELECT ts.parent_table_id, ts.child_label, ts.created_at,
            t.name AS parent_name
     FROM table_splits ts
     JOIN tables t ON t.id = ts.parent_table_id`,
  );

  return tables.map((table: any) => {
    // Thông tin order đang chạy
    const activeOrder = activeOrders.find((o) => o.table_id === table.id);
    const upcomingBooking = bookings.find((b) => b.table_id === table.id);

    // Thông tin khách
    let guestName: string | null = null;
    let guestPhone: string | null = null;
    let bookingStartTime: string | null = null;

    if (activeOrder) {
      // Ưu tiên: guest_name/guest_phone cột riêng → customer từ JOIN
      guestName  = activeOrder.guest_name  || activeOrder.customer_name  || null;
      guestPhone = activeOrder.guest_phone || activeOrder.customer_phone || null;
    }

    if (!guestName && upcomingBooking) {
      guestName = upcomingBooking.guest_name;
      guestPhone = upcomingBooking.guest_phone;
      bookingStartTime = upcomingBooking.start_time;
    }

    // Hiển thị reserved trên sơ đồ khi có booking active nhưng DB chưa sync status
    const displayStatus =
      table.status === "empty" && upcomingBooking ? "reserved" : table.status;

    // Thông tin gộp bàn
    const mergedInto = merges.find((m) => m.merged_table_id === table.id);
    const mergedChildren = merges.filter((m) => m.primary_table_id === table.id);

    // Thông tin tách bàn
    const splitChildren = splits.filter((s) => s.parent_table_id === table.id);

    return {
      ...table,
      status: displayStatus,
      guest_name: guestName,
      guest_phone: guestPhone,
      booking_start_time: bookingStartTime,
      has_upcoming_booking: !!upcomingBooking,
      // Gộp bàn
      is_merged_primary: mergedChildren.length > 0,
      merged_tables: mergedChildren.map((m) => ({ id: m.merged_table_id, name: m.merged_name })),
      is_merged_child: !!mergedInto,
      merged_into: mergedInto
        ? { id: mergedInto.primary_table_id, name: mergedInto.primary_name }
        : null,
      // Tách bàn
      is_split: splitChildren.length > 0,
      split_labels: splitChildren.map((s) => s.child_label),
    };
  });
};

/**
 * Lấy chỉ những bàn trống (status='empty') — dùng cho dropdown tạo booking
 * Nếu truyền vào startTime, sẽ loại bỏ những bàn đã được book vào khoảng thời gian đó (VD: chênh nhau trong vòng 2 tiếng).
 */
export const getEmptyTablesForBooking = async (startTime?: string): Promise<any[]> => {
  let queryStr = `
    SELECT t.*, ta.name AS area_name
    FROM tables t
    JOIN table_areas ta ON t.area_id = ta.id
    WHERE t.is_deleted = 0 AND t.status = 'empty'
  `;
  let params: any[] = [];

  if (startTime) {
    // Nếu có truyền startTime, lấy các bàn trống và KHÔNG có booking trùng giờ
    // Trùng giờ = booking.start_time < requested.start_time + 2 giờ 
    //        AND booking.end_time > requested.start_time
    queryStr += `
      AND t.id NOT IN (
        SELECT table_id FROM bookings
        WHERE status IN ('pending', 'confirmed')
          AND start_time < DATE_ADD(?, INTERVAL 2 HOUR)
          AND end_time > ?
      )
    `;
    params.push(startTime, startTime);
  }

  queryStr += ` ORDER BY t.area_id, t.row_pos, t.col_pos`;
  return query<any[]>(queryStr, params);
};

// ============================================================================
//  RESMANAGER SCHEMA — Merge / Split / Transfer
// ============================================================================

/**
 * Gộp bàn:
 * 1. Di chuyển order_items sang bàn chính.
 * 2. Cập nhật trạng thái các order bị gộp thành 'cancelled' (hoặc merged)
 * 3. insert table_merges, update merged tables status → serving
 */
export const mergeResmanagerTables = async (
  primaryTableId: number,
  mergedTableIds: number[],
): Promise<boolean> => {
  if (mergedTableIds.length === 0) return false;

  // Lấy active order của bàn chính
  const primaryOrders = await query<any[]>(
    `SELECT id FROM orders WHERE table_id = ? AND status NOT IN ('completed', 'cancelled') ORDER BY created_at DESC LIMIT 1`,
    [primaryTableId],
  );

  if (primaryOrders.length > 0) {
    const primaryOrderId = primaryOrders[0].id;

    // Với mỗi bàn bị gộp, tìm active order của nó
    for (const mergedId of mergedTableIds) {
      const mergedOrders = await query<any[]>(
        `SELECT id FROM orders WHERE table_id = ? AND status NOT IN ('completed', 'cancelled') ORDER BY created_at DESC LIMIT 1`,
        [mergedId],
      );

      if (mergedOrders.length > 0) {
        const mergedOrderId = mergedOrders[0].id;
        // Di chuyển tất cả order_items sang primary order
        await query<any>(
          `UPDATE order_items SET order_id = ? WHERE order_id = ?`,
          [primaryOrderId, mergedOrderId],
        );
        // Hủy hóa đơn của bàn phụ (với ghi chú là đã bị gộp)
        await query<any>(
          `UPDATE orders SET status = 'cancelled', note = JSON_SET(COALESCE(note, '{}'), '$.merged_into', ?) WHERE id = ?`,
          [primaryOrderId, mergedOrderId],
        );
      }
    }
  }

  // Xóa merge records cũ liên quan
  const allIds = [primaryTableId, ...mergedTableIds];
  const placeholders = allIds.map(() => "?").join(",");
  await query<any>(
    `DELETE FROM table_merges
     WHERE primary_table_id IN (${placeholders}) OR merged_table_id IN (${placeholders})`,
    [...allIds, ...allIds],
  );

  // Insert merge records mới
  for (const mergedId of mergedTableIds) {
    await query<any>(
      `INSERT INTO table_merges (primary_table_id, merged_table_id) VALUES (?, ?)`,
      [primaryTableId, mergedId],
    );
    // Giữ merged table status = serving (chung với bàn chính)
    await query<any>(`UPDATE tables SET status = 'serving' WHERE id = ?`, [mergedId]);
  }
  return true;
};

/**
 * Bỏ gộp bàn: xóa table_merges records, trả merged tables về empty
 */
export const unmergeResmanagerTable = async (primaryTableId: number): Promise<boolean> => {
  // Lấy danh sách merged tables
  const mergedRows = await query<any[]>(
    `SELECT merged_table_id FROM table_merges WHERE primary_table_id = ?`,
    [primaryTableId],
  );

  // Set merged tables về empty
  for (const row of mergedRows) {
    await query<any>(`UPDATE tables SET status = 'empty' WHERE id = ?`, [row.merged_table_id]);
  }

  // Xóa merge records
  const result = await query<any>(
    `DELETE FROM table_merges WHERE primary_table_id = ? OR merged_table_id = ?`,
    [primaryTableId, primaryTableId],
  );
  return result.affectedRows > 0;
};

/**
 * Chuyển bàn: cập nhật order.table_id, đổi trạng thái 2 bàn
 */
export const transferResmanagerOrder = async (
  sourceTableId: number,
  targetTableId: number,
): Promise<boolean> => {
  const sourceRows = await query<any[]>(
    `SELECT status FROM tables WHERE id = ? AND is_deleted = 0`,
    [sourceTableId],
  );
  if (sourceRows.length === 0) return false;

  const sourceStatus = sourceRows[0].status as string;
  if (!["serving", "pending_payment"].includes(sourceStatus)) return false;

  // Cập nhật order sang bàn mới (nếu có)
  await query<any>(
    `UPDATE orders SET table_id = ? WHERE table_id = ? AND status NOT IN ('completed', 'cancelled')`,
    [targetTableId, sourceTableId],
  );

  // Chuyển trạng thái bàn — kể cả khi chưa có order active (data lệch seed/UI)
  await query<any>(`UPDATE tables SET status = ? WHERE id = ?`, [sourceStatus, targetTableId]);
  await query<any>(`UPDATE tables SET status = 'empty' WHERE id = ?`, [sourceTableId]);

  // Xóa bất kỳ merge records liên quan đến source table
  await query<any>(
    `DELETE FROM table_merges WHERE primary_table_id = ? OR merged_table_id = ?`,
    [sourceTableId, sourceTableId],
  );

  return true;
};

/**
 * Tách bàn: tạo order mới cho target table, move selected items sang order mới
 */
export const splitResmanagerTable = async (
  parentTableId: number,
  childLabel: string,
  targetTableId: number,
  itemIds: number[],
): Promise<{ success: boolean; newOrderId?: number }> => {
  // Lấy order gốc
  const orders = await query<any[]>(
    `SELECT * FROM orders WHERE table_id = ? AND status NOT IN ('completed', 'cancelled')
     ORDER BY created_at DESC LIMIT 1`,
    [parentTableId],
  );
  if (orders.length === 0) return { success: false };
  const originalOrder = orders[0];

  // Tạo order mới cho target table (kế thừa thông tin khách từ order gốc)
  const newOrderResult = await query<any>(
    `INSERT INTO orders (table_id, customer_id, created_by, order_type, split_label, status, note, guest_name, guest_phone)
     VALUES (?, NULL, ?, ?, ?, 'serving', ?, ?, ?)`,
    [
      targetTableId,
      originalOrder.created_by,
      originalOrder.order_type,
      childLabel,
      originalOrder.note || null,
      originalOrder.guest_name || null,
      originalOrder.guest_phone || null,
    ],
  );
  const newOrderId = newOrderResult.insertId;

  // Di chuyển các order_items đã chọn sang order mới
  if (itemIds.length > 0) {
    const placeholders = itemIds.map(() => "?").join(",");
    await query<any>(
      `UPDATE order_items SET order_id = ? WHERE id IN (${placeholders})`,
      [newOrderId, ...itemIds],
    );
  }

  // Ghi lại split record
  await query<any>(
    `INSERT INTO table_splits (parent_table_id, child_label) VALUES (?, ?)`,
    [parentTableId, childLabel],
  );

  // Cập nhật target table status
  await query<any>(`UPDATE tables SET status = 'serving' WHERE id = ?`, [targetTableId]);

  return { success: true, newOrderId };
};

/**
 * Bỏ tách bàn: xóa split records của bàn cha
 */
export const unsplitResmanagerTable = async (parentTableId: number): Promise<boolean> => {
  const result = await query<any>(
    `DELETE FROM table_splits WHERE parent_table_id = ?`,
    [parentTableId],
  );
  return result.affectedRows > 0;
};

// ===== Resmanager User & RBAC Management Operations =====
export const getRoles = async (): Promise<any[]> => {
  return query<any[]>("SELECT * FROM roles ORDER BY id ASC");
};

export const getUsers = async (): Promise<any[]> => {
  return query<any[]>(
    `SELECT u.id, u.role_id, u.full_name, u.email, u.phone, u.avatar_url, u.status, 
            u.is_deleted, u.deleted_at, u.last_login, u.created_at, u.updated_at,
            r.name AS role_name, r.description AS role_description
     FROM users u
     LEFT JOIN roles r ON u.role_id = r.id
     WHERE u.is_deleted = 0
     ORDER BY u.id DESC`
  );
};

export const createResmanagerUser = async (user: any): Promise<any> => {
  const result = await query<any>(
    `INSERT INTO users (role_id, full_name, email, password_hash, phone, status, is_deleted) 
     VALUES (?, ?, ?, ?, ?, ?, 0)`,
    [
      user.role_id,
      user.full_name,
      user.email,
      user.password, // hashed password
      user.phone || null,
      user.status || "active"
    ]
  );
  const insertId = result.insertId;
  return { id: insertId, ...user };
};

export const updateResmanagerUser = async (id: number | string, user: any): Promise<boolean> => {
  const fields: string[] = [];
  const params: any[] = [];

  if (user.role_id !== undefined) {
    fields.push("role_id = ?");
    params.push(user.role_id);
  }
  if (user.full_name !== undefined) {
    fields.push("full_name = ?");
    params.push(user.full_name);
  }
  if (user.email !== undefined) {
    fields.push("email = ?");
    params.push(user.email);
  }
  if (user.password !== undefined) {
    fields.push("password_hash = ?");
    params.push(user.password);
  }
  if (user.phone !== undefined) {
    fields.push("phone = ?");
    params.push(user.phone || null);
  }
  if (user.status !== undefined) {
    fields.push("status = ?");
    params.push(user.status);
  }
  if (user.is_deleted !== undefined) {
    fields.push("is_deleted = ?");
    params.push(user.is_deleted);
  }
  if (user.deleted_at !== undefined) {
    fields.push("deleted_at = ?");
    params.push(user.deleted_at);
  }

  if (fields.length === 0) return false;

  params.push(id);
  const result = await query<any>(`UPDATE users SET ${fields.join(", ")} WHERE id = ?`, params);
  return result.affectedRows > 0;
};

// ===== Event Halls & Set Menu Packages Operations =====
export const getHalls = async (): Promise<any[]> => {
  return query<any[]>("SELECT * FROM halls ORDER BY id DESC");
};

export const createHall = async (hall: any): Promise<any> => {
  const result = await query<any>(
    "INSERT INTO halls (name, capacity, description, is_active) VALUES (?, ?, ?, 1)",
    [hall.name, hall.capacity, hall.description || null]
  );
  return { id: result.insertId, ...hall, is_active: 1 };
};

export const updateHall = async (id: number | string, hall: any): Promise<boolean> => {
  const fields: string[] = [];
  const params: any[] = [];
  if (hall.name !== undefined) {
    fields.push("name = ?");
    params.push(hall.name);
  }
  if (hall.capacity !== undefined) {
    fields.push("capacity = ?");
    params.push(hall.capacity);
  }
  if (hall.description !== undefined) {
    fields.push("description = ?");
    params.push(hall.description);
  }
  if (hall.is_active !== undefined) {
    fields.push("is_active = ?");
    params.push(hall.is_active);
  }
  if (fields.length === 0) return false;
  params.push(id);
  const result = await query<any>(`UPDATE halls SET ${fields.join(", ")} WHERE id = ?`, params);
  return result.affectedRows > 0;
};

export const getEventPackages = async (): Promise<any[]> => {
  const packages = await query<any[]>("SELECT * FROM event_packages ORDER BY id DESC");
  for (const pkg of packages) {
    pkg.items = await query<any[]>(
      `SELECT epi.id, epi.package_id, epi.menu_item_id, epi.quantity,
              mi.name AS menu_item_name, mi.price AS menu_item_price
       FROM event_package_items epi
       JOIN menu_items mi ON epi.menu_item_id = mi.id
       WHERE epi.package_id = ?`,
      [pkg.id]
    );
  }
  return packages;
};

export const createEventPackage = async (pkg: any): Promise<any> => {
  const result = await query<any>(
    "INSERT INTO event_packages (name, price_per_person, description, is_active) VALUES (?, ?, ?, 1)",
    [pkg.name, pkg.price_per_person, pkg.description || null]
  );
  const packageId = result.insertId;

  if (pkg.items && pkg.items.length > 0) {
    for (const item of pkg.items) {
      await query<any>(
        "INSERT INTO event_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, ?)",
        [packageId, item.menu_item_id, item.quantity]
      );
    }
  }

  return { id: packageId, ...pkg, is_active: 1 };
};

export const updateEventPackage = async (id: number | string, pkg: any): Promise<boolean> => {
  const fields: string[] = [];
  const params: any[] = [];
  if (pkg.name !== undefined) {
    fields.push("name = ?");
    params.push(pkg.name);
  }
  if (pkg.price_per_person !== undefined) {
    fields.push("price_per_person = ?");
    params.push(pkg.price_per_person);
  }
  if (pkg.description !== undefined) {
    fields.push("description = ?");
    params.push(pkg.description);
  }
  if (pkg.is_active !== undefined) {
    fields.push("is_active = ?");
    params.push(pkg.is_active);
  }

  if (fields.length > 0) {
    params.push(id);
    await query(`UPDATE event_packages SET ${fields.join(", ")} WHERE id = ?`, params);
  }

  if (pkg.items !== undefined) {
    await query("DELETE FROM event_package_items WHERE package_id = ?", [id]);
    if (pkg.items.length > 0) {
      for (const item of pkg.items) {
        await query(
          "INSERT INTO event_package_items (package_id, menu_item_id, quantity) VALUES (?, ?, ?)",
          [id, item.menu_item_id, item.quantity]
        );
      }
    }
  }

  return true;
};
