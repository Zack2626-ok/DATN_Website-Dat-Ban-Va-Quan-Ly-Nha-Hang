import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import {
  fetchInvoices,
  selectInvoice,
  processInvoicePayment,
  cancelInvoice as cancelInvoiceAction,
  splitBillEqual as splitBillEqualAction,
  splitBillByItems as splitBillByItemsAction,
  mergeBills as mergeBillsAction,
  clearInvoiceError,
} from "../../../store/invoiceSlice";
import { fetchTables } from "../../../store/tableSlice";
import { fetchOrders } from "../../../store/orderSlice";
import type { InvoiceStatus, PaymentRequest, SplitBillGroup } from "../../../interfaces/invoice";
import { InvoiceListPanel } from "./components/InvoiceListPanel";
import { InvoiceDetailPanel } from "./components/InvoiceDetailPanel";
import { PaymentModal } from "./components/PaymentModal";
import { SplitBillModal } from "./components/SplitBillModal";
import { MergeBillModal } from "./components/MergeBillModal";
import { CheckCircle2, X, AlertTriangle, Phone } from "lucide-react";
import { getRestaurantInfo, type RestaurantInfo } from "../../../services/restaurantInfoService";

export const CashierPaymentPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { invoices, selectedInvoiceId, loading, actionLoading, error } = useAppSelector(
    (state) => state.invoices,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | "all">("all");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    dispatch(fetchInvoices());
    dispatch(fetchTables());
    dispatch(fetchOrders());
    const interval = setInterval(() => {
      dispatch(fetchInvoices());
      dispatch(fetchTables());
      dispatch(fetchOrders());
    }, 15000);
    return () => clearInterval(interval);
  }, [dispatch]);

  useEffect(() => {
    getRestaurantInfo()
      .then(setRestaurantInfo)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => dispatch(clearInvoiceError()), 5000);
      return () => clearTimeout(timer);
    }
  }, [error, dispatch]);

  const filteredInvoices = useMemo(() => {
    let result = [...invoices];
    if (statusFilter !== "all") {
      result = result.filter((inv) => inv.invoiceStatus === statusFilter);
    }
    if (statusFilter === "unpaid") {
      // Loại bỏ các bàn 0 món (chưa gọi gì) hoặc tổng tiền = 0 khỏi danh sách chờ thanh toán
      result = result.filter((inv) => inv.items && inv.items.length > 0 && inv.totalAmount > 0);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.id.toLowerCase().includes(q) ||
          (inv.tableName || "").toLowerCase().includes(q) ||
          (inv.customerName || "").toLowerCase().includes(q),
      );
    }
    return result;
  }, [invoices, statusFilter, searchQuery]);

  const selectedInvoice = useMemo(
    () => invoices.find((inv) => inv.id === selectedInvoiceId) || null,
    [invoices, selectedInvoiceId],
  );

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }, []);

  const handleSelectInvoice = useCallback(
    (id: string) => {
      dispatch(selectInvoice(id));
    },
    [dispatch],
  );

  const handlePay = useCallback(() => {
    if (!selectedInvoice) return;
    setPaymentOpen(true);
  }, [selectedInvoice]);

  const handleConfirmPayment = useCallback(
    async (data: PaymentRequest) => {
      if (!selectedInvoice) return;
      try {
        await dispatch(
          processInvoicePayment({ invoiceId: selectedInvoice.id, data }),
        ).unwrap();
        setPaymentOpen(false);
        showSuccess("Thanh toán thành công!");
        dispatch(fetchInvoices());
        dispatch(fetchTables());
        dispatch(fetchOrders());
      } catch {
        // error shown via Redux state
      }
    },
    [dispatch, selectedInvoice, showSuccess],
  );

  const handleCancel = useCallback(async () => {
    if (!selectedInvoice) return;
    if (!window.confirm("Bạn có chắc muốn hủy hóa đơn này?")) return;
    try {
      await dispatch(
        cancelInvoiceAction({ invoiceId: selectedInvoice.id }),
      ).unwrap();
      showSuccess("Đã hủy hóa đơn");
      dispatch(fetchInvoices());
    } catch {
      // error shown via Redux state
    }
  }, [dispatch, selectedInvoice, showSuccess]);

  const handleSplitEqual = useCallback(
    async (parts: number) => {
      if (!selectedInvoice) return;
      try {
        await dispatch(
          splitBillEqualAction({ invoiceId: selectedInvoice.id, data: { parts } }),
        ).unwrap();
        setSplitOpen(false);
        showSuccess(`Đã tách thành ${parts} phần`);
        dispatch(fetchInvoices());
      } catch {
        // error shown via Redux state
      }
    },
    [dispatch, selectedInvoice, showSuccess],
  );

  const handleSplitByItems = useCallback(
    async (groups: SplitBillGroup[]) => {
      if (!selectedInvoice) return;
      try {
        await dispatch(
          splitBillByItemsAction({ invoiceId: selectedInvoice.id, data: { groups } }),
        ).unwrap();
        setSplitOpen(false);
        showSuccess("Đã tách hóa đơn theo món");
        dispatch(fetchInvoices());
      } catch {
        // error shown via Redux state
      }
    },
    [dispatch, selectedInvoice, showSuccess],
  );

  const handleMerge = useCallback(
    async (invoiceIds: string[]) => {
      try {
        await dispatch(mergeBillsAction({ invoiceIds })).unwrap();
        setMergeOpen(false);
        showSuccess("Gộp hóa đơn thành công!");
        dispatch(fetchInvoices());
      } catch {
        // error shown via Redux state
      }
    },
    [dispatch, showSuccess],
  );

  const handlePrint = useCallback(() => {
    if (!selectedInvoice) return;
    const printContent = `
      <h2>Hóa đơn #${selectedInvoice.id.slice(-8).toUpperCase()}</h2>
      <p>Bàn: ${selectedInvoice.tableName || "Mang về"}</p>
      <p>Khách: ${selectedInvoice.customerName || "Khách lẻ"}</p>
      <hr/>
      ${selectedInvoice.items.map((item) => `<p>${item.quantity}x ${item.name} - ${Number(item.price * item.quantity).toLocaleString("vi-VN")} vnđ</p>`).join("")}
      <hr/>
      <p><strong>Tổng: ${Number(selectedInvoice.totalAmount).toLocaleString("vi-VN")} vnđ</strong></p>
    `;
    const win = window.open("", "_blank");
    if (win) {
      win.document.write(printContent);
      win.print();
    }
  }, [selectedInvoice]);

  return (
    <div className="flex flex-col h-[calc(100vh-80px)] gap-4">
      {/* Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 font-display">Quản lý thanh toán</h2>
          <p className="text-xs text-slate-500">
            {restaurantInfo?.name || "ResManager"}
            {restaurantInfo?.hotline && (
              <span className="ml-2 inline-flex items-center gap-1 text-blue-600 font-semibold">
                <Phone size={10} />
                {restaurantInfo.hotline}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              dispatch(fetchInvoices());
              dispatch(fetchTables());
              dispatch(fetchOrders());
            }}
            className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Horizontal Table & Active Order Picker */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
        <div className="flex-shrink-0">
          <h3 className="text-sm font-black font-display text-slate-900">
            Bàn Đang Phục Vụ / Chờ TT
          </h3>
          <p className="text-[11px] text-slate-500">Chọn nhanh bàn bên dưới để xem hoặc thanh toán bill</p>
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto py-1">
          {invoices.filter(inv => inv.invoiceStatus === "unpaid" && inv.items && inv.items.length > 0 && inv.totalAmount > 0).length === 0 ? (
            <span className="text-xs text-slate-400 font-medium px-2 py-1">Không có hóa đơn đang mở</span>
          ) : (
            invoices
              .filter(inv => inv.invoiceStatus === "unpaid" && inv.items && inv.items.length > 0 && inv.totalAmount > 0)
              .map((inv) => {
                const isSelected = selectedInvoiceId === inv.id;
                const isPendingPayment = inv.status === "pending_payment";
                return (
                  <button
                    key={inv.id}
                    onClick={() => handleSelectInvoice(inv.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold font-display border transition-all cursor-pointer flex items-center gap-1.5 ${
                      isSelected
                        ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                        : isPendingPayment
                          ? "bg-red-50 border-red-400 text-red-900 animate-pulse hover:bg-red-100"
                          : "bg-amber-50/80 border-amber-300 text-amber-900 hover:bg-amber-100"
                    }`}
                  >
                    <span className="font-black">{inv.tableName || "Khách lẻ"}</span>
                    {isPendingPayment && (
                      <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide">Chờ TT</span>
                    )}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      isSelected ? "bg-white/20 text-white" : isPendingPayment ? "bg-red-200 text-red-900" : "bg-amber-200/80 text-amber-800"
                    }`}>
                      {Number(inv.totalAmount).toLocaleString("vi-VN")}đ
                    </span>
                  </button>
                );
              })
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3 text-emerald-800 animate-fade-in">
          <CheckCircle2 size={16} className="text-emerald-600" />
          <span className="text-xs font-bold flex-1">{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-600 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3 text-red-800 animate-fade-in">
          <AlertTriangle size={16} className="text-red-600" />
          <span className="text-xs font-bold flex-1">{error}</span>
          <button onClick={() => dispatch(clearInvoiceError())} className="text-red-400 hover:text-red-600 cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main 2-panel layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 min-h-0">
        {/* Left: Invoice list */}
        <InvoiceListPanel
          invoices={filteredInvoices}
          selectedId={selectedInvoiceId}
          onSelect={handleSelectInvoice}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          loading={loading}
        />

        {/* Right: Invoice detail */}
        <InvoiceDetailPanel
          invoice={selectedInvoice}
          onPay={handlePay}
          onSplit={() => setSplitOpen(true)}
          onMerge={() => setMergeOpen(true)}
          onCancel={handleCancel}
          onPrint={handlePrint}
          loading={actionLoading}
        />
      </div>

      {/* Modals */}
      {paymentOpen && selectedInvoice && (
        <PaymentModal
          isOpen={paymentOpen}
          onClose={() => setPaymentOpen(false)}
          invoice={selectedInvoice}
          onConfirm={handleConfirmPayment}
          loading={actionLoading}
        />
      )}

      {splitOpen && selectedInvoice && (
        <SplitBillModal
          isOpen={splitOpen}
          onClose={() => setSplitOpen(false)}
          invoice={selectedInvoice}
          onSplitEqual={handleSplitEqual}
          onSplitByItems={handleSplitByItems}
          loading={actionLoading}
        />
      )}

      {mergeOpen && (
        <MergeBillModal
          isOpen={mergeOpen}
          onClose={() => setMergeOpen(false)}
          invoices={invoices}
          onMerge={handleMerge}
          loading={actionLoading}
        />
      )}
    </div>
  );
};
