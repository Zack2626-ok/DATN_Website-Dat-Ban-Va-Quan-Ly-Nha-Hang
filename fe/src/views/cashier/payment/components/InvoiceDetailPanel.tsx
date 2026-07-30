import React, { useEffect, useState } from "react";
import {
  FileText,
  User,
  Phone,
  Users,
  Clock,
  CreditCard,
  Printer,
  Banknote,
  ArrowRightLeft,
  QrCode,
  UserCheck,
  Hourglass,
} from "lucide-react";
import { getRestaurantInfo, type RestaurantInfo } from "../../../../services/restaurantInfoService";
import type { Invoice } from "../../../../interfaces/invoice";

interface Props {
  invoice: Invoice | null;
  onPay: () => void;
  onSplit: () => void;
  onMerge: () => void;
  onCancel: () => void;
  onPrint: () => void;
  loading: boolean;
}

const formatVnd = (amount: number) => Number(amount).toLocaleString("vi-VN");

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
};

export const InvoiceDetailPanel: React.FC<Props> = (props) => {
  const { invoice, onPay, onPrint, loading } = props;
  const [resInfo, setResInfo] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    getRestaurantInfo().then(setResInfo).catch(() => {});
  }, []);

  if (!invoice) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white rounded-2xl border border-slate-200 text-slate-500 gap-3">
        <FileText size={48} className="text-slate-700" />
        <p className="text-sm font-semibold">Chọn hóa đơn để xem chi tiết</p>
        <p className="text-xs">Danh sách hóa đơn ở bên trái</p>
      </div>
    );
  }

  const isPaid = invoice.invoiceStatus === "paid";
  const isCancelled = invoice.invoiceStatus === "cancelled";
  const isPendingPayment = invoice.status === "pending_payment";
  const canAct = !isPaid && !isCancelled;

  const finalAmount = invoice.totalAmount;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-black text-slate-900 font-display flex items-center gap-2">
              <FileText size={18} className="text-blue-600" />
              Hóa đơn #{invoice.id.slice(-8).toUpperCase()}
            </h3>
            <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock size={12} /> {formatTime(invoice.createdAt)}
              </span>
              {invoice.tableName && (
                <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                  {invoice.tableName}
                </span>
              )}
              {isPendingPayment && (
                <span className="bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                  <Hourglass size={10} /> Chờ thanh toán
                </span>
              )}
              {invoice.staffName && (
                <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-bold text-[10px] inline-flex items-center gap-1">
                  <UserCheck size={10} /> {invoice.staffName}
                </span>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-1.5 flex-wrap justify-end">
            <button
              onClick={onPrint}
              className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 cursor-pointer transition-all"
              title="In hóa đơn"
            >
              <Printer size={14} />
            </button>
          </div>
        </div>

        {/* Customer info */}
        {(invoice.customerName || invoice.customerPhone) && (
          <div className="mt-3 flex items-center gap-4 text-xs text-slate-600 bg-slate-50 rounded-xl p-3">
            {invoice.customerName && (
              <span className="flex items-center gap-1.5">
                <User size={12} className="text-slate-500" /> {invoice.customerName}
              </span>
            )}
            {invoice.customerPhone && (
              <span className="flex items-center gap-1.5">
                <Phone size={12} className="text-slate-500" /> {invoice.customerPhone}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Users size={12} className="text-slate-500" /> {invoice.guestCount} khách
            </span>
          </div>
        )}
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto p-5">
        <h4 className="text-[11px] font-extrabold uppercase text-slate-500 tracking-wider mb-3">
          Chi tiết món ({invoice.items.length})
        </h4>
        <div className="space-y-2">
          {invoice.items.map((item, idx) => (
            <div
              key={idx}
              className="flex justify-between items-center py-2.5 px-3.5 bg-slate-50 rounded-xl border border-slate-100"
            >
              <div className="flex items-center gap-3">
                <span className="text-xs font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                  {item.quantity}x
                </span>
                <span className="text-xs font-bold text-slate-800">{item.name}</span>
              </div>
              <span className="text-xs font-black text-slate-900">{formatVnd(item.price * item.quantity)} vnđ</span>
            </div>
          ))}
        </div>

        {/* VietQR Code */}
        {resInfo?.bank_code && resInfo?.bank_account && (
          <div className="mt-5 flex flex-col items-center gap-1.5 bg-blue-50/50 border border-blue-200 rounded-xl p-3">
            <div className="flex items-center gap-1 text-[10px] font-bold text-blue-700">
              <QrCode size={12} />
              VietQR - Chuyển khoản ngân hàng
            </div>
            <img
              src={`https://img.vietqr.io/image/${resInfo.bank_code}-${resInfo.bank_account}-compact2.png?amount=${Math.round(finalAmount)}&addInfo=${encodeURIComponent(`Thanh toan HD${invoice.id.slice(-6)}`)}`}
              alt="VietQR"
              className="w-[120px] h-[120px] rounded-lg border border-blue-200 bg-white"
            />
            <span className="text-[9px] text-slate-500">{resInfo.bank_account} - {resInfo.bank_account_name}</span>
          </div>
        )}
      </div>

      {/* Footer: Total & Pay button */}
      <div className="border-t border-slate-100 p-5">
        <div className="space-y-2 mb-4">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span>Tạm tính</span>
            <span className="font-semibold text-slate-800">
              {formatVnd(invoice.subtotal !== undefined ? invoice.subtotal : invoice.items.reduce((sum, item) => sum + item.price * item.quantity, 0))} vnđ
            </span>
          </div>
          {Boolean(invoice.tax && invoice.tax > 0) && (
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>VAT ({invoice.vatRate || 10}%)</span>
              <span className="font-semibold text-slate-800">+{formatVnd(invoice.tax || 0)} vnđ</span>
            </div>
          )}
          {Boolean(invoice.discount && invoice.discount > 0) && (
            <div className="flex justify-between items-center text-xs text-slate-500">
              <span>Giảm giá/Voucher</span>
              <span className="font-semibold text-emerald-600">-{formatVnd(invoice.discount || 0)} vnđ</span>
            </div>
          )}
          {Boolean(invoice.depositAmount && invoice.depositAmount > 0) && (
            <div className="flex justify-between items-center text-xs text-rose-600 font-medium">
              <span>Tiền cọc đặt bàn</span>
              <span className="font-semibold">-{formatVnd(invoice.depositAmount || 0)} vnđ</span>
            </div>
          )}
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-sm font-bold text-slate-700">Tổng thanh toán</span>
            <span className="text-lg font-black text-blue-600 font-display">{formatVnd(finalAmount)} vnđ</span>
          </div>
        </div>

        {canAct && (
          <div className="flex gap-2">
            <button
              onClick={onPay}
              disabled={loading}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
            >
              <CreditCard size={15} />
              Thanh toán
            </button>
            <button
              onClick={onPay}
              disabled={loading}
              className="py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              title="Thanh toán tiền mặt nhanh"
            >
              <Banknote size={15} />
            </button>
            <button
              onClick={onPay}
              disabled={loading}
              className="py-3 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all disabled:opacity-50"
              title="Thanh toán chuyển khoản"
            >
              <ArrowRightLeft size={15} />
            </button>
          </div>
        )}

        {isPaid && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center">
            <span className="text-xs font-bold text-emerald-700">Đã thanh toán</span>
            <button
              onClick={onPrint}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
            >
              <Printer size={13} />
              In hóa đơn
            </button>
          </div>
        )}
        {isCancelled && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <span className="text-xs font-bold text-red-700">Đã hủy</span>
          </div>
        )}
      </div>
    </div>
  );
};
