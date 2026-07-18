import React from "react";
import { Search, Filter, X, FileText, Clock, CheckCircle2, XCircle } from "lucide-react";
import type { Invoice, InvoiceStatus } from "../../../../interfaces/invoice";

interface Props {
  invoices: Invoice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  statusFilter: InvoiceStatus | "all";
  onStatusFilterChange: (s: InvoiceStatus | "all") => void;
  loading: boolean;
}

const STATUS_OPTIONS: { value: InvoiceStatus | "all"; label: string }[] = [
  { value: "all", label: "Tất cả" },
  { value: "unpaid", label: "Chưa thanh toán" },
  { value: "paid", label: "Đã thanh toán" },
  { value: "cancelled", label: "Đã hủy" },
];

const statusBadge = (inv: Invoice) => {
  if (inv.invoiceStatus === "unpaid") {
    if (inv.status === "pending_payment") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-extrabold border bg-red-50 border-red-300 text-red-700 animate-pulse shadow-2xs">
          <Clock size={12} /> Chờ TT (Quầy)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 border-amber-200 text-amber-700">
        <Clock size={12} /> Đang phục vụ
      </span>
    );
  }
  if (inv.invoiceStatus === "paid") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 border-emerald-200 text-emerald-700">
        <CheckCircle2 size={12} /> Đã TT
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-50 border-red-200 text-red-700">
      <XCircle size={12} /> Đã hủy
    </span>
  );
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Vừa xong";
  if (mins < 60) return `${mins}p`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
};

export const InvoiceListPanel: React.FC<Props> = ({
  invoices,
  selectedId,
  onSelect,
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  loading,
}) => {
  const unpaidCount = invoices.filter((i) => i.invoiceStatus === "unpaid").length;

  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900 font-display flex items-center gap-2">
            <FileText size={16} className="text-blue-600" />
            Hóa đơn
          </h3>
          {unpaidCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
              {unpaidCount} chờ TT
            </span>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm mã HĐ, bàn, khách..."
            className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 focus:outline-none focus:border-blue-400"
          />
          {searchQuery && (
            <button onClick={() => onSearchChange("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-600 cursor-pointer">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onStatusFilterChange(opt.value)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer ${
                statusFilter === opt.value
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-xs text-slate-500">Đang tải...</div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-xs text-slate-500 gap-2">
            <Filter size={20} className="text-slate-600" />
            Không có hóa đơn nào
          </div>
        ) : (
          invoices.map((inv) => {
            const isSelected = selectedId === inv.id;
            return (
              <button
                key={inv.id}
                onClick={() => onSelect(inv.id)}
                className={`w-full text-left px-4 py-3 border-b border-slate-50 transition-all cursor-pointer ${
                  isSelected ? "bg-blue-50/80 border-l-2 border-l-blue-500" : "hover:bg-slate-50"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-black text-slate-900 truncate">{inv.tableName || "Mang về"}</span>
                      {statusBadge(inv)}
                    </div>
                    <p className="text-[10px] text-slate-500 truncate">
                      {inv.customerName || "Khách lẻ"} &middot; {inv.items.length} món
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-black text-slate-900">
                      {Number(inv.totalAmount).toLocaleString("vi-VN")}
                    </p>
                    <p className="text-[10px] text-slate-500">{timeAgo(inv.createdAt)}</p>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
