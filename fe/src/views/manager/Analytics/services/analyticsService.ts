import api from "../../../../services/axiosInstance";

export interface DateFilter {
  type: "today" | "week" | "month" | "custom";
  startDate?: string;
  endDate?: string;
}

export interface SummaryKpis {
  totalRevenue: number; // Doanh thu nhà hàng (Hóa đơn paid)
  dineInRevenue: number;
  takeawayRevenue: number;
  deliveryRevenue: number;
  eventRevenue: number; // Doanh thu sự kiện (Hợp đồng confirmed/completed)
  totalOrders: number; // Tổng số đơn hàng trong kỳ
  averageOrderValue: number; // Giá trị đơn hàng trung bình
}

export interface RevenueTimePoint {
  label: string; // Ngày (DD/MM), Thứ (Thứ 2...) hoặc Giờ tùy thuộc filter
  revenue: number;
  orderCount: number;
}

export interface PeakHourData {
  hour: number; // Giờ trong ngày (8 - 22)
  count: number; // Số đơn phát sinh
  percentage: number; // Tỉ lệ % lưu lượng
}

export interface TopItem {
  id: number;
  name: string;
  quantity: number;
  revenue: number;
  percentage: number; // % đóng góp số lượng trong top 5
}

export interface PaymentMethodStat {
  method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay";
  name: string;
  count: number;
  total: number;
  percentage: number; // % đóng góp doanh thu
}

export interface CashFlowSummary {
  income: number; // Doanh thu (Restaurant paid + Event deposits/remaining paid)
  expenses: number; // Chi phí nhập nguyên liệu kho
  netProfit: number; // Lợi nhuận ròng
  expenseItems: Array<{
    category: string;
    amount: number;
  }>;
}

// Caching and Request Deduplication Layer
let cachedFilter: string | null = null;
let cachedData: any = null;
let pendingPromise: Promise<any> | null = null;

const fetchDashboardData = async (filter: DateFilter) => {
  const filterKey = JSON.stringify(filter);
  if (cachedFilter === filterKey && cachedData) {
    return cachedData;
  }
  if (pendingPromise) {
    return pendingPromise;
  }

  pendingPromise = api
    .get("/v1/analytics/dashboard", {
      params: {
        type: filter.type,
        startDate: filter.startDate,
        endDate: filter.endDate,
      },
    })
    .then((res) => {
      cachedData = res.data.data;
      cachedFilter = filterKey;
      pendingPromise = null;
      return cachedData;
    })
    .catch((err) => {
      pendingPromise = null;
      throw err;
    });

  return pendingPromise;
};

export const analyticsService = {
  getSummaryKpis: async (filter: DateFilter): Promise<SummaryKpis> => {
    const data = await fetchDashboardData(filter);
    return data.kpis;
  },

  getRevenueTimeline: async (filter: DateFilter): Promise<RevenueTimePoint[]> => {
    const data = await fetchDashboardData(filter);
    return data.timelineData;
  },

  getPeakHours: async (filter: DateFilter): Promise<PeakHourData[]> => {
    const data = await fetchDashboardData(filter);
    return data.peakHourData;
  },

  getTopSellingItems: async (filter: DateFilter): Promise<TopItem[]> => {
    const data = await fetchDashboardData(filter);
    return data.topItems;
  },

  getPaymentMethodStats: async (filter: DateFilter): Promise<PaymentMethodStat[]> => {
    const data = await fetchDashboardData(filter);
    return data.paymentStats;
  },

  getCashFlow: async (filter: DateFilter): Promise<CashFlowSummary> => {
    const data = await fetchDashboardData(filter);
    return data.cashFlow;
  },
};
