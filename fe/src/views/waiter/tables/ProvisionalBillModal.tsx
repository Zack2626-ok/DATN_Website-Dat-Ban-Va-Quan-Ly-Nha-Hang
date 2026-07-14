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
  const printDateTime = now.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const validItems = items.filter((item) => item.status !== "voided" && item.status !== "cancelled");
  const totalAmount = validItems.reduce(
    (sum, item) => sum + Number(item.unit_price) * item.quantity,
    0,
  );

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in">
        {/* Header Modal - Ẩn khi in */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-4 print:hidden">
          <div className="flex items-center gap-2">
            <Receipt className="text-[#FF5A5F]" size={20} />
            <h3 className="text-base font-bold text-gray-800">In phiếu tạm tính</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200/60 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nội dung Phiếu Tạm Tính */}
        <div className="p-6 print:p-0 max-h-[75vh] overflow-y-auto" id="printable-provisional-bill">
          {/* Tiêu đề */}
          <div className="text-center border-b border-dashed border-gray-300 pb-4 mb-4">
            <h2 className="text-lg font-black tracking-wide text-gray-900 uppercase">NHÀ HÀNG RESMANAGER</h2>
            <p className="text-xs text-gray-500 mt-0.5">Hệ thống quản lý nhà hàng đa mô hình</p>
            <div className="mt-3 inline-block rounded-md bg-gray-100 px-3 py-1 text-xs font-bold text-gray-800">
              PHIẾU TẠM TÍNH • {tableName}
            </div>
          </div>

          {/* Thông tin phiếu */}
          <div className="space-y-1.5 text-xs text-gray-600 border-b border-dashed border-gray-300 pb-4 mb-4">
            <div className="flex justify-between">
              <span>Mã Order:</span>
              <span className="font-semibold text-gray-800">#{orderId || "N/A"}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">
                <Clock size={12} className="text-gray-400" />
                Ngày giờ in phiếu:
              </span>
              <span className="font-bold text-gray-900">{printDateTime}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-1">
                <User size={12} className="text-gray-400" />
                Nhân viên phục vụ:
              </span>
              <span className="font-medium text-gray-800">
                {waiterName || "Nhân viên"} {employeeCode ? `(${employeeCode})` : ""}
              </span>
            </div>
          </div>

          {/* Thông tin khách */}
          {(guestName || guestPhone || startTime) && (
            <div className="space-y-1 text-xs text-gray-600 border-b border-dashed border-gray-300 pb-4 mb-4 bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase mb-1.5">Thông tin khách hàng</p>
              {guestName && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <User size={11} className="text-gray-400" />
                    Tên khách:
                  </span>
                  <span className="font-semibold text-gray-800">{guestName}</span>
                </div>
              )}
              {guestPhone && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Phone size={11} className="text-gray-400" />
                    Số điện thoại:
                  </span>
                  <span className="font-medium text-gray-800">{guestPhone}</span>
                </div>
              )}
              {startTime && (
                <div className="flex justify-between">
                  <span className="flex items-center gap-1">
                    <Clock size={11} className="text-gray-400" />
                    Thời gian đến:
                  </span>
                  <span className="font-medium text-gray-800">{startTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Bảng món ăn - dùng grid 3 cột cố định */}
          <div className="mb-4">
            {/* Header bảng */}
            <div className="grid text-[11px] font-bold text-gray-400 uppercase border-b border-gray-200 pb-2 mb-2" style={{ gridTemplateColumns: "1fr 130px 80px" }}>
              <span>Tên món</span>
              <span className="text-center">SL × Đơn giá</span>
              <span className="text-right">Thành tiền</span>
            </div>

            {/* Danh sách món */}
            <div className="space-y-2 max-h-56 overflow-y-auto print:max-h-none">
              {validItems.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-4">Chưa có món ăn nào trong order.</p>
              ) : (
                validItems.map((item) => (
                  <div
                    key={item.id}
                    className="grid text-xs items-start py-1 border-b border-gray-50"
                    style={{ gridTemplateColumns: "1fr 130px 80px" }}
                  >
                    {/* Tên món */}
                    <div className="text-gray-900 font-medium pr-2 min-w-0">
                      <span className="block">{item.item_name || (item as any).menu_item_name || "—"}</span>
                      {item.kitchen_note && (
                        <span className="text-[10px] text-gray-400 italic">{item.kitchen_note}</span>
                      )}
                    </div>
                    {/* SL × đơn giá */}
                    <div className="text-center text-gray-500 whitespace-nowrap">
                      {item.quantity} × {Number(item.unit_price).toLocaleString("vi-VN")}đ
                    </div>
                    {/* Thành tiền */}
                    <div className="text-right font-semibold text-gray-800 whitespace-nowrap">
                      {(item.quantity * Number(item.unit_price)).toLocaleString("vi-VN")}đ
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Tổng cộng */}
          <div className="border-t-2 border-gray-800 pt-3 pb-2 flex justify-between items-center">
            <span className="text-sm font-bold text-gray-900">TỔNG CỘNG:</span>
            <span className="text-lg font-black text-[#FF5A5F]">
              {totalAmount.toLocaleString("vi-VN")} đ
            </span>
          </div>

          <p className="text-[11px] text-center text-gray-400 italic mt-3">
            Quý khách vui lòng cầm phiếu tạm tính ra quầy Thu Ngân để thanh toán. Xin cảm ơn!
          </p>
        </div>

        {/* Footer actions - Ẩn khi in */}
        <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50 px-6 py-4 print:hidden">
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
