import mysql from "mysql2/promise";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Define Order Interface
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

let connectionPool: mysql.Pool | null = null;
let useFallback = false;

const JSON_DB_DIR = path.join(process.cwd(), "src", "database");
const JSON_DB_PATH = path.join(JSON_DB_DIR, "db.json");

// Helper to load fallback JSON database
const loadJsonDb = (): { orders: Order[] } => {
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
const saveJsonDb = (data: { orders: Order[] }) => {
  if (!fs.existsSync(JSON_DB_DIR)) {
    fs.mkdirSync(JSON_DB_DIR, { recursive: true });
  }
  fs.writeFileSync(JSON_DB_PATH, JSON.stringify(data, null, 2));
};

// Initialize DB (MySQL or Fallback JSON)
export const initDb = async (): Promise<boolean> => {
  try {
    const host = process.env.DB_HOST || "localhost";
    const port = parseInt(process.env.DB_PORT || "3306");
    const user = process.env.DB_USER || "root";
    const password = process.env.DB_PASSWORD || "";
    const database = process.env.DB_NAME || "todo_app";

    // Attempt to connect to MySQL
    console.log(`Checking MySQL connection at ${host}:${port}...`);
    connectionPool = mysql.createPool({
      host,
      port,
      user,
      password,
      database,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    });

    // Test the pool connection
    const conn = await connectionPool.getConnection();
    conn.release();
    console.log("🚀 Connect to MySQL database successfully.");

    // Create table if it doesn't exist
    const createTableQuery = `
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
    `;
    await connectionPool.query(createTableQuery);
    console.log("Database tables verified/created successfully.");
    useFallback = false;
    return true;
  } catch (err) {
    console.warn("⚠️ MySQL Database connection failed. Falling back to local JSON database.");
    console.warn(`Reason: ${(err as Error).message}`);
    useFallback = true;
    // Pre-create JSON DB structure
    loadJsonDb();
    console.log(`📂 Fallback JSON Database ready at: ${JSON_DB_PATH}`);
    return false;
  }
};

// Query list of all orders
export const getOrders = async (): Promise<Order[]> => {
  if (useFallback) {
    const db = loadJsonDb();
    return db.orders;
  }

  if (!connectionPool) {
    throw new Error("Database connection pool is not initialized.");
  }

  const [rows] = await connectionPool.query("SELECT * FROM orders ORDER BY createdAt DESC");
  const orders = rows as any[];

  return orders.map((order) => ({
    ...order,
    items: JSON.parse(order.items), // Parse JSON string from MySQL
  }));
};

// Save a new order
export const saveOrder = async (order: Order): Promise<Order> => {
  if (useFallback) {
    const db = loadJsonDb();
    db.orders.push(order);
    saveJsonDb(db);
    return order;
  }

  if (!connectionPool) {
    throw new Error("Database connection pool is not initialized.");
  }

  const query = `
    INSERT INTO orders (
      id, tableId, tableName, items, status, totalAmount, createdAt,
      customerName, customerPhone, customerEmail, guestCount, deliveryAddress, orderType
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    order.id,
    order.tableId || null,
    order.tableName || null,
    JSON.stringify(order.items), // Store array as JSON string
    order.status,
    order.totalAmount,
    order.createdAt,
    order.customerName || null,
    order.customerPhone || null,
    order.customerEmail || null,
    order.guestCount,
    order.deliveryAddress || null,
    order.orderType || "delivery",
  ];

  await connectionPool.query(query, values);
  return order;
};

// Update order status
export const updateOrderStatus = async (id: string, status: string): Promise<boolean> => {
  if (useFallback) {
    const db = loadJsonDb();
    const order = db.orders.find((o) => o.id === id);
    if (order) {
      order.status = status;
      saveJsonDb(db);
      return true;
    }
    return false;
  }

  if (!connectionPool) {
    throw new Error("Database connection pool is not initialized.");
  }

  const [result] = await connectionPool.query(
    "UPDATE orders SET status = ? WHERE id = ?",
    [status, id]
  );

  return (result as any).affectedRows > 0;
};
