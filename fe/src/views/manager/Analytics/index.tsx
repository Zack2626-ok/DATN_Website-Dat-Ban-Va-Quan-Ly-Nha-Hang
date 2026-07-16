import React, { useState, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";
import { TrendingUp } from "lucide-react";
import { DateFilterBar } from "./components/DateFilterBar";
import { KpiCards } from "./components/KpiCards";
import { CustomCharts } from "./components/CustomCharts";
import { FinancialTable } from "./components/FinancialTable";
import { analyticsService } from "./services/analyticsService";
import type {
  DateFilter,
  SummaryKpis,
  RevenueTimePoint,
  PeakHourData,
  TopItem,
  PaymentMethodStat,
  CashFlowSummary,
} from "./services/analyticsService";

/**
 * AnalyticsView - Màn hình Dashboard Báo cáo & Phân tích tổng thể (Module 7)
 * Quản lý trạng thái bộ lọc toàn cục và điều phối nạp dữ liệu song song.
 */
export const AnalyticsView: React.FC = () => {
  const [filter, setFilter] = useState<DateFilter>({ type: "week" }); // mặc định 7 ngày qua
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // States lưu trữ dữ liệu báo cáo
  const [kpis, setKpis] = useState<SummaryKpis>({
    totalRevenue: 0,
    dineInRevenue: 0,
    takeawayRevenue: 0,
    deliveryRevenue: 0,
    eventRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
  });
  const [timelineData, setTimelineData] = useState<RevenueTimePoint[]>([]);
  const [peakHourData, setPeakHourData] = useState<PeakHourData[]>([]);
  const [topItems, setTopItems] = useState<TopItem[]>([]);
  const [paymentStats, setPaymentStats] = useState<PaymentMethodStat[]>([]);
  const [cashFlow, setCashFlow] = useState<CashFlowSummary>({
    income: 0,
    expenses: 0,
    netProfit: 0,
    expenseItems: [],
  });

  // Hàm nạp dữ liệu song song (Parallel Data Fetching)
  const fetchAnalyticsData = useCallback(async (currentFilter: DateFilter) => {
    try {
      setIsLoading(true);
      
      const [
        kpiRes,
        timelineRes,
        peakRes,
        topItemsRes,
        paymentRes,
        cashFlowRes,
      ] = await Promise.all([
        analyticsService.getSummaryKpis(currentFilter),
        analyticsService.getRevenueTimeline(currentFilter),
        analyticsService.getPeakHours(currentFilter),
        analyticsService.getTopSellingItems(currentFilter),
        analyticsService.getPaymentMethodStats(currentFilter),
        analyticsService.getCashFlow(currentFilter),
      ]);

      setKpis(kpiRes);
      setTimelineData(timelineRes);
      setPeakHourData(peakRes);
      setTopItems(topItemsRes);
      setPaymentStats(paymentRes);
      setCashFlow(cashFlowRes);
    } catch (err) {
      console.error("Lỗi nạp báo cáo phân tích: ", err);
      toast.error("Không thể tải dữ liệu báo cáo. Vui lòng thử lại!");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Nạp dữ liệu mỗi khi bộ lọc ngày thay đổi
  useEffect(() => {
    let isMounted = true;
    if (isMounted) {
      fetchAnalyticsData(filter);
    }
    return () => {
      isMounted = false;
    };
  }, [filter, fetchAnalyticsData]);

  const handleRefresh = () => {
    fetchAnalyticsData(filter);
    toast.success("Đã làm mới dữ liệu báo cáo thành công!");
  };

  const getFriendlyDateRange = () => {
    if (filter.type === "today") return "Hôm nay";
    if (filter.type === "week") return "7 ngày gần nhất";
    if (filter.type === "month") return "30 ngày gần nhất";
    if (filter.type === "custom") {
      const start = filter.startDate ? new Date(filter.startDate).toLocaleDateString("vi-VN") : "Đầu ca";
      const end = filter.endDate ? new Date(filter.endDate).toLocaleDateString("vi-VN") : "Cuối ca";
      return `${start} đến ${end}`;
    }
    return "";
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in pb-10">
      
      {/* Tiêu đề in báo cáo (Chỉ hiển thị khi xuất bản PDF/In) */}
      <div className="hidden print:block border-b-2 border-gray-800 pb-4 mb-2">
        <h1 className="text-xl font-bold text-gray-900 font-display">BÁO CÁO PHÂN TÍCH DOANH THU & HOẠT ĐỘNG KINH DOANH</h1>
        <div className="mt-2 text-xs text-gray-500 flex justify-between">
          <span>Thời gian thống kê: {getFriendlyDateRange()}</span>
          <span>Ngày xuất báo cáo: {new Date().toLocaleDateString("vi-VN")} lúc {new Date().toLocaleTimeString("vi-VN")}</span>
        </div>
      </div>

      {/* Tiêu đề trang (Ẩn khi in) */}
      <div className="flex flex-col gap-1 border-b border-gray-200 pb-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
        <div>
          <h1 className="text-2xl font-black text-gray-800 flex items-center gap-2 font-display">
            <TrendingUp size={24} className="text-[#FF5A5F]" />
            Báo cáo & Phân tích kinh doanh
          </h1>
          <p className="mt-1 text-xs text-gray-400">
            Theo dõi tổng quan doanh thu món lẻ, sự kiện, dòng tiền thu chi và hiệu quả thanh toán
          </p>
        </div>
      </div>

      {/* Thanh lọc ngày toàn cục (Ẩn khi in) */}
      <div className="print:hidden">
        <DateFilterBar
          filter={filter}
          onChange={setFilter}
          onRefresh={handleRefresh}
          isLoading={isLoading}
        />
      </div>

      {/* Danh sách thẻ chỉ số KPI tóm tắt */}
      <KpiCards kpis={kpis} isLoading={isLoading} />

      {/* Lưới chứa các biểu đồ trực quan hóa */}
      <CustomCharts
        timelineData={timelineData}
        peakHourData={peakHourData}
        topItems={topItems}
        isLoading={isLoading}
      />

      {/* Lưới chứa bảng dòng tiền chi phí & phương thức thanh toán */}
      <FinancialTable
        paymentStats={paymentStats}
        cashFlow={cashFlow}
        isLoading={isLoading}
      />
      
    </div>
  );
};

export default AnalyticsView;
