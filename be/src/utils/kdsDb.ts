import { connectionPool, useFallback, loadJsonDb, saveJsonDb, Order } from "./db";

export interface KdsItem {
  id: string | number;
  orderId: string | number;
  menuItemId: string | number;
  name: string;
  kitchenStation: "hot_kitchen" | "bar" | "cold_kitchen";
  quantity: number;
  unitPrice: number;
  seatNumber?: number | null;
  courseNumber?: number | null;
  kitchenNote?: string | null;
  status: "pending" | "cooking" | "done" | "delivered" | "cancelled" | "voided";
  createdAt: string;
  tableName?: string;
  orderType?: "dine_in" | "delivery" | "takeaway";
}

export interface KdsVoidAlert {
  id: string | number;
  orderId: string | number;
  name: string;
  quantity: number;
  voidReason?: string | null;
  tableName: string;
  voidedAt: string;
}

// In-memory array to track void/cancelled items in real-time
let inMemoryVoidAlerts: KdsVoidAlert[] = [];

// Helper to determine kitchen station from dish name (fallback/simplified mode)
export const getKitchenStationFromName = (name: string): "hot_kitchen" | "bar" | "cold_kitchen" => {
  const lowerName = (name || "").toLowerCase();
  if (
    lowerName.includes("trà") ||
    lowerName.includes("nước") ||
    lowerName.includes("sinh tố") ||
    lowerName.includes("coca") ||
    lowerName.includes("pepsi") ||
    lowerName.includes("bia") ||
    lowerName.includes("beer") ||
    lowerName.includes("rượu") ||
    lowerName.includes("cà phê")
  ) {
    return "bar";
  } else if (
    lowerName.includes("gỏi") ||
    lowerName.includes("kem") ||
    lowerName.includes("bánh") ||
    lowerName.includes("tráng miệng") ||
    lowerName.includes("salad") ||
    lowerName.includes("chè") ||
    lowerName.includes("nem cuốn")
  ) {
    return "cold_kitchen";
  }
  return "hot_kitchen";
};

/**
 * Fetch all active KDS items
 */
export const getKdsItemsFromDb = async (station?: string): Promise<KdsItem[]> => {
  // 1. MySQL Real Schema Mode
  if (!useFallback && connectionPool) {
    try {
      let query = `
        SELECT 
          oi.id AS id,
          oi.order_id AS orderId,
          oi.menu_item_id AS menuItemId,
          mi.name AS name,
          mi.kitchen_station AS kitchenStation,
          oi.quantity AS quantity,
          oi.unit_price AS unitPrice,
          oi.seat_number AS seatNumber,
          oi.course_number AS courseNumber,
          oi.kitchen_note AS kitchenNote,
          oi.status AS status,
          oi.created_at AS createdAt,
          t.name AS tableName,
          o.order_type AS orderType
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN tables t ON o.table_id = t.id
        WHERE oi.status IN ('pending', 'cooking', 'done')
      `;
      const params: any[] = [];
      if (station && station !== "all") {
        query += ` AND mi.kitchen_station = ?`;
        params.push(station);
      }
      query += ` ORDER BY oi.created_at ASC`;

      const [rows] = await connectionPool.query(query, params);
      return rows as any[];
    } catch (mysqlErr) {
      console.warn("⚠️ MySQL querying order_items failed. Falling back to simplified orders table.", (mysqlErr as Error).message);
      // Fall through to simplified MySQL querying
    }

    try {
      // 2. MySQL Simplified Mode (parse items column)
      const [rows] = await connectionPool.query("SELECT * FROM orders WHERE status NOT IN ('completed', 'cancelled')");
      const kdsItems: KdsItem[] = [];
      for (const order of rows as any[]) {
        let items: any[] = [];
        try {
          items = JSON.parse(order.items);
        } catch (e) {
          items = [];
        }

        items.forEach((item, index) => {
          const status = item.status || "pending";
          if (!["pending", "cooking", "done"].includes(status)) return;

          const kitchenStation = getKitchenStationFromName(item.name);
          if (station && station !== "all" && kitchenStation !== station) return;

          kdsItems.push({
            id: `${order.id}_${index}`,
            orderId: order.id,
            menuItemId: item.menuItemId || `m_${index}`,
            name: item.name,
            kitchenStation,
            quantity: item.quantity,
            unitPrice: item.price || 0,
            kitchenNote: item.kitchenNote || "",
            status: status as any,
            createdAt: order.createdAt,
            tableName: order.tableName || "Mang về",
            orderType: order.orderType || "delivery"
          });
        });
      }
      return kdsItems;
    } catch (mysqlSimpleErr) {
      console.error("⚠️ MySQL Simplified KDS query failed:", mysqlSimpleErr);
    }
  }

  // 3. Fallback JSON Mode
  const db = loadJsonDb();
  const kdsItems: KdsItem[] = [];
  db.orders.forEach((order) => {
    if (order.status === "completed" || order.status === "cancelled") return;

    order.items.forEach((item, index) => {
      const status = item.status || "pending";
      if (!["pending", "cooking", "done"].includes(status)) return;

      const kitchenStation = getKitchenStationFromName(item.name);
      if (station && station !== "all" && kitchenStation !== station) return;

      kdsItems.push({
        id: `${order.id}_${index}`,
        orderId: order.id,
        menuItemId: item.menuItemId || `m_${index}`,
        name: item.name,
        kitchenStation,
        quantity: item.quantity,
        unitPrice: item.price || 0,
        kitchenNote: item.kitchenNote || "",
        status: status as any,
        createdAt: order.createdAt,
        tableName: order.tableName || "Mang về",
        orderType: order.orderType || "delivery"
      });
    });
  });
  return kdsItems;
};

