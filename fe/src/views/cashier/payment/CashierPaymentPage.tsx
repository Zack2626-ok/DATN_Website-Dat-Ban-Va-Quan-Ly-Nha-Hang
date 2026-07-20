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
    const interval = setInterval(() => {
      dispatch(fetchInvoices());
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
    const rName = restaurantInfo?.name || "ResManager Bistro";
    const rAddr = restaurantInfo?.address || "";
    const rHotline = restaurantInfo?.hotline || "";
    const bankCode = restaurantInfo?.bank_code || "";
    const bankAcc = restaurantInfo?.bank_account || "";
    const bankAccName = restaurantInfo?.bank_account_name || "";
    const bankName = restaurantInfo?.bank_name || "";
    const amountVnd = Math.round(selectedInvoice.totalAmount * 1000);
    const desc = `Thanh toan HD${selectedInvoice.id.slice(-6)}`;
    const vietqrUrl = bankCode && bankAcc
      ? `https://img.vietqr.io/image/${bankCode}-${bankAcc}-qr_only.png?amount=${amountVnd}&addInfo=${encodeURIComponent(desc)}`
      : "";

    const printContent = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Hóa đơn</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: 12px; width: 80mm; margin: 0 auto; padding: 5mm; color: #000; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .header { border-bottom: 1px dashed #000; padding-bottom: 3mm; margin-bottom: 3mm; }
  .header h1 { font-size: 16px; margin-bottom: 2px; }
  .header p { font-size: 10px; color: #555; }
  .row { display: flex; justify-content: space-between; margin: 1mm 0; }
  .row .label { color: #555; }
  .divider { border-top: 1px dashed #000; margin: 2mm 0; }
  .item-row { display: flex; justify-content: space-between; margin: 1mm 0; }
  .item-name { flex: 1; }
  .item-qty { width: 20px; text-align: center; }
  .item-price { width: 80px; text-align: right; }
  .total-row { display: flex; justify-content: space-between; margin: 1mm 0; font-size: 14px; }
  .qr-section { text-align: center; margin-top: 3mm; }
  .qr-section img { width: 120px; height: 120px; }
  .qr-section p { font-size: 9px; margin-top: 1mm; }
  .footer { text-align: center; margin-top: 4mm; border-top: 1px dashed #000; padding-top: 3mm; }
  .footer p { font-size: 10px; color: #555; }
  @media print { body { width: 80mm; } }
</style></head><body>
  <div class="header center">
    <h1>${rName}</h1>
    <p>${rAddr}</p>
    <p>Hotline: ${rHotline}</p>
  </div>
  <div class="center bold" style="font-size:14px;margin-bottom:2mm">HÓA ĐƠN THANH TOÁN</div>
  <div class="row"><span class="label">Số HĐ:</span><span>#${selectedInvoice.id.slice(-8).toUpperCase()}</span></div>
  <div class="row"><span class="label">Bàn:</span><span>${selectedInvoice.tableName || "Mang về"}</span></div>
  <div class="row"><span class="label">Khách:</span><span>${selectedInvoice.customerName || "Khách lẻ"}</span></div>
  <div class="row"><span class="label">Thời gian:</span><span>${new Date(selectedInvoice.createdAt).toLocaleString("vi-VN")}</span></div>
  <div class="divider"></div>
  <div class="item-row bold"><span class="item-qty">SL</span><span class="item-name">Món</span><span class="item-price">Thành tiền</span></div>
  ${selectedInvoice.items.map((item) => `<div class="item-row"><span class="item-qty">${item.quantity}</span><span class="item-name">${item.name}</span><span class="item-price">${(item.price * item.quantity * 1000).toLocaleString("vi-VN")}</span></div>`).join("")}
  <div class="divider"></div>
  <div class="row"><span>Tạm tính:</span><span>${amountVnd.toLocaleString("vi-VN")} vnđ</span></div>
  <div class="divider"></div>
  <div class="total-row bold"><span>TỔNG CỘNG:</span><span>${amountVnd.toLocaleString("vi-VN")} vnđ</span></div>
  ${vietqrUrl ? `<div class="qr-section">
    <p class="bold">Quét mã VietQR để thanh toán</p>
    <img src="${vietqrUrl}" alt="VietQR" />
    <p>${bankName}</p>
    <p>STK: ${bankAcc} - ${bankAccName}</p>
    <p>Nội dung: ${desc}</p>
  </div>` : ""}
  <div class="footer">
    <p>Cảm ơn quý khách!</p>
    <p>Hẹn gặp lại tại ${rName}</p>
  </div>
</body></html>`;
    const win = window.open("", "_blank", "width=400,height=600");
    if (win) {
      win.document.write(printContent);
      win.document.close();
      setTimeout(() => win.print(), 500);
    }
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
            onClick={() => dispatch(fetchInvoices())}
            className="px-3 py-1.5 text-xs font-bold border border-slate-200 rounded-lg bg-white hover:bg-slate-50 cursor-pointer transition-all"
          >
            Làm mới
          </button>
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
