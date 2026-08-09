import React, { useState } from "react";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { formatCurrency } from "../../../utils/formatCurrency";
import { X, Wallet, Building2, CheckCircle, ReceiptText, Upload, AlertTriangle } from "lucide-react";

interface Props {
  supplier: { rawId: number; supplierName: string; amount: number };
  onClose: () => void;
  onSuccess: () => void;
}

export const PayDebtModal: React.FC<Props> = ({ supplier, onClose, onSuccess }) => {
  const [amount, setAmount] = useState<number | string>(supplier.amount);
  const [method, setMethod] = useState<"cash" | "bank_transfer">("cash");
  const [note, setNote] = useState("");
  const [proofImage, setProofImage] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const numericAmount = Number(amount) || 0;
  const isOverAmount = numericAmount > supplier.amount;
  const remaining = Math.max(0, supplier.amount - numericAmount);

  const [receiptData, setReceiptData] = useState<any>(null);

  const handleSubmit = async () => {
    if (numericAmount <= 0) {
      toast.error("Số tiền thanh toán phải lớn hơn 0 ₫");
      return;
    }

    if (isOverAmount) {
      toast.error(`Số tiền thanh toán không được lớn hơn tổng số nợ hiện tại (${formatCurrency(supplier.amount)})`);
      return;
    }

    setLoading(true);
    try {
      const res = await api.patch(`/inventory/suppliers/${supplier.rawId}/pay`, {
        amount: numericAmount,
        method,
        note,
        proofImage: proofImage || undefined
      });
      toast.success("Thanh toán thành công!");
      if (res.data?.success && res.data?.data) {
        setReceiptData(res.data.data);
      } else {
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Thanh toán thất bại");
    } finally {
      setLoading(false);
    }
  };

  if (receiptData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
          <div className="text-center pb-4 border-b border-slate-200">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-2">
              <CheckCircle size={32} />
            </div>
            <h3 className="text-2xl font-black text-slate-800">PHIẾU CHI THANH TOÁN CÔNG NỢ</h3>
            <p className="text-xs text-slate-500 font-semibold">Mã phiếu: PC-NCC-{receiptData.paymentId || Date.now()}</p>
          </div>

          <div className="py-5 space-y-3 text-sm">
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Nhà cung cấp:</span>
              <span className="font-bold text-slate-800">{receiptData.supplierName || supplier.supplierName}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Số tiền đã trả:</span>
              <span className="font-black text-emerald-600 text-lg">{formatCurrency(receiptData.paid)}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Nợ còn lại:</span>
              <span className={`font-black ${receiptData.remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {formatCurrency(receiptData.remaining)} {receiptData.remaining > 0 ? '(Còn thiếu)' : '(Đã hết nợ)'}
              </span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Hình thức:</span>
              <span className="font-bold text-slate-700">{receiptData.method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</span>
            </div>
            <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
              <span className="text-slate-500 font-semibold">Ngày thực hiện:</span>
              <span className="font-bold text-slate-700">{new Date(receiptData.paidAt || Date.now()).toLocaleString('vi-VN')}</span>
            </div>
            {receiptData.note && (
              <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-500 font-semibold">Ghi chú:</span>
                <span className="font-medium text-slate-700">{receiptData.note}</span>
              </div>
            )}
            {(receiptData.proofImage || proofImage) && (
              <div className="pt-2">
                <span className="text-slate-500 font-semibold block mb-1.5">Ảnh minh chứng thanh toán:</span>
                <img
                  src={receiptData.proofImage || proofImage}
                  alt="Chứng từ"
                  className="max-h-48 w-full object-contain rounded-xl border border-slate-200 bg-slate-50 p-1"
                />
              </div>
            )}
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-slate-100">
            <button
              onClick={() => window.print()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-md"
            >
              <ReceiptText size={16} /> In phiếu chi
            </button>
            <button
              onClick={onSuccess}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm rounded-xl transition-colors cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
        <div className="mb-5 flex items-center justify-between border-b border-slate-100 pb-4">
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

        <div className="mb-5 flex flex-col md:flex-row gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-200/80">
          <div className="flex-1">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5"><ReceiptText size={12}/> Nhà cung cấp</p>
            <p className="mt-1 font-bold text-slate-800">{supplier.supplierName}</p>
          </div>
          <div className="flex-1 md:text-right">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Tổng nợ hiện tại</p>
            <p className="mt-1 font-black text-rose-600 text-lg leading-none">{formatCurrency(supplier.amount)}</p>
          </div>
        </div>

        <div className="space-y-5 text-xs">
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="font-extrabold text-slate-700 uppercase tracking-wide">Số tiền thanh toán <span className="text-rose-500">*</span></label>
              <button 
                type="button"
                onClick={() => setAmount(supplier.amount)}
                className="text-[10px] font-bold text-sky-600 hover:text-sky-700 hover:bg-sky-50 px-2 py-0.5 rounded transition-colors cursor-pointer"
              >
                Thanh toán toàn bộ
              </button>
            </div>
            <div className="relative">
              <input
                type="text"
                value={isFocused ? amount : (amount === "" ? "" : Number(amount).toLocaleString("vi-VN"))}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onChange={(e) => {
                  const rawVal = e.target.value;
                  const digits = rawVal.replace(/\D/g, "");
                  setAmount(digits === "" ? "" : Number(digits));
                }}
                className={`w-full rounded-xl border-2 px-4 py-3 pl-10 text-xl font-black transition-all focus:outline-none focus:ring-4 shadow-sm ${
                  isOverAmount || (amount !== "" && (isNaN(numericAmount) || numericAmount <= 0))
                    ? "border-rose-500 text-rose-600 bg-rose-50/50 focus:border-rose-600 focus:ring-rose-200"
                    : "border-slate-200 text-sky-600 focus:border-sky-500 focus:ring-sky-500/10"
                }`}
                placeholder="Nhập số tiền..."
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black">₫</span>
            </div>

            {amount !== "" && !isNaN(numericAmount) && (
              <div className="mt-1.5 text-xs font-black text-sky-600 flex items-center gap-1.5 p-1 px-2 bg-sky-50 rounded-lg border border-sky-100 max-w-max">
                <span>Số tiền nhập: {Number(amount).toLocaleString("vi-VN")} ₫</span>
              </div>
            )}

            {isOverAmount ? (
              <div className="mt-2 text-[11px] font-extrabold text-rose-600 flex items-center gap-1.5 p-2 bg-rose-50 rounded-xl border border-rose-200 animate-in fade-in duration-150">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Số tiền nhập ({formatCurrency(numericAmount)}) không được vượt quá số nợ hiện tại ({formatCurrency(supplier.amount)}).</span>
              </div>
            ) : amount !== "" && (isNaN(numericAmount) || numericAmount <= 0) ? (
              <div className="mt-2 text-[11px] font-extrabold text-rose-600 flex items-center gap-1.5 p-2 bg-rose-50 rounded-xl border border-rose-200 animate-in fade-in duration-150">
                <AlertTriangle size={14} className="shrink-0" />
                <span>Số tiền không hợp lệ! Vui lòng nhập một số dương lớn hơn 0.</span>
              </div>
            ) : (
              <div className="mt-2 flex justify-between items-center text-xs">
                <span className="font-semibold text-slate-500">Dư nợ còn lại sau thanh toán:</span>
                <span className={`font-black ${remaining > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {formatCurrency(remaining)}
                </span>
              </div>
            )}
          </div>
          
          <div>
            <label className="font-extrabold text-slate-700 uppercase tracking-wide mb-2 block">Phương thức thanh toán</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMethod("cash")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all cursor-pointer ${method === 'cash' ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm font-bold' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 font-semibold'}`}
              >
                <Wallet size={20} className={method === 'cash' ? 'text-sky-600' : 'text-slate-400'} />
                <span>Tiền mặt</span>
              </button>
              <button
                type="button"
                onClick={() => setMethod("bank_transfer")}
                className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-3 transition-all cursor-pointer ${method === 'bank_transfer' ? 'border-sky-500 bg-sky-50 text-sky-700 shadow-sm font-bold' : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 font-semibold'}`}
              >
                <Building2 size={20} className={method === 'bank_transfer' ? 'text-sky-600' : 'text-slate-400'} />
                <span>Chuyển khoản</span>
              </button>
            </div>
          </div>

          <div>
            <label className="font-extrabold text-slate-700 uppercase tracking-wide mb-1.5 block">
              Ảnh minh chứng thanh toán (Hóa đơn / Ủy nhiệm chi)
            </label>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  id="pay-proof-upload"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        toast.error("Dung lượng ảnh không được vượt quá 5MB");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setProofImage(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                />
                <label
                  htmlFor="pay-proof-upload"
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold transition-colors cursor-pointer flex items-center gap-2 border border-slate-300 shadow-2xs text-xs"
                >
                  <Upload size={15} className="text-slate-600" />
                  {proofImage ? "Thay ảnh minh chứng khác" : "Tải ảnh minh chứng lên"}
                </label>
                {proofImage && (
                  <button
                    type="button"
                    onClick={() => setProofImage("")}
                    className="px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl font-bold text-xs transition-colors cursor-pointer border border-rose-200"
                  >
                    Xóa ảnh
                  </button>
                )}
              </div>

              {proofImage && (
                <div className="relative mt-1 group rounded-2xl border-2 border-sky-100 bg-slate-50 p-2 shadow-sm max-w-md">
                  <img
                    src={proofImage}
                    alt="Minh chứng thanh toán"
                    className="max-h-48 w-full object-contain rounded-xl bg-white"
                  />
                  <div className="mt-2 text-center text-[11px] font-bold text-slate-500">
                    Ảnh minh chứng sẽ được lưu cùng phiếu chi
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <label className="font-extrabold text-slate-700 uppercase tracking-wide mb-1.5 block">Ghi chú thêm</label>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Nhập ghi chú giao dịch (không bắt buộc)..."
              className="w-full rounded-xl border-2 border-slate-200 px-4 py-2.5 font-medium transition-all focus:border-sky-500 focus:outline-none focus:ring-4 focus:ring-sky-500/10 shadow-sm"
            />
          </div>
        </div>

        <div className="mt-7 flex justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || isNaN(numericAmount) || numericAmount <= 0 || isOverAmount || amount === ""}
            className="rounded-xl bg-sky-600 hover:bg-sky-700 px-6 py-2.5 text-xs font-bold text-white transition-colors disabled:opacity-40 flex items-center gap-2 cursor-pointer shadow-md hover:shadow-lg active:scale-95 disabled:cursor-not-allowed"
          >
            {loading ? "Đang xử lý..." : (
              <>
                <CheckCircle size={16} /> Xác nhận thanh toán
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};