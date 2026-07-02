import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import { userService } from "../../../services/userService";
import type { User, Role } from "../../../interfaces";
import { UserFilters } from "./components/UserFilters";
import { UserTable } from "./components/UserTable";
import { UserDrawer } from "./components/UserDrawer";
import { ConfirmDeleteModal } from "./components/ConfirmDeleteModal";

/**
 * UserManagement - Quản lý người dùng (Manager role)
 */
const UserManagement: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        userService.getUsers(),
        userService.getRoles(),
      ]);
      setUsers(usersRes.data.filter((u) => !u.is_deleted));
      setRoles(rolesRes.data);
    } catch (err) {
      console.error(err);
      alert("Không thể tải dữ liệu");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = searchQuery.trim() === ""
        ? true
        : user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesRole = roleFilter === null ? true : user.role_id === roleFilter;

      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Handle create/edit
  const handleSaveUser = useCallback(async (userData: any) => {
    try {
      setActionLoading(true);
      if (editingUser) {
        await userService.updateUser(editingUser.id, userData);
        toast.success("Cập nhật thông tin nhân viên thành công");
      } else {
        await userService.createUser(userData);
        toast.success("Thêm nhân viên mới thành công");
      }
      setIsDrawerOpen(false);
      setEditingUser(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "Không thể lưu người dùng";
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  }, [editingUser, fetchData]);

  // Handle delete
  const handleDeleteUser = useCallback(async () => {
    if (!userToDelete) return;
    try {
      setActionLoading(true);
      await userService.deleteUser(userToDelete.id);
      toast.success("Xóa nhân viên thành công");
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
      await fetchData();
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.message || err.message || "Không thể xóa người dùng";
      toast.error(errMsg);
    } finally {
      setActionLoading(false);
    }
  }, [userToDelete, fetchData]);

  return (
    <div className="p-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <Users className="w-7 h-7 text-[#FF5A5F]" />
            Quản lý người dùng
          </h1>
          <p className="text-gray-500 mt-1">Quản lý tài khoản và vai trò của nhân viên</p>
        </div>
        <button
          onClick={() => {
            setEditingUser(null);
            setIsDrawerOpen(true);
          }}
          className="px-4 py-2 bg-[#FF5A5F] text-white rounded-lg hover:bg-[#ff4449] transition-colors font-medium flex items-center gap-2"
        >
          <Plus size={18} />
          Thêm người dùng
        </button>
      </div>

      {/* Filters */}
      <UserFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        roleFilter={roleFilter}
        onRoleFilterChange={setRoleFilter}
        roles={roles}
      />

      {/* Table */}
      <UserTable
        users={filteredUsers}
        loading={loading}
        onEdit={(user) => {
          setEditingUser(user);
          setIsDrawerOpen(true);
        }}
        onDelete={(user) => {
          setUserToDelete(user);
          setIsDeleteModalOpen(true);
        }}
      />

      {/* Create/Edit Drawer */}
      <UserDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingUser(null);
        }}
        onSave={handleSaveUser}
        editingUser={editingUser}
        roles={roles}
        loading={actionLoading}
      />

      {/* Delete Confirm Modal */}
      {userToDelete && (
        <ConfirmDeleteModal
          isOpen={isDeleteModalOpen}
          onClose={() => {
            setIsDeleteModalOpen(false);
            setUserToDelete(null);
          }}
          onConfirm={handleDeleteUser}
          userName={userToDelete.full_name}
          loading={actionLoading}
        />
      )}
    </div>
  );
};

export default UserManagement;
