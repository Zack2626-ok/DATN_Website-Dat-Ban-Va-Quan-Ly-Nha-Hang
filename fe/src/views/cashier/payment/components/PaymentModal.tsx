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
} from "lucide-react";
import { Modal } from "../../../../components/Modal";
import { getRestaurantInfo } from "../../../../services/restaurantInfoService";
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
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherAmount, setVoucherAmount] = useState(0);

  useEffect(() => {
    getRestaurantInfo()
      .then((info) => {
        setVatRate(info.tax_rate ?? 10);
      })
      .catch(() => {});
  }, []);

  const breakdown = useMemo(() => {
    const subtotal = invoice.subtotal !== undefined ? invoice.subtotal : invoice.totalAmount;
    const vat = subtotal * (vatRate / 100);
    const finalAmount = subtotal + vat - voucherAmount;
    return { subtotal, vat, finalAmount };
  }, [invoice.subtotal, invoice.totalAmount, vatRate, voucherAmount]);

  const handleConfirm = () => {
    onConfirm({
      paymentMethod,
      vatRate,
      serviceFeeRate: 0,
      voucherCode: voucherCode || undefined,
      voucherAmount: voucherAmount || undefined,
      tipAmount: 0,
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Thanh toán hóa đơn" size="lg" theme="light">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Breakdown */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm font-black text-slate-900">
            <Receipt size={16} className="text-blue-600" />
            Chi tiết thanh toán
          </div>

          {/* Subtotal */}
          <div className="flex justify-between text-xs py-2 border-b border-slate-100">
            <span className="text-slate-500">Tạm tính ({invoice.items.length} món)</span>
            <span className="font-bold text-slate-900">{formatVnd(breakdown.subtotal)} vnđ</span>
          </div>

          {/* VAT */}
          <div className="flex justify-between items-center text-xs py-2 border-b border-slate-100">
            <span className="text-slate-500 flex items-center gap-1.5">
              <BadgePercent size={12} className="text-orange-500" />
              VAT
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={0}
                max={100}
                value={vatRate}
                onChange={(e) => setVatRate(Number(e.target.value) || 0)}
                className="w-14 text-right text-xs border border-slate-200 rounded-lg px-2 py-1 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              <span className="text-[10px] text-slate-500">%</span>
              <span className="font-bold text-slate-900 min-w-[80px] text-right">{formatVnd(breakdown.vat)} vnđ</span>
            </div>
          </div>

          {/* Voucher */}
          <div className="space-y-2 py-2 border-b border-slate-100">
            <span className="text-xs text-slate-500 flex items-center gap-1.5">
              <Tag size={12} className="text-pink-500" />
              Voucher
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value)}
                placeholder="Mã voucher"
                className="flex-1 text-xs border border-slate-200 rounded-lg px-3 py-1.5 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              <input
                type="number"
                min={0}
                value={voucherAmount || ""}
                onChange={(e) => setVoucherAmount(Number(e.target.value) || 0)}
                placeholder="Số tiền"
                className="w-24 text-right text-xs border border-slate-200 rounded-lg px-2 py-1.5 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              <span className="text-[10px] text-slate-500 self-center">.000đ</span>
            </div>
          </div>

          {/* Final total */}
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex justify-between items-center">
            <span className="text-sm font-bold text-blue-800">Tổng thanh toán</span>
            <span className="text-xl font-black text-blue-700 font-display">{formatVnd(breakdown.finalAmount)} vnđ</span>
          </div>
        </div>

        {/* Right: Payment method */}
        <div className="space-y-4">
          <div className="text-sm font-black text-slate-900">Phương thức thanh toán</div>
          <div className="grid grid-cols-2 gap-2">
            {PAYMENT_METHODS.map((pm) => {
              const Icon = pm.icon;
              const isSelected = paymentMethod === pm.value;
              return (
                <button
                  key={pm.value}
                  onClick={() => setPaymentMethod(pm.value)}
                  className={`p-3 rounded-xl border-2 flex flex-col items-center gap-2 cursor-pointer transition-all ${
                    isSelected ? `${pm.color} border-current shadow-sm` : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-[10px] font-bold">{pm.label}</span>
                </button>
              );
            })}
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-xs">
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
            className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
          >
            {loading ? (
              "Đang xử lý..."
            ) : (
              <>
                <CreditCard size={18} />
                Xác nhận thanh toán {formatVnd(breakdown.finalAmount)} vnđ
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
