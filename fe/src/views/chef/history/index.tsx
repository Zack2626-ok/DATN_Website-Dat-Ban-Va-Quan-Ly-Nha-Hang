import React, { useState, useEffect, useMemo } from "react";
import {
  Calendar,
  Clock,
  Trash2,
  Inbox,
  RefreshCcw,
  CheckCircle2,
  AlertTriangle,
  BookmarkCheck
} from "lucide-react";
import { getKdsHistoryApi } from "../../../services/api";
import { toast } from "react-hot-toast";

interface HistoryItem {
  id: string | number;
  orderId: string | number;
  menuItemId: string | number;
  name: string;
  kitchenStation: "hot_kitchen" | "bar" | "cold_kitchen";
  quantity: number;
  unitPrice: number;
  status: "pending" | "waiting_kitchen" | "cooking" | "done" | "served" | "cancelled" | "voided" | "delivered";
  createdAt: string;
  updatedAt?: string;
  tableName: string;
  areaName?: string;
  orderType: "dine_in" | "delivery" | "takeaway";
  voidReason?: string;
  voidedAt?: string;
  waiterName?: string;
  kitchenNote?: string;
}

export const ChefCookingHistory: React.FC = () => {
  // Swedish local date string YYYY-MM-DD
  const getTodayString = () => {
    const tzoffset = (new Date()).getTimezoneOffset() * 60000; // offset in milliseconds
    const localISOTime = (new Date(Date.now() - tzoffset)).toISOString().slice(0, 10);
    return localISOTime;
  };

  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [historyItems, setHistoryItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "completed" | "returned">("all");

  const fetchHistory = async (dateVal: string) => {
    setLoading(true);
    try {
      const data = await getKdsHistoryApi(dateVal);
      setHistoryItems(data);
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Không thể tải lịch sử nấu ăn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(selectedDate);
  }, [selectedDate]);

  const handleRefresh = () => {
    fetchHistory(selectedDate);
    toast.success("Làm mới lịch sử thành công");
  };

  // Group items by Hour of Order and sort by order creation time (only for dine_in table orders)
  const groupedHistory = useMemo(() => {
    const groups: {
      [hourSlot: string]: HistoryItem[];
    } = {};

    historyItems.forEach((item) => {
      // Filter out takeaway/delivery
      if (item.orderType !== "dine_in") return;

      // Status filtering
      const isCompleted = ["done", "served", "delivered"].includes(item.status);
      const isReturned = ["cancelled", "voided"].includes(item.status);

      if (statusFilter === "completed" && !isCompleted) return;
      if (statusFilter === "returned" && !isReturned) return;

      const orderDate = new Date(item.createdAt);
      const hour = orderDate.getHours();
      const hourSlot = `${String(hour).padStart(2, "0")}:00 - ${String(hour).padStart(2, "0")}:59`;

      if (!groups[hourSlot]) {
        groups[hourSlot] = [];
      }

      groups[hourSlot].push(item);
    });

    // Sort hour slots descending
    const sortedHours = Object.keys(groups).sort((a, b) => b.localeCompare(a));
    const sortedResult: Array<{
      hourSlot: string;
      items: HistoryItem[];
    }> = [];

    sortedHours.forEach((hourSlot) => {
      const itemsList = groups[hourSlot].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      sortedResult.push({
        hourSlot,
        items: itemsList,
      });
    });

    return sortedResult;
  }, [historyItems, statusFilter]);

  // Statistics calculation for the top-right corner (only for dine_in table orders)
  const stats = useMemo(() => {
    let completedCount = 0;
    let returnedCount = 0;
    const hourlyCompleted: { [hour: string]: number } = {};

    historyItems.forEach((item) => {
      // Filter out takeaway/delivery
      if (item.orderType !== "dine_in") return;

      const isCompleted = ["done", "served", "delivered"].includes(item.status);
      const isReturned = ["cancelled", "voided"].includes(item.status);

      if (isCompleted) {
        completedCount += item.quantity;

        const hour = new Date(item.createdAt).getHours();
        const hourLabel = `${String(hour).padStart(2, "0")}:00 - ${String(hour).padStart(2, "0")}:59`;
        hourlyCompleted[hourLabel] = (hourlyCompleted[hourLabel] || 0) + item.quantity;
      } else if (isReturned) {
        returnedCount += item.quantity;
      }
    });

    // Sort hourly completed descending
    const sortedHourlyStats = Object.keys(hourlyCompleted)
      .sort((a, b) => b.localeCompare(a))
      .map((hour) => ({
        hour,
        count: hourlyCompleted[hour],
      }));

    return {
      completedCount,
      returnedCount,
      hourlyStats: sortedHourlyStats,
    };
  }, [historyItems]);

  // Station name display
  const getStationLabel = (station: string) => {
    switch (station) {
      case "hot_kitchen":
        return "Bếp Nóng";
      case "cold_kitchen":
        return "Bếp Nguội";
      case "bar":
        return "Quầy Nước";
      default:
        return station;
    }
  };

  const getStationBadgeClass = (station: string) => {
    switch (station) {
      case "hot_kitchen":
        return "bg-orange-50 border-orange-200 text-orange-700";
      case "cold_kitchen":
        return "bg-cyan-50 border-cyan-200 text-cyan-700";
      case "bar":
        return "bg-purple-50 border-purple-200 text-purple-700";
      default:
        return "bg-slate-50 border-slate-200 text-slate-700";
    }
  };

  return (
    <div className="bg-slate-50 text-slate-800 p-6 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-6 select-none min-h-175 transition-all">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-5 gap-4">
        <div>
          <div className="flex items-center gap-2">
            <BookmarkCheck size={28} className="text-admin-primary" />
            <h3 className="text-2xl font-black tracking-tight text-slate-800 font-display">
              Lịch Sử
            </h3>
          </div>
          <p className="text-xs text-slate-500 mt-1 font-medium">
            Xem danh sách món ăn đã hoàn thành hoặc bị hủy trả theo thời gian
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Chọn ngày */}
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 shadow-sm w-full md:w-auto">
            <Calendar size={15} className="text-slate-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer bg-transparent border-none"
            />
          </div>

          {/* Refresh */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center cursor-pointer transition-all bg-white border-slate-300 text-slate-700 hover:bg-slate-50 active:bg-slate-100 disabled:opacity-50"
            title="Làm mới lịch sử"
          >
            <RefreshCcw size={15} className={`${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Main Grid: Statistics Top Right & Content Below / Left */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
        {/* Left/Bottom: Detailed History List (3 columns wide) */}
        <div className="xl:col-span-3 flex flex-col gap-6">

          {loading && historyItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-3 bg-white rounded-2xl border border-slate-200 shadow-sm">
              <Clock size={48} className="text-slate-400 animate-spin" />
              <span className="text-sm text-slate-500 italic animate-pulse">
                Đang tải dữ liệu lịch sử nấu ăn...
              </span>
            </div>
          ) : groupedHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 gap-4 bg-white rounded-2xl border border-slate-200 shadow-sm text-slate-400 text-center">
              <Inbox size={48} className="text-slate-300" />
              <div>
                <p className="text-sm font-bold text-slate-600">Không tìm thấy món ăn nào</p>
                <p className="text-xs text-slate-450 mt-1">
                  {statusFilter === "all"
                    ? "Chưa có đơn hoàn thành hoặc bị hủy trả trong ngày này."
                    : statusFilter === "completed"
                    ? "Chưa có món ăn nào hoàn thành trong ngày này."
                    : "Chưa có món ăn nào bị hủy trả trong ngày này."}
                </p>
              </div>
            </div>
          ) : (
            groupedHistory.map((hourGroup) => (
              <div
                key={hourGroup.hourSlot}
                className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
              >
                {/* Hour Header */}
                <div className="bg-slate-100/70 border-b border-slate-200 px-5 py-3.5 flex items-center gap-2">
                  <Clock size={16} className="text-admin-primary" />
                  <span className="text-sm font-black text-slate-800 tracking-tight">
                    Khung giờ lên đơn: {hourGroup.hourSlot}
                  </span>
                </div>

                {/* Dishes List */}
                <div className="p-5 flex flex-col gap-3 max-h-120 overflow-y-auto pr-2 scrollbar">
                  {hourGroup.items.map((item) => {
                    const isDone = ["done", "served", "delivered"].includes(item.status);
                    return (
                      <div
                        key={item.id}
                        className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3.5 rounded-lg border border-slate-200/80 shadow-sm gap-3 hover:border-slate-300 transition-colors"
                      >
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-black text-admin-primary bg-blue-50/80 px-2.5 py-0.5 rounded-md border border-blue-200/60">
                              Bàn: {item.tableName || "Mang về"}
                            </span>
                            <span className="text-[10px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                              🤵 {item.waiterName || "Phục vụ"}
                            </span>
                            <span className="text-sm font-extrabold text-slate-800 leading-snug">
                              {item.name}
                            </span>
                            <span className="text-xs font-black bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md border border-blue-200/60">
                              x{item.quantity}
                            </span>
                            <span className={`text-[10px] border px-2 py-0.5 rounded-md font-bold uppercase ${getStationBadgeClass(item.kitchenStation)}`}>
                              {getStationLabel(item.kitchenStation)}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 font-semibold flex items-center gap-3.5 flex-wrap">
                            <span>
                              🕒 Giờ lên: {new Date(item.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                            </span>
                            {item.updatedAt && (
                              <span>
                                🍳 Xong: {new Date(item.updatedAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                              </span>
                            )}
                            {item.orderType && (
                              <span className="capitalize">
                                ({item.orderType === "dine_in" ? "Tại bàn" : item.orderType === "delivery" ? "Giao hàng" : "Mang về"})
                              </span>
                            )}
                          </div>
                          {/* Kitchen Note if present */}
                          {item.kitchenNote && (
                            <div className="text-[10px] font-extrabold text-slate-700 bg-slate-100/80 border border-slate-200 px-2.5 py-1 rounded-md flex items-center gap-1.5 w-fit">
                              <span>📝 Ghi chú: {item.kitchenNote}</span>
                            </div>
                          )}
                          {/* Void Reason if cancelled */}
                          {!isDone && (item.voidReason || item.status === "voided") && (
                            <div className="mt-1 text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-150 px-2 py-1 rounded-md flex items-center gap-1.5">
                              <AlertTriangle size={11} className="stroke-[2.5]" />
                              <span>Lý do hủy: {item.voidReason || "Nhân viên hủy đơn"}</span>
                            </div>
                          )}
                        </div>

                        <div>
                          {isDone ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 size={12} />
                              {item.status === "done" ? "Đã nấu xong" : "Đã phục vụ"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black bg-rose-50 text-rose-700 border border-rose-200">
                              <Trash2 size={12} />
                              Đã hủy trả
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right/Top Corner: Aggregated Stats Panel (1 column wide) */}
        <div className="xl:col-span-1 flex flex-col gap-5">
          {/* Stats overview card */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
              Tổng quan ngày này
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div
                onClick={() => setStatusFilter(statusFilter === "completed" ? "all" : "completed")}
                className={`border rounded-xl p-3.5 flex flex-col gap-1 shadow-inner cursor-pointer transition-all active:scale-95 select-none ${
                  statusFilter === "completed"
                    ? "bg-emerald-100 border-emerald-300 ring-2 ring-emerald-500/20"
                    : "bg-emerald-50 border-emerald-150 hover:bg-emerald-100/50"
                }`}
              >
                <span className="text-[10px] font-bold text-emerald-700 uppercase">Hoàn thành</span>
                <span className="text-xl font-black text-emerald-800">
                  {stats.completedCount} <span className="text-[11px] font-medium text-emerald-650">món</span>
                </span>
              </div>
              <div
                onClick={() => setStatusFilter(statusFilter === "returned" ? "all" : "returned")}
                className={`border rounded-xl p-3.5 flex flex-col gap-1 shadow-inner cursor-pointer transition-all active:scale-95 select-none ${
                  statusFilter === "returned"
                    ? "bg-rose-100 border-rose-300 ring-2 ring-rose-500/20"
                    : "bg-rose-50 border-rose-150 hover:bg-rose-100/50"
                }`}
              >
                <span className="text-[10px] font-bold text-rose-700 uppercase">Hủy / Trả</span>
                <span className="text-xl font-black text-rose-800">
                  {stats.returnedCount} <span className="text-[11px] font-medium text-rose-650">món</span>
                </span>
              </div>
            </div>
          </div>

          {/* Stats details per hour block */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-4">
            <div className="border-b border-slate-100 pb-2 flex justify-between items-center">
              <h4 className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Món xong theo giờ
              </h4>
              <span className="bg-blue-50 text-admin-primary text-[10px] font-black px-2 py-0.5 rounded border border-blue-200">
                Tổng: {stats.completedCount}
              </span>
            </div>

            <div className="flex flex-col gap-2 max-h-100 overflow-y-auto pr-1 scrollbar">
              {stats.hourlyStats.length === 0 ? (
                <p className="text-[11px] text-slate-400 italic text-center py-8">
                  Chưa có số liệu tổng hợp
                </p>
              ) : (
                stats.hourlyStats.map((stat, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center text-xs font-bold text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-150 hover:bg-slate-100/60 transition-colors"
                  >
                    <span className="flex items-center gap-1.5 text-slate-650">
                      <Clock size={12} className="text-admin-primary" />
                      {stat.hour}
                    </span>
                    <span className="bg-admin-primary/10 text-admin-primary px-2 py-0.5 rounded-md font-black min-w-8 text-center border border-blue-100">
                      {stat.count} món
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
