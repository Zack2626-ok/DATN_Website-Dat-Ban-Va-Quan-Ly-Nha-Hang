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
        <div className="w-8 h-8 border-4 border-[#FF5A5F] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <UserIcon className="w-12 h-12 mb-3 text-gray-300" />
        <p className="text-lg">Không có người dùng nào</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Avatar</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Họ và tên</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Email</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Số điện thoại</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Vai trò</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Trạng thái</th>
            <th className="px-4 py-3 text-xs font-semibold text-gray-600 uppercase">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {users.map((user) => (
            <tr key={user.id} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-gray-500 font-medium">
                      {user.full_name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </td>
              <td className="px-4 py-4 font-medium text-gray-800">{user.full_name}</td>
              <td className="px-4 py-4 text-gray-600">{user.email}</td>
              <td className="px-4 py-4 text-gray-600">{user.phone || "-"}</td>
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
                    : "bg-gray-100 text-gray-700"
                }`}>
                  {user.status === "active" ? "Hoạt động" : "Không hoạt động"}
                </span>
              </td>
              <td className="px-4 py-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => onEdit(user)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Sửa"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => onDelete(user)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Xóa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
