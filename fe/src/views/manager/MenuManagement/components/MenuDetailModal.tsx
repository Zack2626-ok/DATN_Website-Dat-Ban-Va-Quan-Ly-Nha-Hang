import React from "react";
import { X, CheckCircle2, XCircle } from "lucide-react";
import type { MenuItem } from "../../../../interfaces";

interface MenuDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  menuItem: MenuItem | null;
}

/**
 * MenuDetailModal - Modal to view menu item details
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
      bar: "Bar",
      cold_kitchen: "Bếp lạnh",
    };
    return labels[station] || station;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Chi tiết món ăn</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Image */}
          {menuItem.image_url && (
            <div className="w-full h-48 rounded-lg overflow-hidden">
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
              <p className="text-lg font-bold text-gray-900">{menuItem.name}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Giá
              </label>
              <p className="text-lg font-bold text-[#FF5A5F]">
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
              <p className="text-sm text-gray-900">{menuItem.category_name}</p>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trạm bếp
              </label>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {getKitchenStationLabel(menuItem.kitchen_station)}
              </span>
            </div>
          </div>

          {/* Description */}
          {menuItem.description && (
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Mô tả
              </label>
              <p className="text-sm text-gray-700 leading-relaxed">{menuItem.description}</p>
            </div>
          )}

          {/* Status Badges */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trạng thái
              </label>
              <div className="flex items-center gap-2">
                {menuItem.is_active ? (
                  <CheckCircle2 size={16} className="text-green-600" />
                ) : (
                  <XCircle size={16} className="text-red-600" />
                )}
                <span
                  className={`text-sm font-medium ${
                    menuItem.is_active ? "text-green-700" : "text-red-700"
                  }`}
                >
                  {menuItem.is_active ? "Đang bán" : "Ngừng bán"}
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Nổi bật
              </label>
              <div className="flex items-center gap-2">
                {menuItem.is_featured ? (
                  <CheckCircle2 size={16} className="text-green-600" />
                ) : (
                  <XCircle size={16} className="text-gray-400" />
                )}
                <span
                  className={`text-sm font-medium ${
                    menuItem.is_featured ? "text-green-700" : "text-gray-500"
                  }`}
                >
                  {menuItem.is_featured ? "Có" : "Không"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
