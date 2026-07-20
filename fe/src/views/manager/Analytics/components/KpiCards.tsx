import React from "react";
import { DollarSign, ShoppingBag, BarChart } from "lucide-react";
import { formatCurrency } from "../../../../utils/formatCurrency";
import type { SummaryKpis } from "../services/analyticsService";

interface KpiCardsProps {
  kpis: SummaryKpis;
  isLoading: boolean;
}

/**
 * KpiCards - Hiển thị 4 thẻ chỉ số KPI kinh doanh cốt lõi
 */
export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, isLoading }) => {
  // Tính toán tỷ lệ phần trăm phân bố doanh thu nhà hàng
  const totalRestaurantRev = kpis.totalRevenue || 1; // tránh chia cho 0
  const dineInPct = Math.round((kpis.dineInRevenue / totalRestaurantRev) * 100);
  const takeawayPct = Math.round((kpis.takeawayRevenue / totalRestaurantRev) * 100);
  const deliveryPct = 100 - dineInPct - takeawayPct;

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 w-full animate-pulse rounded-2xl border border-sky-50 bg-white p-5 shadow-xs"
          />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {/* CARD 1: Doanh thu Nhà hàng */}
      <div className="relative overflow-hidden rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Doanh thu món lẻ
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-600">
            <DollarSign size={16} />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-black text-slate-700 font-display">
            {formatCurrency(kpis.totalRevenue)}
          </h3>
          <p className="mt-1.5 text-[10px] text-gray-400">Đơn mang về, giao hàng & tại bàn</p>
        </div>

        {/* Phân bố doanh thu dưới dạng thanh progress bar */}
        <div className="mt-4 space-y-1.5">
          <div className="flex h-1.5 overflow-hidden rounded-full bg-sky-100">
            <div
              className="bg-sky-500"
              style={{ width: `${dineInPct}%` }}
              title={`Tại bàn: ${dineInPct}%`}
            />
            <div
              className="bg-amber-400"
              style={{ width: `${takeawayPct}%` }}
              title={`Mang về: ${takeawayPct}%`}
            />
            <div
              className="bg-sky-400"
              style={{ width: `${Math.max(0, deliveryPct)}%` }}
              title={`Giao hàng: ${deliveryPct}%`}
            />
          </div>
          <div className="flex justify-between text-[9px] font-bold text-gray-400">
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-500" /> Tại bàn ({dineInPct}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" /> Mang về ({takeawayPct}%)
            </span>
            <span className="flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-sky-400" /> Ship ({Math.max(0, deliveryPct)}%)
            </span>
          </div>
        </div>
      </div>

      {/* CARD 2: Tổng số đơn hàng */}
      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Tổng đơn hàng lẻ
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
            <ShoppingBag size={16} />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-black text-slate-700 font-display">
            {kpis.totalOrders.toLocaleString("vi-VN")} đơn
          </h3>
          <p className="mt-1.5 text-[10px] text-gray-400">Số hóa đơn lẻ được xuất thành công</p>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-sky-50 pt-3 text-[10px] font-bold text-gray-400">
          <span>Tỷ lệ hoàn thành đơn</span>
          <span className="text-emerald-500 font-black">98.2%</span>
        </div>
      </div>

      {/* CARD 3: Giá trị đơn hàng trung bình */}
      <div className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
        <div className="flex items-start justify-between">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Đơn giá trung bình (AOV)
          </span>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-sky-600">
            <BarChart size={16} />
          </div>
        </div>
        <div className="mt-3">
          <h3 className="text-2xl font-black text-slate-700 font-display">
            {formatCurrency(kpis.averageOrderValue)}
          </h3>
          <p className="mt-1.5 text-[10px] text-gray-400">Doanh thu trung bình thu từ 1 hóa đơn</p>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-sky-50 pt-3 text-[10px] font-bold text-gray-400">
          <span>Sức mua của khách lẻ</span>
          <span className="text-sky-600 font-black">+4.1% cải thiện</span>
        </div>
      </div>
    </div>
  );
};
export default KpiCards;
