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
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
      {/* Search Input */}
      <div className="relative flex-1 w-full sm:w-80">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm theo tên hoặc email..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
        />
      </div>

      {/* Role Filter */}
      <select
        value={roleFilter ?? ""}
        onChange={(e) => onRoleFilterChange(e.target.value ? Number(e.target.value) : null)}
        className="w-full sm:w-auto px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500 bg-white"
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
