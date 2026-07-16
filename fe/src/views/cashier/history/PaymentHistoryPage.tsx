import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
  History,
  Search,
  X,
  Filter,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Wallet,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { getPaymentHistoryApi } from "../../../services/invoiceService";

interface PaymentRecord {
  id: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
  status: string;
  discountAmount?: number;
  discountReason?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  table_name?: string;
  guest_name?: string;
  guest_phone?: string;
  order_type?: string;
}

const METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cash: { label: "Tiền mặt", icon: <Banknote size={14} />, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  transfer: { label: "Chuyển khoản", icon: <ArrowRightLeft size={14} />, color: "text-blue-600 bg-blue-50 border-blue-200" },
  card: { label: "Thẻ tín dụng", icon: <CreditCard size={14} />, color: "text-violet-600 bg-violet-50 border-violet-200" },
  wallet: { label: "Ví điện tử", icon: <Wallet size={14} />, color: "text-amber-600 bg-amber-50 border-amber-200" },
};

const formatVnd = (amount: number) => amount.toLocaleString("vi-VN");

const formatTime = (dateStr: string) => {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

export const PaymentHistoryPage: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPaymentHistoryApi({
        search: searchQuery || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        paymentMethod: methodFilter !== "all" ? methodFilter : undefined,
      });
      setPayments(data);
    } catch (err) {
      console.error("Failed to fetch payment history:", err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, dateFrom, dateTo, methodFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const totalAmount = useMemo(
    () => payments.filter((p) => p.status === "completed").reduce((sum, p) => sum + p.amount, 0),
    [payments],
  );

  const completedCount = useMemo(
    () => payments.filter((p) => p.status === "completed").length,
    [payments],
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 font-display flex items-center gap-2">
            <History size={20} className="text-blue-600" />
            Lịch sử thanh toán
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Xem lại tất cả giao dịch thanh toán</p>
        </div>
        <button
          onClick={fetchPayments}
          className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all"
        >
          Làm mới
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Tổng giao dịch</p>
          <p className="text-xl font-black text-slate-900 font-display mt-1">{payments.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Thành công</p>
          <p className="text-xl font-black text-emerald-600 font-display mt-1">{completedCount}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4 col-span-2">
          <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Tổng doanh thu</p>
          <p className="text-xl font-black text-blue-600 font-display mt-1">{formatVnd(totalAmount)} vnđ</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm mã đơn, bàn, khách..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-400"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer">
              <X size={14} />
            </button>
          )}
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-blue-400"
          placeholder="Từ ngày"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="text-xs border border-slate-200 rounded-lg px-3 py-2 bg-slate-50 focus:outline-none focus:border-blue-400"
          placeholder="Đến ngày"
        />
        <div className="flex gap-1.5 flex-wrap">
          {[
            { value: "all", label: "Tất cả" },
            { value: "cash", label: "Tiền mặt" },
            { value: "transfer", label: "Chuyển khoản" },
            { value: "card", label: "Thẻ" },
            { value: "wallet", label: "Ví" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setMethodFilter(opt.value)}
              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                methodFilter === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Payment list */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-xs text-slate-400">Đang tải...</div>
        ) : payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
            <Filter size={24} className="text-slate-300" />
            <p className="text-xs">Không có giao dịch nào</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Mã GD</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Đơn hàng</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Bàn</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Khách</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Phương thức</th>
                  <th className="text-right px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Số tiền</th>
                  <th className="text-left px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Thời gian</th>
                  <th className="text-center px-4 py-3 font-bold text-slate-500 uppercase tracking-wider">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {payments.map((p) => {
                  const method = METHOD_LABELS[p.paymentMethod] || { label: p.paymentMethod, icon: <CreditCard size={14} />, color: "text-slate-600 bg-slate-50 border-slate-200" };
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-black text-slate-900">#{String(p.id).slice(-8).toUpperCase()}</td>
                      <td className="px-4 py-3 font-bold text-slate-700">#{String(p.orderId).slice(-6)}</td>
                      <td className="px-4 py-3">
                        {p.table_name ? (
                          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-bold text-[10px] border border-blue-200">
                            {p.table_name}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.guest_name || <span className="text-slate-400">Khách lẻ</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${method.color}`}>
                          {method.icon} {method.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-black text-slate-900">{formatVnd(p.amount)} vnđ</td>
                      <td className="px-4 py-3 text-slate-500">{formatTime(p.completedAt || p.createdAt)}</td>
                      <td className="px-4 py-3 text-center">
                        {p.status === "completed" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 size={11} /> Thành công
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock size={11} /> {p.status}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
