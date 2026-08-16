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

/** Distinguishes an operational dine-in order from a future pre-order reservation. */
export const ORDER_TYPE = {
  PRE_ORDER: "pre_order",
} as const;

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

/** Lifecycle values for a party allocated across separate table clusters. */
export const GROUP_SEATING_STATUS = {
  ACTIVE: "active",
  RESOLVED: "resolved",
} as const;

/** Prefix used for an auditable multi-table party allocation code. */
export const GROUP_SEATING_CODE_PREFIX = "DOAN";

/** Booking window protected from operational table merges. */
export const MERGE_BOOKING_LOOKAHEAD_MINUTES = 120;
