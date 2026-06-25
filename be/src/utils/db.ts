import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { Table, MenuItem, Inventory, Payment, User } from "./types";

dotenv.config();

let connectionPool: mysql.Pool | null = null;

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

const normalizeMenuItem = (row: any): MenuItem => ({
  ...row,
  available: Boolean(row.available),
});

const normalizeTable = (row: any): Table => ({
  ...row,
  tableNumber: Number(row.tableNumber),
  capacity: Number(row.capacity),
});

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

// ===== User operations =====
export const findUserByEmail = async (email: string): Promise<User | null> => {
  const rows = await query<any[]>("SELECT * FROM users WHERE email = ?", [email]);
  return rows[0] ? (rows[0] as User) : null;
};

export const findUserById = async (id: string): Promise<User | null> => {
  const rows = await query<any[]>("SELECT * FROM users WHERE id = ?", [id]);
  return rows[0] ? (rows[0] as User) : null;
};

export const createUser = async (user: Omit<User, "id" | "createdAt">): Promise<User> => {
  const id = `user_${Date.now()}`;
  const createdAt = new Date().toISOString();
  await query(
    "INSERT INTO users (id, full_name, email, password, role_name, phone, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [id, user.full_name, user.email, user.password, user.role_name, user.phone, createdAt],
  );
  return { id, createdAt, ...user };
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

// ===== Table operations =====
export const getTables = async (): Promise<Table[]> => {
  const rows = await query<any[]>("SELECT * FROM tables ORDER BY tableNumber ASC");
  return rows.map(normalizeTable);
};

export const getTableById = async (id: string): Promise<Table | null> => {
  const rows = await query<any[]>("SELECT * FROM tables WHERE id = ?", [id]);
  return rows[0] ? normalizeTable(rows[0]) : null;
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

// ============================================================================
//  RESMANAGER SCHEMA — Table Areas & Tables (khớp với SQLQuery1.sql)
// ============================================================================

export const getTableAreas = async (): Promise<any[]> => {
  return query<any[]>("SELECT * FROM table_areas WHERE is_active = 1 ORDER BY id ASC");
};

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
  return result.affectedRows > 0;
};

// ============================================================================
//  RESMANAGER SCHEMA — Bookings
// ============================================================================

export const getBookings = async (): Promise<any[]> => {
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
  return { id: result.insertId, ...data, confirmation_code: code, status: "pending" };
};

export const updateBookingStatus = async (
  id: number,
  status: "pending" | "confirmed" | "cancelled" | "completed",
): Promise<boolean> => {
  const result = await query<any>("UPDATE bookings SET status = ? WHERE id = ?", [status, id]);
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
}): Promise<any> => {
  const result = await query<any>(
    `INSERT INTO orders (table_id, customer_id, created_by, order_type, status, note)
     VALUES (?, ?, ?, ?, 'open', ?)`,
    [
      data.table_id,
      data.customer_id || null,
      data.created_by,
      data.order_type || "dine_in",
      data.note || null,
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
    `UPDATE order_items SET status = 'cooking' WHERE id IN (${placeholders}) AND status = 'pending'`,
    orderItemIds,
  );
  return result.affectedRows > 0;
};
