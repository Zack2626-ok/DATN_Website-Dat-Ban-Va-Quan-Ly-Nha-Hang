import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
import { toast } from "react-hot-toast";
import type { User, Role } from "../../../../interfaces";

interface UserDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (userData: any) => void;
  editingUser: User | null;
  roles: Role[];
  loading?: boolean;
}

/**
 * UserDrawer - Slide-out drawer form for Creating and Editing restaurant staff accounts.
 * Implements password requirements, status toggle, and custom visual inline validations.
 */
export const UserDrawer: React.FC<UserDrawerProps> = ({
  isOpen,
  onClose,
  onSave,
  editingUser,
  roles,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    phone: "",
    password: "",
    role_id: 2, // Default to MANAGER
    status: "active" as "active" | "inactive",
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    setFieldErrors({});
    setValidationError(null);
    
    if (editingUser) {
      setFormData({
        full_name: editingUser.full_name,
        email: editingUser.email,
        phone: editingUser.phone || "",
        password: "", // Always clear password field on start editing
        role_id: editingUser.role_id,
        status: editingUser.status,
      });
    } else {
      setFormData({
        full_name: "",
        email: "",
        phone: "",
        password: "",
        role_id: roles[0]?.id || 2,
        status: "active",
      });
    }
  }, [editingUser, roles, isOpen]);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    let firstError = "";

    // 1. Full Name check
    if (!formData.full_name.trim()) {
      errors.full_name = "Họ và tên không được để trống.";
      if (!firstError) firstError = errors.full_name;
    }

    // 2. Email check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email.trim()) {
      errors.email = "Email không được để trống.";
      if (!firstError) firstError = errors.email;
    } else if (!emailRegex.test(formData.email.trim())) {
      errors.email = "Định dạng email không hợp lệ (ví dụ: email@gmail.com).";
      if (!firstError) firstError = errors.email;
    }

    // 3. Phone check (Optional, but if input, must be valid numeric length)
    if (formData.phone.trim()) {
      const phoneRegex = /^(03|09)\d{8}$/;
      if (!phoneRegex.test(formData.phone.trim())) {
        errors.phone = "Số điện thoại phải gồm 10 chữ số, bắt đầu bằng 03 hoặc 09.";
        if (!firstError) firstError = errors.phone;
      }
    }

    // 4. Password check
    if (!editingUser) {
      // Create mode: password is required, min 6 characters
      if (!formData.password) {
        errors.password = "Mật khẩu là bắt buộc khi tạo mới tài khoản.";
        if (!firstError) firstError = errors.password;
      } else if (formData.password.length < 6) {
        errors.password = "Mật khẩu phải có độ dài tối thiểu 6 ký tự.";
        if (!firstError) firstError = errors.password;
      }
    } else {
      // Edit mode: password is optional, but if entered, must be min 6 characters
      if (formData.password && formData.password.length < 6) {
        errors.password = "Mật khẩu mới phải có độ dài tối thiểu 6 ký tự.";
        if (!firstError) firstError = errors.password;
      }
    }

    setFieldErrors(errors);

    if (Object.keys(errors).length > 0) {
      console.log("Validation Error: ", errors);
      setValidationError(firstError);
      toast.error(firstError);
      return false;
    }

    setValidationError(null);
    return true;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Filter out password if empty in Edit mode
    const payload: any = {
      full_name: formData.full_name.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim() || null,
      role_id: formData.role_id,
      status: formData.status,
    };

    if (formData.password) {
      payload.password = formData.password;
    }

    onSave(payload);
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
      <div className="relative w-full max-w-md bg-white shadow-xl h-full flex flex-col z-10 animate-slide-in">
        
        {/* Sticky Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center z-10">
          <div>
            <h2 className="text-lg font-bold text-gray-800">
              {editingUser ? "Cập nhật tài khoản" : "Thêm nhân viên mới"}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">Quản lý hồ sơ nhân viên và vai trò hệ thống</p>
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
          id="user-drawer-form"
          onSubmit={handleSubmit}
          className="flex-1 overflow-y-auto p-6 space-y-6"
        >
          {/* Validation Alert */}
          {validationError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2.5">
              <span className="text-red-500 text-lg">⚠️</span>
              <div>
                <div className="font-semibold mb-0.5">Lỗi thông tin nhập liệu</div>
                <div className="font-medium text-red-600/90">{validationError}</div>
              </div>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Họ và tên <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => {
                setFormData({ ...formData, full_name: e.target.value });
                if (fieldErrors.full_name) {
                  setFieldErrors({ ...fieldErrors, full_name: "" });
                }
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-shadow ${
                fieldErrors.full_name
                  ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                  : "border-gray-300 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F]"
              }`}
              placeholder="Nhập họ và tên nhân viên"
              disabled={loading}
            />
            {fieldErrors.full_name && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{fieldErrors.full_name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Địa chỉ Email <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (fieldErrors.email) {
                  setFieldErrors({ ...fieldErrors, email: "" });
                }
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-shadow ${
                fieldErrors.email
                  ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                  : "border-gray-300 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F]"
              }`}
              placeholder="email@example.com"
              disabled={loading}
            />
            {fieldErrors.email && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{fieldErrors.email}</p>
            )}
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => {
                setFormData({ ...formData, phone: e.target.value });
                if (fieldErrors.phone) {
                  setFieldErrors({ ...fieldErrors, phone: "" });
                }
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-shadow ${
                fieldErrors.phone
                  ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                  : "border-gray-300 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F]"
              }`}
              placeholder="Nhập số điện thoại (ví dụ: 0912345678)"
              disabled={loading}
            />
            {fieldErrors.phone && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{fieldErrors.phone}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5 flex items-center justify-between">
              <span>
                Mật khẩu {!editingUser && <span className="text-[#FF5A5F]">*</span>}
              </span>
              {editingUser && (
                <span className="text-[11px] font-normal text-gray-400">
                  Không bắt buộc
                </span>
              )}
            </label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => {
                setFormData({ ...formData, password: e.target.value });
                if (fieldErrors.password) {
                  setFieldErrors({ ...fieldErrors, password: "" });
                }
              }}
              className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-shadow ${
                fieldErrors.password
                  ? "border-red-500 focus:ring-red-500/20 focus:border-red-500"
                  : "border-gray-300 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F]"
              }`}
              placeholder={editingUser ? "Để trống nếu muốn giữ nguyên mật khẩu cũ" : "Nhập mật khẩu (tối thiểu 6 ký tự)"}
              disabled={loading}
            />
            {editingUser && !fieldErrors.password && (
              <p className="text-[11px] text-gray-400 mt-1">Để trống trường này nếu không muốn thay đổi mật khẩu hiện tại.</p>
            )}
            {fieldErrors.password && (
              <p className="text-xs text-red-500 mt-1 font-semibold">{fieldErrors.password}</p>
            )}
          </div>

          {/* Role Select */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Vai trò nhân viên <span className="text-[#FF5A5F]">*</span>
            </label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F] bg-white transition-shadow"
              disabled={loading}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.description}
                </option>
              ))}
            </select>
          </div>

          {/* Status Toggle Switch */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-100">
            <div>
              <span className="block text-sm font-semibold text-gray-700">Trạng thái hoạt động</span>
              <span className="block text-xs text-gray-400 mt-0.5">Cho phép nhân viên đăng nhập vào hệ thống</span>
            </div>
            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  status: formData.status === "active" ? "inactive" : "active",
                })
              }
              disabled={loading}
              className={`w-11 h-6 rounded-full transition-colors focus:outline-none relative flex-shrink-0 ${
                formData.status === "active" ? "bg-[#FF5A5F]" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-transform ${
                  formData.status === "active" ? "translate-x-5.5" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Hidden submit trigger */}
          <button type="submit" className="hidden" />
        </form>

        {/* Sticky Footer Actions */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 flex gap-3 z-10 shadow-lg">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy bỏ
          </button>
          <button
            type="submit"
            form="user-drawer-form"
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-[#FF5A5F] text-white rounded-lg hover:bg-[#ff4449] transition-colors font-medium text-sm flex items-center justify-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/30 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Save size={18} />
                Lưu nhân sự
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
