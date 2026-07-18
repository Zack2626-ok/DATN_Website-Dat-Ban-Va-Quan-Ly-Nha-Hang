/** Danh sách role khớp với ENUM trong DB */
export const USER_ROLE = {
  ADMIN: "admin",
  MANAGER: "manager",
  WAITER: "waiter",
  CASHIER: "cashier",
  CHEF: "chef",
  SALES_EVENT: "sales_event",
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

/** Label tiếng Việt hiển thị trên UI */
export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Chủ nhà hàng",
  manager: "Quản lý",
  waiter: "Phục vụ",
  cashier: "Thu ngân",
  chef: "Đầu bếp",
  sales_event: "Kinh doanh sự kiện",
};

/** Màu badge Tailwind cho từng role */
export const ROLE_COLORS: Record<UserRole, string> = {
  admin: "bg-red-100 text-red-700",
  manager: "bg-purple-100 text-purple-700",
  waiter: "bg-blue-100 text-blue-700",
  cashier: "bg-green-100 text-green-700",
  chef: "bg-orange-100 text-orange-700",
  sales_event: "bg-pink-100 text-pink-700",
};

/** Danh sách role cho dropdown — admin không tạo từ UI thông thường */
export const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: USER_ROLE.MANAGER, label: "Quản lý" },
  { value: USER_ROLE.WAITER, label: "Phục vụ" },
  { value: USER_ROLE.CASHIER, label: "Thu ngân" },
  { value: USER_ROLE.CHEF, label: "Đầu bếp" },
  { value: USER_ROLE.SALES_EVENT, label: "Kinh doanh sự kiện" },
];