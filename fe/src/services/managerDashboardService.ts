import api from "./axiosInstance";
import type { RestaurantInfo } from "./restaurantInfoService";

export interface ManagerReportSummary {
    totalRevenue: number;
    totalCompletedOrders: number;
    activeOrdersCount: number;
    occupiedTables: number;
    revenueByDate: { date: string; totalRevenue: number; totalOrders: number }[];
    bookingStats: { status: string; count: number }[];
    topItems: { id: number; name: string; totalQty: number; totalRevenue: number }[];
}

export const managerDashboardService = {
    getDetailedReport: async (startDate?: string, endDate?: string): Promise<ManagerReportSummary> => {
        const response = await api.get("/v1/manager/reports", {
            params: { startDate, endDate },
        });
        return response.data.data;
    },

    getSystemSettings: async (): Promise<RestaurantInfo> => {
        const response = await api.get("/v1/manager/settings");
        return response.data.data;
    },

    updateSystemSettings: async (data: Partial<RestaurantInfo>): Promise<RestaurantInfo> => {
        const response = await api.put("/v1/manager/settings", data);
        return response.data.data;
    },
};
