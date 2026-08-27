import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { toast } from "react-hot-toast";
import type { MenuItem, Category } from "../../../../interfaces";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<MenuItem, "id" | "created_at" | "updated_at">) => void;
  editingItem: MenuItem | null;
  categories: Category[];
}



/**
 * MenuDrawer - Slide-out form drawer for creating and editing menu items.
 * Supports nesting Level 2 Modifier Groups and Level 3 Modifier Options.
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
    kitchen_station: "hot_kitchen" as "hot_kitchen" | "bar" | "cold_kitchen",
    category_id: "",
    image_url: "",
    is_active: true,
    description: "",
    is_featured: false,
  });

  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Field-specific validation errors for inline red text and outlines
  const [fieldErrors, setFieldErrors] = useState<any>({});

  useEffect(() => {
    setValidationError(null);
    setFieldErrors({});
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
  }, [editingItem, categories, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    const errors: any = {};
    let firstErrorMsg = "";

    // 1. Basic Form Validations
    if (!formData.name.trim()) {
      errors.name = "Tên món ăn không được để trống.";
      if (!firstErrorMsg) firstErrorMsg = errors.name;
    }

    if (formData.price === undefined || formData.price < 0) {
      errors.price = "Giá bán phải là số dương hoặc bằng 0.";
      if (!firstErrorMsg) firstErrorMsg = errors.price;
    }

    if (!formData.category_id) {
      errors.category_id = "Vui lòng chọn danh mục cho món ăn.";
      if (!firstErrorMsg) firstErrorMsg = errors.category_id;
    }

    // If there are validation errors, cancel submission and display logs
    if (Object.keys(errors).length > 0) {
      console.log("Validation Error: ", errors);
      setFieldErrors(errors);
      setValidationError(firstErrorMsg);
      toast.error(firstErrorMsg);

      // Scroll form body to top so the validation error banner is visible
      const formElement = document.getElementById("menu-drawer-form");
      if (formElement) {
        formElement.scrollTo({ top: 0, behavior: "smooth" });
      }
      return;
    }

    // Clean states on successful submit
    setFieldErrors({});
    setValidationError(null);

    onSave({
      ...formData,
      category_name: categories.find((c) => String(c.id) === formData.category_id)?.name || "",
      modifier_groups: [],
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-xl h-full flex flex-col animate-slide-in">
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white border-b border-sky-100 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-700">
              {editingItem ? "Cập nhật món ăn" : "Thêm món ăn mới"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Thiết lập thông tin món và tùy chọn đi kèm</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-sky-100 rounded-full transition-colors">
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="menu-drawer-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          
          {/* Validation Alert */}
          {validationError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2.5">
              <span className="text-red-500 text-lg">⚠️</span>
              <div>
                <div className="font-semibold mb-0.5">Lỗi kiểm tra dữ liệu</div>
                <div className="font-medium text-red-600/90">{validationError}</div>
              </div>
            </div>
          )}

          {/* Section 1: Basic Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider border-b border-sky-50 pb-2">
              Thông tin món ăn
            </h3>
            
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                Tên món ăn <span className="text-sky-600">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (fieldErrors.name) setFieldErrors({ ...fieldErrors, name: undefined });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-shadow ${
                  fieldErrors.name
                    ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                    : "border-sky-200 focus:ring-sky-500/20 focus:border-sky-500"
                }`}
                placeholder="Ví dụ: Bò lúc lắc, Trà đào sả..."
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-500 mt-1 font-semibold">{fieldErrors.name}</p>
              )}
            </div>

            {/* Price */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                Giá bán (VNĐ) <span className="text-sky-600">*</span>
              </label>
              <input
                type="number"
                min="0"
                value={formData.price}
                onChange={(e) => {
                  setFormData({ ...formData, price: Number(e.target.value) || 0 });
                  if (fieldErrors.price) setFieldErrors({ ...fieldErrors, price: undefined });
                }}
                className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-shadow ${
                  fieldErrors.price
                    ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                    : "border-sky-200 focus:ring-sky-500/20 focus:border-sky-500"
                }`}
                placeholder="Nhập giá bán món ăn"
              />
              {fieldErrors.price && (
                <p className="text-xs text-red-500 mt-1 font-semibold">{fieldErrors.price}</p>
              )}
            </div>

            {/* Category & Kitchen Station */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                  Danh mục <span className="text-sky-600">*</span>
                </label>
                <select
                  value={formData.category_id}
                  onChange={(e) => {
                    setFormData({ ...formData, category_id: e.target.value });
                    if (fieldErrors.category_id) setFieldErrors({ ...fieldErrors, category_id: undefined });
                  }}
                  className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white transition-shadow ${
                    fieldErrors.category_id
                      ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                      : "border-sky-200 focus:ring-sky-500/20 focus:border-sky-500"
                  }`}
                >
                  <option value="">-- Chọn danh mục --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
                {fieldErrors.category_id && (
                  <p className="text-xs text-red-500 mt-1 font-semibold">{fieldErrors.category_id}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                  Trạm chế biến
                </label>
                <select
                  value={formData.kitchen_station}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      kitchen_station: e.target.value as "hot_kitchen" | "bar" | "cold_kitchen",
                    })
                  }
                  className="w-full px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white transition-shadow"
                >
                  <option value="hot_kitchen">Bếp nóng</option>
                  <option value="bar">Quầy Bar</option>
                  <option value="cold_kitchen">Bếp lạnh</option>
                </select>
              </div>
            </div>

            {/* Image URL */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                Đường dẫn ảnh món ăn
              </label>
              <input
                type="url"
                value={formData.image_url}
                onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                className="w-full px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-shadow"
                placeholder="https://example.com/image.jpg"
              />
              {formData.image_url && (
                <div className="mt-2 relative rounded-lg overflow-hidden border border-sky-100 h-28 w-full bg-sky-50/50 flex items-center justify-center">
                  <img src={formData.image_url} alt="Preview" className="h-full w-full object-cover" />
                </div>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-slate-600 mb-1.5">
                Mô tả chi tiết
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="w-full px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-shadow"
                placeholder="Mô tả nguyên liệu, hương vị..."
              />
            </div>

            {/* Status Toggles */}
            <div className="bg-sky-50/50 rounded-xl p-4 space-y-3.5 border border-sky-50">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-600">Trạng thái bán</div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`w-11 h-6 rounded-full transition-colors focus:outline-none ${
                    formData.is_active ? "bg-sky-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      formData.is_active ? "translate-x-5.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-slate-600">Món ăn nổi bật (Trang chủ)</div>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_featured: !formData.is_featured })}
                  className={`w-11 h-6 rounded-full transition-colors focus:outline-none ${
                    formData.is_featured ? "bg-sky-500" : "bg-gray-300"
                  }`}
                >
                  <div
                    className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                      formData.is_featured ? "translate-x-5.5" : "translate-x-0.5"
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>


        </form>

        {/* Sticky Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-sky-100 px-6 py-4 flex gap-3 z-10 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-full hover:bg-slate-50 transition-colors font-bold text-xs"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="menu-drawer-form"
            className="flex-1 px-4 py-2.5 bg-[#3E2016] text-white rounded-full hover:bg-[#5C2E17] transition-all font-black text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
          >
            <Save size={18} />
            Lưu món ăn
          </button>
        </div>
      </div>
    </div>
  );
};
