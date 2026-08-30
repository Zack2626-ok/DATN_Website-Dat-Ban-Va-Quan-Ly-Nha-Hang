import React, { useEffect, useMemo, useState } from "react";
import { CalendarDays, Search } from "lucide-react";
import type { Attendance } from "../../../../interfaces/shift.interface";

interface AttendanceHistoryTabProps {
  attendance: Attendance[];
  loading: boolean;
}

/** Displays one row for every historical attendance record. */
export const AttendanceHistoryTab: React.FC<AttendanceHistoryTabProps> = ({ attendance, loading }) => {
  const [query, setQuery] = useState("");
  const [currentTimestamp, setCurrentTimestamp] = useState(() => Date.now());

  useEffect(() => {
    const timerId = window.setInterval(() => setCurrentTimestamp(Date.now()), 1000);
    return () => window.clearInterval(timerId);
  }, []);

  const filteredAttendance = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return attendance.filter((record) => {
      // Loại bỏ admin và manager khỏi lịch sử làm việc
      if (record.employee_role === "manager" || record.employee_role === "admin") return false;

      if (!record.clock_out) return false;
      if (!normalizedQuery) return true;
      return record.employee_name?.toLowerCase().includes(normalizedQuery)
        || record.employee_role?.toLowerCase().includes(normalizedQuery)
        || record.clock_in.slice(0, 10).includes(normalizedQuery);
    });
  }, [attendance, query]);

  /** Formats a timestamp into separate date and time values for the attendance table. */
  const formatDateTime = (timestamp: string): { date: string; time: string } => {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) {
      const [datePart = timestamp, timePart = ""] = timestamp.replace("T", " ").split(" ");
      return { date: datePart, time: timePart.slice(0, 8) };
    }
    return {
      date: new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(date),
      time: new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }).format(date),
    };
  };

  /** Calculates the elapsed working time for completed and active records. */
  const formatDuration = (clockIn: string, clockOut: string | null): string => {
    const startedAt = new Date(clockIn).getTime();
    const endedAt = clockOut ? new Date(clockOut).getTime() : currentTimestamp;
    const totalSeconds = Math.max(0, Math.floor((endedAt - startedAt) / 1000));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds].map((value) => String(value).padStart(2, "0")).join(":");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-gray-150 bg-white p-4 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <CalendarDays size={17} className="text-[#3E2016]" />
          Lịch sử làm việc theo ngày
        </div>
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Tìm tên, vai trò hoặc ngày..."
            className="w-full rounded-lg border border-sky-100 py-2 pl-10 pr-3 text-xs focus:border-sky-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-sky-100 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="border-b border-sky-100 bg-sky-50/50 text-[10px] font-bold uppercase text-slate-400">
              <tr>
                <th className="px-5 py-3">Ngày</th>
                <th className="px-5 py-3">Nhân viên</th>
                <th className="px-5 py-3">Vai trò</th>
                <th className="px-5 py-3">Giờ vào</th>
                <th className="px-5 py-3">Giờ ra</th>
                <th className="px-5 py-3 text-right">Tổng giờ làm</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={6} className="px-5 py-10 text-center text-gray-400">Đang tải lịch sử làm việc...</td></tr>
              ) : filteredAttendance.length === 0 ? (
                <tr><td colSpan={6} className="px-5 py-8 text-center font-medium text-gray-400">Chưa có lịch sử làm việc phù hợp.</td></tr>
              ) : filteredAttendance.map((record) => (
                <tr key={record.id} className="transition-colors hover:bg-sky-50/50">
                  <td className="px-5 py-4 font-mono text-slate-500">{formatDateTime(record.clock_in).date}</td>
                  <td className="px-5 py-4 font-bold text-slate-700">{record.employee_name}</td>
                  <td className="px-5 py-4 font-medium text-slate-400">{record.employee_role}</td>
                  <td className="px-5 py-4 font-mono text-slate-500">{formatDateTime(record.clock_in).time}</td>
                  <td className="px-5 py-4 font-mono text-slate-500">
                    {record.clock_out ? formatDateTime(record.clock_out).time : <span className="font-sans text-orange-600">Đang làm việc</span>}
                  </td>
                  <td className="px-5 py-4 text-right font-mono font-bold text-slate-600">
                    {record.clock_out ? (
                      formatDuration(record.clock_in, record.clock_out)
                    ) : (
                      <span className="font-sans text-orange-600">Đang làm việc</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
