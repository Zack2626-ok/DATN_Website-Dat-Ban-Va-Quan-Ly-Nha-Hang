import type { OrderItem } from "./index";

export type InvoiceStatus = "unpaid" | "paid" | "cancelled";

export interface Invoice {
  id: string;
  tableId?: string;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  customerEmail?: string;
  guestCount: number;
  items: OrderItem[];
  totalAmount: number;
  subtotal?: number;
  tax?: number;
  discount?: number;
  vatRate?: number;
  depositAmount?: number;
  status: string;
  invoiceStatus: InvoiceStatus;
  createdAt: string;
  orderType?: string;
}

export interface PaymentBreakdown {
  subtotal: number;
  vat: number;
  vatRate: number;
  depositAmount?: number;
  serviceFee: number;
  serviceFeeRate: number;
  voucher: number;
  voucherCode?: string;
  tip: number;
  finalAmount: number;
}

export interface PaymentRequest {
  paymentMethod: "cash" | "transfer" | "card" | "wallet";
  vatRate?: number;
  serviceFeeRate?: number;
  voucherCode?: string;
  voucherAmount?: number;
  tipAmount?: number;
  notes?: string;
}

export interface SplitBillEqualRequest {
  parts: number;
}

export interface SplitBillGroup {
  label?: string;
  itemIndices: number[];
}

export interface SplitBillByItemsRequest {
  groups: SplitBillGroup[];
}

export interface MergeBillRequest {
  invoiceIds: string[];
}

export interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
  status: string;
  discountAmount?: number;
  discountReason?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
}
