import React, { useState, useEffect, useMemo } from "react";
import { Printer, X, Receipt, Clock, User, Phone, QrCode } from "lucide-react";
import type { WaiterOrderItem } from "../../../services/waiterService";
import { getRestaurantInfo, type RestaurantInfo } from "../../../services/restaurantInfoService";
import { getComboConstituents } from "../../../utils/comboHelper";

interface ProvisionalBillModalProps {
  isOpen: boolean;
  onClose: () => void;
  tableName: string;
  orderId?: string | number;
  items: WaiterOrderItem[];
  subtotal?: number;
  tax?: number;
  depositAmount?: number;
  totalAmount?: number;
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
  subtotal,
  tax,
  depositAmount,
  totalAmount,
  waiterName,
  employeeCode,
  guestName,
  guestPhone,
  startTime,
}) => {
  if (!isOpen) return null;

  const [resInfo, setResInfo] = useState<RestaurantInfo | null>(null);
  useEffect(() => {
    getRestaurantInfo()
      .then(setResInfo)
      .catch(() => {});
  }, []);

  const now = new Date();
  const printDate = now.toLocaleDateString("vi-VN");
  const printTime = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const validItems = items.filter((item) => item.status !== "voided" && item.status !== "cancelled");
  const calcSubtotal = subtotal !== undefined ? subtotal : validItems.reduce(
    (sum, item) => sum + Number(item.unit_price) * item.quantity,
    0,
  );
  const currentTaxRate = resInfo?.tax_rate !== undefined ? resInfo.tax_rate : 8;
  const calcTax = tax !== undefined ? tax : Math.round(calcSubtotal * (currentTaxRate / 100));
  const calcDeposit = depositAmount || 0;
  const calcTotal = totalAmount !== undefined ? totalAmount : Math.max(0, calcSubtotal + calcTax - calcDeposit);

  const vietqrUrl = useMemo(() => {
    if (!resInfo?.bank_code || !resInfo?.bank_account) return "";
    const desc = `Thanh toan HD${String(orderId || "").slice(-6).toUpperCase()}`;
    return `https://img.vietqr.io/image/${resInfo.bank_code}-${resInfo.bank_account}-compact2.png?amount=${Math.round(calcTotal)}&addInfo=${encodeURIComponent(desc)}`;
  }, [resInfo, calcTotal, orderId]);

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
            font-size: 11px;
            width: 80mm;
            padding: 8px 8px;
            color: #000;
            background-color: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .lg { font-size: 13px; }
          .xl { font-size: 15px; }
          .divider { border-top: 1px dashed #000; margin: 8px 0; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; }
          .total-row { font-size: 13px; font-weight: bold; margin-top: 6px; }
          .note { font-size: 9px; color: #333; font-style: italic; margin-top: 4px; }
          .item-note { font-size: 9px; color: #555; padding-left: 10px; margin-top: 1px; }
          .item-block { margin: 6px 0; }
          @media print {
            @page {
              size: auto;
              margin: 0mm;
            }
            body {
              margin: 8mm 6mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="center bold lg">NHÀ HÀNG RESMANAGER</div>
        <div class="center" style="font-size:9px; margin-top:2px;">Địa chỉ: 123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM</div>
        <div class="center" style="font-size:9px;">Hotline: 028 3829 4000</div>
        <div class="divider"></div>
        <div class="center bold xl" style="margin: 4px 0;">PHIẾU TẠM TÍNH</div>
        <div class="center bold lg" style="margin-bottom:6px;">${tableName}</div>
        <div class="divider"></div>
        <div class="row"><span>Mã Order:</span><span class="bold">#${orderId || "N/A"}</span></div>
        <div class="row"><span>Thời gian in:</span><span>${printDate} ${printTime}</span></div>
        <div class="row"><span>Nhân viên:</span><span>${waiterName || "Nhân viên"}${employeeCode ? " (" + employeeCode + ")" : ""}</span></div>
        ${guestName || guestPhone || startTime ? `
        <div class="divider"></div>
        ${guestName ? `<div class="row"><span>Khách:</span><span class="bold">${guestName}</span></div>` : ""}
        ${guestPhone ? `<div class="row"><span>SĐT:</span><span>${guestPhone}</span></div>` : ""}
        ${startTime ? `<div class="row"><span>Giờ đến:</span><span>${startTime}</span></div>` : ""}
        ` : ""}
        <div class="divider"></div>
        ${validItems.map(item => {
          const itemName = item.item_name || (item as any).menu_item_name || "—";
          const constituents = getComboConstituents(itemName);
          const subItemsHtml = constituents 
            ? `<div style="font-size: 9px; color: #555; padding-left: 12px; margin-top: 2px; line-height: 1.2;">
                ${constituents.map(sub => `<div>• ${sub}</div>`).join("")}
               </div>`
            : "";
          return `
            <div class="item-block">
              <div class="bold" style="font-size: 11px;">${itemName}</div>
              <div style="display: flex; justify-content: space-between; padding-left: 10px; margin-top: 2px;">
                <span>${item.quantity} x ${Number(item.unit_price).toLocaleString("vi-VN")}</span>
                <span class="bold">${(item.quantity * Number(item.unit_price)).toLocaleString("vi-VN")}đ</span>
              </div>
              ${subItemsHtml}
              ${item.kitchen_note ? `<div class="item-note">↳ ${item.kitchen_note}</div>` : ""}
            </div>
          `;
        }).join("")}
        <div class="divider"></div>
        <div class="row">
          <span>Tạm tính (món):</span>
          <span>${calcSubtotal.toLocaleString("vi-VN")} đ</span>
        </div>
        <div class="row">
          <span>VAT (${currentTaxRate}%):</span>
          <span>+${calcTax.toLocaleString("vi-VN")} đ</span>
        </div>
        ${calcDeposit > 0 ? `
        <div class="row" style="color: #c2410c;">
          <span>Tiền cọc đặt bàn:</span>
          <span>-${calcDeposit.toLocaleString("vi-VN")} đ</span>
        </div>
        ` : ""}
        <div class="divider"></div>
        <div class="row total-row">
          <span>TỔNG THANH TOÁN:</span>
          <span>${calcTotal.toLocaleString("vi-VN")} đ</span>
        </div>
        <div class="divider"></div>

        ${vietqrUrl ? `
        <div style="text-align: center; margin-top: 10px; padding: 8px; border: 1px dashed #000; border-radius: 4px;">
          <p class="bold" style="font-size:10px;">Quét mã VietQR để thanh toán</p>
          <img src="${vietqrUrl}" alt="VietQR" style="width: 120px; height: 120px; margin-top: 4px;" />
          <p class="bold" style="margin-top:4px; font-size:9px;">${resInfo?.bank_name}</p>
          <p style="font-size:9px;">STK: ${resInfo?.bank_account} - ${resInfo?.bank_account_name}</p>
          <p style="font-size:8px; color:#555; margin-top:2px;">Nội dung: Thanh toan HD${String(orderId || "").slice(-6).toUpperCase()}</p>
        </div>
        <div class="divider"></div>
        ` : ""}

        <div class="center note" style="margin-top:8px;">Quý khách vui lòng ra quầy Thu Ngân để thanh toán.</div>
        <div class="center note">Xin chân thành cảm ơn quý khách!</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => {
      printWindow?.close();
    };
    setTimeout(() => {
      if (printWindow) {
        printWindow.print();
      }
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-sky-50 bg-sky-50/50 px-6 py-4">
          <div className="flex items-center gap-2">
            <Receipt className="text-sky-600" size={20} />
            <h3 className="text-base font-bold text-slate-700">Phiếu tạm tính — {tableName}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200/60 hover:text-slate-500 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Preview nội dung phiếu */}
        <div id="bill-print-area" className="p-6 max-h-[65vh] overflow-y-auto font-mono text-xs text-slate-700">
          {/* Tên nhà hàng */}
          <div className="text-center mb-1">
            <p className="font-black text-sm tracking-wider text-slate-800">NHÀ HÀNG RESMANAGER</p>
            <p className="text-[10px] text-gray-400">Hệ thống quản lý nhà hàng đa mô hình</p>
          </div>
          <div className="border-t border-dashed border-sky-200 my-2" />

          <div className="text-center font-black text-base text-slate-800 mb-0.5">PHIẾU TẠM TÍNH</div>
          <div className="text-center font-bold text-sm text-sky-600 mb-3">Bàn {tableName}</div>

          {/* Meta info */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between"><span className="text-slate-400">Mã Order:</span><span className="font-bold">#{orderId || "N/A"}</span></div>
            <div className="flex justify-between"><span className="text-slate-400 flex items-center gap-1"><Clock size={10} /> Ngày giờ:</span><span>{printDate} {printTime}</span></div>
            <div className="flex justify-between"><span className="text-slate-400 flex items-center gap-1"><User size={10} /> Nhân viên:</span><span>{waiterName}{employeeCode ? ` (${employeeCode})` : ""}</span></div>
          </div>

          {/* Khách hàng */}
          {(guestName || guestPhone || startTime) && (
            <>
              <div className="border-t border-dashed border-sky-200 my-2" />
              <div className="space-y-1 text-[11px] bg-sky-50/50 rounded-lg p-2">
                {guestName && <div className="flex justify-between"><span className="text-slate-400 flex items-center gap-1"><User size={10} /> Khách:</span><span className="font-bold">{guestName}</span></div>}
                {guestPhone && <div className="flex justify-between"><span className="text-slate-400 flex items-center gap-1"><Phone size={10} /> SĐT:</span><span>{guestPhone}</span></div>}
                {startTime && <div className="flex justify-between"><span className="text-slate-400 flex items-center gap-1"><Clock size={10} /> Giờ đến:</span><span>{startTime}</span></div>}
              </div>
            </>
          )}

          {/* Danh sách món */}
          <div className="border-t border-dashed border-sky-200 my-2" />
          <div className="space-y-2">
            {validItems.length === 0 ? (
              <p className="text-center text-gray-400 py-4">Chưa có món ăn nào.</p>
            ) : (
              validItems.map((item) => {
                const itemName = item.item_name || (item as any).menu_item_name || "—";
                const constituents = getComboConstituents(itemName);
                return (
                  <div key={item.id} className="py-1 border-b border-sky-50 last:border-0 animate-fade-in">
                    <div className="font-bold text-slate-800 text-[11px] leading-tight">
                      {itemName}
                    </div>
                    <div className="flex justify-between text-[11px] pl-2.5 text-slate-500 mt-0.5">
                      <span>{item.quantity} × {Number(item.unit_price).toLocaleString("vi-VN")}đ</span>
                      <span className="font-bold text-slate-700">{(item.quantity * Number(item.unit_price)).toLocaleString("vi-VN")}đ</span>
                    </div>
                    {constituents && (
                      <div className="pl-2.5 mt-1 flex flex-col gap-0.5">
                        <span className="text-[9px] text-sky-600 font-extrabold uppercase tracking-wider block">Gồm có:</span>
                        <div className="grid grid-cols-1 gap-0.5">
                          {constituents.map((sub, sIdx) => (
                            <div key={sIdx} className="text-[10px] text-slate-500 font-semibold flex items-center gap-1">
                              <span className="h-0.5 w-0.5 rounded-full bg-sky-400"></span>
                              {sub}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.kitchen_note && (
                      <p className="text-[10px] text-sky-600 italic pl-2.5 mt-0.5">↳ {item.kitchen_note}</p>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Tổng chi phí */}
          <div className="border-t-2 border-gray-800 mt-3 pt-2 space-y-1.5 text-xs">
            <div className="flex justify-between items-center text-slate-600">
              <span>Tạm tính (món):</span>
              <span className="font-bold">{calcSubtotal.toLocaleString("vi-VN")} đ</span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>VAT ({currentTaxRate}%):</span>
              <span className="font-bold">+{calcTax.toLocaleString("vi-VN")} đ</span>
            </div>
            {calcDeposit > 0 && (
              <div className="flex justify-between items-center text-amber-600 font-medium">
                <span>Tiền cọc đặt bàn:</span>
                <span className="font-bold">-{calcDeposit.toLocaleString("vi-VN")} đ</span>
              </div>
            )}
            <div className="border-t border-gray-300 pt-1.5 flex justify-between items-center">
              <span className="font-black text-sm text-slate-800 uppercase">TỔNG THANH TOÁN:</span>
              <span className="font-black text-base text-sky-600">{calcTotal.toLocaleString("vi-VN")} đ</span>
            </div>
          </div>

          <div className="border-t border-dashed border-sky-200 mt-3 pt-2 text-center text-[10px] text-gray-400 italic">
            Quý khách vui lòng ra quầy Thu Ngân để thanh toán. Xin cảm ơn!
          </div>

          {vietqrUrl && (
            <div className="mt-4 flex flex-col items-center gap-1.5 bg-blue-50/50 border border-blue-100 rounded-xl p-3">
              <span className="text-[10px] font-bold text-blue-700 flex items-center gap-1">
                <QrCode size={12} /> Quét mã VietQR thanh toán tại bàn
              </span>
              <img
                src={vietqrUrl}
                alt="VietQR"
                className="w-36 h-36 rounded-lg border border-blue-100 bg-white"
              />
              <span className="text-[9px] text-slate-500 font-semibold text-center leading-normal">
                {resInfo?.bank_name}<br />
                STK: {resInfo?.bank_account} - {resInfo?.bank_account_name}
              </span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-sky-50 bg-sky-50/50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-sky-100 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-sky-100 transition-colors cursor-pointer"
          >
            Đóng
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-sky-500 px-5 py-2 text-xs font-bold text-white hover:bg-sky-600 transition-colors shadow-md cursor-pointer"
          >
            <Printer size={14} />
            In phiếu tạm tính
          </button>
        </div>
      </div>
    </div>
  );
};
