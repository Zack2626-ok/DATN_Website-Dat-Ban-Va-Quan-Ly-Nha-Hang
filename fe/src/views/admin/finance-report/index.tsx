import React, { useState, useEffect } from "react";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, RefreshCw } from "lucide-react";
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
    { label: "Doanh thu", value: data.summary.totalIncome, icon: ArrowUpCircle, color: "text-green-700 bg-green-100" },
    { label: "Chi phí vận hành", value: data.summary.totalExpenses, icon: ArrowDownCircle, color: "text-red-700 bg-red-100" },
    { label: "Lợi nhuận ròng", value: data.summary.netProfit, icon: DollarSign, color: "text-sky-700 bg-blue-100" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-sky-100 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Báo cáo tài chính thu / chi</h1>
          <p className="mt-1 text-sm text-slate-500">Tổng hợp dòng tiền thực tế (Thu từ Hóa đơn, Chi từ Nhập kho)</p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="p-2 bg-white border border-sky-100 text-sky-600 rounded-lg shadow-sm hover:bg-sky-50 transition-colors"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
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
              <th className="px-5 py-3">Mã GD</th>
              <th className="px-5 py-3">Loại</th>
              <th className="px-5 py-3">Hạng mục</th>
              <th className="px-5 py-3 text-right">Số tiền</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">Đang tải dữ liệu...</td>
              </tr>
            ) : data.recentTransactions.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-slate-400">Chưa có giao dịch nào</td>
              </tr>
            ) : (
              data.recentTransactions.map((row: any) => (
                <tr key={`${row.id}-${row.date}`} className="border-t border-sky-50">
                  <td className="px-5 py-3 text-slate-600">{new Date(row.date).toLocaleString('vi-VN')}</td>
                  <td className="px-5 py-3 text-slate-500 font-mono text-xs">{row.id}</td>
                  <td className="px-5 py-3">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        row.type === "income" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {row.type === "income" ? "Thu" : "Chi"}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">{row.description}</td>
                  <td className="px-5 py-3 text-right font-semibold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
                    {formatCurrency(Number(row.amount))}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
