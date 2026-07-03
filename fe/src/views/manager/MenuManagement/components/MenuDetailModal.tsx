import React from "react";
import { X, CheckCircle2, XCircle } from "lucide-react";
import type { MenuItem } from "../../../../interfaces";

interface MenuDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItem | null;
}

/**
 * MenuDetailModal - Modal to view menu item details including custom modifier groups
 */
export const MenuDetailModal: React.FC<MenuDetailModalProps> = ({
  isOpen,
  onClose,
  menuItem,
}) => {
  if (!isOpen || !menuItem) return null;

  const getKitchenStationLabel = (station: string) => {
    const labels: Record<string, string> = {
      hot_kitchen: "Bếp nóng",
      bar: "Quầy Bar",
      cold_kitchen: "Bếp lạnh",
    };
    return labels[station] || station;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-150">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Chi tiết món ăn</h2>
            <p className="text-xs text-gray-500 mt-0.5">Thông tin chi tiết và tùy chọn tùy chỉnh</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors focus:outline-none"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Image */}
          {menuItem.image_url && (
            <div className="w-full h-44 rounded-xl overflow-hidden border border-gray-150">
              <img
                src={menuItem.image_url}
                alt={menuItem.name}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Name & Price */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tên món
              </label>
              <p className="text-base font-bold text-gray-900">{menuItem.name}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Giá bán
              </label>
              <p className="text-base font-bold text-[#FF5A5F]">
                {menuItem.price.toLocaleString("vi-VN")}₫
              </p>
            </div>
          </div>

          {/* Category & Kitchen Station */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Danh mục
              </label>
              <p className="text-sm font-medium text-gray-800">{menuItem.category_name || "Món chính"}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trạm chế biến
              </label>
              <div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-155">
                  {getKitchenStationLabel(menuItem.kitchen_station)}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          {menuItem.description && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Mô tả
              </label>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-3 rounded-lg border border-gray-100">
                {menuItem.description}
              </p>
            </div>
          )}

          {/* Status Badges */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trạng thái hoạt động
              </label>
              <div className="flex items-center gap-2">
                {menuItem.is_active ? (
                  <CheckCircle2 size={16} className="text-green-600" />
                ) : (
                  <XCircle size={16} className="text-red-600" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    menuItem.is_active ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {menuItem.is_active ? "Đang bán" : "Ngừng bán"}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trang chủ nổi bật
              </label>
              <div className="flex items-center gap-2">
                {menuItem.is_featured ? (
                  <CheckCircle2 size={16} className="text-green-600" />
                ) : (
                  <XCircle size={16} className="text-gray-400" />
                )}
                <span
                  className={`text-sm font-semibold ${
                    menuItem.is_featured ? "text-green-700" : "text-gray-550"
                  }`}
                >
                  {menuItem.is_featured ? "Có" : "Không"}
                </span>
              </div>
            </div>
          </div>

          {/* Modifier Groups Detail */}
          {menuItem.modifier_groups && menuItem.modifier_groups.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider block">
                Nhóm tùy chọn đi kèm
              </label>
              <div className="space-y-3 bg-gray-50 p-3 rounded-xl border border-gray-150 max-h-48 overflow-y-auto">
                {menuItem.modifier_groups.map((group, idx) => (
                  <div key={idx} className="text-sm border-b border-gray-200/50 last:border-0 pb-2.5 last:pb-0">
                    <div className="flex items-center justify-between font-bold text-gray-800">
                      <span>{group.name}</span>
                      <span className="text-[10px] font-normal text-gray-400 bg-white px-2 py-0.5 rounded border border-gray-200">
                        {group.is_required
                          ? `Bắt buộc (Chọn ${group.min_select} - ${group.max_select})`
                          : `Tự chọn (Tối đa ${group.max_select})`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {group.modifiers.map((m, mIdx) => (
                        <span
                          key={mIdx}
                          className="inline-flex items-center px-2 py-0.5 rounded bg-white text-xs font-medium border border-gray-200 text-gray-600 shadow-sm"
                        >
                          {m.name}
                          {Number(m.extra_price) > 0 && (
                            <span className="text-[#FF5A5F] ml-0.5">
                              (+{Number(m.extra_price).toLocaleString("vi-VN")}₫)
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium text-sm focus:outline-none"
          >
            Đóng lại
          </button>
        </div>
      </div>
    </div>
  );
};
