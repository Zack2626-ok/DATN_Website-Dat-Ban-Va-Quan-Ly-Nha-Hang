import { Order, createNotification, query } from "./db";

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
  status: "pending" | "waiting_kitchen" | "cooking" | "done" | "delivered" | "cancelled" | "voided";
  createdAt: string;
  updatedAt?: string;
  tableName?: string;
  areaName?: string;
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
  const rows = await query<any[]>(
    `SELECT
       oi.id,
       oi.order_id    AS orderId,
       oi.menu_item_id AS menuItemId,
       m.name,
       oi.quantity,
       oi.unit_price  AS unitPrice,
       oi.seat_number AS seatNumber,
       oi.course_number AS courseNumber,
       oi.kitchen_note AS kitchenNote,
       oi.status,
       oi.created_at  AS createdAt,
       oi.updated_at  AS updatedAt,
       t.name         AS tableName,
       ta.name        AS areaName,
       o.order_type   AS orderType,
       oi.void_reason  AS voidReason,
       oi.voided_at    AS voidedAt,
       oi.chef_dismissed AS chefDismissed
     FROM order_items oi
     JOIN orders o      ON oi.order_id     = o.id
     JOIN menu_items m  ON oi.menu_item_id = m.id
     LEFT JOIN tables t ON o.table_id      = t.id
     LEFT JOIN table_areas ta ON t.area_id = ta.id
<<<<<<< HEAD
     WHERE (oi.status IN ('pending', 'cooking', 'done') 
        OR (oi.status IN ('cancelled', 'voided') AND oi.chef_dismissed = 0))
=======
     WHERE oi.status IN ('pending', 'waiting_kitchen', 'cooking', 'done')
>>>>>>> 984048de46a547e7ab198cef87fc4aa2eb29e4b7
       AND oi.created_at >= NOW() - INTERVAL 6 HOUR
     ORDER BY oi.created_at ASC`
  );

  return rows.map((row) => {
    const kitchenStation = getKitchenStationFromName(row.name);
    return {
      id: row.id,
      orderId: row.orderId,
      menuItemId: row.menuItemId,
      name: row.name,
      kitchenStation,
      quantity: Number(row.quantity),
      unitPrice: Number(row.unitPrice),
      seatNumber: row.seatNumber,
      courseNumber: row.courseNumber,
      kitchenNote: row.kitchenNote,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tableName: row.tableName || "Mang về",
      areaName: row.areaName || undefined,
      orderType: row.orderType || "dine_in",
      voidReason: row.voidReason || undefined,
      voidedAt: row.voidedAt || undefined,
      chefDismissed: row.chefDismissed !== undefined ? Number(row.chefDismissed) : 0
    };
  }).filter((item) => {
    if (station && station !== "all" && item.kitchenStation !== station) return false;
    return true;
  });
};

/**
 * Helper to fetch a single KdsItem's information before status change
 */
const getSingleKdsItemInfo = async (id: string | number): Promise<any | null> => {
  const rows = await query<any[]>(
    `SELECT
       oi.order_id    AS orderId,
       m.name         AS name,
       oi.quantity,
       t.name         AS tableName
     FROM order_items oi
     JOIN orders o      ON oi.order_id     = o.id
     JOIN menu_items m  ON oi.menu_item_id = m.id
     LEFT JOIN tables t ON o.table_id      = t.id
     WHERE oi.id = ?`,
    [id]
  );
  return rows[0] || null;
};

/**
 * Update KDS item status
 */
export const updateKdsItemStatusInDb = async (id: string | number, status: string): Promise<boolean> => {
  if (status === "dismissed") {
    const result = await query<any>(
      "UPDATE order_items SET chef_dismissed = 1 WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }

  const result = await query<any>(
    "UPDATE order_items SET status = ? WHERE id = ?",
    [status, id]
  );
  
  if (result.affectedRows === 0) return false;

  // If status is done, trigger a notification to waiter/order
  if (status === "done") {
    try {
      const itemInfo = await getSingleKdsItemInfo(id);
      if (itemInfo) {
        const title = "Món ăn hoàn thành";
        const message = `Món "${itemInfo.name}" (x${itemInfo.quantity}) của Bàn ${itemInfo.tableName || "Mang về"} đã nấu xong!`;
        await createNotification(title, message, "success", "waiter");
      }
    } catch (e) {
      console.warn("Failed to create KDS done notification:", e);
    }
  }

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

  return true;
};

/**
 * Recall / Undo the last status change of an item
 */
export const recallKdsItemStatusInDb = async (id: string | number): Promise<boolean> => {
  const rows = await query<any[]>("SELECT status FROM order_items WHERE id = ?", [id]);
  if (rows.length === 0) return false;
  
  const currentStatus = rows[0].status;
  let nextStatus = "pending";
  if (currentStatus === "done") {
    nextStatus = "cooking";
  } else if (currentStatus === "cooking") {
    nextStatus = "pending";
  }

  const result = await query<any>(
    "UPDATE order_items SET status = ? WHERE id = ?",
    [nextStatus, id]
  );
  return result.affectedRows > 0;
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
  return inMemoryVoidAlerts;
};
