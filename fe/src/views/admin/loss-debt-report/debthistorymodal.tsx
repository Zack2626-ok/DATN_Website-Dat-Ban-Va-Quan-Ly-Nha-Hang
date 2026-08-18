import React, { useState, useEffect } from "react";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../../utils/formatCurrency";
import { X, History, Wallet, Building2, Calendar, User, ReceiptText, Loader2, Inbox } from "lucide-react";

interface Props {
  supplier: { rawId: number; supplierName: string } | null;
  onClose: () => void;
}

export const DebtHistoryModal: React.FC<Props> = ({ supplier, onClose }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        if (supplier?.rawId) {
          const res = await api.get(`/v1/inventory/suppliers/${supplier.rawId}/debt-history`);
          if (res.data.success) {
            setHistory(res.data.data);
          }
        }
      } catch (err) {
        console.error("Lỗi lấy lịch sử thanh toán nợ:", err);
        toast.error("Không thể tải lịch sử thanh toán.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [supplier]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-2xl rounded-3xl bg-white p-7 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 shadow-inner">
              <History size={22} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-800">
                Lịch sử thanh toán công nợ
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                {supplier ? `Nhà cung cấp: ${supplier.supplierName}` : "Tất cả các giao dịch thanh toán công nợ"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="flex flex-col items-center gap-2">
                <Loader2 size={24} className="animate-spin text-sky-500" />
                <span className="text-sm font-semibold">Đang tải lịch sử thanh toán...</span>
              </div>
            </div>
          ) : history.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              <div className="flex flex-col items-center gap-2">
                <Inbox size={32} className="text-slate-300" />
                <span className="text-sm font-bold text-slate-600">Chưa có lịch sử thanh toán</span>
                <span className="text-xs text-slate-400">Chưa có giao dịch trả nợ nào được ghi nhận cho nhà cung cấp này.</span>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 shadow-xs">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200/80">
                  <tr>
                    <th className="px-4 py-3">Mã / Thời gian</th>
                    <th className="px-4 py-3 text-right">Số tiền đã trả</th>
                    <th className="px-4 py-3">Hình thức</th>
                    <th className="px-4 py-3">Ghi chú</th>
                    <th className="px-4 py-3">Người thực hiện</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {history.map((row) => (
                    <tr key={row.id} className="hover:bg-sky-50/40 transition-colors">
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5 text-slate-900 font-bold">
                          <ReceiptText size={13} className="text-sky-600 shrink-0" />
                          <span>PC-NCC-{row.id}</span>
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5 flex items-center gap-1">
                          <Calendar size={10} />
                          {new Date(row.paid_at || row.paidAt).toLocaleString("vi-VN")}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-800 text-sm tabular-nums">
                        {formatCurrency(Number(row.amount))}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          row.method === "cash"
                            ? "bg-amber-50 text-amber-700 border border-amber-200/60"
                            : "bg-sky-50 text-sky-700 border border-sky-200/60"
                        }`}>
                          {row.method === "cash" ? (
                            <Wallet size={11} className="text-amber-600" />
                          ) : (
                            <Building2 size={11} className="text-sky-600" />
                          )}
                          {row.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate" title={row.note || "—"}>
                        {row.note || "—"}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-semibold">
                        <div className="flex items-center gap-1 text-slate-700">
                          <User size={12} className="text-slate-400" />
                          <span>{row.paid_by_name || row.paidByName || "Hệ thống"}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="mt-5 flex justify-end pt-4 border-t border-slate-100 shrink-0">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-800 hover:bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
