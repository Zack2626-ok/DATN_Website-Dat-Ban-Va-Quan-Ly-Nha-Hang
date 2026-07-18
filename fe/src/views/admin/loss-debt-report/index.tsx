import React from "react";
import { AlertTriangle } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency";

const VARIANCE = [
  { ingredient: "Thịt bò Mỹ", expected: 12.5, actual: 11.2, unit: "kg", loss: 10.4 },
  { ingredient: "Tôm sú", expected: 8.0, actual: 7.1, unit: "kg", loss: 11.3 },
  { ingredient: "Rau muống", expected: 15.0, actual: 13.8, unit: "kg", loss: 8.0 },
];

const SUPPLIER_DEBT = [
  { supplier: "Công ty Thực phẩm ABC", due: "20/06/2026", amount: 18500000, status: "Chưa thanh toán" },
  { supplier: "NCC Hải sản Sài Gòn", due: "25/06/2026", amount: 9200000, status: "Quá hạn 2 ngày" },
  { supplier: "Rau củ Đà Lạt Fresh", due: "30/06/2026", amount: 4300000, status: "Chưa thanh toán" },
];

export const LossDebtReport: React.FC = () => (
  <div className="flex flex-col gap-6">
    <div className="border-b border-sky-100 pb-4">
      <h1 className="text-2xl font-bold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Báo cáo hao hụt & công nợ NCC</h1>
      <p className="mt-1 text-sm text-slate-500">
        Chênh lệch kiểm kê kho và công nợ nhà cung cấp — Admin & Bếp trưởng
      </p>
    </div>

    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
      <div className="flex items-center gap-2 font-semibold">
        <AlertTriangle size={16} />
        Cảnh báo: 2 nguyên liệu có hao hụt vượt ngưỡng 10%
      </div>
    </div>

    <div className="overflow-hidden rounded-xl border border-sky-100 bg-white/80 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="border-b border-sky-100 px-5 py-4">
        <h2 className="font-semibold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Báo cáo chênh lệch hao hụt (Variance)</h2>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-white/80 backdrop-blur-xl text-xs uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">Nguyên liệu</th>
            <th className="px-5 py-3 text-right">Định mức</th>
            <th className="px-5 py-3 text-right">Thực tế</th>
            <th className="px-5 py-3 text-right">% Hao hụt</th>
          </tr>
        </thead>
        <tbody>
          {VARIANCE.map((row) => (
            <tr key={row.ingredient} className="border-t border-sky-50">
              <td className="px-5 py-3 font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">{row.ingredient}</td>
              <td className="px-5 py-3 text-right text-slate-600">
                {row.expected} {row.unit}
              </td>
              <td className="px-5 py-3 text-right text-slate-600">
                {row.actual} {row.unit}
              </td>
              <td className="px-5 py-3 text-right">
                <span
                  className={`font-semibold ${row.loss > 10 ? "text-red-700" : "text-amber-700"}`}
                >
                  {row.loss}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>

    <div className="overflow-hidden rounded-xl border border-sky-100 bg-white/80 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
      <div className="border-b border-sky-100 px-5 py-4">
        <h2 className="font-semibold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Công nợ nhà cung cấp</h2>
      </div>
      <table className="w-full text-left text-sm">
        <thead className="bg-white/80 backdrop-blur-xl text-xs uppercase text-slate-500">
          <tr>
            <th className="px-5 py-3">Nhà cung cấp</th>
            <th className="px-5 py-3">Hạn thanh toán</th>
            <th className="px-5 py-3 text-right">Số tiền</th>
            <th className="px-5 py-3">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {SUPPLIER_DEBT.map((row) => (
            <tr key={row.supplier} className="border-t border-sky-50">
              <td className="px-5 py-3 font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">{row.supplier}</td>
              <td className="px-5 py-3 text-slate-600">{row.due}</td>
              <td className="px-5 py-3 text-right font-semibold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                {formatCurrency(row.amount)}
              </td>
              <td className="px-5 py-3">
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                    row.status.includes("Quá hạn")
                      ? "bg-red-100 text-red-800"
                      : "bg-amber-100 text-amber-800"
                  }`}
                >
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);
