import React, { useState, useEffect } from "react";
import { Printer, X, Clock, User, Minus, Check, AlertCircle, RotateCcw } from "lucide-react";
import type { Invoice } from "../../../../interfaces/invoice";
import { refundInvoiceItemsApi } from "../../../../services/invoiceService";
import { getRestaurantInfo, type RestaurantInfo } from "../../../../services/restaurantInfoService";
import { toast } from "react-hot-toast";

interface RefundModalProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice | null;
  onSuccess: () => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({
  isOpen,
  onClose,
  invoice,
  onSuccess,
}) => {
  const [selectedItemIds, setSelectedItemIds] = useState<number[]>([]);
  const [selectedReasonOption, setSelectedReasonOption] = useState<string>("Làm sai món");
  const [customReasonNote, setCustomReasonNote] = useState<string>("Khách yêu cầu hoàn do món bị sai");
  const [executorName, setExecutorName] = useState<string>("Quản lý");
  const [refundMethod, setRefundMethod] = useState<"cash" | "transfer">("cash");
  const [loading, setLoading] = useState<boolean>(false);
  const [resInfo, setResInfo] = useState<RestaurantInfo | null>(null);

  useEffect(() => {
    getRestaurantInfo()
      .then(setResInfo)
      .catch(() => {});

    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        if (u.name || u.username) {
          setExecutorName(u.name || u.username);
        }
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    if (isOpen && invoice) {
      setSelectedItemIds([]);
      setSelectedReasonOption("Làm sai món");
      setCustomReasonNote("Khách yêu cầu hoàn do món bị sai");
      setRefundMethod("cash");
    }
  }, [isOpen, invoice]);

  if (!isOpen || !invoice) return null;

  const getItemId = (item: any): number | undefined => item.id || item.order_item_id;
  const getItemName = (item: any): string => item.name || item.item_name || item.menu_item_name || "Món ăn";
  const getItemPrice = (item: any): number => {
    const p = item.price ?? item.unit_price ?? item.unitPrice ?? 0;
    return Number(p) || 0;
  };
  const getItemQty = (item: any): number => Number(item.quantity || 1);

  const toggleSelectItem = (itemId?: number) => {
    if (!itemId) return;
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  const now = new Date();
  const printDate = now.toLocaleDateString("vi-VN");
  const printTime = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  // Calculate live refund totals
  const selectedItems = invoice.items.filter((item) => {
    const id = getItemId(item);
    return id && selectedItemIds.includes(id);
  });
  const refundSubtotal = selectedItems.reduce(
    (sum, item) => sum + getItemPrice(item) * getItemQty(item),
    0
  );
  // The backend owns tax allocation; keep this label explicitly provisional.
  const estimatedInvoiceSubtotal = Number(invoice.subtotal || 0);
  const estimatedInvoiceTax = Number(invoice.tax || 0);
  const estimatedRefundVat = estimatedInvoiceSubtotal > 0
    ? Math.round(refundSubtotal * estimatedInvoiceTax / estimatedInvoiceSubtotal)
    : 0;
  const estimatedRefundAmount = refundSubtotal + estimatedRefundVat;

  const handlePrintRefundReceipt = (refundData: any) => {
    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) return;

    const itemsHtml = (refundData.refundedItems || []).map((item: any) => `
      <div style="margin: 4px 0; font-size: 11px;">
        <div style="font-weight: bold; text-decoration: line-through; color: #dc2626;">${item.name}</div>
        <div style="display: flex; justify-content: space-between; padding-left: 8px; color: #dc2626;">
          <span>${item.quantity} x ${(item.unitPrice || 0).toLocaleString("vi-VN")}đ</span>
          <span style="font-weight: bold;">-${(item.refundAmount || 0).toLocaleString("vi-VN")}đ</span>
        </div>
      </div>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>PHIẾU HOÀN TIỀN - HÓA ĐƠN ${invoice.order_code || `#${invoice.id}`}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 11px;
            width: 80mm;
            padding: 8px;
            color: #000;
            background-color: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .lg { font-size: 13px; }
          .xl { font-size: 15px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .total-row { font-size: 13px; font-weight: bold; margin-top: 6px; color: #000; }
          .note { font-size: 9px; color: #333; font-style: italic; margin-top: 4px; }
        </style>
      </head>
      <body>
        <div class="center bold lg">${resInfo?.name || "NHÀ HÀNG RESMANAGER"}</div>
        <div class="center" style="font-size:9px; margin-top:2px;">Địa chỉ: ${resInfo?.address || "123 Nguyễn Huệ, Q.1, TP.HCM"}</div>
        <div class="center" style="font-size:9px;">Hotline: ${resInfo?.hotline || "028 3829 4000"}</div>
        <div class="divider"></div>
        <div class="center bold xl" style="margin: 4px 0; color: #dc2626;">PHIẾU HOÀN TIỀN</div>
        <div class="divider"></div>
        <div class="row"><span>Mã Order gốc:</span><span class="bold">${invoice.order_code || `#${invoice.id}`}</span></div>
        <div class="row"><span>Thời gian hoàn:</span><span>${printDate} ${printTime}</span></div>
        <div class="row"><span>Hình thức trả:</span><span>${refundMethod === "cash" ? "Tiền mặt" : "Chuyển khoản"}</span></div>
        <div class="row"><span>Người thực hiện:</span><span>${executorName}</span></div>
        <div class="divider"></div>
        <div class="bold" style="margin-bottom: 4px;">DANH SÁCH MÓN HOÀN TRẢ:</div>
        ${itemsHtml}
        <div class="divider"></div>
        <div class="row">
          <span>Tạm tính món hoàn:</span>
          <span>${refundSubtotal.toLocaleString("vi-VN")} đ</span>
        </div>
        <div class="divider"></div>
        <div class="row total-row">
          <span>TỔNG TIỀN HOÀN TRẢ:</span>
          <span>${totalRefundAmount.toLocaleString("vi-VN")} đ</span>
        </div>
        <div class="divider"></div>
        <div class="note">Lý do hoàn: ${refundData.reason || "Làm sai món"}</div>
        <div class="divider"></div>
        <div style="display: flex; justify-content: space-between; text-align: center; margin-top: 15px; font-size: 10px;">
          <div>
            <b>Khách hàng</b><br><br><br>
            (Ký tên)
          </div>
          <div>
            <b>Người lập phiếu</b><br>(${executorName})<br><br><br>
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleSubmitRefund = async () => {
    if (selectedItemIds.length === 0) {
      toast.error("Vui lòng chọn ít nhất một món ăn cần hoàn tiền bằng cách nhấn nút [-]");
      return;
    }

    const finalReason = selectedReasonOption === "Khác"
      ? (customReasonNote.trim() || "Lý do khác")
      : (selectedReasonOption + (customReasonNote.trim() ? `: ${customReasonNote.trim()}` : ""));

    if (selectedReasonOption === "Khác" && !customReasonNote.trim()) {
      toast.error("Vui lòng nhập chi tiết lý do hoàn tiền");
      return;
    }

    setLoading(true);
    try {
      const result = await refundInvoiceItemsApi(invoice.id, {
        itemIds: selectedItemIds,
        reason: finalReason,
        refundMethod,
      });

      toast.success(`Đã hoàn ${totalRefundAmount.toLocaleString("vi-VN")}đ cho khách thành công!`);
      handlePrintRefundReceipt(result);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Lỗi tạo phiếu hoàn tiền");
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-sky-50 bg-sky-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <RotateCcw className="text-red-600" size={20} />
            <h3 className="text-base font-bold text-slate-700">Phiếu hoàn tiền</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200/60 hover:text-slate-500 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Preview nội dung phiếu tạm tính / hoàn tiền */}
        <div id="refund-print-area" className="p-6 max-h-[65vh] overflow-y-auto font-mono text-xs text-slate-700 space-y-3">
          {/* Tên nhà hàng */}
          <div className="text-center mb-1">
            <p className="font-black text-sm tracking-wider text-slate-800">
              {resInfo?.name || "NHÀ HÀNG RESMANAGER"}
            </p>
            <p className="text-[10px] text-gray-400">Hệ thống quản lý nhà hàng đa mô hình</p>
          </div>
          <div className="border-t border-dashed border-sky-200 my-2" />

          <div className="text-center font-black text-base text-red-600 mb-2">PHIẾU HOÀN TIỀN</div>

          {/* Meta info */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-400">Mã Order:</span>
              <span className="font-bold">{invoice.order_code || `#${invoice.id}`}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 flex items-center gap-1"><Clock size={10} /> Ngày giờ:</span>
              <span>{printDate} {printTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400 flex items-center gap-1"><User size={10} /> Trạng thái bill:</span>
              <span className="font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Đã thanh toán</span>
            </div>
          </div>

          {/* Không hiển thị tên bàn / tên khách trên phiếu hoàn */}

          {/* Cảnh báo hướng dẫn */}
          <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-start gap-2 text-[11px] text-amber-800">
            <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Bấm nút <b className="bg-red-100 text-red-700 px-1 py-0.5 rounded">[-]</b> bên cạnh món khách xin hủy để chọn hoàn tiền.</p>
            </div>
          </div>

          {/* Danh sách món trong phiếu */}
          <div className="border-t border-dashed border-sky-200 my-2" />
          <div className="space-y-2">
            {invoice.items.map((item, idx) => {
              const itemId = getItemId(item);
              const name = getItemName(item);
              const unitPrice = getItemPrice(item);
              const qty = getItemQty(item);
              const lineTotal = unitPrice * qty;

              const isAlreadyRefunded = Boolean(item.is_refunded);
              const isSelectedForRefund = itemId ? selectedItemIds.includes(itemId) : false;

              return (
                <div
                  key={itemId || idx}
                  className={`p-2 rounded-xl border transition-all ${
                    isAlreadyRefunded
                      ? "bg-slate-100/70 border-slate-200 opacity-60"
                      : isSelectedForRefund
                      ? "bg-red-50 border-red-300"
                      : "bg-white border-slate-100 hover:border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-[11px] leading-tight ${
                        isSelectedForRefund || isAlreadyRefunded
                          ? "line-through text-red-600 font-bold"
                          : "text-slate-800"
                      }`}>
                        {name}
                      </p>
                      <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                        <span>{qty} × {unitPrice.toLocaleString("vi-VN")}đ</span>
                        <span className={`font-bold ${isSelectedForRefund || isAlreadyRefunded ? "text-red-600" : "text-slate-700"}`}>
                          {isSelectedForRefund ? `-${lineTotal.toLocaleString("vi-VN")}đ` : `${lineTotal.toLocaleString("vi-VN")}đ`}
                        </span>
                      </div>
                    </div>

                    {!isAlreadyRefunded && itemId && (
                      <button
                        type="button"
                        onClick={() => toggleSelectItem(itemId)}
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer shadow-2xs ${
                          isSelectedForRefund
                            ? "bg-red-600 text-white hover:bg-red-700"
                            : "bg-red-50 text-red-700 hover:bg-red-100 border border-red-200"
                        }`}
                      >
                        {isSelectedForRefund ? (
                          <>
                            <Check size={12} /> Đã chọn
                          </>
                        ) : (
                          <>
                            <Minus size={12} /> [-] Hoàn món
                          </>
                        )}
                      </button>
                    )}
                    {isAlreadyRefunded && (
                      <span className="text-[9px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">
                        Đã hoàn
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Tổng chi phí món hoàn */}
          <div className="border-t-2 border-slate-800 mt-3 pt-2 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Tạm tính (món hoàn):</span>
              <span className="font-bold text-slate-700">{refundSubtotal.toLocaleString("vi-VN")} đ</span>
            </div>
            <div className="border-t border-slate-300 pt-1.5 flex justify-between items-center">
              <span className="font-black text-xs text-slate-800 uppercase">TỔNG TIỀN HOÀN TRẢ:</span>
              <span className="font-black text-base text-slate-900">{totalRefundAmount.toLocaleString("vi-VN")} đ</span>
            </div>
          </div>

          {/* Lý do & Hình thức */}
          <div className="border-t border-dashed border-sky-200 pt-3 space-y-2 text-[11px]">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Hình thức hoàn tiền:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setRefundMethod("cash")}
                  className={`flex-1 py-1.5 px-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                    refundMethod === "cash"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  💵 Tiền mặt
                </button>
                <button
                  type="button"
                  onClick={() => setRefundMethod("transfer")}
                  className={`flex-1 py-1.5 px-2 rounded-lg border text-[10px] font-bold transition-all cursor-pointer ${
                    refundMethod === "transfer"
                      ? "bg-purple-600 text-white border-purple-600"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  💳 Chuyển khoản
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Lý do hoàn tiền:</label>
              <div className="grid grid-cols-2 gap-1.5 mb-2 font-sans text-[10px]">
                {["Làm sai món", "Món có vấn đề", "Khách hủy món", "Phục vụ chậm", "Khác"].map((opt) => (
                  <label
                    key={opt}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-[10px] font-bold cursor-pointer transition-all ${
                      selectedReasonOption === opt
                        ? "bg-[#3E2016]/5 border-[#3E2016] text-[#3E2016]"
                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="refundReasonOption"
                      value={opt}
                      checked={selectedReasonOption === opt}
                      onChange={() => setSelectedReasonOption(opt)}
                      className="accent-[#3E2016]"
                    />
                    <span>{opt}</span>
                  </label>
                ))}
              </div>
              
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block mb-0.5">Ghi chú chi tiết:</label>
                <textarea
                  value={customReasonNote}
                  onChange={(e) => setCustomReasonNote(e.target.value)}
                  placeholder={
                    selectedReasonOption === "Khác"
                      ? "Vui lòng nhập chi tiết lý do hoàn tiền..."
                      : "Nhập ghi chú thêm nếu cần..."
                  }
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-[10px] focus:ring-1 focus:ring-[#3E2016] focus:border-[#3E2016] outline-none font-sans h-12 resize-none"
                  required={selectedReasonOption === "Khác"}
                />
              </div>
            </div>

            <div className="flex justify-between items-center text-[10px] border-t border-slate-100 pt-2 font-sans">
              <span className="text-slate-400">Người thực hiện hoàn tiền:</span>
              <span className="font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded">{executorName}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-sky-50 bg-sky-50/50 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg border border-sky-100 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-sky-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={handleSubmitRefund}
            disabled={loading || selectedItemIds.length === 0}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-xs font-bold text-white hover:bg-sky-600 transition-colors shadow-md cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer size={14} />
            {loading ? "Đang xử lý..." : `Xác nhận hoàn (ước tính -${estimatedRefundAmount.toLocaleString("vi-VN")}đ)`}
          </button>
        </div>
      </div>
    </div>
  );
};
