import React, { useState, useEffect } from "react";
import { X, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { menuService } from "../../../../services/menuService";
import type { MenuItem } from "../../../../interfaces";
import type { EventPackage, EventPackageItem } from "../interfaces";

interface EventPackageDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (packageData: any) => void;
  editingPackage: EventPackage | null;
  loading?: boolean;
}

export const EventPackageDrawer: React.FC<EventPackageDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  editingPackage,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    price_per_person: 500000,
    description: "",
    is_active: 1,
  });

  // Dynamic set menu items
  const [packageItems, setPackageItems] = useState<Omit<EventPackageItem, "id">[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  // Fetch menu items for selection
  useEffect(() => {
    const fetchMenuItems = async () => {
      try {
        const items = await menuService.getMenuItems();
        // Filter out inactive/deleted items if any
        setMenuItems(items.filter((item) => item.is_active));
      } catch (err) {
        console.error("Error fetching menu items:", err);
        toast.error("Không thể tải danh sách món ăn.");
      }
    };
    if (isOpen) {
      fetchMenuItems();
    }
  }, [isOpen]);

  // Load data for editing
  useEffect(() => {
    setErrors({});
    setValidationMsg(null);

    if (editingPackage) {
      setFormData({
        name: editingPackage.name,
        price_per_person: editingPackage.price_per_person,
        description: editingPackage.description || "",
        is_active: editingPackage.is_active,
      });
      // Map existing items
      setPackageItems(
        editingPackage.items.map((item) => ({
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
        }))
      );
    } else {
      setFormData({
        name: "",
        price_per_person: 500000,
        description: "",
        is_active: 1,
      });
      setPackageItems([]);
    }
  }, [editingPackage, isOpen]);

  // Handle nested items changes
  const handleAddItemRow = () => {
    // Find the first menu item that is not yet selected
    const unselectedItem = menuItems.find(
      (mi) => !packageItems.some((pi) => Number(pi.menu_item_id) === Number(mi.id))
    );
    
    setPackageItems([
      ...packageItems,
      {
        menu_item_id: unselectedItem ? Number(unselectedItem.id) : Number(menuItems[0]?.id || 0),
        quantity: 1,
      },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    const updated = [...packageItems];
    updated.splice(index, 1);
    setPackageItems(updated);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...packageItems];
    updated[index] = {
      ...updated[index],
      [field]: value,
    };
    setPackageItems(updated);
    
    // Clear errors when user modifies input
    if (errors[`item_${index}`]) {
      const newErrors = { ...errors };
      delete newErrors[`item_${index}`];
      setErrors(newErrors);
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    let firstErr = "";

    if (!formData.name.trim()) {
      newErrors.name = "Tên gói set menu không được để trống.";
      if (!firstErr) firstErr = newErrors.name;
    }

    if (formData.price_per_person === undefined || formData.price_per_person === null) {
      newErrors.price_per_person = "Giá mỗi khách là bắt buộc.";
      if (!firstErr) firstErr = newErrors.price_per_person;
    } else if (Number(formData.price_per_person) <= 0) {
      newErrors.price_per_person = "Giá mỗi khách phải lớn hơn 0.";
      if (!firstErr) firstErr = newErrors.price_per_person;
    }

    // Validate nested items
    if (packageItems.length === 0) {
      newErrors.items_general = "Vui lòng thêm ít nhất một món ăn vào set menu.";
      if (!firstErr) firstErr = newErrors.items_general;
    }

    const seenIds = new Set<number>();
    packageItems.forEach((item, index) => {
      const itemId = Number(item.menu_item_id);
      
      if (!itemId || itemId <= 0) {
        newErrors[`item_${index}`] = "Vui lòng chọn món ăn hợp lệ.";
        if (!firstErr) firstErr = newErrors[`item_${index}`];
      } else if (seenIds.has(itemId)) {
        newErrors[`item_${index}`] = "Món này đã có trong gói.";
        if (!firstErr) firstErr = "Có món ăn bị chọn trùng lặp trong gói tiệc.";
      } else {
        seenIds.add(itemId);
      }

      if (Number(item.quantity) <= 0) {
        newErrors[`quantity_${index}`] = "Số lượng phải lớn hơn 0.";
        if (!firstErr) firstErr = newErrors[`quantity_${index}`];
      }
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      console.log("Validation Error: ", newErrors);
      setValidationMsg(firstErr);
      toast.error(firstErr);
      return false;
    }

    setValidationMsg(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    
    onSave({
      ...formData,
      items: packageItems,
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-lg bg-white shadow-xl h-full flex flex-col z-10 animate-slide-in">
        
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {editingPackage ? "Cập nhật gói set menu" : "Thêm gói set menu mới"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Thiết lập thực đơn trọn gói cho tiệc hội nghị, tiệc cưới</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={loading}
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          id="package-drawer-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {validationMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2.5">
              <span className="text-red-500 text-lg">⚠️</span>
              <div>
                <div className="font-semibold mb-0.5">Lỗi thông tin nhập liệu</div>
                <div className="font-medium text-red-600/90">{validationMsg}</div>
              </div>
            </div>
          )}

          {/* Package Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Tên gói set menu <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: "" });
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-shadow ${
                errors.name
                  ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                  : "border-gray-300 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F]"
              }`}
              placeholder="Ví dụ: Gói Tiệc Cưới VIP, Gói Buffet Hội Nghị..."
              disabled={loading}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.name}</p>}
          </div>

          {/* Price per person */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Đơn giá trên mỗi khách (VNĐ/Khách) <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="number"
              value={formData.price_per_person}
              onChange={(e) => {
                setFormData({ ...formData, price_per_person: e.target.value ? Number(e.target.value) : 0 });
                if (errors.price_per_person) setErrors({ ...errors, price_per_person: "" });
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-shadow ${
                errors.price_per_person
                  ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                  : "border-gray-300 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F]"
              }`}
              placeholder="Nhập đơn giá mỗi khách"
              disabled={loading}
              min="1"
            />
            {errors.price_per_person && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{errors.price_per_person}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Mô tả gói tiệc</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F] transition-shadow h-20 resize-none"
              placeholder="Bao gồm các dịch vụ khuyến mãi, trang trí đi kèm..."
              disabled={loading}
            />
          </div>

          {/* Package Items Builder (Set Menu) */}
          <div className="border-t border-gray-200 pt-6">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-800">Danh sách món trong Set Menu</h3>
                <p className="text-xs text-gray-400 mt-0.5">Xây dựng định lượng món ăn đi kèm gói</p>
              </div>
              <button
                type="button"
                onClick={handleAddItemRow}
                disabled={loading || menuItems.length === 0}
                className="px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors font-semibold text-xs flex items-center gap-1"
              >
                <Plus size={14} />
                Thêm món ăn
              </button>
            </div>

            {errors.items_general && (
              <p className="text-xs text-red-500 mb-3 font-semibold">{errors.items_general}</p>
            )}

            <div className="space-y-3">
              {packageItems.map((item, index) => {
                const isItemDuplicate = packageItems.some(
                  (pi, idx) => idx !== index && Number(pi.menu_item_id) === Number(item.menu_item_id)
                );

                return (
                  <div key={index} className="flex gap-2.5 items-start">
                    {/* Select Dropdown */}
                    <div className="flex-1 min-w-0">
                      <select
                        value={item.menu_item_id}
                        onChange={(e) => handleItemChange(index, "menu_item_id", Number(e.target.value))}
                        disabled={loading}
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 bg-white text-sm transition-shadow ${
                          isItemDuplicate || errors[`item_${index}`]
                            ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                            : "border-gray-300 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F]"
                        }`}
                      >
                        <option value={0} disabled>-- Chọn món ăn --</option>
                        {menuItems.map((mi) => (
                          <option key={mi.id} value={mi.id}>
                            {mi.name} ({Number(mi.price).toLocaleString("vi-VN")}đ)
                          </option>
                        ))}
                      </select>
                      {(isItemDuplicate || errors[`item_${index}`]) && (
                        <p className="text-[11px] text-red-500 mt-1 font-semibold">
                          {isItemDuplicate ? "Món này đã có trong gói" : errors[`item_${index}`]}
                        </p>
                      )}
                    </div>

                    {/* Quantity Input */}
                    <div className="w-24">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, "quantity", e.target.value ? Number(e.target.value) : 1)}
                        disabled={loading}
                        min="1"
                        placeholder="SL"
                        className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 text-sm transition-shadow ${
                          errors[`quantity_${index}`]
                            ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                            : "border-gray-300 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F]"
                        }`}
                      />
                      {errors[`quantity_${index}`] && (
                        <p className="text-[11px] text-red-500 mt-1 font-semibold">
                          {errors[`quantity_${index}`]}
                        </p>
                      )}
                    </div>

                    {/* Delete row button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(index)}
                      disabled={loading}
                      className="p-2 border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                );
              })}

              {packageItems.length === 0 && (
                <div className="text-center py-6 border border-dashed border-gray-200 rounded-xl text-gray-400 text-xs">
                  Chưa có món ăn nào trong gói tiệc. Nhấp "Thêm món ăn" để chọn.
                </div>
              )}
            </div>
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <span className="block text-sm font-semibold text-gray-700">Trạng thái hoạt động</span>
              <span className="block text-xs text-gray-400 mt-0.5">Cho phép áp dụng gói tiệc khi lập hợp đồng</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  is_active: formData.is_active === 1 ? 0 : 1,
                })
              }
              disabled={loading}
              className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 focus:outline-none ${
                formData.is_active === 1 ? "bg-[#FF5A5F]" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                  formData.is_active === 1 ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>
        </form>

        {/* Sticky Actions Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 z-10 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="package-drawer-form"
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-[#FF5A5F] text-white rounded-lg hover:bg-[#ff4449] transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/30 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                Lưu gói set menu
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
export default EventPackageDrawer;
