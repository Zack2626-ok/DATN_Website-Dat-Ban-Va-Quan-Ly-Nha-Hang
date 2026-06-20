export const ORDER_STATUS = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  IN_KITCHEN: "in_kitchen",
  SERVED: "served",
  PAID: "paid",
  CANCELLED: "cancelled",
  PENDING_PAYMENT: "pending_payment",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];
