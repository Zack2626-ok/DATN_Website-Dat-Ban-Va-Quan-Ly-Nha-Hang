import React, { useState, useEffect } from "react";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, RefreshCw, Inbox, Loader2 } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";

export const FinanceReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    summary: { totalIncome: 0, totalExpenses: 0, netProfit: 0 },
    recentTransactions: []
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/v1/analytics/finance-report");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error("Lỗi lấy báo cáo tài chính:", error);
      toast.error("Không thể tải báo cáo tài chính.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const SUMMARY = [
    {
      label: "Doanh thu",
      value: data.summary.totalIncome,
      icon: ArrowUpCircle,
      accent: "from-emerald-500 to-emerald-400",
      iconBg: "bg-emerald-50 text-emerald-600",
      ring: "ring-emerald-100",
    },
    {
      label: "Chi phí vận hành",
      value: data.summary.totalExpenses,
      icon: ArrowDownCircle,
      accent: "from-rose-500 to-rose-400",
      iconBg: "bg-rose-50 text-rose-600",
      ring: "ring-rose-100",
    },
    {
      label: "Lợi nhuận ròng",
      value: data.summary.netProfit,
      icon: DollarSign,
      accent: "from-sky-600 to-sky-400",
      iconBg: "bg-sky-50 text-sky-700",
      ring: "ring-sky-100",
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-sky-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-sky-500">
            Tổng quan tài chính
          </p>
          <h1 className="font-playfair text-2xl font-bold text-sky-800">
            Báo cáo tài chính thu / chi
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Tổng hợp dòng tiền thực tế (Thu từ Hóa đơn, Chi từ Nhập kho)
          </p>
        </div>
        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 self-start rounded-lg border border-sky-100 bg-white px-4 py-2 text-sm font-medium text-sky-700 shadow-sm transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60 sm:self-auto"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {SUMMARY.map((item) => (
          <div
            key={item.label}
            className="group relative overflow-hidden rounded-2xl border border-sky-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <span
              className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${item.accent}`}
            />
            <div className="flex items-start justify-between">
              <p className="text-sm font-medium text-slate-500">{item.label}</p>
              <span className={`rounded-xl p-2.5 ring-4 ${item.iconBg} ${item.ring}`}>
                <item.icon size={18} />
              </span>
            </div>
            <p className="mt-4 font-playfair text-2xl font-bold tabular-nums text-sky-800">
              {formatCurrency(item.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Transactions table */}
      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-sky-100 px-5 py-4">
          <h2 className="font-playfair text-base font-semibold text-sky-800">
            Chi tiết giao dịch gần đây
          </h2>
          {!loading && data.recentTransactions.length > 0 && (
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-600">
              {data.recentTransactions.length} giao dịch
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-sky-50/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Ngày</th>
                <th className="px-5 py-3 font-semibold">Mã GD</th>
                <th className="px-5 py-3 font-semibold">Loại</th>
                <th className="px-5 py-3 font-semibold">Hạng mục</th>
                <th className="px-5 py-3 text-right font-semibold">Số tiền</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={22} className="animate-spin text-sky-400" />
                      <span className="text-sm">Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : data.recentTransactions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox size={26} className="text-slate-300" />
                      <span className="text-sm">Chưa có giao dịch nào</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.recentTransactions.map((row: any, idx: number) => (
                  <tr
                    key={`${row.id}-${row.date}`}
                    className={`border-t border-sky-50 transition-colors hover:bg-sky-50/50 ${idx % 2 === 1 ? "bg-slate-50/40" : ""
                      }`}
                  >
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(row.date).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{row.id}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${row.type === "income"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                          }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${row.type === "income" ? "bg-emerald-500" : "bg-rose-500"
                            }`}
                        />
                        {row.type === "income" ? "Thu" : "Chi"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{row.description}</td>
                    <td
                      className={`px-5 py-3 text-right font-semibold tabular-nums ${row.type === "income" ? "text-emerald-700" : "text-rose-700"
                        }`}
                    >
                      {row.type === "income" ? "+" : "-"}
                      {formatCurrency(Number(row.amount))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};