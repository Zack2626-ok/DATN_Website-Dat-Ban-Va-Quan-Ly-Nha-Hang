export const TABLE_STATUS = {
  AVAILABLE: "empty",
  RESERVED: "reserved",
  OCCUPIED: "serving",
  CLEANING: "pending_payment",
} as const;

export type TableStatus = (typeof TABLE_STATUS)[keyof typeof TABLE_STATUS];
