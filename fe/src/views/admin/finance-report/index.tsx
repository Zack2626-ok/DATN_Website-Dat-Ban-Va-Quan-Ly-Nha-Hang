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
    <div className="space-y-4 font-sans text-[#1A1A1A]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#FFFFFF] p-5 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            Báo cáo tài chính thu / chi
          </h1>
          <p className="text-xs font-semibold text-[#8A8A8A] mt-0.5">
            Tổng hợp dòng tiền thực tế (Thu từ Hóa đơn, Chi từ Nhập kho)
          </p>
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={loading}
          className="px-5 py-2.5 bg-[#3E2016] hover:bg-[#5C2E17] text-[#FFFFFF] text-xs font-black rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0 disabled:opacity-50"
        >
          <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {SUMMARY.map((item) => (
          <div
            key={item.label}
            className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-[#FFFFFF] p-5 shadow-xs transition-shadow hover:shadow-md"
          >
            <span
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${item.accent}`}
            />
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold text-[#8A8A8A]">{item.label}</p>
              <span className={`rounded-full p-2.5 ${item.iconBg}`}>
                <item.icon size={18} />
              </span>
            </div>
            <p className="mt-4 text-2xl font-black tabular-nums text-[#1A1A1A]">
              {formatCurrency(item.value)}
            </p>
          </div>
        ))}
      </div>

      {/* Transactions table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-[#FFFFFF] shadow-xs">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
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
                    className={`border-t border-sky-50 transition-colors hover:bg-sky-50/50 ${
                      idx % 2 === 1 ? "bg-slate-50/40" : ""
                    }`}
                  >
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(row.date).toLocaleString("vi-VN")}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">{row.id}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          row.type === "income"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            row.type === "income" ? "bg-emerald-500" : "bg-rose-500"
                          }`}
                        />
                        {row.type === "income" ? "Thu" : "Chi"}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-slate-700">{row.description}</td>
                    <td
                      className={`px-5 py-3 text-right font-semibold tabular-nums ${
                        row.type === "income" ? "text-emerald-700" : "text-rose-700"
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