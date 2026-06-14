export const TABLE_STATUS = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  OCCUPIED: "occupied",
  CLEANING: "cleaning",
} as const;

export type TableStatus = (typeof TABLE_STATUS)[keyof typeof TABLE_STATUS];
