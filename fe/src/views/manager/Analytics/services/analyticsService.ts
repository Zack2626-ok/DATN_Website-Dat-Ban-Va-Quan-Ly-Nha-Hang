/**
 * analyticsService.ts
 * Tầng dịch vụ báo cáo & phân tích (Module 7).
 * Kết nối trực tiếp với API Backend.
 */
import api from "../../../../services/axiosInstance";

export interface DateFilter {
  type: "today" | "week" | "month" | "custom";
  startDate?: string;
  endDate?: string;
}

export interface SummaryKpis {
  totalRevenue: number;
  dineInRevenue: number;
  takeawayRevenue: number;
  deliveryRevenue: number;
  eventRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
}

export interface RevenueTimePoint {
  label: string;
  revenue: number;
  orderCount: number;
}

export interface PeakHourData {
  hour: number;
  count: number;
  percentage: number;
}

export interface TopItem {
  id: number;
  name: string;
  quantity: number;
  revenue: number;
  percentage: number;
}

export interface PaymentMethodStat {
  method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay";
  name: string;
  count: number;
  total: number;
  percentage: number;
}

export interface CashFlowSummary {
  income: number;
  expenses: number;
  netProfit: number;
  expenseItems: Array<{
    category: string;
    amount: number;
  }>;
}

const filterToQueryParams = (filter: DateFilter) => {
  const params: Record<string, string> = {};
  const today = new Date();
  
  if (filter.type === "today") {
    const dateStr = today.toISOString().split("T")[0];
    params.startDate = `${dateStr} 00:00:00`;
    params.endDate = `${dateStr} 23:59:59`;
  } else if (filter.type === "week") {
    const past = new Date();
    past.setDate(today.getDate() - 7);
    params.startDate = past.toISOString().split("T")[0] + " 00:00:00";
    params.endDate = today.toISOString().split("T")[0] + " 23:59:59";
  } else if (filter.type === "month") {
    const past = new Date();
    past.setDate(today.getDate() - 30);
    params.startDate = past.toISOString().split("T")[0] + " 00:00:00";
    params.endDate = today.toISOString().split("T")[0] + " 23:59:59";
  } else if (filter.type === "custom") {
    if (filter.startDate) {
      params.startDate = `${filter.startDate} 00:00:00`;
    }
    if (filter.endDate) {
      params.endDate = `${filter.endDate} 23:59:59`;
    }
  }
  return params;
};

export const analyticsService = {
  getSummaryKpis: async (filter: DateFilter): Promise<SummaryKpis> => {
    const params = filterToQueryParams(filter);
    const res = await api.get("/reports/revenue-overview", { params });
    return res.data.data.kpis;
  },

  getRevenueTimeline: async (filter: DateFilter): Promise<RevenueTimePoint[]> => {
    const params = filterToQueryParams(filter);
    const res = await api.get("/reports/revenue-overview", { params });
    const rawTimeline = res.data.data.timeline || [];
    
    if (filter.type === "today") {
      return rawTimeline.map((item: any) => ({
        label: item.date ? `${new Date(item.date).getHours()}h` : item.label,
        revenue: Number(item.revenue),
        orderCount: Number(item.orderCount)
      }));
    }
    
    return rawTimeline.map((item: any) => {
      const dateParts = item.date.split("-");
      const label = dateParts.length >= 3 ? `${dateParts[2]}/${dateParts[1]}` : item.date;
      return {
        label,
        revenue: Number(item.revenue),
        orderCount: Number(item.orderCount)
      };
    });
  },

  getPeakHours: async (filter: DateFilter): Promise<PeakHourData[]> => {
    const params = filterToQueryParams(filter);
    const res = await api.get("/reports/peak-hours", { params });
    return (res.data.data || []).map((item: any) => ({
      hour: Number(item.hour),
      count: Number(item.count),
      percentage: Number(item.percentage)
    }));
  },

  getTopSellingItems: async (filter: DateFilter): Promise<TopItem[]> => {
    const params = filterToQueryParams(filter);
    const res = await api.get("/reports/top-items", { params });
    const rawItems = res.data.data || [];
    
    const totalTopQuantity = rawItems.reduce((sum: number, item: any) => sum + Number(item.quantity), 0) || 1;

    return rawItems.map((item: any) => ({
      id: Number(item.id),
      name: item.name,
      quantity: Number(item.quantity),
      revenue: Number(item.revenue),
      percentage: Math.round((Number(item.quantity) / totalTopQuantity) * 100)
    }));
  },

  getPaymentMethodStats: async (filter: DateFilter): Promise<PaymentMethodStat[]> => {
    const params = filterToQueryParams(filter);
    const res = await api.get("/reports/payment-methods", { params });
    const rawStats = res.data.data || [];
    
    const methodNames: Record<string, string> = {
      cash: "Tiền mặt",
      transfer: "Chuyển khoản",
      card: "Thẻ ngân hàng",
      wallet: "Ví điện tử",
      momo: "Ví điện tử MoMo",
      vnpay: "Cổng VNPay"
    };

    let grandTotal = rawStats.reduce((sum: number, item: any) => sum + Number(item.total), 0) || 1;

    return rawStats.map((item: any) => ({
      method: item.method,
      name: methodNames[item.method] || item.method,
      count: Number(item.count),
      total: Number(item.total),
      percentage: Math.round((Number(item.total) / grandTotal) * 100)
    }));
  },

  getCashFlow: async (filter: DateFilter): Promise<CashFlowSummary> => {
    const params = filterToQueryParams(filter);
    const res = await api.get("/reports/cash-flow", { params });
    const data = res.data.data;
    return {
      income: Number(data.income),
      expenses: Number(data.expenses),
      netProfit: Number(data.netProfit),
      expenseItems: (data.expenseItems || []).map((item: any) => ({
        category: String(item.category),
        amount: Number(item.amount)
      }))
    };
  }
};
