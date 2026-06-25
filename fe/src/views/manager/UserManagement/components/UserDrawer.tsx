import React, { useState, useEffect } from "react";
import { X, Save } from "lucide-react";
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
 * UserDrawer - Drawer tạo/sửa người dùng
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
    role_id: roles[0]?.id || 2,
    status: "active" as "active" | "inactive",
  });

  useEffect(() => {
    if (editingUser) {
      setFormData({
        full_name: editingUser.full_name,
        email: editingUser.email,
        phone: editingUser.phone || "",
        password: "",
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
  }, [editingUser, roles]);

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
            {editingUser ? "Sửa người dùng" : "Thêm người dùng mới"}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={loading}
          >
            <X size={20} className="text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Full Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Họ và tên <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
              placeholder="Nhập họ và tên"
              disabled={loading}
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Email <span className="text-[#FF5A5F]">*</span>
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
              placeholder="email@example.com"
              disabled={loading}
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Số điện thoại
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
              placeholder="Nhập số điện thoại"
              disabled={loading}
            />
          </div>

          {/* Password - Only on create */}
          {!editingUser && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Mật khẩu <span className="text-[#FF5A5F]">*</span>
              </label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
                placeholder="Nhập mật khẩu"
                disabled={loading}
              />
            </div>
          )}

          {/* Role */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Vai trò <span className="text-[#FF5A5F]">*</span>
            </label>
            <select
              value={formData.role_id}
              onChange={(e) => setFormData({ ...formData, role_id: Number(e.target.value) })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F] bg-white"
              disabled={loading}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.description}
                </option>
              ))}
            </select>
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">Trạng thái hoạt động</span>
            <button
              type="button"
              onClick={() => setFormData({ ...formData, status: formData.status === "active" ? "inactive" : "active" })}
              disabled={loading}
              className={`w-11 h-6 rounded-full transition-colors ${
                formData.status === "active" ? "bg-[#FF5A5F]" : "bg-gray-300"
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
                  formData.status === "active" ? "translate-x-6" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-gray-200 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#FF5A5F] text-white rounded-lg hover:bg-[#ff4449] transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save size={18} />
              )}
              Lưu
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