/**
 * Update KDS item status
 */
export const updateKdsItemStatusInDb = async (id: string | number, status: string): Promise<boolean> => {
  // If status is cancelled/voided, log it to the in-memory alerts
  if (status === "cancelled" || status === "voided") {
    try {
      const itemInfo = await getSingleKdsItemInfo(id);
      if (itemInfo) {
        inMemoryVoidAlerts.push({
          id,
          orderId: itemInfo.orderId,
          name: itemInfo.name,
          quantity: itemInfo.quantity,
          voidReason: "Yêu cầu từ phục vụ",
          tableName: itemInfo.tableName || "Mang về",
          voidedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.warn("Failed to log void alert in memory:", e);
    }
  }

  // 1. MySQL Real Schema Mode (if compound ID containing "_" is NOT present, it's a real order_item database ID)
  if (!useFallback && connectionPool && !String(id).includes("_")) {
    try {
      // Get current status for logging
      const [currentRows] = await connectionPool.query(
        "SELECT status FROM order_items WHERE id = ?",
        [id]
      ) as any[];
      const fromStatus = currentRows[0]?.status || null;

      // Update status
      const [result] = await connectionPool.query(
        "UPDATE order_items SET status = ? WHERE id = ?",
        [status, id]
      ) as any[];

      // Log the transition
      await connectionPool.query(
        "INSERT INTO order_item_status_log (order_item_id, from_status, to_status) VALUES (?, ?, ?)",
        [id, fromStatus, status]
      );
      return result.affectedRows > 0;
    } catch (mysqlErr) {
      console.warn("⚠️ MySQL real order_item update failed, falling back to simplified update.", (mysqlErr as Error).message);
    }
  }

  // 2. Fallback / Simplified Mode (compound ID: orderId_itemIndex)
  const parts = String(id).split("_");
  if (parts.length >= 2) {
    const orderId = parts.slice(0, -1).join("_");
    const itemIndex = parseInt(parts[parts.length - 1]);

    if (!useFallback && connectionPool) {
      try {
        const [rows] = await connectionPool.query("SELECT * FROM orders WHERE id = ?", [orderId]);
        if (rows && (rows as any[]).length > 0) {
          const order = (rows as any[])[0];
          const items = JSON.parse(order.items);
          if (items[itemIndex]) {
            items[itemIndex].status = status;
            const [updateRes] = await connectionPool.query(
              "UPDATE orders SET items = ? WHERE id = ?",
              [JSON.stringify(items), orderId]
            ) as any[];
            return updateRes.affectedRows > 0;
          }
        }
      } catch (mysqlSimpleErr) {
        console.error("⚠️ MySQL Simplified update failed:", mysqlSimpleErr);
      }
    }

    // JSON file mode
    const db = loadJsonDb();
    const order = db.orders.find((o) => o.id === orderId);
    if (order && order.items[itemIndex]) {
      order.items[itemIndex].status = status;
      saveJsonDb(db);
      return true;
    }
  }

  return false;
};

/**
 * Helper to fetch a single KdsItem's information before status change
 */
const getSingleKdsItemInfo = async (id: string | number): Promise<any | null> => {
  if (!useFallback && connectionPool && !String(id).includes("_")) {
    try {
      const query = `
        SELECT 
          oi.id, oi.order_id AS orderId, mi.name, oi.quantity, t.name AS tableName
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN tables t ON o.table_id = t.id
        WHERE oi.id = ?
      `;
      const [rows] = await connectionPool.query(query, [id]) as any[];
      return rows[0] || null;
    } catch (e) {
      // ignore and fallback
    }
  }

  const parts = String(id).split("_");
  if (parts.length >= 2) {
    const orderId = parts.slice(0, -1).join("_");
    const itemIndex = parseInt(parts[parts.length - 1]);

    if (!useFallback && connectionPool) {
      const [rows] = await connectionPool.query("SELECT * FROM orders WHERE id = ?", [orderId]) as any[];
      if (rows && rows.length > 0) {
        const order = rows[0];
        const items = JSON.parse(order.items);
        if (items[itemIndex]) {
          return {
            orderId,
            name: items[itemIndex].name,
            quantity: items[itemIndex].quantity,
            tableName: order.tableName
          };
        }
      }
    }

    const db = loadJsonDb();
    const order = db.orders.find((o) => o.id === orderId);
    if (order && order.items[itemIndex]) {
      return {
        orderId,
        name: order.items[itemIndex].name,
        quantity: order.items[itemIndex].quantity,
        tableName: order.tableName
      };
    }
  }
  return null;
};

/**
 * Recall / Undo the last status change of an item
 */
export const recallKdsItemStatusInDb = async (id: string | number): Promise<boolean> => {
  // 1. MySQL Real Schema Mode
  if (!useFallback && connectionPool && !String(id).includes("_")) {
    try {
      const [logRows] = await connectionPool.query(
        "SELECT from_status, to_status FROM order_item_status_log WHERE order_item_id = ? ORDER BY changed_at DESC LIMIT 1",
        [id]
      ) as any[];

      if (logRows && logRows.length > 0) {
        const prevStatus = logRows[0].from_status || "pending";
        const currentStatus = logRows[0].to_status;

        // Revert status
        await connectionPool.query(
          "UPDATE order_items SET status = ? WHERE id = ?",
          [prevStatus, id]
        );

        // Log the reversal
        await connectionPool.query(
          "INSERT INTO order_item_status_log (order_item_id, from_status, to_status) VALUES (?, ?, ?)",
          [id, currentStatus, prevStatus]
        );
        return true;
      }
    } catch (mysqlErr) {
      console.warn("⚠️ MySQL real order_item recall failed, falling back.", (mysqlErr as Error).message);
    }
  }

  // 2. Fallback / Simplified Mode
  // For fallback, we simply step backwards: done -> cooking -> pending
  const itemInfo = await getSingleKdsItemInfo(id);
  if (itemInfo) {
    const parts = String(id).split("_");
    const orderId = parts.slice(0, -1).join("_");
    const itemIndex = parseInt(parts[parts.length - 1]);

    if (!useFallback && connectionPool) {
      const [rows] = await connectionPool.query("SELECT * FROM orders WHERE id = ?", [orderId]) as any[];
      if (rows && rows.length > 0) {
        const order = rows[0];
        const items = JSON.parse(order.items);
        const curr = items[itemIndex]?.status || "pending";
        let prev = "pending";
        if (curr === "done") prev = "cooking";
        else if (curr === "cooking") prev = "pending";

        items[itemIndex].status = prev;
        await connectionPool.query(
          "UPDATE orders SET items = ? WHERE id = ?",
          [JSON.stringify(items), orderId]
        );
        return true;
      }
    }

    const db = loadJsonDb();
    const order = db.orders.find((o) => o.id === orderId);
    if (order && order.items[itemIndex]) {
      const curr = order.items[itemIndex].status || "pending";
      let prev = "pending";
      if (curr === "done") prev = "cooking";
      else if (curr === "cooking") prev = "pending";

      order.items[itemIndex].status = prev;
      saveJsonDb(db);
      return true;
    }
  }

  return false;
};

/**
 * Get active void / cancelled item alerts
 */
export const getKdsVoidAlertsFromDb = async (): Promise<KdsVoidAlert[]> => {
  // Clear alerts older than 5 minutes in memory
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
  inMemoryVoidAlerts = inMemoryVoidAlerts.filter(
    (alert) => new Date(alert.voidedAt).getTime() > fiveMinutesAgo
  );

  // 1. MySQL Real Schema Mode (also join database to grab direct updates)
  if (!useFallback && connectionPool) {
    try {
      const query = `
        SELECT 
          oi.id AS id,
          oi.order_id AS orderId,
          mi.name AS name,
          oi.quantity AS quantity,
          oi.void_reason AS voidReason,
          t.name AS tableName,
          oi.voided_at AS voidedAt
        FROM order_items oi
        JOIN menu_items mi ON oi.menu_item_id = mi.id
        JOIN orders o ON oi.order_id = o.id
        LEFT JOIN tables t ON o.table_id = t.id
        WHERE oi.status IN ('cancelled', 'voided')
          AND oi.voided_at >= NOW() - INTERVAL 5 MINUTE
        ORDER BY oi.voided_at DESC
      `;
      const [rows] = await connectionPool.query(query) as any[];
      
      // Merge with in-memory void alerts to catch all triggers
      const mergedAlerts = [...inMemoryVoidAlerts];
      rows.forEach((row: any) => {
        if (!mergedAlerts.some((alert) => alert.id === row.id)) {
          mergedAlerts.push({
            id: row.id,
            orderId: row.orderId,
            name: row.name,
            quantity: row.quantity,
            voidReason: row.voidReason,
            tableName: row.tableName || "Mang về",
            voidedAt: row.voidedAt
          });
        }
      });
      return mergedAlerts;
    } catch (mysqlErr) {
      // Fallback to in-memory alerts
    }
  }

  // 2. Return in-memory alerts (works for Fallback JSON and simplified MySQL)
  return inMemoryVoidAlerts;
};
