import React, { useState, useMemo, useEffect } from "react";
import {
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Wallet,
  Receipt,
  Tag,
  Gift,
  BadgePercent,
  QrCode,
  Copy,
  Check,
} from "lucide-react";
import { Modal } from "../../../../components/Modal";
import { getRestaurantInfo, type RestaurantInfo } from "../../../../services/restaurantInfoService";
import type { Invoice, PaymentRequest } from "../../../../interfaces/invoice";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  onConfirm: (data: PaymentRequest) => void;
  loading: boolean;
}

const formatVnd = (n: number) => Number(n).toLocaleString("vi-VN");

const PAYMENT_METHODS = [
  { value: "cash" as const, label: "Tiền mặt", icon: Banknote, color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  { value: "transfer" as const, label: "Chuyển khoản", icon: ArrowRightLeft, color: "bg-blue-50 border-blue-200 text-blue-700" },
  { value: "card" as const, label: "Thẻ tín dụng", icon: CreditCard, color: "bg-violet-50 border-violet-200 text-violet-700" },
  { value: "wallet" as const, label: "Ví điện tử", icon: Wallet, color: "bg-amber-50 border-amber-200 text-amber-700" },
];

export const PaymentModal: React.FC<Props> = ({ isOpen, onClose, invoice, onConfirm, loading }) => {
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "transfer" | "card" | "wallet">("cash");
  const [vatRate, setVatRate] = useState(10);
  const [serviceFeeRate, setServiceFeeRate] = useState(0);
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherAmount, setVoucherAmount] = useState(0);
  const [tipAmount, setTipAmount] = useState(0);
  const [resInfo, setResInfo] = useState<RestaurantInfo | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getRestaurantInfo()
      .then((info) => {
        setVatRate(info.tax_rate ?? 10);
        setServiceFeeRate(info.service_fee_rate ?? 0);
        setResInfo(info);
      })
      .catch(() => {});
  }, []);

  const breakdown = useMemo(() => {
    const subtotal = invoice.subtotal !== undefined ? invoice.subtotal : invoice.totalAmount;
    const vat = Math.round(subtotal * (vatRate / 100));
    const serviceFee = Math.round(subtotal * (serviceFeeRate / 100));
    const depositAmount = invoice.depositAmount || 0;
    const finalAmount = Math.max(0, subtotal + vat + serviceFee - depositAmount - voucherAmount);
    return { subtotal, vat, serviceFee, depositAmount, finalAmount };
  }, [invoice.subtotal, invoice.totalAmount, invoice.depositAmount, vatRate, serviceFeeRate, voucherAmount]);

  const vietqrUrl = useMemo(() => {
    if (!resInfo?.bank_code || !resInfo?.bank_account) return "";
    const amountVnd = Math.round(breakdown.finalAmount * 1000);
    const desc = `Thanh toan HD${invoice.id.slice(-6)}`;
    return `https://img.vietqr.io/image/${resInfo.bank_code}-${resInfo.bank_account}-compact2.png?amount=${amountVnd}&addInfo=${encodeURIComponent(desc)}`;
  }, [resInfo, breakdown.finalAmount, invoice.id]);

  const copyBankInfo = () => {
    if (!resInfo) return;
    const text = `Ngân hàng: ${resInfo.bank_name}\nSố TK: ${resInfo.bank_account}\nChủ TK: ${resInfo.bank_account_name}\nSố tiền: ${formatVnd(breakdown.finalAmount)} vnđ\nNội dung: Thanh toan HD${invoice.id.slice(-6)}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConfirm = () => {
    onConfirm({
      paymentMethod,
      vatRate,
      serviceFeeRate,
      voucherCode: voucherCode || undefined,
      voucherAmount: voucherAmount || undefined,
      tipAmount: tipAmount || 0,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thanh toán hóa đơn" size="lg" theme="light">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Breakdown */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Receipt size={16} className="text-blue-600" />
            Chi tiết thanh toán
          </div>

          {/* Subtotal */}
          <div className="flex justify-between text-xs py-1.5 border-b border-slate-100">
            <span className="text-slate-500">Tạm tính ({invoice.items.length} món)</span>
            <span className="font-bold text-slate-900">{formatVnd(breakdown.subtotal)} vnđ</span>
          </div>

          {/* VAT */}
          <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1">
              <BadgePercent size={10} className="text-orange-500" />
              VAT
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                className="w-10 text-right text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              <span className="text-[10px] text-slate-400">%</span>
              <span className="font-bold text-slate-900 min-w-[70px] text-right text-[11px]">{formatVnd(breakdown.vat)} vnđ</span>
            </div>
          </div>

          {/* Service Fee */}
          <div className="flex justify-between items-center text-xs py-1.5 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1">
              <BadgePercent size={10} className="text-teal-500" />
              Phí DV
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                max={100}
                value={serviceFeeRate}
                onChange={(e) => setServiceFeeRate(Number(e.target.value) || 0)}
                className="w-10 text-right text-[10px] border border-slate-200 rounded px-1 py-0.5 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              <span className="text-[10px] text-slate-400">%</span>
              <span className="font-bold text-slate-900 min-w-[70px] text-right text-[11px]">{formatVnd(breakdown.serviceFee)} vnđ</span>
            </div>
          </div>

          {/* Voucher */}
          <div className="space-y-1.5 py-1.5 border-b border-slate-100">
            <span className="text-[11px] text-slate-500 flex items-center gap-1">
              <Tag size={10} className="text-pink-500" />
              Voucher
            </span>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Mã voucher"
                className="flex-1 text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              <input
                type="number"
                min={0}
                value={voucherAmount || ""}
                onChange={(e) => setVoucherAmount(Number(e.target.value) || 0)}
                placeholder="Số tiền"
                className="w-20 text-right text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              <span className="text-[10px] text-slate-500 self-center">.000đ</span>
            </div>
          </div>

          {/* Tip */}
          <div className="flex justify-between items-center text-xs py-1.5">
            <span className="text-slate-500 flex items-center gap-1">
              <Gift size={10} className="text-yellow-500" />
              Tip
            </span>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min={0}
                value={tipAmount || ""}
                onChange={(e) => setTipAmount(Number(e.target.value) || 0)}
                placeholder="0"
                className="w-16 text-right text-[11px] border border-slate-200 rounded px-2 py-1 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              <span className="text-[10px] text-slate-400">.000đ</span>
            </div>
          )

          {/* Final total */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex justify-between items-center">
            <span className="text-xs font-bold text-blue-800">Tổng thanh toán</span>
            <span className="text-lg font-black text-blue-700 font-display">{formatVnd(breakdown.finalAmount)} vnđ</span>
          </div>
        </div>

        {/* Right: Payment method */}
        <div className="space-y-3">
          <div className="text-xs font-black text-slate-900">Phương thức thanh toán</div>
          <div className="grid grid-cols-2 gap-1.5">
            {PAYMENT_METHODS.map((pm) => {
              const Icon = pm.icon;
              const isSelected = paymentMethod === pm.value;
              return (
                <button
                  key={pm.value}
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`p-2.5 rounded-xl border-2 flex flex-col items-center gap-1.5 cursor-pointer transition-all ${
                    isSelected ? `${pm.color} border-current shadow-sm` : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={18} />
                  <span className="text-[10px] font-bold">{pm.label}</span>
                </button>
              );
            })}
          </div>

          {/* VietQR when transfer selected */}
          {paymentMethod === "transfer" && resInfo?.bank_code && (
            <div className="bg-blue-50/50 border border-blue-200 rounded-xl p-3 flex flex-col items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-blue-700">
                <QrCode size={14} />
                Quét mã VietQR để chuyển khoản
              </div>
              <img
                src={vietqrUrl}
                alt="VietQR"
                className="w-48 h-48 rounded-lg border border-blue-200 bg-white"
              />
              <div className="w-full text-[10px] text-slate-600 space-y-0.5">
                <div className="flex justify-between">
                  <span>Ngân hàng:</span>
                  <span className="font-bold">{resInfo.bank_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Số TK:</span>
                  <span className="font-bold">{resInfo.bank_account}</span>
                </div>
                <div className="flex justify-between">
                  <span>Chủ TK:</span>
                  <span className="font-bold">{resInfo.bank_account_name}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={copyBankInfo}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Đã copy!" : "Copy thông tin TK"}
              </button>
            </div>
          )}

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-500">Phương thức</span>
              <span className="font-bold text-slate-900">{PAYMENT_METHODS.find((p) => p.value === paymentMethod)?.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Hóa đơn</span>
              <span className="font-bold text-slate-900">#{invoice.id.slice(-8).toUpperCase()}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Bàn</span>
              <span className="font-bold text-slate-900">{invoice.tableName || "Mang về"}</span>
            </div>
          </div>

          {/* Confirm button */}
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {loading ? (
              "Đang xử lý..."
            ) : (
              <>
                <CreditCard size={16} />
                Xác nhận thanh toán {formatVnd(breakdown.finalAmount)} vnđ
              </>
            )}
          </button>
        </div>
      </div>
      </div>
    </Modal>
  );
};
