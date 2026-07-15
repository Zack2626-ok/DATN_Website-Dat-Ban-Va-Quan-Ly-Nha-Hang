import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { toast } from "react-hot-toast";
import type { Hall } from "../interfaces";

interface HallDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (hallData: any) => void;
  editingHall: Hall | null;
  loading?: boolean;
}

export const HallDrawer: React.FC<HallDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  editingHall,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    name: "",
    capacity: 100,
    description: "",
    is_active: 1,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [validationMsg, setValidationMsg] = useState<string | null>(null);

  useEffect(() => {
    setErrors({});
    setValidationMsg(null);

    if (editingHall) {
      setFormData({
        name: editingHall.name,
        capacity: editingHall.capacity,
        description: editingHall.description || "",
        is_active: editingHall.is_active,
      });
    } else {
      setFormData({
        name: "",
        capacity: 100,
        description: "",
        is_active: 1,
      });
    }
  }, [editingHall, isOpen]);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    let firstErr = "";

    if (!formData.name.trim()) {
      newErrors.name = "Tên sảnh tiệc không được để trống.";
      if (!firstErr) firstErr = newErrors.name;
    }

    if (formData.capacity === undefined || formData.capacity === null) {
      newErrors.capacity = "Sức chứa là bắt buộc.";
      if (!firstErr) firstErr = newErrors.capacity;
    } else if (Number(formData.capacity) <= 0) {
      newErrors.capacity = "Sức chứa của sảnh tiệc phải lớn hơn 0.";
      if (!firstErr) firstErr = newErrors.capacity;
    }

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
    onSave(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 transition-opacity" onClick={onClose} />

      {/* Drawer */}
      <div className="relative w-full max-w-md bg-white shadow-xl h-full flex flex-col z-10 animate-slide-in">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-sky-100 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-700">
              {editingHall ? "Cập nhật sảnh tiệc" : "Thêm sảnh tiệc mới"}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Quản lý không gian tổ chức sự kiện</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-sky-100 rounded-full transition-colors"
            disabled={loading}
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Form Body */}
        <form id="hall-drawer-form" onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {validationMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2.5">
              <span className="text-red-500 text-lg">⚠️</span>
              <div>
                <div className="font-semibold mb-0.5">Lỗi thông tin nhập liệu</div>
                <div className="font-medium text-red-600/90">{validationMsg}</div>
              </div>
            </div>
          )}

          {/* Name */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">
              Tên sảnh tiệc <span className="text-sky-600">*</span>
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
                  : "border-sky-200 focus:ring-sky-500/20 focus:border-sky-500"
              }`}
              placeholder="Ví dụ: Sảnh Hoa Hồng, Sảnh Windsor..."
              disabled={loading}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.name}</p>}
          </div>

          {/* Capacity */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">
              Sức chứa tối đa (Khách) <span className="text-sky-600">*</span>
            </label>
            <input
              type="number"
              value={formData.capacity}
              onChange={(e) => {
                setFormData({ ...formData, capacity: e.target.value ? Number(e.target.value) : 0 });
                if (errors.capacity) setErrors({ ...errors, capacity: "" });
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-shadow ${
                errors.capacity
                  ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                  : "border-sky-200 focus:ring-sky-500/20 focus:border-sky-500"
              }`}
              placeholder="Nhập số khách tối đa"
              disabled={loading}
              min="1"
            />
            {errors.capacity && <p className="text-xs text-red-500 mt-1 font-semibold">{errors.capacity}</p>}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-semibold text-slate-600 mb-1.5">Mô tả chi tiết</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 transition-shadow h-28 resize-none"
              placeholder="Thông tin sân khấu, âm thanh, ánh sáng, phòng chuẩn bị..."
              disabled={loading}
            />
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between p-4 bg-sky-50/50 rounded-xl border border-sky-50">
            <div>
              <span className="block text-sm font-semibold text-slate-600">Trạng thái hoạt động</span>
              <span className="block text-xs text-gray-400 mt-0.5">Sảnh hoạt động cho phép khách đặt tiệc</span>
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
                formData.is_active === 1 ? "bg-sky-500" : "bg-gray-300"
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

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-sky-100 px-6 py-4 flex gap-3 z-10 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-sky-200 text-slate-600 rounded-lg hover:bg-sky-50/50 transition-colors font-medium text-sm disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="hall-drawer-form"
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-sky-500 text-white rounded-lg hover:bg-[#ff4449] transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500/30 disabled:opacity-50"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                Lưu sảnh tiệc
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
export default HallDrawer;
