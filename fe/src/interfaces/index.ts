import type { OrderStatus } from "../constants/orderStatus";
import type { TableStatus } from "../constants/tableStatus";

export interface MenuItem {
  id: string;
  name: string;
  price: number;
  description: string;
  category: string;
  image: string;
  isSpicy: boolean;
  isBestSeller: boolean;
  inStock: boolean;
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
  menuItemId: string;
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

export type UserRole = "admin" | "manager" | "waiter" | "chef" | "cashier";
