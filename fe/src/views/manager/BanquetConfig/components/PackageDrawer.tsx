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
        <div className="sticky top-0 bg-white border-b border-sky-100 px-6 py-4 flex justify-between items-center z-10">
          <h2 className="text-lg font-bold text-slate-700">
            {editingPackage ? "Sửa gói tiệc" : "Thêm gói tiệc mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sky-100 rounded-full transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              Tên gói <span className="text-sky-600">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
              placeholder="Nhập tên gói"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              Giá / Người (VNĐ) <span className="text-sky-600">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.price_per_person}
              onChange={(e) => setFormData({ ...formData, price_per_person: parseInt(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
              placeholder="Nhập giá"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-2">
              Mô tả
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
              placeholder="Mô tả chi tiết về gói"
            />
          </div>

          {/* Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-600">Kích hoạt</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
              className={`w-11 h-6 rounded-full transition-colors ${
                formData.is_active ? "bg-sky-500" : "bg-gray-300"
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
          <div className="pt-4 border-t border-sky-100 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-sky-200 text-slate-600 rounded-lg hover:bg-sky-50/50 transition-colors font-medium"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-[#ff4449] transition-colors font-medium flex items-center justify-center gap-2"
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
