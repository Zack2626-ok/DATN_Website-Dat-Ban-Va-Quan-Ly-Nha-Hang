import { Order, createNotification, query, deductInventoryForItem, refundInventoryForItem } from "./db";


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
  status: "pending" | "waiting_kitchen" | "cooking" | "done" | "served" | "cancelled" | "voided";
  createdAt: string;
  updatedAt?: string;
  tableName?: string;
  areaName?: string;
  orderType?: "dine_in" | "delivery" | "takeaway";
  waiterName?: string;
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
       m.kitchen_station AS dbKitchenStation,
       oi.quantity,
       oi.unit_price  AS unitPrice,
       oi.seat_number AS seatNumber,
       oi.course_number AS courseNumber,
       oi.kitchen_note AS kitchenNote,
       oi.status,
       oi.created_at  AS createdAt,
       oi.updated_at  AS updatedAt,
       COALESCE(o.split_label, t.name) AS tableName,
       o.split_label  AS splitLabel,
       ta.name        AS areaName,
       o.order_type   AS orderType,
       oi.void_reason  AS voidReason,
       oi.voided_at    AS voidedAt,
       oi.chef_dismissed AS chefDismissed,
       oi.is_cooked_cancelled AS isCookedCancelled,
       oi.was_reused   AS wasReused,
       u.full_name    AS waiterName
     FROM order_items oi
     JOIN orders o      ON oi.order_id     = o.id
     JOIN menu_items m  ON oi.menu_item_id = m.id
     LEFT JOIN tables t ON o.table_id      = t.id
     LEFT JOIN table_areas ta ON t.area_id = ta.id
     LEFT JOIN users u  ON oi.created_by   = u.id
     WHERE (oi.status IN ('pending', 'waiting_kitchen', 'cooking') 
        OR oi.status = 'done'
        OR (oi.status IN ('cancelled', 'voided') 
            AND (oi.chef_dismissed = 0 
                 OR (oi.chef_dismissed = 1 
                     AND oi.is_cooked_cancelled = 1 
                     AND oi.was_reused = 0 
                     AND TIMESTAMPDIFF(MINUTE, COALESCE(oi.voided_at, oi.updated_at, oi.created_at), NOW()) < 120))))
       AND (o.status IN ('open', 'serving') OR (o.status = 'completed' AND o.is_early_paid = 1))
     ORDER BY oi.created_at ASC`
  );

  return rows.map((row) => {
    const kitchenStation = row.dbKitchenStation || getKitchenStationFromName(row.name);
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
      chefDismissed: row.chefDismissed !== undefined ? Number(row.chefDismissed) : 0,
      isCookedCancelled: row.isCookedCancelled !== undefined ? Number(row.isCookedCancelled) : 0,
      wasReused: row.wasReused !== undefined ? Number(row.wasReused) : 0,
      waiterName: row.waiterName || "Phục vụ"
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

  if (status === "discarded") {
    const result = await query<any>(
      "UPDATE order_items SET chef_dismissed = 1, is_cooked_cancelled = 0 WHERE id = ?",
      [id]
    );
    return result.affectedRows > 0;
  }

  // Get current status before update to handle refund properly
  const rows = await query<any[]>("SELECT status FROM order_items WHERE id = ?", [id]);
  const currentStatus = rows.length > 0 ? rows[0].status : null;

  const result = await query<any>(
    "UPDATE order_items SET status = ? WHERE id = ?",
    [status, id]
  );
  

  if (result.affectedRows === 0) return false;

  // If status is done, trigger a notification to waiter/order and deduct inventory
  if (status === "done") {
    try {
      await deductInventoryForItem(id);
      
      const itemInfo = await getSingleKdsItemInfo(id);
      if (itemInfo) {
        const title = "Món ăn hoàn thành";
        const message = `Món "${itemInfo.name}" (x${itemInfo.quantity}) của Bàn ${itemInfo.tableName || "Mang về"} đã nấu xong!`;
        await createNotification(title, message, "success", "waiter");
      }
    } catch (e) {
      console.warn("Failed to process KDS done action:", e);
    }
  }

  // If status is cancelled/voided, log it to the in-memory alerts
  if (status === "cancelled" || status === "voided") {
    try {
      if (currentStatus === "done" || currentStatus === "cooking") {
        // Đánh dấu món đã nấu/đang nấu bị hủy để tái sử dụng
        await query(
          "UPDATE order_items SET is_cooked_cancelled = 1 WHERE id = ?",
          [id]
        );

        if (currentStatus === "cooking") {
          // Trừ kho dưới dạng hao hụt do bếp đã chuẩn bị/bắt đầu nấu
          await deductInventoryForItem(id, "waste", "Hao hụt do hủy món đang nấu");
        }

        console.log(`[KDS] Món đã/đang nấu bị hủy (ID: ${id}) - Không hoàn kho và được tính vào hao hụt.`);
      }
      
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
      console.warn("Failed to log void alert in memory or mark is_cooked_cancelled:", e);
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

  // If recalled from 'done' back to 'cooking', we must refund the inventory
  if (result.affectedRows > 0 && currentStatus === "done") {
    try {
      await refundInventoryForItem(id);
    } catch (e) {
      console.error("Failed to refund inventory on recall:", e);
    }
  }

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

/**
 * Fetch KDS history of completed and returned items
 */
export const getKdsHistoryFromDb = async (date?: string): Promise<any[]> => {
  let dateFilter = "";
  const params: any[] = [];
  
  if (date) {
    dateFilter = "AND DATE(oi.created_at) = ?";
    params.push(date);
  } else {
    dateFilter = "AND oi.created_at >= NOW() - INTERVAL 1 DAY";
  }

  const rows = await query<any[]>(
    `SELECT
       oi.id,
       oi.order_id    AS orderId,
       oi.menu_item_id AS menuItemId,
       m.name,
       oi.quantity,
       oi.unit_price  AS unitPrice,
       oi.status,
       oi.created_at  AS createdAt,
       oi.updated_at  AS updatedAt,
       t.name         AS tableName,
       ta.name        AS areaName,
       o.order_type   AS orderType,
       oi.void_reason  AS voidReason,
       oi.voided_at    AS voidedAt,
       oi.kitchen_note AS kitchenNote,
       u.full_name    AS waiterName,
       oi.was_reused   AS wasReused,
       oi.reused_by_order_item_id AS reusedByOrderItemId,
       COALESCE(target_o.split_label, target_t.name) AS targetTableName
     FROM order_items oi
     JOIN orders o      ON oi.order_id     = o.id
     JOIN menu_items m  ON oi.menu_item_id = m.id
     LEFT JOIN tables t ON o.table_id      = t.id
     LEFT JOIN table_areas ta ON t.area_id = ta.id
     LEFT JOIN users u  ON oi.created_by    = u.id
     LEFT JOIN order_items reused_oi ON oi.reused_by_order_item_id = reused_oi.id
     LEFT JOIN orders target_o ON reused_oi.order_id = target_o.id
     LEFT JOIN tables target_t ON target_o.table_id = target_t.id
     WHERE oi.status IN ('done', 'served', 'delivered', 'cancelled', 'voided')
       ${dateFilter}
     ORDER BY oi.created_at DESC`,
    params
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
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      tableName: row.tableName || "Mang về",
      areaName: row.areaName || undefined,
      orderType: row.orderType || "dine_in",
      voidReason: row.voidReason || undefined,
      voidedAt: row.voidedAt || undefined,
      kitchenNote: row.kitchenNote || undefined,
      waiterName: row.waiterName || "Phục vụ",
      wasReused: row.wasReused,
      reusedByOrderItemId: row.reusedByOrderItemId,
      targetTableName: row.targetTableName
    };
  });
};
