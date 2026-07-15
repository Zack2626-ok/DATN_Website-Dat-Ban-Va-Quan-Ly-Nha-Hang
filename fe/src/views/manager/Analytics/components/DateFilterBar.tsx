import React, { useState, useEffect } from "react";
import { Calendar, Download, RefreshCw } from "lucide-react";
import type { DateFilter } from "../services/analyticsService";

interface DateFilterBarProps {
  filter: DateFilter;
  onChange: (filter: DateFilter) => void;
  onRefresh: () => void;
  isLoading: boolean;
}

/**
 * DateFilterBar - Bộ lọc khoảng thời gian báo cáo và các nút chức năng
 */
export const DateFilterBar: React.FC<DateFilterBarProps> = ({
  filter,
  onChange,
  onRefresh,
  isLoading,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [localStartDate, setLocalStartDate] = useState(filter.startDate || "");
  const [localEndDate, setLocalEndDate] = useState(filter.endDate || "");
  const [error, setError] = useState<string | null>(null);

  // Đồng bộ hóa input nội bộ khi bộ lọc của cha thay đổi
  useEffect(() => {
    if (filter.startDate) setLocalStartDate(filter.startDate);
    if (filter.endDate) setLocalEndDate(filter.endDate);

    // Xóa lỗi nếu chuyển sang các tab chọn sẵn
    if (filter.type !== "custom") {
      setError(null);
    }
  }, [filter.startDate, filter.endDate, filter.type]);

  const handleTypeChange = (type: DateFilter["type"]) => {
    setError(null);
    if (type === "custom") {
      // Thiết lập mặc định cho tùy chỉnh là 7 ngày qua
      const start = new Date();
      start.setDate(start.getDate() - 7);
      const startStr = start.toISOString().split("T")[0];
      const endStr = new Date().toISOString().split("T")[0];
      
      setLocalStartDate(startStr);
      setLocalEndDate(endStr);
      
      onChange({
        type,
        startDate: startStr,
        endDate: endStr,
      });
    } else {
      onChange({ type });
    }
  };

  const handleCustomDateChange = (field: "startDate" | "endDate", value: string) => {
    const nextStartDate = field === "startDate" ? value : localStartDate;
    const nextEndDate = field === "endDate" ? value : localEndDate;

    if (field === "startDate") setLocalStartDate(value);
    if (field === "endDate") setLocalEndDate(value);

    if (nextStartDate && nextEndDate) {
      if (new Date(nextEndDate) < new Date(nextStartDate)) {
        setError("Ngày kết thúc không được nhỏ hơn ngày bắt đầu!");
        // Chặn không gọi onChange để giữ kết quả truy vấn hợp lệ trước đó
      } else {
        setError(null);
        onChange({
          type: "custom",
          startDate: nextStartDate,
          endDate: nextEndDate,
        });
      }
    } else {
      onChange({
        type: "custom",
        startDate: nextStartDate || undefined,
        endDate: nextEndDate || undefined,
      });
    }
  };

  const handleExport = () => {
    if (error) {
      alert("Vui lòng sửa khoảng ngày bị lỗi trước khi xuất báo cáo!");
      return;
    }
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      alert("Đã xuất báo cáo phân tích định dạng PDF thành công!");
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-sky-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
      {/* Cụm bộ lọc thời gian */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-sky-100 p-0.5">
          <button
            type="button"
            onClick={() => handleTypeChange("today")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              filter.type === "today"
                ? "bg-white text-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            Hôm nay
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("week")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              filter.type === "week"
                ? "bg-white text-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            7 ngày qua
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("month")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              filter.type === "month"
                ? "bg-white text-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            30 ngày qua
          </button>
          <button
            type="button"
            onClick={() => handleTypeChange("custom")}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer ${
              filter.type === "custom"
                ? "bg-white text-slate-700 shadow-sm"
                : "text-slate-400 hover:text-slate-700"
            }`}
          >
            Tùy chỉnh
          </button>
        </div>

        {/* Khung nhập ngày tùy chỉnh với cảnh báo lỗi */}
        {filter.type === "custom" && (
          <div className="flex flex-col gap-1 pl-1">
            <div className="flex items-center gap-1.5 animate-fade-in">
              <Calendar size={14} className="text-gray-400" />
              <input
                type="date"
                value={localStartDate}
                onChange={(e) => handleCustomDateChange("startDate", e.target.value)}
                className={`rounded-lg border bg-sky-50/50 px-2 py-1 text-xs font-medium focus:outline-none transition-all ${
                  error
                    ? "border-rose-500 text-rose-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/30"
                    : "border-sky-100 text-slate-600 focus:border-sky-500"
                }`}
              />
              <span className="text-xs text-gray-400">đến</span>
              <input
                type="date"
                value={localEndDate}
                onChange={(e) => handleCustomDateChange("endDate", e.target.value)}
                className={`rounded-lg border bg-sky-50/50 px-2 py-1 text-xs font-medium focus:outline-none transition-all ${
                  error
                    ? "border-rose-500 text-rose-600 focus:border-rose-500 focus:ring-1 focus:ring-rose-500 bg-rose-50/30"
                    : "border-sky-100 text-slate-600 focus:border-sky-500"
                }`}
              />
            </div>
            {error && (
              <p className="text-[10px] font-bold text-rose-500 mt-0.5 animate-pulse flex items-center gap-1">
                ⚠️ {error}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Cụm hành động phụ trợ */}
      <div className="flex items-center gap-2 self-end sm:self-auto">
        <button
          type="button"
          disabled={isLoading}
          onClick={onRefresh}
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-sky-100 bg-white text-slate-400 hover:bg-sky-50/50 hover:text-slate-700 disabled:opacity-50 cursor-pointer"
          title="Làm mới dữ liệu"
        >
          <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
        </button>

        <button
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className="flex items-center gap-2 rounded-lg bg-sky-500 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#e04f53] transition-colors disabled:opacity-75 cursor-pointer"
        >
          {isExporting ? (
            <>
              <RefreshCw size={12} className="animate-spin" />
              Đang xuất...
            </>
          ) : (
            <>
              <Download size={12} />
              Xuất báo cáo
            </>
          )}
        </button>
      </div>
    </div>
  );
};
export default DateFilterBar;
