import React, { useState } from "react";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../../utils/formatCurrency";
import { X } from "lucide-react";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-playfair text-lg font-bold text-sky-800">Thanh toán công nợ</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        <p className="mb-4 text-sm text-slate-500">
          NCC: <span className="font-semibold text-slate-700">{supplier.supplierName}</span>
          <br />
          Tổng nợ: <span className="font-semibold text-rose-600">{formatCurrency(supplier.amount)}</span>
        </p>

        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-500">Số tiền thanh toán</label>
            <input
              type="number"
              value={amount}
              max={supplier.amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Phương thức</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="mt-1 w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              <option value="cash">Tiền mặt</option>
              <option value="bank_transfer">Chuyển khoản</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500">Ghi chú</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ghi chú (tuỳ chọn)"
              className="mt-1 w-full rounded-lg border border-sky-200 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg border border-sky-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Hủy
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="rounded-lg bg-sky-600 px-4 py-2 text-sm text-white hover:bg-sky-700 disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Xác nhận thanh toán"}
          </button>
        </div>
      </div>
    </div>
  );
};