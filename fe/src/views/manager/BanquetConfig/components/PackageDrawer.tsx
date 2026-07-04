import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";

interface EventPackage {
  id: number;
  name: string;
  price_per_person: number;
  description: string;
  is_active: boolean;
  items?: any[];
}

interface PackageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (pkg: Omit<EventPackage, "id">) => void;
  editingPackage: EventPackage | null;
}

/**
 * PackageDrawer - Drawer tạo/sửa gói tiệc
 */
export const PackageDrawer: React.FC<PackageDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPackage,
}) => {
  const [formData, setFormData] = useState<Omit<EventPackage, "id">>({
    name: "",
    price_per_person: 0,
    description: "",
    is_active: true,
  });

  useEffect(() => {
    if (editingPackage) {
      setFormData(editingPackage);
    } else {
      setFormData({
        name: "",
        price_per_person: 0,
        description: "",
        is_active: true,
      });
    }
  }, [editingPackage]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white shadow-xl h-full overflow-y-auto animate-slide-in">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-lg font-bold text-gray-800">
            {editingPackage ? "Sửa gói tiệc" : "Thêm gói tiệc mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Tên gói <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
              placeholder="Nhập tên gói"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Giá / Người (VNĐ) <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.price_per_person}
              onChange={(e) => setFormData({ ...formData, price_per_person: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
              placeholder="Nhập giá"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mô tả
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
              placeholder="Mô tả chi tiết về gói"
            />
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Kích hoạt</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={`w-11 h-6 rounded-full transition-colors ${
                formData.is_active ? "bg-[#FF5A5F]" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  formData.is_active ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-[#FF5A5F] text-white rounded-lg hover:bg-[#ff4449] transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Save size={18} />
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
