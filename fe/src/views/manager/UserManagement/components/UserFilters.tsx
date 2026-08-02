import React from "react";
import { Search } from "lucide-react";
import type { Role } from "../../../../interfaces";

interface UserFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  roleFilter: number | null;
  onRoleFilterChange: (value: number | null) => void;
  roles: Role[];
}

/**
 * UserFilters - Bộ lọc và tìm kiếm người dùng
 */
export const UserFilters: React.FC<UserFiltersProps> = ({
  searchQuery,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  roles,
}) => {
  return (
    <div className="bg-[#FFFFFF] p-3.5 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3">
      {/* Search Input */}
      <div className="relative flex-1">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8A8A]" size={17} />
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-11 pr-4 py-2 bg-[#F8F6F2] rounded-full text-xs font-bold text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#3E2016]/30 transition-all border-0"
        />
      </div>

      {/* Role Filter */}
      <select
        value={roleFilter ?? ""}
        onChange={(e) => onRoleFilterChange(e.target.value ? Number(e.target.value) : null)}
        className="px-4 py-2 bg-[#F8F6F2] rounded-full text-xs font-bold text-[#1A1A1A] cursor-pointer focus:outline-none border-0"
      >
        <option value="">Tất cả vai trò</option>
        {roles.map((role) => (
          <option key={role.id} value={role.id}>
            {role.description}
          </option>
        ))}
      </select>
    </div>
  );
};
