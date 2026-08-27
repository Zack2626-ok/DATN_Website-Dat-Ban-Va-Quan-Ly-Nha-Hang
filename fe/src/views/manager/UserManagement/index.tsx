import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus } from "lucide-react";
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
      setUsers(
        usersRes.data.filter(
          (u) =>
            !u.is_deleted &&
            u.role?.name !== "admin" &&
            (u as any).role_name !== "admin" &&
            u.email !== "admin@gmail.com"
        )
      );
      setRoles(rolesRes.data.filter((r) => r.name !== "admin"));
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
    <div className="space-y-4 font-sans text-[#1A1A1A]">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#FFFFFF] p-5 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            Quản lý người dùng
          </h1>
          <p className="text-xs font-semibold text-[#8A8A8A] mt-0.5">
            Quản lý tài khoản, vai trò và quyền hạn của nhân viên nhà hàng
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingUser(null);
            setIsDrawerOpen(true);
          }}
          className="px-5 py-2.5 bg-[#3E2016] hover:bg-[#5C2E17] text-[#FFFFFF] text-xs font-black rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
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
