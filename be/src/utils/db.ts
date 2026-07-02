import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { Table, MenuItem, Inventory, Payment, User } from "./types";

dotenv.config();

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
  const database = process.env.DB_NAME || "todo_app";

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
  console.log("✅ MySQL tables verified/created successfully.");
  return true;
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

const getRoleId = (roleName: string): number => {
  const role = roleName.toLowerCase();
  switch (role) {
    case "admin": return 1;
    case "manager": return 2;
    case "waiter": return 3;
    case "cashier": return 4;
    case "chef": return 5;
    case "sales_event": return 6;
    default: return 3;
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
  const rows = await query<any[]>("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0] ? mapUserRow(rows[0]) : null;
};

export const findUserById = async (id: string): Promise<User | null> => {
  const rows = await query<any[]>("SELECT * FROM users WHERE id = ?", [id]);
  return rows[0] ? mapUserRow(rows[0]) : null;
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
export const getOrders = async (): Promise<Order[]> => {
  const rows = await query<any[]>("SELECT * FROM orders ORDER BY createdAt DESC");
  return rows.map(normalizeOrder);
};

export const getOrderById = async (id: string): Promise<Order | null> => {
  const rows = await query<any[]>("SELECT * FROM orders WHERE id = ?", [id]);
  return rows[0] ? normalizeOrder(rows[0]) : null;
};

export const saveOrder = async (order: Order): Promise<Order> => {
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
    const rows = await query<any[]>("SELECT * FROM table_areas WHERE is_active = 1");
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
  const rows = await query<any[]>("SELECT * FROM menu_items ORDER BY createdAt DESC");
  return rows.map(normalizeMenuItem);
};

export const getMenuItemById = async (id: string): Promise<MenuItem | null> => {
  const rows = await query<any[]>("SELECT * FROM menu_items WHERE id = ?", [id]);
  return rows[0] ? normalizeMenuItem(rows[0]) : null;
};

export const getMenuItemsByCategory = async (category: string): Promise<MenuItem[]> => {
  const rows = await query<any[]>("SELECT * FROM menu_items WHERE category = ? ORDER BY createdAt DESC", [category]);
  return rows.map(normalizeMenuItem);
};

export const createMenuItem = async (item: Omit<MenuItem, "id" | "createdAt">): Promise<MenuItem> => {
  const id = `dish_${Date.now()}`;
  const createdAt = new Date().toISOString();
  await query(
    "INSERT INTO menu_items (id, name, description, category, price, image, available, preparationTime, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, item.name, item.description || null, item.category, item.price, item.image || null, item.available ? 1 : 0, item.preparationTime || null, createdAt],
  );
  return { id, createdAt, ...item };
};

export const updateMenuItem = async (id: string, data: Partial<MenuItem>): Promise<MenuItem | null> => {
  const existing = await getMenuItemById(id);
  if (!existing) return null;
  const updated = { ...existing, ...data };
  await query(
    "UPDATE menu_items SET name = ?, description = ?, category = ?, price = ?, image = ?, available = ?, preparationTime = ? WHERE id = ?",
    [updated.name, updated.description || null, updated.category, updated.price, updated.image || null, updated.available ? 1 : 0, updated.preparationTime || null, id],
  );
  return updated;
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
export const getPayments = async (): Promise<Payment[]> => {
  const rows = await query<Payment[]>("SELECT * FROM payments ORDER BY createdAt DESC");
  return rows.map(normalizePayment);
};

export const getPaymentById = async (id: string): Promise<Payment | null> => {
  const rows = await query<Payment[]>("SELECT * FROM payments WHERE id = ?", [id]);
  return rows[0] ? normalizePayment(rows[0]) : null;
};

export const getPaymentsByOrderId = async (orderId: string): Promise<Payment[]> => {
  const rows = await query<Payment[]>("SELECT * FROM payments WHERE orderId = ? ORDER BY createdAt DESC", [orderId]);
  return rows.map(normalizePayment);
};

export const createPayment = async (payment: Omit<Payment, "id" | "createdAt">): Promise<Payment> => {
  const id = `pay_${Date.now()}`;
  const createdAt = new Date().toISOString();
  await query(
    "INSERT INTO payments (id, orderId, amount, paymentMethod, status, discountAmount, discountReason, notes, createdAt, completedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
    [id, payment.orderId, payment.amount, payment.paymentMethod, payment.status, payment.discountAmount || 0, payment.discountReason || null, payment.notes || null, createdAt, payment.completedAt || null],
  );
  return { id, createdAt, ...payment };
};

export const updatePaymentStatus = async (id: string, status: Payment["status"]): Promise<Payment | null> => {
  const payment = await getPaymentById(id);
  if (!payment) return null;
  const completedAt = status === "completed" ? new Date().toISOString() : undefined;
  await query("UPDATE payments SET status = ?, completedAt = ? WHERE id = ?", [status, completedAt || null, id]);
  return { ...payment, status, completedAt };
};

export const applyDiscount = async (id: string, discountAmount: number, discountReason?: string): Promise<Payment | null> => {
  const payment = await getPaymentById(id);
  if (!payment) return null;
  const newAmount = payment.amount - discountAmount;
  if (newAmount < 0) return null;
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
