import api from "./axiosInstance";

export interface AnalyticsSummary {
  totalRevenue: number;
  activeOrdersCount: number;
  completedOrdersCount: number;
  occupiedTables: number;
  totalTables: number;
  lowStockCount: number;
  revenueByDay: { day: string; revenue: number }[];
  topItems: { id: number; name: string; totalQty: number; totalRevenue: number }[];
}

export interface FinanceTransaction {
  date: string;
  type: "thu" | "chi";
  category: string;
  reference: string;
  amount: number;
}

export interface FinanceReport {
  dateRange: { startDate: string; endDate: string };
  summary: { totalIncome: number; totalExpense: number; netProfit: number };
  transactions: FinanceTransaction[];
}

export interface LossDebtReport {
  summary: { totalSupplierDebt: number; totalLossRecords: number; totalLossQuantity: number };
  inventoryVariance: {
    id: number;
    ingredient_name: string;
    unit: string;
    actual_stock: number;
    system_stock: number;
    variance: number;
    noted_at: string;
  }[];
  wasteOut: {
    id: number;
    ingredient_name: string;
    unit: string;
    quantity: number;
    reason: string;
    note: string | null;
    created_at: string;
  }[];
  suppliers: { id: number; name: string; phone: string; address: string; total_debt: number }[];
}

/**
 * Report Service - Các báo cáo tổng hợp cho Admin/Manager (analytics, tài chính, hao hụt & công nợ).
 */
export const reportService = {
  getAnalyticsSummary: async (): Promise<AnalyticsSummary> => {
    const response = await api.get("/reports/analytics");
    return response.data.data;
  },

  getFinanceReport: async (startDate?: string, endDate?: string): Promise<FinanceReport> => {
    const response = await api.get("/reports/finance", { params: { startDate, endDate } });
    return response.data.data;
  },

  getLossDebtReport: async (): Promise<LossDebtReport> => {
    const response = await api.get("/reports/loss-debt");
    return response.data.data;
  },
};
