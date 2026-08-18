import React, { useState, useEffect } from "react";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../../utils/formatCurrency";
import { X, Calendar, History, Clock, ArrowRight, CheckCircle2, Loader2 } from "lucide-react";

interface Props {
  debtItem: {
    ticketCode: string;
    supplierId?: number;
    supplierName: string;
    amount: number;
    totalAmount?: number;
    paidAmount?: number;
    dueDate?: string | null;
    status?: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const RescheduleDueModal: React.FC<Props> = ({ debtItem, onClose, onSuccess }) => {
  const [newDueDate, setNewDueDate] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  const isInitialLock = !debtItem?.dueDate;

  useEffect(() => {
    if (debtItem?.dueDate) {
      setNewDueDate(debtItem.dueDate.split("T")[0]);
    } else {
      // Default to 14 days later
      const d = new Date();
      d.setDate(d.getDate() + 14);
      setNewDueDate(d.toISOString().split("T")[0]);
    }

    // Fetch history
    if (debtItem?.ticketCode) {
      setHistoryLoading(true);
      api.get(`/v1/inventory/debts/${debtItem.ticketCode}/history`)
        .then((res) => {
          if (res.data.success) {
            setHistory(res.data.data);
          }
        })
        .catch((err) => {
          console.error("Lỗi lấy lịch sử đổi hạn:", err);
        })
        .finally(() => {
          setHistoryLoading(false);
        });
    }
  }, [debtItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtItem) return;

    if (!newDueDate) {
      toast.error("Vui lòng chọn hạn thanh toán!");
      return;
    }

    const todayStr = new Date().toISOString().split("T")[0];
    if (newDueDate < todayStr) {
      toast.error("Hạn thanh toán mới không được ở trong quá khứ (phải từ hôm nay trở đi)!");
      return;
    }

    try {
      setLoading(true);
      const res = await api.patch(`/v1/inventory/debts/${debtItem.ticketCode}/due-date`, {
        newDueDate,
        reason: reason.trim() || (isInitialLock ? "Chốt hạn thanh toán ban đầu" : "Thỏa thuận gia hạn nợ"),
        supplierId: debtItem.supplierId,
      });

      if (res.data.success) {
        toast.success(isInitialLock ? "Đã chốt hạn thanh toán thành công!" : "Đã cập nhật hạn thanh toán mới!");
        onSuccess();
      }
    } catch (error: any) {
      console.error("Lỗi cập nhật hạn thanh toán:", error);
      toast.error(error.response?.data?.message || "Không thể cập nhật hạn thanh toán.");
    } finally {
      setLoading(false);
    }
  };

  if (!debtItem) return null;

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-white rounded-3xl p-6 shadow-2xl animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 shadow-inner">
              <Calendar size={22} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 tracking-tight">
                {isInitialLock ? "Chốt hạn thanh toán nợ" : "Gia hạn / Sửa hạn thanh toán"}
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">
                Phiếu nhập: <span className="font-mono font-bold text-sky-700">{debtItem.ticketCode}</span> — {debtItem.supplierName}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 pr-1 space-y-4">
          {/* Info Card */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Nhà cung cấp:</span>
              <span className="font-bold text-slate-800">{debtItem.supplierName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Dư nợ hiện tại:</span>
              <span className="font-black text-rose-600 text-sm">{formatCurrency(debtItem.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500 font-medium">Hạn thanh toán hiện tại:</span>
              <span className="font-bold text-slate-700">
                {debtItem.dueDate ? (
                  <span className="inline-flex items-center gap-1 text-amber-700 font-black">
                    <Clock size={12} /> {new Date(debtItem.dueDate).toLocaleDateString("vi-VN")}
                  </span>
                ) : (
                  <span className="text-slate-400 font-semibold italic">Chưa chốt hạn</span>
                )}
              </span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Hạn thanh toán mới <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  min={todayStr}
                  value={newDueDate}
                  onChange={(e) => setNewDueDate(e.target.value)}
                  required
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-700 mb-1.5">
                Lý do thay đổi / Ghi chú thỏa thuận
              </label>
              <textarea
                rows={2}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={isInitialLock ? "VD: Thống nhất thanh toán vào cuối tháng..." : "VD: Quản lý đã trao đổi với NCC dời hạn sau rằm..."}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-medium text-slate-800 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-200 bg-white"
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2 text-xs font-black text-white bg-amber-600 hover:bg-amber-700 rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50 active:scale-95"
              >
                {loading ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                {isInitialLock ? "Xác nhận chốt hạn" : "Cập nhật hạn mới"}
              </button>
            </div>
          </form>

          {/* Audit History Section */}
          <div className="border-t border-slate-100 pt-4">
            <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
              <History size={13} className="text-sky-600" /> Lịch sử thay đổi hạn thanh toán
            </h4>

            {historyLoading ? (
              <div className="py-4 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <Loader2 size={14} className="animate-spin text-sky-500" /> Đang tải lịch sử...
              </div>
            ) : history.length === 0 ? (
              <div className="py-4 text-center bg-slate-50/50 rounded-xl border border-slate-100 text-slate-400 text-[11px] font-semibold">
                Chưa có lịch sử thay đổi hạn nào cho phiếu nợ này.
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200/70">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-3 py-2">Thời gian</th>
                      <th className="px-3 py-2">Thay đổi hạn</th>
                      <th className="px-3 py-2">Lý do</th>
                      <th className="px-3 py-2">Người sửa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {history.map((h: any) => (
                      <tr key={h.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 text-slate-500 font-semibold whitespace-nowrap">
                          {new Date(h.updated_at).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-3 py-2 font-bold whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <span className={h.old_due_date ? "text-slate-500 line-through" : "text-slate-400 italic"}>
                              {h.old_due_date ? new Date(h.old_due_date).toLocaleDateString("vi-VN") : "Chưa có"}
                            </span>
                            <ArrowRight size={10} className="text-amber-500 shrink-0" />
                            <span className="text-amber-700 font-black">
                              {new Date(h.new_due_date).toLocaleDateString("vi-VN")}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-700">
                          {h.reason || "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-500 font-semibold whitespace-nowrap">
                          {h.updated_by_name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
