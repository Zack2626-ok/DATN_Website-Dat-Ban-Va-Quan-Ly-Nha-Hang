import { Order } from "./db";

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
  status: "pending" | "cooking" | "done" | "cancelled" | "voided";
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

// Mock data for fallback since we removed JSON db
const mockOrders: Order[] = [
  {
    id: "order_1",
    tableName: "Bàn 1",
    items: [
      { name: "Gỏi tôm", quantity: 2, price: 80000 },
      { name: "Cá nướng miễn", quantity: 1, price: 250000 }
    ],
    status: "pending",
    totalAmount: 410000,
    createdAt: new Date().toISOString(),
    guestCount: 2,
    orderType: "dine_in"
  }
];

/**
 * Fetch all active KDS items
 */
export const getKdsItemsFromDb = async (station?: string): Promise<KdsItem[]> => {
  // For now, use mock data to avoid errors
  const kdsItems: KdsItem[] = [];
  
  mockOrders.forEach((order) => {
    if (order.status === "completed" || order.status === "cancelled") return;

    order.items.forEach((item: any, index: number) => {
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

  // For now, just log and return true
  console.log(`Updating KDS item ${id} to status: ${status}`);
  return true;
};

/**
 * Helper to fetch a single KdsItem's information before status change
 */
const getSingleKdsItemInfo = async (id: string | number): Promise<any | null> => {
  const parts = String(id).split("_");
  if (parts.length >= 2) {
    const orderId = parts.slice(0, -1).join("_");
    const itemIndex = parseInt(parts[parts.length - 1]);
    const order = mockOrders.find((o) => o.id === orderId);
    if (order && order.items[itemIndex]) {
      return {
        orderId,
        name: (order.items[itemIndex] as any).name,
        quantity: (order.items[itemIndex] as any).quantity,
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
  console.log(`Recalling KDS item ${id}`);
  return true;
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
