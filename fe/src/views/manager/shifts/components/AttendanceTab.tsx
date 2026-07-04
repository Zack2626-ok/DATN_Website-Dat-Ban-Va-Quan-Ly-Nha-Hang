import React, { useState, useMemo } from "react";
import { Search, LogIn, LogOut, CheckCircle, Clock } from "lucide-react";
import type { Attendance, ShiftEmployee } from "../../../../interfaces/shift.interface";

interface AttendanceTabProps {
  attendance: Attendance[];
  employees: ShiftEmployee[];
  loading: boolean;
  onClockIn: (employeeId: number) => void;
  onClockOut: (employeeId: number) => void;
  actionLoading?: boolean;
}

export const AttendanceTab: React.FC<AttendanceTabProps> = ({
  attendance,
  employees,
  loading,
  onClockIn,
  onClockOut,
  actionLoading = false,
}) => {
  const [query, setQuery] = useState("");
  const [selectedEmpId, setSelectedEmpId] = useState<number | "">("");

  // Lọc lịch sử chấm công
  const filtered = attendance.filter((a) => {
    const nameMatch = a.employee_name?.toLowerCase().includes(query.toLowerCase());
    const roleMatch = a.employee_role?.toLowerCase().includes(query.toLowerCase());
    return nameMatch || roleMatch;
  });

  // Tìm bản ghi đang hoạt động (chưa clock-out) của nhân viên đang được chọn ở bộ giả lập
  const activeRecord = useMemo(() => {
    if (!selectedEmpId) return null;
    return attendance.find((a) => a.employee_id === selectedEmpId && a.clock_out === null) || null;
  }, [selectedEmpId, attendance]);

  const calculateHours = (inStr: string, outStr: string | null): string => {
    if (!outStr) return "-";
    try {
      const inDate = new Date(inStr);
      const outDate = new Date(outStr);
      const diffMs = outDate.getTime() - inDate.getTime();
      if (isNaN(diffMs) || diffMs < 0) return "0.0h";
      const hours = diffMs / (1000 * 60 * 60);
      return hours.toFixed(1) + "h";
    } catch {
      return "-";
    }
  };

  const formatDateTime = (dtStr: string) => {
    return dtStr.replace("T", " ");
  };

  const handleSimulateClockIn = () => {
    if (selectedEmpId) {
      onClockIn(Number(selectedEmpId));
    }
  };

  const handleSimulateClockOut = () => {
    if (selectedEmpId) {
      onClockOut(Number(selectedEmpId));
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Cột Trái: Bảng Lịch sử Chấm Công */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs flex items-center">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm lịch sử theo tên hoặc vai trò..."
              className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-xs focus:border-[#FF5A5F] focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-gray-50 text-[10px] uppercase font-bold text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-5 py-3">Nhân viên</th>
                  <th className="px-5 py-3">Vai trò</th>
                  <th className="px-5 py-3">Giờ vào (Clock-in)</th>
                  <th className="px-5 py-3">Giờ ra (Clock-out)</th>
                  <th className="px-5 py-3 text-right">Tổng giờ làm</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-10 text-center text-gray-400">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="w-6 h-6 border-2 border-[#FF5A5F] border-t-transparent rounded-full animate-spin" />
                        <span>Đang tải lịch sử chấm công...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gray-400 font-medium">
                      Không tìm thấy bản ghi chấm công nào.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-gray-800">{row.employee_name}</td>
                      <td className="px-5 py-4 text-gray-500 font-medium">{row.employee_role}</td>
                      <td className="px-5 py-4 text-gray-600 font-mono">{formatDateTime(row.clock_in)}</td>
                      <td className="px-5 py-4 text-gray-600 font-mono">
                        {row.clock_out ? (
                          formatDateTime(row.clock_out)
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-600 border border-orange-200 font-sans">
                            Đang làm việc
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-gray-700 font-mono">
                        {calculateHours(row.clock_in, row.clock_out)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Cột Phải: Giả lập Chấm Công (Simulation) */}
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-xl border border-gray-150 shadow-xs space-y-4">
          <div>
            <h4 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              ⚙️ Giả lập chấm công nhân sự
            </h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Khu vực giả lập máy chấm công (vân tay/nhận diện khuôn mặt) của nhà hàng. Chọn nhân viên để thực hiện giả lập ghi nhận check-in/out.
            </p>
          </div>

          <hr className="border-gray-100" />

          <div>
            <label className="block text-[10px] font-bold text-gray-500 mb-1.5 uppercase">Chọn nhân viên giả lập *</label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-xs focus:border-[#FF5A5F] focus:outline-none bg-white"
            >
              <option value="">-- Chọn nhân sự --</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.full_name} ({emp.role_name})
                </option>
              ))}
            </select>
          </div>

          {selectedEmpId && (
            <div className="p-3.5 rounded-lg bg-gray-50 border border-gray-100 text-[11px] space-y-1.5 text-gray-600 animate-fade-in">
              <span className="font-bold text-gray-700 block mb-1">Trạng thái hiện tại trên máy:</span>
              {activeRecord ? (
                <div className="flex items-center gap-1.5 text-orange-600 font-bold">
                  <Clock size={12} className="animate-spin-slow" />
                  Đang làm việc (Check-in từ {formatDateTime(activeRecord.clock_in)})
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-gray-500 font-semibold">
                  <CheckCircle size={12} className="text-gray-400" />
                  Đang nghỉ ca (Sẵn sàng Check-in)
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleSimulateClockIn}
              disabled={actionLoading || !selectedEmpId || !!activeRecord}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <LogIn size={13} />
              Clock In
            </button>
            <button
              onClick={handleSimulateClockOut}
              disabled={actionLoading || !selectedEmpId || !activeRecord}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white py-2.5 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <LogOut size={13} />
              Clock Out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
