export const TABLE_STATUS = {
  AVAILABLE: "empty",
  RESERVED: "reserved",
  OCCUPIED: "serving",
  PENDING_PAYMENT: "pending_payment",
  CLEANING: "cleaning",
  MAINTENANCE: "maintenance",
} as const;

export type TableStatus = (typeof TABLE_STATUS)[keyof typeof TABLE_STATUS];
