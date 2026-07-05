import React, { useEffect, useRef } from "react";
import { MoreVertical, Users, ArrowLeftRight, Link2, Copy, Eye, FileText, CheckCircle, XCircle, Edit, Trash2 } from "lucide-react";
import type { ResmanagerTable } from "../../../../services/tableService";

interface TableCardProps {
  table: ResmanagerTable;
  onAction: (action: string, table: ResmanagerTable) => void;
  isBottomRow?: boolean;
  showMenu: boolean;
  onToggleMenu: (isOpen: boolean) => void;
  showCrud?: boolean;
}

export const TableCard: React.FC<TableCardProps> = ({
  table,
  onAction,
  isBottomRow = false,
  showMenu,
  onToggleMenu,
  showCrud = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(event.target as Node)) {
        onToggleMenu(false);
      }
    };
    if (showMenu) {
      document.addEventListener("click", handleClickOutside);
    }
    return () => {
      document.removeEventListener("click", handleClickOutside);
    };
  }, [showMenu, onToggleMenu]);

  // Chọn style màu sắc dựa vào trạng thái ENUM của bàn
  const getStatusStyles = (status: ResmanagerTable["status"]) => {
    switch (status) {
      case "empty":
        return {
          bg: "bg-slate-50 border-slate-200 hover:bg-slate-100/80",
          text: "text-slate-700",
          badge: "bg-slate-100 text-slate-700 border-slate-300",
          label: "Trống",
        };
      case "reserved":
        return {
          bg: "bg-amber-50 border-amber-200 hover:bg-amber-100/80",
          text: "text-amber-800",
          badge: "bg-amber-100 text-amber-800 border-amber-300",
          label: "Đặt trước",
        };
      case "serving":
        return {
          bg: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100/80",
          text: "text-emerald-700",
          badge: "bg-emerald-100 text-emerald-700 border-emerald-300",
          label: "Đang phục vụ",
        };
      case "pending_payment":
        return {
          bg: "bg-rose-50 border-rose-200 hover:bg-rose-100/80",
          text: "text-rose-700",
          badge: "bg-rose-100 text-rose-700 border-rose-300",
          label: "Chờ thanh toán",
        };
      default:
        return {
          bg: "bg-gray-50 border-gray-200 hover:bg-gray-100",
          text: "text-gray-800",
          badge: "bg-gray-100 text-gray-800",
          label: "Không xác định",
        };
    }
  };

  const styles = getStatusStyles(table.status);

  const handleMenuClick = (e: React.MouseEvent, action: string) => {
    e.stopPropagation();
    onToggleMenu(false);
    onAction(action, table);
  };

  // Chỉ cho xóa bàn khi trạng thái là trống (empty) và không có khách đặt trước/phục vụ
  const canDelete = table.status === "empty" && !table.guest_name;

  return (
    <div
      ref={cardRef}
      onClick={() => onToggleMenu(true)}
      className={`relative w-full h-full min-h-[96px] rounded-xl border p-3 flex flex-col justify-between shadow-xs transition-all cursor-pointer select-none group ${styles.bg}`}
    >
      {/* Nút hành động nhanh ở góc */}
      <div className="absolute top-2 right-2 z-10">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleMenu(!showMenu);
          }}
          className="p-1 hover:bg-black/5 rounded-md text-gray-500 hover:text-gray-800 transition-colors"
        >
          <MoreVertical size={14} />
        </button>

        {/* Dropdown Menu hành động */}
        {showMenu && (
          <div className={`absolute right-0 w-44 rounded-lg border border-gray-100 bg-white p-1 shadow-md z-30 animate-fade-in text-left ${isBottomRow ? "bottom-full mb-1" : "top-full mt-1"}`}>
              <div className="px-2 py-1 text-[10px] font-bold text-gray-400 border-b border-gray-100 uppercase tracking-wider">
                Thao tác: {table.name}
              </div>

              {/* Trạng thái BÀN TRỐNG */}
              {table.status === "empty" && (
                <>
                  <button
                    onClick={(e) => handleMenuClick(e, "open")}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <CheckCircle size={12} className="text-green-600" />
                    Mở bàn mới
                  </button>
                  <button
                    onClick={(e) => handleMenuClick(e, "reserve")}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Users size={12} className="text-amber-600" />
                    Đặt trước
                  </button>
                </>
              )}

              {/* Trạng thái ĐẶT TRƯỚC */}
              {table.status === "reserved" && (
                <>
                  <button
                    onClick={(e) => handleMenuClick(e, "checkin")}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <CheckCircle size={12} className="text-green-600" />
                    Nhận bàn (Check-in)
                  </button>
                  <button
                    onClick={(e) => handleMenuClick(e, "cancel_reserve")}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <XCircle size={12} className="text-red-500" />
                    Hủy đặt bàn
                  </button>
                </>
              )}

              {/* Trạng thái ĐANG PHỤC VỤ */}
              {table.status === "serving" && (
                <>
                  <button
                    onClick={(e) => handleMenuClick(e, "view_order")}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                  >
                    <Eye size={12} className="text-blue-600" />
                    Xem order
                  </button>
                  <button
                    onClick={(e) => handleMenuClick(e, "transfer")}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <ArrowLeftRight size={12} className="text-indigo-600" />
                    Chuyển bàn
                  </button>
                  <button
                    onClick={(e) => handleMenuClick(e, "merge")}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Link2 size={12} className="text-purple-600" />
                    Gộp bàn
                  </button>
                  <button
                    onClick={(e) => handleMenuClick(e, "split")}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Copy size={12} className="text-pink-600" />
                    Tách bàn
                  </button>
                  {(table.is_merged_primary || table.is_merged_child) && (
                    <button
                      onClick={(e) => handleMenuClick(e, "unmerge")}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100 mt-1"
                    >
                      <XCircle size={12} className="text-red-500" />
                      Bỏ gộp bàn
                    </button>
                  )}
                  <button
                    onClick={(e) => handleMenuClick(e, "request_payment")}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-rose-600 hover:bg-rose-50 transition-colors border-t border-gray-100 mt-1 font-semibold"
                  >
                    <FileText size={12} className="text-rose-500" />
                    Yêu cầu thanh toán
                  </button>
                </>
              )}

              {/* Trạng thái CHỜ THANH TOÁN */}
              {table.status === "pending_payment" && (
                <>
                  <button
                    onClick={(e) => handleMenuClick(e, "view_invoice")}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-50 transition-colors font-semibold"
                  >
                    <FileText size={12} className="text-purple-600" />
                    Thanh toán hóa đơn
                  </button>
                </>
              )}

              {/* Quản lý danh sách bàn (CRUD) */}
              {showCrud && (
                <div className="border-t border-gray-100 mt-1 pt-1">
                  <button
                    type="button"
                    onClick={(e) => handleMenuClick(e, "edit_table")}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    <Edit size={12} className="text-gray-500" />
                    Sửa thông tin
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleMenuClick(e, "delete_table")}
                    disabled={!canDelete}
                    className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 disabled:opacity-40 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors font-medium"
                    title={!canDelete ? "Chỉ được xóa khi bàn trống và không có lịch đặt trước" : ""}
                  >
                    <Trash2 size={12} className="text-red-500" />
                    Xóa bàn ăn
                  </button>
                </div>
              )}
            </div>
        )}
      </div>

      {/* Thông tin bàn và trạng thái */}
      <div>
        <div className="flex items-center gap-1.5">
          <span className={`text-base font-black font-display ${styles.text}`}>
            {table.name}
          </span>
          {/* Trạng thái đang gộp hay tách bàn */}
          {table.is_merged_primary && (
            <span className="bg-purple-100 text-purple-700 text-[8px] font-black px-1 py-0.5 rounded-sm uppercase">
              Mẹ
            </span>
          )}
          {table.is_merged_child && (
            <span className="bg-gray-100 text-gray-600 text-[8px] font-black px-1 py-0.5 rounded-sm uppercase">
              Con
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-400 font-semibold mt-0.5 flex items-center gap-1">
          <Users size={10} />
          Sức chứa: {table.capacity} người
        </p>
      </div>

      {/* Footer của Card hiển thị chi tiết phụ */}
      <div className="flex flex-col gap-0.5 mt-2">
        {/* Tên khách nếu đang dùng hoặc đặt trước */}
        {table.guest_name && (
          <p className="text-[10px] font-bold text-gray-600 truncate">
            👤 {table.guest_name}
          </p>
        )}

        {/* Thông tin gộp bàn */}
        {table.is_merged_primary && table.merged_tables && table.merged_tables.length > 0 && (
          <p className="text-[9px] font-bold text-purple-600 truncate">
            🔗 Gộp với: {table.merged_tables.map((t) => t.name).join(", ")}
          </p>
        )}
        {table.is_merged_child && table.merged_into && (
          <p className="text-[9px] font-bold text-gray-500 truncate">
            🔗 Gộp vào: {table.merged_into.name}
          </p>
        )}

        {/* Badge trạng thái */}
        <div className="mt-1 flex justify-between items-center">
          <span className={`px-2 py-0.5 text-[9px] font-black uppercase rounded-md border ${styles.badge}`}>
            {styles.label}
          </span>
          <span className="text-[9px] font-black text-gray-300 uppercase">
            {table.row_pos}-{table.col_pos}
          </span>
        </div>
      </div>
    </div>
  );
};

export default TableCard;
