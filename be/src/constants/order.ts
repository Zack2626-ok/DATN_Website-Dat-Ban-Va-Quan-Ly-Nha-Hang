/** Order lifecycle values shared by operational workflows. */
export const ORDER_STATUS = {
  OPEN: "open",
  SERVING: "serving",
  PENDING_PAYMENT: "pending_payment",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
  MERGED: "merged",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

/** Statuses that represent an order which can still receive items or payment. */
export const ACTIVE_ORDER_STATUSES = [
  ORDER_STATUS.OPEN,
  ORDER_STATUS.SERVING,
  ORDER_STATUS.PENDING_PAYMENT,
] as const;

/** Table merge audit state. Historical rows are never deleted after checkout. */
export const TABLE_MERGE_STATUS = {
  ACTIVE: "active",
  RESOLVED: "resolved",
} as const;

/** Booking window protected from operational table merges. */
export const MERGE_BOOKING_LOOKAHEAD_MINUTES = 120;
