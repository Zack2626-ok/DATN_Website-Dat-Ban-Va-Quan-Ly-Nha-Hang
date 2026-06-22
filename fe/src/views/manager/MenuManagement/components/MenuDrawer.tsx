import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import type { MenuItem, Category } from "../../../../interfaces";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: any) => void;
  editingItem: MenuItem | null;
  categories: Category[];
}

/**
 * MenuDrawer - Slide-out drawer for creating/editing menu items
 */
export const MenuDrawer: React.FC<MenuDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  categories,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    price: 0,
    kitchen_station: "hot_kitchen" as const,
    category_id: "",
    image_url: "",
    is_active: true,
    description: "",
    is_featured: false,
  });

  useEffect(() => {
    if (editingItem) {
      setFormData({
        name: editingItem.name,
        price: editingItem.price,
        kitchen_station: editingItem.kitchen_station,
        category_id: String(editingItem.category_id),
        image_url: editingItem.image_url || "",
        is_active: editingItem.is_active,
        description: editingItem.description || "",
        is_featured: editingItem.is_featured || false,
      });
    } else {
      setFormData({
        name: "",
        price: 0,
        kitchen_station: "hot_kitchen",
        category_id: categories[0]?.id ? String(categories[0].id) : "",
        image_url: "",
        is_active: true,
        description: "",
        is_featured: false,
      });
    }
  }, [editingItem, categories]);

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
            {editingItem ? "Sửa món ăn" : "Thêm món ăn mới"}
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
              Tên món ăn <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
              placeholder="Nhập tên món ăn"
            />
          </div>

          {/* Price */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Giá (VNĐ) <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="number"
              required
              min="0"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
              placeholder="Nhập giá"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Danh mục <span className="text-[#FF5A5F]">*</span>
            </label>
            <select
              value={formData.category_id}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F] bg-white"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kitchen Station */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Trạm bếp
            </label>
            <select
              value={formData.kitchen_station}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  kitchen_station: e.target.value as any,
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F] bg-white"
            >
              <option value="hot_kitchen">Bếp nóng</option>
              <option value="bar">Bar</option>
              <option value="cold_kitchen">Bếp lạnh</option>
            </select>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              URL ảnh
            </label>
            <input
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
              placeholder="https://example.com/image.jpg"
            />
            {formData.image_url && (
              <img
                src={formData.image_url}
                alt="Preview"
                className="mt-2 w-full h-32 object-cover rounded-lg border border-gray-200"
              />
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Mô tả
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
              placeholder="Mô tả ngắn gọn về món ăn"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-4">
            {/* Is Active */}
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

            {/* Is Featured */}
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Hiển thị trang chủ</span>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, is_featured: !formData.is_featured })}
                className={`w-11 h-6 rounded-full transition-colors ${
                  formData.is_featured ? "bg-[#FF5A5F]" : "bg-gray-300"
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                    formData.is_featured ? "translate-x-6" : "translate-x-0.5"
                  }`}
                />
              </button>
            </div>
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
