import React from "react";
import { Edit, Trash2, User as UserIcon } from "lucide-react";
import type { User } from "../../../../interfaces";
import { ROLE_COLORS, ROLE_LABELS } from "../../../../constants/roles";

interface UserTableProps {
  users: User[];
  onEdit: (user: User) => void;
  onDelete: (user: User) => void;
  loading?: boolean;
}

/**
 * UserTable - Bảng danh sách người dùng
 */
export const UserTable: React.FC<UserTableProps> = ({
  users,
  onEdit,
  onDelete,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-400">
        <UserIcon className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-lg">Không có người dùng nào</p>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] rounded-3xl border border-slate-200/70 shadow-xs overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-100 bg-[#FFFFFF]">
            <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">Avatar</th>
            <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">Họ và tên</th>
            <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">Email</th>
            <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">Số điện thoại</th>
            <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">Vai trò</th>
            <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">Trạng thái</th>
            <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider text-right">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-sky-50/50 transition-colors">
              <td className="px-4 py-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-slate-400 font-medium">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 font-medium text-slate-700">{user.full_name}</td>
              <td className="px-4 py-4 text-slate-500">{user.email}</td>
              <td className="px-4 py-4 text-slate-500">{user.phone || "-"}</td>
              <td className="px-4 py-4">
                {user.role && (
                  <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${ROLE_COLORS[user.role.name]}`}>
                    {ROLE_LABELS[user.role.name]}
                  </span>
                )}
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex px-2.5 py-1 text-xs font-semibold rounded-full ${
                  user.status === "active"
                    ? "bg-green-100 text-green-700"
                    : "bg-sky-100 text-slate-600"
                }`}>
                  {user.status === "active" ? "Hoạt động" : "Không hoạt động"}
                </span>
              </td>
              <td className="px-4 py-4">
                {user.role?.name === "admin" ? (
                  <span className="text-xs text-slate-400 italic font-semibold flex items-center gap-1 select-none">
                    🔒 Hệ thống
                  </span>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => onEdit(user)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Sửa"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => onDelete(user)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Xóa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
