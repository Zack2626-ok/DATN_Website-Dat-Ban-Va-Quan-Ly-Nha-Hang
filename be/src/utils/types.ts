export interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
}

export interface JwtPayload {
  userId: string;
  email: string;
<<<<<<< HEAD
<<<<<<< HEAD
  role?: string;
=======
  role_name: string;
>>>>>>> main
=======
  role_name: string;
>>>>>>> 628231b119bcded153dc56433816237b072c9aea
  iat?: number;
  exp?: number;
}

export interface User {
  id: string;
  full_name: string;
  email: string;
  password: string;
  role_name: string;
  phone: string;
  createdAt: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ===== TABLE TYPES =====
export interface Table {
  id: string;
  tableNumber: number;
  capacity: number;
  status: "available" | "occupied" | "reserved";
  location?: string;
  qrCode?: string;
  createdAt: string;
}

// ===== MENU/DISH TYPES =====
export interface MenuItem {
  id: string;
  name: string;
  description?: string;
  category: string;
  price: number;
  image?: string;
  available: boolean;
  preparationTime?: number;
  createdAt: string;
}

// ===== INVENTORY TYPES =====
export interface Inventory {
  id: string;
  itemName: string;
  itemCode: string;
  category: string;
  quantity: number;
  unit: string;
  minQuantity: number;
  supplier?: string;
  lastRestocked?: string;
  createdAt: string;
}

// ===== PAYMENT TYPES =====
export interface Payment {
  id: string;
  orderId: string;
  amount: number;
  paymentMethod: "cash" | "card" | "transfer" | "wallet";
  status: "pending" | "completed" | "failed" | "refunded";
  discountAmount?: number;
  discountReason?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}

export interface PaymentDetail {
  orderId: string;
  totalAmount: number;
  itemsAmount: number;
  discountAmount: number;
  taxAmount: number;
  finalAmount: number;
}
