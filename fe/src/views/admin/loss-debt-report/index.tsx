import React, { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";

export const LossDebtReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    variances: [],
    supplierDebts: []
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/v1/analytics/loss-debt");
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error("Lỗi lấy báo cáo hao hụt công nợ:", error);
      toast.error("Không thể tải báo cáo.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter high variances (difference > 10% between expected and actual)
  const highVarianceCount = data.variances.filter((row: any) => {
    if (row.expected === 0) return false;
    return Math.abs(row.variance) / row.expected > 0.1;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="border-b border-sky-100 pb-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Báo cáo hao hụt & công nợ NCC</h1>
          <p className="mt-1 text-sm text-slate-500">
            Chênh lệch kiểm kê kho và công nợ nhà cung cấp — Admin & Bếp trưởng
          </p>
        </div>
        <button 
          onClick={fetchData}
          disabled={loading}
          className="p-2 bg-white border border-sky-100 text-sky-600 rounded-lg shadow-sm hover:bg-sky-50 transition-colors"
        >
          <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {highVarianceCount > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <div className="flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} />
            Cảnh báo: {highVarianceCount} nguyên liệu có hao hụt vượt ngưỡng 10%
          </div>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-sky-100 bg-white/80 backdrop-blur-xl shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="border-b border-sky-100 px-5 py-4">
          <h2 className="font-semibold text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">Báo cáo chênh lệch hao hụt (Variance)</h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-white/80 backdrop-blur-xl text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Nguyên liệu</th>
              <th className="px-5 py-3 text-right">Lý thuyết</th>
              <th className="px-5 py-3 text-right">Thực tế</th>
              <th className="px-5 py-3 text-right">Độ lệch (Variance)</th>
              <th className="px-5 py-3 text-right">% Hao hụt</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="text-center py-6 text-slate-400">Đang tải dữ liệu...</td></tr>
            ) : data.variances.length === 0 ? (
              <tr><td colSpan={5} className="text-center py-6 text-slate-400">Chưa có dữ liệu hao hụt</td></tr>
            ) : (
              data.variances.map((row: any) => {
                const lossPercent = row.expected > 0 ? (Math.abs(row.variance) / row.expected) * 100 : 0;
                return (
                  <tr key={row.id} className="border-t border-sky-50">
                    <td className="px-5 py-3 font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">{row.ingredientName}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{row.expected}</td>
                    <td className="px-5 py-3 text-right text-slate-600">{row.actual}</td>
                    <td className="px-5 py-3 text-right text-slate-600 font-semibold">{row.variance}</td>
                    <td className="px-5 py-3 text-right">
                      <span className={`font-semibold ${lossPercent > 10 ? "text-red-700" : "text-amber-700"}`}>
                        {lossPercent.toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
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
              <th className="px-5 py-3 text-right">Số tiền nợ</th>
              <th className="px-5 py-3">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} className="text-center py-6 text-slate-400">Đang tải dữ liệu...</td></tr>
            ) : data.supplierDebts.length === 0 ? (
              <tr><td colSpan={4} className="text-center py-6 text-slate-400">Không có công nợ</td></tr>
            ) : (
              data.supplierDebts.map((row: any) => (
                <tr key={row.id} className="border-t border-sky-50">
                  <td className="px-5 py-3 font-medium text-sky-700 font-playfair drop-shadow-[0_4px_20px_rgba(0,0,0,0.3)]">{row.supplierName}</td>
                  <td className="px-5 py-3 text-slate-600">{new Date(row.due).toLocaleDateString('vi-VN')}</td>
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
