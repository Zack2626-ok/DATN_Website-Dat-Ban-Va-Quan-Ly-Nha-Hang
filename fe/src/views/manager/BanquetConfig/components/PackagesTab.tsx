import React, { useState } from "react";
import { Edit, Trash2, Search, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { useAppSelector, useAppDispatch } from "../../../../store/hooks";
import { addPackage, updatePackage, deletePackage } from "../../../../store/banquetSlice";
import { PackageDrawer } from "./PackageDrawer";
import { PackageDetailModal } from "./PackageDetailModal";

interface EventPackage {
  id: number;
  name: string;
  price_per_person: number;
  description: string;
  is_active: boolean;
  items?: any[];
}

interface PackagesTabProps {
  isDrawerOpen: boolean;
  onDrawerClose: () => void;
}

/**
 * PackagesTab - Tab quản lý Gói Set Menu Tiệc
 */
export const PackagesTab: React.FC<PackagesTabProps> = ({ isDrawerOpen, onDrawerClose }) => {
  const dispatch = useAppDispatch();
  const packages = useAppSelector((state) => state.banquet.packages);
  const [editingPackage, setEditingPackage] = useState<EventPackage | null>(null);
  const [viewingPackage, setViewingPackage] = useState<EventPackage | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredPackages = packages.filter(pkg =>
    pkg.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = (pkg: Omit<EventPackage, "id">) => {
    if (editingPackage) {
      dispatch(updatePackage({ id: editingPackage.id, data: pkg }));
      toast.success("Cập nhật gói tiệc thành công!");
    } else {
      dispatch(addPackage(pkg));
      toast.success("Thêm gói tiệc thành công!");
    }
    onDrawerClose();
    setEditingPackage(null);
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa gói tiệc này?")) {
      dispatch(deletePackage(id));
      toast.success("Xóa gói tiệc thành công!");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm gói tiệc..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/50 focus:border-sky-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-sky-100 bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-sky-100 bg-sky-50/50">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tên Gói
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Giá / Người
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Mô tả
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-slate-400 uppercase tracking-wider text-right">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredPackages.map(pkg => (
              <tr key={pkg.id} className="hover:bg-sky-50/50">
                <td className="px-6 py-4 text-sm font-medium text-slate-800">
                  {pkg.name}
                </td>
                <td className="px-6 py-4 text-sm font-semibold text-sky-600">
                  {pkg.price_per_person.toLocaleString("vi-VN")}₫
                </td>
                <td className="px-6 py-4 text-sm text-slate-500">
                  {pkg.description}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      pkg.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {pkg.is_active ? "Hoạt động" : "Đã khóa"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setViewingPackage(pkg)}
                      className="p-2 text-slate-500 hover:bg-sky-100 rounded-lg transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingPackage(pkg);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Sửa"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(pkg.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Xóa"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Drawer */}
      <PackageDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          onDrawerClose();
          setEditingPackage(null);
        }}
        onSave={handleSave}
        editingPackage={editingPackage}
      />

      {/* Detail Modal */}
      <PackageDetailModal
        isOpen={viewingPackage !== null}
        onClose={() => setViewingPackage(null)}
        pkg={viewingPackage}
      />
    </div>
  );
};
