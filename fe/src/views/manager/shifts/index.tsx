import React, { useState } from "react";
import { Clock, Plus, Search } from "lucide-react";

interface ShiftRow {
  id: string;
  name: string;
  role: string;
  shift: string;
  clockIn: string;
  clockOut: string;
  hours: number;
}

const SHIFTS: ShiftRow[] = [
  { id: "1", name: "Nguyễn Văn A", role: "Phục vụ", shift: "Ca sáng", clockIn: "06:00", clockOut: "14:00", hours: 8 },
  { id: "2", name: "Trần Thị B", role: "Thu ngân", shift: "Ca sáng", clockIn: "07:00", clockOut: "15:00", hours: 8 },
  { id: "3", name: "Lê Văn C", role: "Bếp", shift: "Ca tối", clockIn: "14:00", clockOut: "22:00", hours: 8 },
  { id: "4", name: "Phạm Thị D", role: "Phục vụ", shift: "Ca tối", clockIn: "14:30", clockOut: "22:30", hours: 8 },
];

export const ShiftManagement: React.FC = () => {
  const [query, setQuery] = useState("");

  const filtered = SHIFTS.filter(
    (s) =>
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.role.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col justify-between gap-4 border-b border-gray-200 pb-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-700">Quản lý ca làm việc</h1>
          <p className="mt-1 text-sm text-gray-500">Xếp ca và theo dõi chấm công nhân viên trong ca</p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
        >
          <Plus size={16} />
          Thêm ca mới
        </button>
      </div>

      <div className="relative max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm nhân viên..."
          className="w-full rounded-lg border border-gray-200 py-2 pl-10 pr-3 text-sm focus:border-blue-700 focus:outline-none"
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-5 py-3">Nhân viên</th>
              <th className="px-5 py-3">Vai trò</th>
              <th className="px-5 py-3">Ca</th>
              <th className="px-5 py-3">Clock-in</th>
              <th className="px-5 py-3">Clock-out</th>
              <th className="px-5 py-3 text-right">Tổng giờ</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="px-5 py-3 font-medium text-gray-700">{row.name}</td>
                <td className="px-5 py-3 text-gray-600">{row.role}</td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800">
                    <Clock size={12} />
                    {row.shift}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-600">{row.clockIn}</td>
                <td className="px-5 py-3 text-gray-600">{row.clockOut}</td>
                <td className="px-5 py-3 text-right font-semibold text-gray-700">{row.hours}h</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
