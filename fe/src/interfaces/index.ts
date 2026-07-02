import type { OrderStatus } from "../constants/orderStatus";
import type { TableStatus } from "../constants/tableStatus";

export interface Modifier {
  id?: number | string;
  group_id?: number | string;
  parent_modifier_id?: number | string | null;
  name: string;
  extra_price: number;
}

export interface ModifierGroup {
  id?: number | string;
  menu_item_id?: number | string;
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  modifiers: Modifier[];
}

export interface MenuItem {
  id: string | number;
  name: string;
  price: number;
  description: string;
  category_id: string | number;
  category_name?: string;
  category?: string; // For backward compatibility
  image_url?: string;
  image?: string; // For backward compatibility
  kitchen_station: "hot_kitchen" | "bar" | "cold_kitchen";
  is_active: boolean;
  is_featured: boolean;
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
  inStock?: boolean; // For backward compatibility
  available?: boolean; // For backward compatibility
  modifier_groups?: ModifierGroup[];
}

export interface Category {
  id: string | number;
  name: string;
  sort_order: number;
  is_active: boolean;
}

export interface Table {
  id: string;
  name: string;
  status: TableStatus;
  seats: number;
  zone: string;
  currentOrderId: string | null;
}

export interface OrderItem {
  menuItemId: string | number;
  name: string;
  price: number;
  quantity: number;
}

export interface Order {
  id: string;
  tableId?: string;
  tableName?: string;
  items: OrderItem[];
  status: OrderStatus;
  totalAmount: number;
  createdAt: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  guestCount: number;
  deliveryAddress?: string;
  orderType?: "dine_in" | "delivery" | "takeaway";
}

export interface Ingredient {
  id: string;
  name: string;
  stock: number;
  unit: string;
  threshold: number; // Alert when stock < threshold
}

export type UserRole = "admin" | "manager" | "waiter" | "chef" | "cashier" | "sales_event";

export interface Role {
  id: number;
  name: UserRole;
  description: string;
}

export interface User {
  id: number;
  role_id: number;
  full_name: string;
  email: string;
  password_hash?: string;
  phone?: string;
  avatar_url?: string;
  status: "active" | "inactive";
  is_deleted: boolean;
  deleted_at?: string;
  last_login?: string;
  created_at: string;
  updated_at: string;
  // For UI: include role object when fetching
  role?: Role;
}
