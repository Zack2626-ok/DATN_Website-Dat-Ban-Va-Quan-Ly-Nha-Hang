import React from "react";
import { ArrowDownCircle, ArrowUpCircle, DollarSign } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency";

const SUMMARY = [
  { label: "Doanh thu tháng", value: 285000000, icon: ArrowUpCircle, color: "text-green-700 bg-green-100" },
  { label: "Chi phí vận hành", value: 142000000, icon: ArrowDownCircle, color: "text-red-700 bg-red-100" },
  { label: "Lợi nhuận ròng", value: 143000000, icon: DollarSign, color: "text-sky-700 bg-blue-100" },
];

const ROWS = [
  { date: "15/06/2026", type: "Thu", category: "Doanh thu dine-in", amount: 12500000 },
  { date: "15/06/2026", type: "Thu", category: "Doanh thu tiệc", amount: 45000000 },
  { date: "14/06/2026", type: "Chi", category: "Nguyên liệu", amount: 8200000 },
  { date: "14/06/2026", type: "Chi", category: "Lương ca tối", amount: 5600000 },
  { date: "13/06/2026", type: "Thu", category: "Doanh thu dine-in", amount: 9800000 },
];

export const FinanceReport: React.FC = () => (
  <div className="flex flex-col gap-6">
    <div className="border-b border-sky-100 pb-4">
      <h1 className="text-2xl font-bold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Báo cáo tài chính thu / chi</h1>
      <p className="mt-1 text-sm text-slate-500">Tổng hợp dòng tiền theo ngày, tuần và tháng</p>
    </div>

    <div className="grid gap-4 sm:grid-cols-3">
      {SUMMARY.map((item) => (
        <div key={item.label} className="rounded-xl border border-sky-100 bg-white/80 backdrop-blur-xl p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="flex items-start justify-between">
            <p className="text-sm text-slate-500">{item.label}</p>
            <span className={`rounded-lg p-2 ${item.color}`}>
              <item.icon size={18} />
            </span>
          </div>
          <p className="mt-3 text-2xl font-bold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">{formatCurrency(item.value)}</p>
        </div>
      ))}
    </div>

    <div className="overflow-hidden rounded-xl border border-sky-100 bg-white/80 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="border-b border-sky-100 px-5 py-4">
        <h2 className="font-semibold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Chi tiết giao dịch gần đây</h2>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-white/80 backdrop-blur-xl text-xs uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">Ngày</th>
            <th className="px-5 py-3">Loại</th>
            <th className="px-5 py-3">Hạng mục</th>
            <th className="px-5 py-3 text-right">Số tiền</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={`${row.date}-${row.category}`} className="border-t border-sky-50">
              <td className="px-5 py-3 text-slate-600">{row.date}</td>
              <td className="px-5 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    row.type === "Thu" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {row.type}
                </span>
              </td>
              <td className="px-5 py-3 text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">{row.category}</td>
              <td className="px-5 py-3 text-right font-semibold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                {formatCurrency(row.amount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
