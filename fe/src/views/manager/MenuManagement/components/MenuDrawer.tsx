import React, { useState, useEffect } from "react";
import { X, Save, Plus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import type { MenuItem, Category } from "../../../../interfaces";

interface MenuDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<MenuItem, "id" | "created_at" | "updated_at">) => void;
  editingItem: MenuItem | null;
  categories: Category[];
}

interface ModifierFormState {
  name: string;
  extra_price: number;
}

interface ModifierGroupFormState {
  name: string;
  is_required: boolean;
  min_select: number;
  max_select: number;
  modifiers: ModifierFormState[];
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

  const [modifierGroups, setModifierGroups] = useState<ModifierGroupFormState[]>([]);
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

      if (editingItem.modifier_groups) {
        setModifierGroups(
          editingItem.modifier_groups.map((g) => ({
            name: g.name,
            is_required: Boolean(g.is_required),
            min_select: Number(g.min_select),
            max_select: Number(g.max_select),
            modifiers: g.modifiers.map((m) => ({
              name: m.name,
              extra_price: Number(m.extra_price),
            })),
          }))
        );
      } else {
        setModifierGroups([]);
      }
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
      setModifierGroups([]);
    }
  }, [editingItem, categories, isOpen]);

  // Group modifiers state handlers
  const handleAddGroup = () => {
    setModifierGroups((prev) => [
      ...prev,
      {
        name: "",
        is_required: false,
        min_select: 0,
        max_select: 1,
        modifiers: [{ name: "", extra_price: 0 }],
      },
    ]);
  };

  const handleRemoveGroup = (gIndex: number) => {
    setModifierGroups((prev) => prev.filter((_, idx) => idx !== gIndex));
    // Clear any validation errors for this group
    if (fieldErrors.groups?.[gIndex]) {
      const updatedGroups = { ...fieldErrors.groups };
      delete updatedGroups[gIndex];
      setFieldErrors({ ...fieldErrors, groups: updatedGroups });
    }
  };

  const handleGroupChange = (
    gIndex: number,
    field: keyof Omit<ModifierGroupFormState, "modifiers">,
    value: string | number | boolean
  ) => {
    setModifierGroups((prev) =>
      prev.map((g, idx) => {
        if (idx !== gIndex) return g;
        const updated = { ...g, [field]: value };
        
        // Sync required and min_select logically
        if (field === "is_required") {
          // If turning off requirement, set min_select to 0. Otherwise ensure at least 1
          updated.min_select = value ? (g.min_select > 0 ? g.min_select : 1) : 0;
        } else if (field === "min_select") {
          const val = Number(value) || 0;
          updated.is_required = val > 0;
        }
        return updated;
      })
    );

    // Clear validation warnings upon manual editing
    if (fieldErrors.groups?.[gIndex]) {
      const updatedGroups = { ...fieldErrors.groups };
      delete updatedGroups[gIndex];
      setFieldErrors({ ...fieldErrors, groups: updatedGroups });
    }
  };

  const handleAddModifier = (gIndex: number) => {
    setModifierGroups((prev) =>
      prev.map((g, idx) =>
        idx === gIndex
          ? { ...g, modifiers: [...g.modifiers, { name: "", extra_price: 0 }] }
          : g
      )
    );
  };

  const handleRemoveModifier = (gIndex: number, mIndex: number) => {
    setModifierGroups((prev) =>
      prev.map((g, idx) =>
        idx === gIndex
          ? { ...g, modifiers: g.modifiers.filter((_, mIdx) => mIdx !== mIndex) }
          : g
      )
    );
  };

  const handleModifierChange = (
    gIndex: number,
    mIndex: number,
    field: keyof ModifierFormState,
    value: string | number
  ) => {
    setModifierGroups((prev) =>
      prev.map((g, idx) => {
        if (idx !== gIndex) return g;
        const updatedModifiers = g.modifiers.map((m, mIdx) =>
          mIdx === mIndex ? { ...m, [field]: value } : m
        );
        return { ...g, modifiers: updatedModifiers };
      })
    );

    // Clear validation warnings for this option
    if (fieldErrors.groups?.[gIndex]?.modifiers?.[mIndex]) {
      const updatedGroups = { ...fieldErrors.groups };
      if (updatedGroups[gIndex]?.modifiers) {
        delete updatedGroups[gIndex].modifiers[mIndex];
      }
      setFieldErrors({ ...fieldErrors, groups: updatedGroups });
    }
  };

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

    // 2. Modifier Groups Validations
    const groupErrors: any = {};
    modifierGroups.forEach((g, gIdx) => {
      const gErr: any = {};
      const nameLabel = g.name.trim() || `Nhóm tùy chọn số ${gIdx + 1}`;

      if (!g.name.trim()) {
        gErr.name = "Tên nhóm tùy chọn không được bỏ trống.";
        if (!firstErrorMsg) firstErrorMsg = `Tên nhóm tùy chọn thứ ${gIdx + 1} không được bỏ trống.`;
      }

      if (g.min_select > g.max_select) {
        gErr.range = `Số lượng tối thiểu (${g.min_select}) không được lớn hơn tối đa (${g.max_select}).`;
        if (!firstErrorMsg) {
          firstErrorMsg = `Lỗi tại nhóm "${nameLabel}": Số lượng chọn tối thiểu không được lớn hơn chọn tối đa.`;
        }
      }

      if ((g.is_required || g.min_select > 0) && g.modifiers.length === 0) {
        gErr.range = "Nhóm bắt buộc phải có ít nhất 1 tùy chọn lựa chọn.";
        if (!firstErrorMsg) {
          firstErrorMsg = `Lỗi tại nhóm "${nameLabel}": Đây là nhóm bắt buộc, vui lòng thêm ít nhất 1 tùy chọn.`;
        }
      }

      const modErrors: any = {};
      g.modifiers.forEach((m, mIdx) => {
        const mErr: any = {};
        if (!m.name.trim()) {
          mErr.name = "Tên tùy chọn không được để trống.";
          if (!firstErrorMsg) {
            firstErrorMsg = `Tên tùy chọn thứ ${mIdx + 1} trong nhóm "${nameLabel}" không được để trống.`;
          }
        }
        if (m.extra_price < 0) {
          mErr.price = "Giá phụ thu không được là số âm.";
          if (!firstErrorMsg) {
            firstErrorMsg = `Giá phụ thu của "${m.name || `Tùy chọn ${mIdx + 1}`}" trong nhóm "${nameLabel}" không được là số âm.`;
          }
        }

        if (Object.keys(mErr).length > 0) {
          modErrors[mIdx] = mErr;
        }
      });

      if (Object.keys(modErrors).length > 0) {
        gErr.modifiers = modErrors;
      }

      if (Object.keys(gErr).length > 0) {
        groupErrors[gIdx] = gErr;
      }
    });

    if (Object.keys(groupErrors).length > 0) {
      errors.groups = groupErrors;
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
      modifier_groups: modifierGroups.map((g) => ({
        name: g.name.trim(),
        is_required: g.is_required,
        min_select: g.min_select,
        max_select: g.max_select,
        modifiers: g.modifiers.map((m) => ({
          name: m.name.trim(),
          extra_price: Number(m.extra_price),
        })),
      })),
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

          {/* Section 2: Modifiers (Groups & Options) */}
          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between border-b border-sky-50 pb-2">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                Nhóm tùy chọn đi kèm <span className="text-xs font-normal text-gray-400 capitalize">(Lựa chọn)</span>
              </h3>
              <button
                type="button"
                onClick={handleAddGroup}
                className="text-xs font-semibold text-sky-600 hover:text-[#ff4449] flex items-center gap-1 transition-colors"
              >
                <Plus size={14} />
                Thêm nhóm tùy chọn
              </button>
            </div>

            {modifierGroups.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-sky-100 rounded-xl bg-sky-50/50/50">
                <p className="text-sm text-gray-400">Chưa có tùy chọn tùy chỉnh cho món này</p>
                <button
                  type="button"
                  onClick={handleAddGroup}
                  className="mt-2 text-xs font-semibold text-sky-600 hover:underline"
                >
                  Thêm nhóm đầu tiên
                </button>
              </div>
            ) : (
              <div className="space-y-5">
                {modifierGroups.map((group, gIdx) => (
                  <div
                    key={gIdx}
                    className={`relative bg-white border rounded-xl p-4 shadow-sm hover:border-sky-200 transition-colors space-y-4 ${
                      fieldErrors.groups?.[gIdx] ? "border-red-300 bg-red-50/5" : "border-sky-100"
                    }`}
                  >
                    {/* Header Group */}
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex-1">
                        <input
                          type="text"
                          value={group.name}
                          onChange={(e) => handleGroupChange(gIdx, "name", e.target.value)}
                          className={`w-full font-bold text-sm text-slate-800 border-b focus:outline-none pb-0.5 ${
                            fieldErrors.groups?.[gIdx]?.name
                              ? "border-red-400 focus:border-red-500"
                              : "border-sky-100 hover:border-gray-400 focus:border-sky-500"
                          }`}
                          placeholder="Tên nhóm (ví dụ: Độ ngọt, Kích thước)"
                        />
                        {fieldErrors.groups?.[gIdx]?.name && (
                          <p className="text-[11px] text-red-500 mt-1 font-semibold">
                            {fieldErrors.groups[gIdx].name}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveGroup(gIdx)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa nhóm này"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>

                    {/* Options Config */}
                    <div className="grid grid-cols-3 gap-3 bg-sky-50/50/80 p-3 rounded-lg border border-sky-50">
                      {/* Is Required toggle */}
                      <div className="flex flex-col justify-center">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Bắt buộc chọn
                        </span>
                        <div className="flex items-center h-8">
                          <button
                            type="button"
                            onClick={() => handleGroupChange(gIdx, "is_required", !group.is_required)}
                            className={`w-9 h-5 rounded-full transition-colors focus:outline-none ${
                              group.is_required ? "bg-sky-500" : "bg-gray-300"
                            }`}
                          >
                            <div
                              className={`w-4 h-4 bg-white rounded-full shadow transform transition-transform ${
                                group.is_required ? "translate-x-4.5" : "translate-x-0.5"
                              }`}
                            />
                          </button>
                        </div>
                      </div>

                      {/* Min Select */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Chọn tối thiểu
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={group.min_select}
                          onChange={(e) => handleGroupChange(gIdx, "min_select", e.target.value)}
                          className={`w-full px-2.5 py-1 border rounded-md text-sm focus:outline-none focus:ring-1 bg-white ${
                            fieldErrors.groups?.[gIdx]?.range
                              ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                              : "border-sky-200 focus:ring-sky-500 focus:border-sky-500"
                          }`}
                        />
                      </div>

                      {/* Max Select */}
                      <div>
                        <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                          Chọn tối đa
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={group.max_select}
                          onChange={(e) => handleGroupChange(gIdx, "max_select", e.target.value)}
                          className={`w-full px-2.5 py-1 border rounded-md text-sm focus:outline-none focus:ring-1 bg-white ${
                            fieldErrors.groups?.[gIdx]?.range
                              ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                              : "border-sky-200 focus:ring-sky-500 focus:border-sky-500"
                          }`}
                        />
                      </div>
                    </div>

                    {/* Range / Options Length Validation Message */}
                    {fieldErrors.groups?.[gIdx]?.range && (
                      <p className="text-xs text-red-500 font-semibold mt-1">
                        ⚠️ {fieldErrors.groups[gIdx].range}
                      </p>
                    )}

                    {/* Options Item Options (Modifiers) */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-slate-400">Tùy chọn chi tiết</span>
                        <button
                          type="button"
                          onClick={() => handleAddModifier(gIdx)}
                          className="text-[11px] font-bold text-sky-600 hover:text-[#ff4449] flex items-center gap-0.5 transition-colors"
                        >
                          <Plus size={12} />
                          Thêm tùy chọn
                        </button>
                      </div>

                      {group.modifiers.length === 0 ? (
                        <p className="text-[11px] text-gray-400 italic text-center py-2">
                          Vui lòng thêm ít nhất một tùy chọn lựa chọn (ví dụ: Tái, Vừa, Chín).
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {group.modifiers.map((modifier, mIdx) => (
                            <div key={mIdx} className="space-y-1">
                              <div className="flex items-center gap-2">
                                {/* Option name */}
                                <input
                                  type="text"
                                  value={modifier.name}
                                  onChange={(e) => handleModifierChange(gIdx, mIdx, "name", e.target.value)}
                                  className={`flex-1 px-3 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-1 ${
                                    fieldErrors.groups?.[gIdx]?.modifiers?.[mIdx]?.name
                                      ? "border-red-400 focus:ring-red-400 focus:border-red-400 bg-red-50/5"
                                      : "border-sky-100 focus:ring-sky-500 focus:border-sky-500"
                                  }`}
                                  placeholder="Tên tùy chọn (ví dụ: Ít đường, Cỡ lớn)"
                                />
                                
                                {/* Option extra price */}
                                <div className="relative w-28">
                                  <input
                                    type="number"
                                    min="0"
                                    value={modifier.extra_price}
                                    onChange={(e) =>
                                      handleModifierChange(gIdx, mIdx, "extra_price", e.target.value)
                                    }
                                    className={`w-full pl-3 pr-6 py-1.5 border rounded-md text-sm focus:outline-none focus:ring-1 ${
                                      fieldErrors.groups?.[gIdx]?.modifiers?.[mIdx]?.price
                                        ? "border-red-400 focus:ring-red-400 focus:border-red-400 bg-red-50/5"
                                        : "border-sky-100 focus:ring-sky-500 focus:border-sky-500"
                                    }`}
                                    placeholder="0"
                                  />
                                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs font-medium text-gray-400">
                                    đ
                                  </span>
                                </div>

                                {/* Delete option */}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveModifier(gIdx, mIdx)}
                                  className="p-1.5 text-gray-400 hover:text-red-500 rounded-md transition-colors"
                                  title="Xóa tùy chọn này"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                              
                              {/* Option-specific errors */}
                              {fieldErrors.groups?.[gIdx]?.modifiers?.[mIdx] && (
                                <div className="flex gap-4 px-1 text-[10px] font-semibold text-red-500">
                                  {fieldErrors.groups[gIdx].modifiers[mIdx].name && (
                                    <span>* {fieldErrors.groups[gIdx].modifiers[mIdx].name}</span>
                                  )}
                                  {fieldErrors.groups[gIdx].modifiers[mIdx].price && (
                                    <span>* {fieldErrors.groups[gIdx].modifiers[mIdx].price}</span>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </form>

        {/* Sticky Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-sky-100 px-6 py-4 flex gap-3 z-10 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-sky-200 text-slate-600 rounded-lg hover:bg-sky-50/50 transition-colors font-medium text-sm"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="menu-drawer-form"
            className="flex-1 px-4 py-2.5 bg-sky-500 text-white rounded-lg hover:bg-[#ff4449] transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30"
          >
            <Save size={18} />
            Lưu món ăn
          </button>
        </div>
      </div>
    </div>
  );
};
