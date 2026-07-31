import React, { useState, useEffect } from "react";
import { AlertTriangle, RefreshCw, Wallet, ShieldAlert, Users, ClipboardCheck, Inbox, Loader2 } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { KpiCard } from "./kpicard";
import { PayDebtModal } from "./Paydebtmodal";
import { StockCheckModal } from "./Stockcheckmodal";

export const LossDebtReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    variances: [],
    supplierDebts: [],
    summary: { totalDebt: 0, overdueDebt: 0, supplierCount: 0, overdueCount: 0 },
  });

  const [payModal, setPayModal] = useState<{ open: boolean; supplier: any | null }>({
    open: false,
    supplier: null,
  });
  const [checkModalOpen, setCheckModalOpen] = useState(false);

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

  const getVarianceColor = (pct: number) => {
    if (pct === 0) return "text-emerald-600";
    if (pct <= 2) return "text-amber-600";
    if (pct <= 5) return "text-orange-600";
    return "text-rose-700 font-bold";
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-sky-100 pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-sky-500">
            Kiểm soát kho & công nợ
          </p>
          <h1 className="font-playfair text-2xl font-bold text-sky-800">
            Báo cáo hao hụt & công nợ NCC
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Chênh lệch kiểm kê kho và công nợ nhà cung cấp — Admin & Bếp trưởng
          </p>
        </div>
        <div className="flex gap-2 self-start sm:self-auto">
          <button
            onClick={() => setCheckModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-sky-700"
          >
            <ClipboardCheck size={16} />
            Kiểm kê kho hôm nay
          </button>
          <button
            onClick={fetchData}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-sky-100 bg-white px-3 py-2 text-sm font-medium text-sky-700 shadow-sm transition-colors hover:bg-sky-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tổng công nợ" value={formatCurrency(data.summary.totalDebt)} icon={Wallet} color="blue" />
        <KpiCard label="Nợ quá hạn" value={formatCurrency(data.summary.overdueDebt)} icon={ShieldAlert} color="red" />
        <KpiCard label="NCC đang nợ" value={`${data.summary.supplierCount} NCC`} icon={Users} color="amber" />
        <KpiCard label="NCC quá hạn" value={`${data.summary.overdueCount} NCC`} icon={AlertTriangle} color="red" />
      </div>

      {highVarianceCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
          <AlertTriangle size={16} />
          Cảnh báo: {highVarianceCount} nguyên liệu có hao hụt vượt ngưỡng 10%
        </div>
      )}

      {/* Variance table */}
      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <div className="border-b border-sky-100 px-5 py-4">
          <h2 className="font-playfair text-base font-semibold text-sky-800">
            Báo cáo chênh lệch hao hụt (Variance)
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-sky-50/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Nguyên liệu</th>
                <th className="px-5 py-3 font-semibold">Đơn vị</th>
                <th className="px-5 py-3 text-right font-semibold">Lý thuyết</th>
                <th className="px-5 py-3 text-right font-semibold">Thực tế</th>
                <th className="px-5 py-3 text-right font-semibold">Độ lệch</th>
                <th className="px-5 py-3 text-right font-semibold">% Hao hụt</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={22} className="animate-spin text-sky-400" />
                      <span className="text-sm">Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : data.variances.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox size={26} className="text-slate-300" />
                      <span className="text-sm">Chưa có dữ liệu hao hụt</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.variances.map((row: any, idx: number) => {
                  const lossPercent = row.expected > 0 ? (Math.abs(row.variance) / row.expected) * 100 : 0;
                  return (
                    <tr
                      key={row.id}
                      className={`border-t border-sky-50 transition-colors hover:bg-sky-50/50 ${
                        idx % 2 === 1 ? "bg-slate-50/40" : ""
                      }`}
                    >
                      <td className="px-5 py-3 font-medium text-sky-800">{row.ingredientName}</td>
                      <td className="px-5 py-3 text-slate-500">{row.unit}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-600">{row.expected}</td>
                      <td className="px-5 py-3 text-right tabular-nums text-slate-600">{row.actual}</td>
                      <td className="px-5 py-3 text-right tabular-nums font-semibold text-slate-700">
                        {row.variance > 0 ? "+" : ""}
                        {row.variance}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <span className={`font-semibold tabular-nums ${getVarianceColor(lossPercent)}`}>
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
      </div>

      {/* Supplier debt table */}
      <div className="overflow-hidden rounded-2xl border border-sky-100 bg-white shadow-sm">
        <div className="border-b border-sky-100 px-5 py-4">
          <h2 className="font-playfair text-base font-semibold text-sky-800">Công nợ nhà cung cấp</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-sky-50/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-semibold">Nhà cung cấp</th>
                <th className="px-5 py-3 font-semibold">Hạn thanh toán</th>
                <th className="px-5 py-3 text-right font-semibold">Số tiền nợ</th>
                <th className="px-5 py-3 font-semibold">Trạng thái</th>
                <th className="px-5 py-3 text-right font-semibold">Thao tác</th>
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
              ) : data.supplierDebts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox size={26} className="text-slate-300" />
                      <span className="text-sm">Không có công nợ</span>
                    </div>
                  </td>
                </tr>
              ) : (
                data.supplierDebts.map((row: any, idx: number) => (
                  <tr
                    key={row.id}
                    className={`border-t border-sky-50 transition-colors hover:bg-sky-50/50 ${
                      idx % 2 === 1 ? "bg-slate-50/40" : ""
                    }`}
                  >
                    <td className="px-5 py-3 font-medium text-sky-800">{row.supplierName}</td>
                    <td className="px-5 py-3 text-slate-600">
                      {new Date(row.due).toLocaleDateString("vi-VN")}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold tabular-nums text-sky-800">
                      {formatCurrency(row.amount)}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          row.status === "Quá hạn"
                            ? "bg-rose-50 text-rose-700"
                            : row.status === "Sắp đến hạn"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            row.status === "Quá hạn"
                              ? "bg-rose-500"
                              : row.status === "Sắp đến hạn"
                              ? "bg-amber-500"
                              : "bg-slate-400"
                          }`}
                        />
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => setPayModal({ open: true, supplier: row })}
                        className="rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-sky-700"
                      >
                        Thanh toán
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {payModal.open && payModal.supplier && (
        <PayDebtModal
          supplier={payModal.supplier}
          onClose={() => setPayModal({ open: false, supplier: null })}
          onSuccess={() => {
            setPayModal({ open: false, supplier: null });
            fetchData();
          }}
        />
      )}

      {checkModalOpen && (
        <StockCheckModal
          onClose={() => setCheckModalOpen(false)}
          onSuccess={() => {
            setCheckModalOpen(false);
            fetchData();
          }}
        />
      )}
    </div>
  );
};