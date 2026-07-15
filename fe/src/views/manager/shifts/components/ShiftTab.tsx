import React, { useState } from "react";
import { Search, Plus, Clock, Lock, FileText, CheckCircle2 } from "lucide-react";
import type { Shift } from "../../../../interfaces/shift.interface";

interface ShiftTabProps {
  shifts: Shift[];
  loading: boolean;
  onOpenShiftClick: () => void;
  onCloseShiftClick: (shift: Shift) => void;
}

export const ShiftTab: React.FC<ShiftTabProps> = ({
  shifts,
  loading,
  onOpenShiftClick,
  onCloseShiftClick,
}) => {
  const [query, setQuery] = useState("");

  const filtered = shifts.filter((s) => {
    const nameMatch = s.employee_name?.toLowerCase().includes(query.toLowerCase());
    const roleMatch = s.employee_role?.toLowerCase().includes(query.toLowerCase());
    const noteMatch = s.note?.toLowerCase().includes(query.toLowerCase());
    return nameMatch || roleMatch || noteMatch;
  });

  const formatVnd = (num: number) => {
    return num.toLocaleString("vi-VN") + " đ";
  };

  const formatDateTime = (dtStr: string) => {
    return dtStr.replace("T", " ");
  };

  return (
    <div className="space-y-4">
      {/* Thanh tìm kiếm và Nút thêm ca mới */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-white p-4 rounded-xl border border-gray-150 shadow-xs">
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm nhân viên, vai trò hoặc ghi chú..."
            className="w-full rounded-lg border border-sky-100 py-2 pl-10 pr-3 text-xs focus:border-sky-500 focus:outline-none"
          />
        </div>

        <button
          onClick={onOpenShiftClick}
          className="flex items-center justify-center gap-2 rounded-lg bg-sky-500 hover:bg-[#e04f53] px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer shadow-sm"
        >
          <Plus size={14} />
          Mở ca làm việc mới
        </button>
      </div>

      {/* Danh sách bảng ca làm việc */}
      <div className="overflow-hidden rounded-xl border border-sky-100 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-sky-50/50 text-[10px] uppercase font-bold text-slate-400 border-b border-sky-100">
              <tr>
                <th className="px-5 py-3">Nhân viên</th>
                <th className="px-5 py-3">Vai trò</th>
                <th className="px-5 py-3">Giờ bắt đầu</th>
                <th className="px-5 py-3">Giờ kết thúc</th>
                <th className="px-5 py-3 text-right">Bàn giao đầu</th>
                <th className="px-5 py-3 text-right">Kết toán cuối</th>
                <th className="px-5 py-3">Trạng thái</th>
                <th className="px-5 py-3">Ghi chú</th>
                <th className="px-5 py-3 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải thông tin ca làm việc...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-8 text-center text-gray-400 font-medium">
                    Không tìm thấy ca làm việc nào phù hợp.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => {
                  const isActive = !row.end_time;
                  return (
                    <tr key={row.id} className="hover:bg-sky-50/50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-700">{row.employee_name}</td>
                      <td className="px-5 py-4 text-slate-400 font-medium">{row.employee_role}</td>
                      <td className="px-5 py-4 text-slate-500 font-mono">{formatDateTime(row.start_time)}</td>
                      <td className="px-5 py-4 text-slate-500 font-mono">
                        {row.end_time ? formatDateTime(row.end_time) : <span className="text-gray-400 italic">chưa đóng ca</span>}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-600 font-mono">
                        {formatVnd(row.cash_open)}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-slate-600 font-mono">
                        {row.cash_close !== null ? formatVnd(row.cash_close) : <span className="text-gray-400 italic">-</span>}
                      </td>
                      <td className="px-5 py-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <Clock size={10} className="animate-pulse" />
                            Đang mở
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-gray-55 px-2 py-1 text-[10px] font-bold text-slate-500 border border-sky-100">
                            <Lock size={10} />
                            Đã đóng
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400 max-w-xs truncate" title={row.note || ""}>
                        {row.note || <span className="text-gray-300">-</span>}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {isActive ? (
                          <button
                            onClick={() => onCloseShiftClick(row)}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-700 hover:bg-slate-800 px-3 py-1.5 text-[10px] font-bold text-white transition-all shadow-xs cursor-pointer"
                          >
                            <FileText size={10} />
                            Đóng ca
                          </button>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-400">
                            <CheckCircle2 size={12} className="text-gray-400" />
                            Hoàn thành
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
