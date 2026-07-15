import React from "react";
import { Printer, X, Receipt, Clock, User, Phone } from "lucide-react";
import type { WaiterOrderItem } from "../../../services/waiterService";

interface ProvisionalBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  orderId?: string | number;
  items: WaiterOrderItem[];
  waiterName?: string;
  employeeCode?: string;
  guestName?: string | null;
  guestPhone?: string | null;
  startTime?: string | null;
}

export const ProvisionalBillModal: React.FC<ProvisionalBillModalProps> = ({
  isOpen,
  onClose,
  tableName,
  orderId,
  items,
  waiterName,
  employeeCode,
  guestName,
  guestPhone,
  startTime,
}) => {
  if (!isOpen) return null;

  const now = new Date();
  const printDate = now.toLocaleDateString("vi-VN");
  const printTime = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const validItems = items.filter((item) => item.status !== "voided" && item.status !== "cancelled");
  const totalAmount = validItems.reduce(
    (sum, item) => sum + Number(item.unit_price) * item.quantity,
    0,
  );

  const handlePrint = () => {
    const printContent = document.getElementById("bill-print-area");
    if (!printContent) return;

    const printWindow = window.open("", "_blank", "width=380,height=600");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Phiếu tạm tính - ${tableName}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: 'Courier New', Courier, monospace;
            font-size: 12px;
            width: 80mm;
            padding: 8px 10px;
            color: #111;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .lg { font-size: 14px; }
          .xl { font-size: 16px; }
          .divider { border-top: 1px dashed #999; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .col-name { flex: 1; padding-right: 6px; }
          .col-qty { width: 60px; text-align: center; }
          .col-price { width: 70px; text-align: right; }
          .total-row { font-size: 15px; font-weight: bold; margin-top: 6px; }
          .note { font-size: 10px; color: #555; font-style: italic; margin-top: 4px; }
          .item-note { font-size: 10px; color: #777; padding-left: 4px; }
        </style>
      </head>
      <body>
        <div class="center bold lg">NHÀ HÀNG RESMANAGER</div>
        <div class="center" style="font-size:10px; margin-bottom:4px;">Hệ thống quản lý nhà hàng đa mô hình</div>
        <div class="divider"></div>
        <div class="center bold xl" style="margin: 4px 0;">PHIẾU TẠM TÍNH</div>
        <div class="center bold" style="font-size:14px; margin-bottom:6px;">${tableName}</div>
        <div class="divider"></div>
        <div class="row"><span>Mã Order:</span><span class="bold">#${orderId || "N/A"}</span></div>
        <div class="row"><span>Ngày:</span><span>${printDate}</span></div>
        <div class="row"><span>Giờ in:</span><span>${printTime}</span></div>
        <div class="row"><span>Nhân viên:</span><span>${waiterName || "Nhân viên"}${employeeCode ? " (" + employeeCode + ")" : ""}</span></div>
        ${guestName || guestPhone || startTime ? `
        <div class="divider"></div>
        ${guestName ? `<div class="row"><span>Khách:</span><span class="bold">${guestName}</span></div>` : ""}
        ${guestPhone ? `<div class="row"><span>SĐT:</span><span>${guestPhone}</span></div>` : ""}
        ${startTime ? `<div class="row"><span>Giờ đến:</span><span>${startTime}</span></div>` : ""}
        ` : ""}
        <div class="divider"></div>
        <div class="row bold" style="font-size:11px; color:#555;">
          <span class="col-name">TÊN MÓN</span>
          <span class="col-qty">SL x ĐG</span>
          <span class="col-price">T.TIỀN</span>
        </div>
        <div class="divider"></div>
        ${validItems.map(item => `
          <div class="row">
            <span class="col-name">${item.item_name || (item as any).menu_item_name || "—"}</span>
            <span class="col-qty">${item.quantity} × ${Number(item.unit_price).toLocaleString("vi-VN")}</span>
            <span class="col-price">${(item.quantity * Number(item.unit_price)).toLocaleString("vi-VN")}đ</span>
          </div>
          ${item.kitchen_note ? `<div class="item-note">↳ ${item.kitchen_note}</div>` : ""}
        `).join("")}
        <div class="divider"></div>
        <div class="row total-row">
          <span>TỔNG CỘNG:</span>
          <span>${totalAmount.toLocaleString("vi-VN")} đ</span>
        </div>
        <div class="divider"></div>
        <div class="center note" style="margin-top:8px;">Quý khách vui lòng ra quầy Thu Ngân để thanh toán.</div>
        <div class="center note">Xin chân thành cảm ơn quý khách!</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="text-[#FF5A5F]" size={20} />
            <h3 className="text-base font-bold text-gray-800">Phiếu tạm tính — {tableName}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Preview nội dung phiếu */}
        <div id="bill-print-area" className="p-6 max-h-[65vh] overflow-y-auto font-mono text-xs text-gray-800">
          {/* Tên nhà hàng */}
          <div className="text-center mb-1">
            <p className="font-black text-sm tracking-wider text-gray-900">NHÀ HÀNG RESMANAGER</p>
            <p className="text-[10px] text-gray-400">Hệ thống quản lý nhà hàng đa mô hình</p>
          </div>
          <div className="border-t border-dashed border-gray-300 my-2" />

          <div className="text-center font-black text-base text-gray-900 mb-0.5">PHIẾU TẠM TÍNH</div>
          <div className="text-center font-bold text-sm text-[#FF5A5F] mb-3">Bàn {tableName}</div>

          {/* Meta info */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between"><span className="text-gray-500">Mã Order:</span><span className="font-bold">#{orderId || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><Clock size={10} /> Ngày giờ:</span><span>{printDate} {printTime}</span></div>
            <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><User size={10} /> Nhân viên:</span><span>{waiterName}{employeeCode ? ` (${employeeCode})` : ""}</span></div>
          </div>

          {/* Khách hàng */}
          {(guestName || guestPhone || startTime) && (
            <>
              <div className="border-t border-dashed border-gray-300 my-2" />
              <div className="space-y-1 text-[11px] bg-gray-50 rounded-lg p-2">
                {guestName && <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><User size={10} /> Khách:</span><span className="font-bold">{guestName}</span></div>}
                {guestPhone && <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><Phone size={10} /> SĐT:</span><span>{guestPhone}</span></div>}
                {startTime && <div className="flex justify-between"><span className="text-gray-500 flex items-center gap-1"><Clock size={10} /> Giờ đến:</span><span>{startTime}</span></div>}
              </div>
            </>
          )}

          {/* Danh sách món */}
          <div className="border-t border-dashed border-gray-300 my-2" />
          <div className="grid text-[10px] font-bold text-gray-400 uppercase pb-1.5 mb-1 border-b border-gray-200" style={{ gridTemplateColumns: "1fr 110px 70px" }}>
            <span>TÊN MÓN</span>
            <span className="text-center">SL × ĐG</span>
            <span className="text-right">T.TIỀN</span>
          </div>
          <div className="space-y-1.5">
            {validItems.length === 0 ? (
              <p className="text-center text-gray-400 py-4">Chưa có món ăn nào.</p>
            ) : (
              validItems.map((item) => (
                <div key={item.id}>
                  <div className="grid text-[11px]" style={{ gridTemplateColumns: "1fr 110px 70px" }}>
                    <span className="text-gray-900 font-medium truncate pr-1">{item.item_name || (item as any).menu_item_name || "—"}</span>
                    <span className="text-center text-gray-500 whitespace-nowrap">{item.quantity} × {Number(item.unit_price).toLocaleString("vi-VN")}đ</span>
                    <span className="text-right font-semibold text-gray-800 whitespace-nowrap">{(item.quantity * Number(item.unit_price)).toLocaleString("vi-VN")}đ</span>
                  </div>
                  {item.kitchen_note && (
                    <p className="text-[10px] text-amber-500 italic pl-1">↳ {item.kitchen_note}</p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Tổng */}
          <div className="border-t-2 border-gray-800 mt-3 pt-2 flex justify-between items-center">
            <span className="font-black text-sm text-gray-900">TỔNG CỘNG:</span>
            <span className="font-black text-base text-[#FF5A5F]">{totalAmount.toLocaleString("vi-VN")} đ</span>
          </div>

          <div className="border-t border-dashed border-gray-300 mt-3 pt-2 text-center text-[10px] text-gray-400 italic">
            Quý khách vui lòng ra quầy Thu Ngân để thanh toán. Xin cảm ơn!
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-[#FF5A5F] px-5 py-2 text-xs font-bold text-white hover:bg-[#e0484d] transition-colors shadow-md cursor-pointer"
          >
            <Printer size={14} />
            In phiếu tạm tính
          </button>
        </div>
      </div>
    </div>
  );
};
