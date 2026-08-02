import React, { useState } from "react";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../../utils/formatCurrency";
import { X, Wallet, Building2, CheckCircle, ReceiptText } from "lucide-react";

interface Props {
  supplier: { rawId: number; supplierName: string; amount: number };
  onClose: () => void;
  onSuccess: () => void;
}

export const PayDebtModal: React.FC<Props> = ({ supplier, onClose, onSuccess }) => {
  const [amount, setAmount] = useState(supplier.amount);
  const [method, setMethod] = useState<"cash" | "bank_transfer">("cash");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  const remaining = supplier.amount - amount;

  const handleSubmit = async () => {
    if (amount <= 0 || amount > supplier.amount) {
      toast.error("Số tiền không hợp lệ");
      return;
    }
    setLoading(true);
    try {
      await api.patch(`/v1/inventory/suppliers/${supplier.rawId}/pay`, { amount, method, note });
      toast.success("Thanh toán thành công!");
      onSuccess();
    } catch {
      toast.error("Thanh toán thất bại");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600 shadow-inner">
              <Wallet size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight text-slate-800">Thanh toán công nợ</h3>
              <p className="text-xs font-semibold text-slate-500 mt-0.5">Xác nhận thanh toán tiền hàng cho NCC</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 cursor-pointer">
            <X size={22} />
          </button>
        </div>

        <div className="mb-6 flex flex-col md:flex-row gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><ReceiptText size={12}/> Nhà cung cấp</p>
            <p className="mt-1 font-bold text-slate-800">{supplier.supplierName}</p>
          </div>
          <div className="flex-1 md:text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tổng nợ hiện tại</p>
            <p className="mt-1 font-black text-rose-600 text-lg leading-none">{formatCurrency(supplier.amount)}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">Số tiền thanh toán</label>
              <button 
                onClick={() => setAmount(supplier.amount)}
                className="text-[10px] font-bold text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-2 py-0.5 rounded transition-colors cursor-pointer"
              >
                Thanh toán toàn bộ
              </button>
            </div>
            <div className="relative">
              <input
                type="number"
                value={amount}
                max={supplier.amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 pl-10 text-xl font-black text-sky-600 transition-all focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 shadow-sm"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">₫</span>
            </div>
            <div className="mt-2 flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-500">Dư nợ còn lại sau thanh toán:</span>
              <span className={`font-black ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {formatCurrency(Math.max(0, remaining))}
              </span>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-2 block">Phương thức</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod("cash")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all cursor-pointer ${method === 'cash' ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
              >
                <Wallet size={20} className={method === 'cash' ? 'text-sky-600' : 'text-slate-400'} />
                <span className="text-xs font-bold">Tiền mặt</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("bank_transfer")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all cursor-pointer ${method === 'bank_transfer' ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}`}
              >
                <Building2 size={20} className={method === 'bank_transfer' ? 'text-sky-600' : 'text-slate-400'} />
                <span className="text-xs font-bold">Chuyển khoản</span>
              </button>
            </div>
          </div>
          
          <div>
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5 block">Ghi chú thêm</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú giao dịch (không bắt buộc)..."
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-3 text-sm font-medium transition-all focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 shadow-sm"
            />
          </div>
        </div>

        <div className="mt-8 flex justify-end gap-3 pt-5 border-t border-slate-100">
          <button
            onClick={onClose}
            className="rounded-xl border-2 border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-xl bg-sky-600 hover:bg-sky-700 px-6 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50 flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-95"
          >
            {loading ? "Đang xử lý..." : (
              <>
                <CheckCircle size={18} /> Xác nhận thanh toán
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};