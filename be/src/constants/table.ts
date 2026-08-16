/** Operational table statuses used by the live table map. */
export const TABLE_STATUS = {
  EMPTY: "empty",
  RESERVED: "reserved",
  SERVING: "serving",
  PENDING_PAYMENT: "pending_payment",
  CLEANING: "cleaning",
  MAINTENANCE: "maintenance",
} as const;

export type TableStatus = (typeof TABLE_STATUS)[keyof typeof TABLE_STATUS];
