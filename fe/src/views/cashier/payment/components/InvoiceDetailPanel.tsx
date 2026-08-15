import React, { useEffect } from "react";
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
  UserCheck,
  Hourglass,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { getRestaurantInfo } from "../../../../services/restaurantInfoService";
import type { Invoice } from "../../../../interfaces/invoice";
import { getComboConstituents } from "../../../../utils/comboHelper";

interface Props {
  invoice: Invoice | null;
  onPay: () => void;
  onSplit: () => void;
  onMerge: () => void;
  onCancel: () => void;
  onPrint: () => void;
  onRefund?: () => void;
  loading: boolean;
}

const formatVnd = (amount: number) => Number(amount).toLocaleString("vi-VN");

const formatTime = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" });
};

export const InvoiceDetailPanel: React.FC<Props> = (props) => {
  const { invoice, onPay, onPrint, onRefund, loading } = props;

  useEffect(() => {
    getRestaurantInfo().catch(() => { });
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
  const isEarlyPayment = Boolean(invoice.is_early_payment);
  const canAct = !isPaid && !isCancelled;

  const finalAmount = invoice.totalAmount;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Early payment alert for Cashier */}
      {isEarlyPayment && (
        <div className="bg-amber-50 border-b border-amber-200 p-4 flex items-start gap-3 text-xs text-amber-800 animate-pulse">
          <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-extrabold text-amber-900 text-sm">⚠️ YÊU CẦU THANH TOÁN SỚM</p>
            <p className="mt-0.5 font-bold text-amber-700">Khách thanh toán trước toàn bộ món nhưng vẫn ăn tại bàn. Bếp & phục vụ sẽ tiếp tục phục vụ các món đang làm.</p>
          </div>
        </div>
      )}
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
          {invoice.items.map((item, idx) => {
            const constituents = getComboConstituents(item.name);
            return (
              <div
                key={idx}
                className="flex flex-col py-2.5 px-3.5 bg-slate-50 rounded-xl border border-slate-100 gap-2"
              >
                <div className="flex justify-between items-center w-full">
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-black text-slate-900 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                      {item.quantity}x
                    </span>
                    <span className={`text-xs font-bold ${item.is_refunded ? "line-through text-red-600 bg-red-50 px-1.5 py-0.5 rounded" : "text-slate-800"}`}>
                      {item.name}
                    </span>
                    {item.is_refunded ? (
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 border border-red-200">
                        Đã hoàn tiền
                      </span>
                    ) : item.status ? (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                        item.status === "served" ? "bg-slate-200/80 text-slate-600" :
                        item.status === "done" ? "bg-emerald-100 text-emerald-800 font-extrabold" :
                        item.status === "cooking" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                      }`}>
                        {item.status === "served" ? "Đã mang ra" :
                         item.status === "done" ? "Bếp nấu xong" :
                         item.status === "cooking" ? "Đang nấu" : "Chờ nấu"}
                      </span>
                    ) : null}
                  </div>
                  <span className="text-xs font-black text-slate-900">{formatVnd(item.price * item.quantity)} vnđ</span>
                </div>
                {constituents && (
                  <div className="pl-9 flex flex-col gap-1 border-t border-slate-200/50 pt-1.5 w-full">
                    <span className="text-[9px] uppercase tracking-wider font-extrabold text-blue-600 block">
                      Chi tiết món trong combo:
                    </span>
                    <div className="grid grid-cols-1 gap-1 pl-1">
                      {constituents.map((sub, sIdx) => (
                        <div key={sIdx} className="text-[10px] text-slate-500 font-bold flex items-center gap-1.5">
                          <span className="h-1 w-1 rounded-full bg-blue-400"></span>
                          {sub}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>


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
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex justify-between items-center gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-bold text-emerald-700">Đã thanh toán</span>
              {invoice.has_refund && (
                <span className="text-[10px] font-black text-red-600 bg-red-100 px-2 py-0.5 rounded-full border border-red-200">
                  Đã hoàn {Number(invoice.refunded_total || 0).toLocaleString("vi-VN")}đ
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {onRefund && (
                <button
                  onClick={onRefund}
                  className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-xs"
                  title="Tạo phiếu hoàn tiền cho món ăn"
                >
                  <RotateCcw size={13} />
                  Phiếu hoàn
                </button>
              )}
              <button
                onClick={onPrint}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all"
              >
                <Printer size={13} />
                In hóa đơn
              </button>
            </div>
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
