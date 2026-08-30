import React, { useEffect, useState } from "react";
import { Search, LogIn, LogOut, CheckCircle, Clock, X } from "lucide-react";
import type { Attendance, ShiftEmployee } from "../../../../interfaces/shift.interface";

interface AttendanceTabProps {
  attendance: Attendance[];
  employees: ShiftEmployee[];
  loading: boolean;
  onClockIn: (employeeId: number, lateReason?: string) => Promise<void>;
  onClockOut: (employeeId: number, earlyReason?: string) => Promise<void>;
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
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());
  const [reasonAction, setReasonAction] = useState<"clock-in" | "clock-out" | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTimestamp(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  // Lọc lịch sử chấm công
  /** Returns one current clock-in record for each employee. */
  const getCurrentAttendance = (): Attendance[] => {
    const currentEmployeeIds = new Set<number>();
    return attendance.filter((record) => {
      if (record.clock_out || currentEmployeeIds.has(record.employee_id)) return false;
      currentEmployeeIds.add(record.employee_id);
      return true;
    });
  };

  const filtered = getCurrentAttendance().filter((a) => {
    // Loại bỏ admin và manager khỏi danh sách hiển thị chấm công
    if (a.employee_role === "manager" || a.employee_role === "admin") return false;
    
    const nameMatch = a.employee_name?.toLowerCase().includes(query.toLowerCase());
    const roleMatch = a.employee_role?.toLowerCase().includes(query.toLowerCase());
    return nameMatch || roleMatch;
  });

  // Tìm bản ghi đang hoạt động (chưa clock-out) của nhân viên đang được chọn ở bộ giả lập
  const activeRecord = selectedEmpId
    ? getCurrentAttendance().find((record) => record.employee_id === selectedEmpId) ?? null
    : null;

  /** Formats the duration of a completed or currently active attendance record. */
  const calculateHours = (inStr: string, outStr: string | null): string => {
    try {
      const inDate = new Date(inStr);
      const endTimestamp = outStr ? new Date(outStr).getTime() : currentTimestamp;
      const durationSeconds = Math.floor((endTimestamp - inDate.getTime()) / 1000);
      if (Number.isNaN(durationSeconds) || durationSeconds < 0) return "00:00:00";

      const hours = Math.floor(durationSeconds / 3600);
      const minutes = Math.floor((durationSeconds % 3600) / 60);
      const seconds = durationSeconds % 60;
      return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
    } catch {
      return "00:00:00";
    }
  };

  const formatDateTime = (dtStr: string) => {
    if (!dtStr) return "";
    try {
      const date = new Date(dtStr);
      if (isNaN(date.getTime())) return dtStr.replace("T", " ");
      const hh = String(date.getHours()).padStart(2, "0");
      const mm = String(date.getMinutes()).padStart(2, "0");
      const ss = String(date.getSeconds()).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const y = date.getFullYear();
      return `${hh}:${mm}:${ss} ${d}/${m}/${y}`;
    } catch {
      return dtStr.replace("T", " ");
    }
  };

  /** Identifies a server response that requires a discipline explanation. */
  const requiresReason = (error: unknown): boolean => {
    if (typeof error !== "object" || error === null || !("response" in error)) return false;
    const response = error.response;
    if (typeof response !== "object" || response === null || !("data" in response)) return false;
    const data = response.data;
    if (typeof data !== "object" || data === null || !("code" in data)) return false;
    return data.code === "LATE_REASON_REQUIRED" || data.code === "EARLY_REASON_REQUIRED";
  };

  /** Attempts a terminal action and opens the explanation dialog only when policy requires it. */
  const handleAttendanceAction = async (action: "clock-in" | "clock-out", explanation?: string): Promise<void> => {
    if (!selectedEmpId) return;
    try {
      if (action === "clock-in") await onClockIn(Number(selectedEmpId), explanation);
      else await onClockOut(Number(selectedEmpId), explanation);
      setReasonAction(null);
      setReason("");
    } catch (error) {
      if (requiresReason(error) && !explanation?.trim()) setReasonAction(action);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Cột Trái: Nhân viên đang chấm công */}
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white p-4 rounded-xl border border-gray-150 shadow-xs flex items-center">
          <div className="relative w-full">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm nhân viên đang chấm công..."
              className="w-full rounded-lg border border-sky-100 py-2 pl-10 pr-3 text-xs focus:border-sky-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-hidden rounded-xl border border-sky-100 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-sky-50/50 text-[10px] uppercase font-bold text-slate-400 border-b border-sky-100">
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
                        <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
                        <span>Đang tải danh sách chấm công...</span>
                      </div>
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-5 py-8 text-center text-gray-400 font-medium">
                      Chưa có nhân viên nào đang chấm công.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-sky-50/50/50 transition-colors">
                      <td className="px-5 py-4 font-bold text-slate-700">{row.employee_name}</td>
                      <td className="px-5 py-4 text-slate-400 font-medium">{row.employee_role}</td>
                      <td className="px-5 py-4 text-slate-500 font-mono">{formatDateTime(row.clock_in)}</td>
                      <td className="px-5 py-4 text-slate-500 font-mono">
                        {row.clock_out ? (
                          formatDateTime(row.clock_out)
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-600 border border-orange-200 font-sans">
                            Đang làm việc
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right font-bold text-slate-600 font-mono">
                        {row.clock_out ? (
                          calculateHours(row.clock_in, row.clock_out)
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[9px] font-bold text-orange-600 border border-orange-200 font-sans">
                            Đang làm việc
                          </span>
                        )}
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
            <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
              ⚙️ Giả lập chấm công nhân sự
            </h4>
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              Khu vực giả lập máy chấm công (vân tay/nhận diện khuôn mặt) của nhà hàng. Chọn nhân viên để thực hiện giả lập ghi nhận check-in/out.
            </p>
          </div>

          <hr className="border-sky-50" />

          <div>
            <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase">Chọn nhân viên giả lập *</label>
            <select
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value === "" ? "" : Number(e.target.value))}
              className="w-full rounded-lg border border-sky-100 px-3 py-2 text-xs focus:border-sky-500 focus:outline-none bg-white"
            >
              <option value="">-- Chọn nhân sự --</option>
              {employees
                .filter((emp) => emp.role_name !== "manager" && emp.role_name !== "admin")
                .map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.full_name} ({emp.role_name})
                  </option>
                ))}
            </select>
          </div>

          {selectedEmpId && (
            <div className="p-3.5 rounded-lg bg-sky-50/50 border border-sky-50 text-[11px] space-y-1.5 text-slate-500 animate-fade-in">
              <span className="font-bold text-slate-600 block mb-1">Trạng thái hiện tại trên máy:</span>
              {activeRecord ? (
                <div className="flex items-center gap-1.5 text-orange-600 font-bold">
                  <Clock size={12} className="animate-spin-slow" />
                  Đang làm việc (Check-in từ {formatDateTime(activeRecord.clock_in)})
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-slate-400 font-semibold">
                  <CheckCircle size={12} className="text-gray-400" />
                  Đang nghỉ ca (Sẵn sàng Check-in)
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={() => void handleAttendanceAction("clock-in")}
              disabled={actionLoading || !selectedEmpId || !!activeRecord}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <LogIn size={13} />
              Clock In
            </button>
            <button
              onClick={() => void handleAttendanceAction("clock-out")}
              disabled={actionLoading || !selectedEmpId || !activeRecord}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white py-2.5 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              <LogOut size={13} />
              Clock Out
            </button>
          </div>
        </div>
      </div>
      {reasonAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <div role="dialog" aria-modal="true" aria-labelledby="attendance-reason-title" className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 id="attendance-reason-title" className="text-base font-black text-slate-800">Giải trình {reasonAction === "clock-in" ? "đi muộn" : "về sớm"}</h3>
                <p className="mt-1 text-xs text-slate-500">Theo quy định ca làm, vui lòng nhập lý do trước khi xác nhận.</p>
              </div>
              <button type="button" onClick={() => { setReasonAction(null); setReason(""); }} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Đóng"><X size={18} /></button>
            </div>
            <textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Nhập lý do..." className="mt-4 min-h-24 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-sky-500" />
            <button type="button" disabled={!reason.trim() || actionLoading} onClick={() => void handleAttendanceAction(reasonAction, reason.trim())} className="mt-3 w-full rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">Xác nhận chấm công</button>
          </div>
        </div>
      )}
    </div>
  );
};
