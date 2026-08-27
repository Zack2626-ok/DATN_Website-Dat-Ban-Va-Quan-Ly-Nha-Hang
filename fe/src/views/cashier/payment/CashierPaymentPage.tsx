import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { io, type Socket } from "socket.io-client";
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
import type { Invoice, PaymentRequest, SplitBillGroup } from "../../../interfaces/invoice";
import { InvoiceListPanel } from "./components/InvoiceListPanel";
import { InvoiceDetailPanel } from "./components/InvoiceDetailPanel";
import { PaymentModal } from "./components/PaymentModal";
import { SplitBillModal } from "./components/SplitBillModal";
import { MergeBillModal } from "./components/MergeBillModal";
import { RefundModal } from "./components/RefundModal";
import { CheckCircle2, X, AlertTriangle, Phone, RefreshCw } from "lucide-react";
import { toast } from "react-hot-toast";
import { getRestaurantInfo, type RestaurantInfo } from "../../../services/restaurantInfoService";
import type { BankTransferPaymentSession } from "../../../services/bankTransferPaymentService";
import { printCashierInvoice } from "../../../utils/printBill";

interface PaymentSuccessEvent {
  invoiceId: number;
  amount: number;
  paymentReference: string;
}

export const CashierPaymentPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { invoices, selectedInvoiceId, loading, actionLoading, error } = useAppSelector(
    (state) => state.invoices,
  );

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "unpaid">("all");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const paymentSocketRef = useRef<Socket | null>(null);
  const selectedInvoiceRef = useRef<Invoice | null>(null);
  const restaurantInfoRef = useRef<RestaurantInfo | null>(null);

  const showSuccess = useCallback((msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(null), 3000);
  }, []);

  useEffect(() => {
    dispatch(fetchInvoices());
    dispatch(fetchTables());
    dispatch(fetchOrders());

    // Thiết lập Socket.io cập nhật thời gian thực cho trang Hóa đơn
    const socketUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
    });
    paymentSocketRef.current = socket;

    socket.on("connect", () => {
      console.log("⚡ Connected to Socket.io Server for Cashier Payment Page");
    });

    const triggerRefresh = () => {
      dispatch(fetchInvoices());
      dispatch(fetchTables());
      dispatch(fetchOrders());
    };

    /** Handles a confirmed bank transfer emitted only after webhook reconciliation. */
    const handleBankTransferSuccess = (payload: PaymentSuccessEvent): void => {
      const activeInvoice = selectedInvoiceRef.current;

      triggerRefresh();
      if (!activeInvoice || Number(activeInvoice.id) !== payload.invoiceId) return;

      setPaymentOpen(false);
      showSuccess("Đã nhận chuyển khoản ngân hàng thành công!");
      printCashierInvoice(
        { ...activeInvoice, paymentMethod: "transfer", totalAmount: payload.amount },
        restaurantInfoRef.current?.name,
        restaurantInfoRef.current,
      );
    };

    /** Handles a failed or underpaid bank transfer emitted via webhook. */
    const handleBankTransferFailed = (payload: { message?: string }): void => {
      triggerRefresh();
      toast.error(`⚠️ ${payload.message || "Chuyển khoản thất bại hoặc thiếu tiền!"}`, { duration: 6000 });
    };

    const handlePaymentRequest = (data?: { orderId?: number; tableName?: string; tableId?: number; waiterName?: string; isEarlyPayment?: boolean }) => {
      triggerRefresh();
      if (data && data.orderId) {
        dispatch(selectInvoice(String(data.orderId)));
      }
    };

    const handleSettingsUpdated = (info: any) => {
      if (info) {
        setRestaurantInfo(info);
        restaurantInfoRef.current = info;
      }
      triggerRefresh();
    };

    socket.on("table:status_changed", triggerRefresh);
    socket.on("table:transferred", triggerRefresh);
    socket.on("table:merged", triggerRefresh);
    socket.on("table:merge_resolved", triggerRefresh);
    socket.on("table:group_seating_changed", triggerRefresh);
    socket.on("order_updated", triggerRefresh);
    socket.on("kds_updated", triggerRefresh);
    socket.on("payment:request", handlePaymentRequest);
    socket.on("payment:updated", triggerRefresh);
    socket.on("invoice:updated", triggerRefresh);
    socket.on("invoice_refunded", triggerRefresh);
    socket.on("settings_updated", handleSettingsUpdated);
    socket.on("restaurant_info_updated", handleSettingsUpdated);
    socket.on("payment:success", handleBankTransferSuccess);
    socket.on("payment:failed", handleBankTransferFailed);

    return () => {
      socket.off("connect");
      socket.off("table:status_changed");
      socket.off("table:transferred");
      socket.off("table:merged");
      socket.off("table:merge_resolved");
      socket.off("table:group_seating_changed");
      socket.off("order_updated");
      socket.off("kds_updated");
      socket.off("payment:request", handlePaymentRequest);
      socket.off("payment:updated", triggerRefresh);
      socket.off("invoice:updated", triggerRefresh);
      socket.off("invoice_refunded", triggerRefresh);
      socket.off("settings_updated");
      socket.off("restaurant_info_updated");
      socket.off("payment:success", handleBankTransferSuccess);
      socket.off("payment:failed", handleBankTransferFailed);
      if (paymentSocketRef.current === socket) paymentSocketRef.current = null;
      socket.disconnect();
      console.log("🔌 Disconnected Socket.io Client for Cashier Payment Page");
    };
  }, [dispatch, showSuccess]);

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

  const activeUnpaidInvoices = useMemo(() => {
    return invoices
      .filter(
        (inv) =>
          inv.invoiceStatus !== "paid" &&
          inv.status !== "completed" &&
          inv.status !== "paid" &&
          inv.invoiceStatus !== "cancelled" &&
          inv.items &&
          inv.items.length > 0 &&
          inv.totalAmount > 0 &&
          inv.tableName !== "Mang về" &&
          inv.tableName !== "Mang Về" &&
          (inv.tableId || inv.tableName)
      )
      .sort((a, b) => {
        const isPendingA = a.status === "pending_payment" || a.invoiceStatus === "pending" || a.is_early_payment;
        const isPendingB = b.status === "pending_payment" || b.invoiceStatus === "pending" || b.is_early_payment;
        const pA = isPendingA ? 1 : 2;
        const pB = isPendingB ? 1 : 2;
        if (pA !== pB) return pA - pB;
        // Đến trước thanh toán trước
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    // Chỉ lấy các hóa đơn chưa thanh toán / đang mở
    let result = invoices.filter(
      (inv) =>
        inv.invoiceStatus !== "paid" &&
        inv.status !== "completed" &&
        inv.status !== "paid" &&
        inv.invoiceStatus !== "cancelled"
    );

    if (statusFilter === "pending") {
      result = result.filter(
        (inv) => inv.status === "pending_payment" || inv.invoiceStatus === "pending" || inv.is_early_payment
      );
    } else if (statusFilter === "unpaid") {
      result = result.filter(
        (inv) => inv.status !== "pending_payment" && inv.invoiceStatus !== "pending" && !inv.is_early_payment
      );
    }

    // Loại bỏ "Mang về"
    result = result.filter((inv) => inv.tableName !== "Mang về" && inv.tableName !== "Mang Về" && (inv.tableId || inv.tableName));

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (inv) =>
          inv.id.toLowerCase().includes(q) ||
          (inv.tableName || "").toLowerCase().includes(q) ||
          (inv.customerName || "").toLowerCase().includes(q) ||
          (inv.staffName || "").toLowerCase().includes(q),
      );
    }

    // Ưu tiên hiển thị theo yêu cầu người dùng:
    // 1. Chờ thanh toán / TT Sớm (pending_payment / is_early_payment) - MẶC ĐỊNH NẰM Ở TRÊN ĐẦU
    // 2. Đang phục vụ / Chưa thanh toán (unpaid - open/serving)
    result.sort((a, b) => {
      const isPendingA = a.status === "pending_payment" || a.invoiceStatus === "pending" || a.is_early_payment;
      const isPendingB = b.status === "pending_payment" || b.invoiceStatus === "pending" || b.is_early_payment;
      const pA = isPendingA ? 1 : 2;
      const pB = isPendingB ? 1 : 2;
      if (pA !== pB) return pA - pB;

      // Chưa thanh toán/Chờ thanh toán thì đến trước được thanh toán trước (createdAt tăng dần)
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    return result;
  }, [invoices, statusFilter, searchQuery]);

  useEffect(() => {
    if (filteredInvoices.length > 0) {
      if (!selectedInvoiceId || !filteredInvoices.some((i) => i.id === selectedInvoiceId)) {
        dispatch(selectInvoice(filteredInvoices[0].id));
      }
    }
  }, [filteredInvoices, selectedInvoiceId, dispatch]);

  const selectedInvoice = useMemo(
    () => invoices.find((inv) => inv.id === selectedInvoiceId) || null,
    [invoices, selectedInvoiceId],
  );
  useEffect(() => {
    selectedInvoiceRef.current = selectedInvoice;
  }, [selectedInvoice]);

  useEffect(() => {
    restaurantInfoRef.current = restaurantInfo;
  }, [restaurantInfo]);

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
        
        const subtotal = selectedInvoice.subtotal !== undefined ? selectedInvoice.subtotal : selectedInvoice.totalAmount;
        const vat = Math.round(subtotal * ((data.vatRate || 8) / 100));
        const depositAmount = selectedInvoice.depositAmount || 0;
        const voucherDiscount = data.voucherAmount || 0;
        const pointsDiscount = data.pointsUsed ? data.pointsUsed * 100 : 0;
        const finalDiscount = voucherDiscount + pointsDiscount;
        const tipAmount = data.tipAmount || 0;
        const finalAmount = Math.max(0, subtotal + vat + tipAmount - depositAmount - finalDiscount);

        printCashierInvoice(
          { 
            ...selectedInvoice, 
            paymentMethod: data.paymentMethod,
            discount: finalDiscount,
            voucherDiscount: voucherDiscount,
            pointsDiscount: pointsDiscount,
            tax: vat,
            vatRate: data.vatRate || 8,
            totalAmount: finalAmount
          },
          restaurantInfo?.name,
          restaurantInfo
        );
        dispatch(fetchInvoices());
        dispatch(fetchTables());
        dispatch(fetchOrders());
      } catch {
        // error shown via Redux state
      }
    },
    [dispatch, selectedInvoice, showSuccess, restaurantInfo],
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
    printCashierInvoice(selectedInvoice, restaurantInfo?.name, restaurantInfo);
  }, [selectedInvoice, restaurantInfo]);

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
            onClick={async () => {
              try {
                await Promise.all([
                  dispatch(fetchInvoices()).unwrap(),
                  dispatch(fetchTables()).unwrap(),
                  dispatch(fetchOrders()).unwrap(),
                ]);
                toast.success("Đã làm mới dữ liệu mới nhất!");
              } catch {
                toast.error("Không thể làm mới dữ liệu!");
              }
            }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold border border-slate-200 rounded-xl bg-white hover:bg-slate-50 cursor-pointer transition-all text-slate-700 shadow-2xs hover:shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
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
          {activeUnpaidInvoices.length === 0 ? (
            <span className="text-xs text-slate-400 font-medium px-2 py-1">Không có hóa đơn đang mở</span>
          ) : (
            activeUnpaidInvoices.map((inv) => {
              const isSelected = selectedInvoiceId === inv.id;
              const isPendingPayment = inv.status === "pending_payment" || inv.invoiceStatus === "pending";
              const isEarlyPayment = !!inv.is_early_payment;

              return (
                <button
                  key={inv.id}
                  onClick={() => handleSelectInvoice(inv.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold font-display border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                      : isPendingPayment || isEarlyPayment
                        ? "bg-red-50/90 border-red-400 text-red-900 shadow-2xs hover:bg-red-100"
                        : "bg-amber-50/80 border-amber-300 text-amber-900 hover:bg-amber-100"
                  }`}
                >
                  <span className="font-black">{inv.tableName || "Khách lẻ"}</span>

                  {isEarlyPayment && (
                    <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-wide">
                      TT Sớm
                    </span>
                  )}

                  {isPendingPayment && (
                    <span className="text-[9px] bg-red-600 text-white px-1.5 py-0.5 rounded font-extrabold uppercase tracking-wide animate-pulse">
                      Chờ TT
                    </span>
                  )}

                  {!isPendingPayment && !isEarlyPayment && (
                    <span className="text-[9px] bg-amber-200/80 text-amber-800 px-1.5 py-0.5 rounded font-bold">
                      Đang ăn
                    </span>
                  )}

                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
                      isSelected
                        ? "bg-white/20 text-white"
                        : isPendingPayment || isEarlyPayment
                          ? "bg-red-200/90 text-red-900"
                          : "bg-amber-200/80 text-amber-800"
                    }`}
                  >
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
          onRefund={() => setRefundOpen(true)}
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
          onBankTransferStarted={(session: BankTransferPaymentSession) => {
            paymentSocketRef.current?.emit("payment:subscribe", session.invoiceId);
          }}
          onBankTransferDemoCompleted={() => {
            setPaymentOpen(false);
            dispatch(fetchInvoices());
            dispatch(fetchTables());
            dispatch(fetchOrders());
            showSuccess("Đã mô phỏng tiền về và chốt hóa đơn thành công!");
          }}
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

      {refundOpen && selectedInvoice && (
        <RefundModal
          isOpen={refundOpen}
          onClose={() => setRefundOpen(false)}
          invoice={selectedInvoice}
          onSuccess={() => {
            dispatch(fetchInvoices());
            dispatch(fetchTables());
            dispatch(fetchOrders());
            showSuccess("Đã tạo phiếu hoàn tiền thành công!");
          }}
        />
      )}
    </div>
  );
};
