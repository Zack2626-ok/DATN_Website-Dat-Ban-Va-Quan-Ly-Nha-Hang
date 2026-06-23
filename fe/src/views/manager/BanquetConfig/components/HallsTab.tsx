import React, { useState } from "react";
import { Edit, Trash2, Search, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { useAppSelector, useAppDispatch } from "../../../../store/hooks";
import { addHall, updateHall, deleteHall } from "../../../../store/banquetSlice";
import { HallDrawer } from "./HallDrawer";
import { HallDetailModal } from "./HallDetailModal";

interface Hall {
  id: number;
  name: string;
  capacity: number;
  description: string;
  is_active: boolean;
}

interface HallsTabProps {
  isDrawerOpen: boolean;
  onDrawerClose: () => void;
}

/**
 * HallsTab - Tab quản lý Sảnh tiệc
 */
export const HallsTab: React.FC<HallsTabProps> = ({ isDrawerOpen, onDrawerClose }) => {
  const dispatch = useAppDispatch();
  const halls = useAppSelector((state) => state.banquet.halls);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [viewingHall, setViewingHall] = useState<Hall | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredHalls = halls.filter(hall =>
    hall.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSave = (hall: Omit<Hall, "id">) => {
    if (editingHall) {
      dispatch(updateHall({ id: editingHall.id, data: hall }));
      toast.success("Cập nhật sảnh thành công!");
    } else {
      dispatch(addHall(hall));
      toast.success("Thêm sảnh thành công!");
    }
    onDrawerClose();
    setEditingHall(null);
  };

  const handleDelete = (id: number) => {
    if (confirm("Bạn có chắc muốn xóa sảnh này?")) {
      dispatch(deleteHall(id));
      toast.success("Xóa sảnh thành công!");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Search */}
      <div className="relative max-w-md">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Tìm kiếm sảnh..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left">
          <thead className="border-b border-gray-200 bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tên Sảnh
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Sức chứa
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Mô tả
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Trạng thái
              </th>
              <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                Hành động
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredHalls.map(hall => (
              <tr key={hall.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                  {hall.name}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {hall.capacity} người
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {hall.description}
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      hall.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}
                  >
                    {hall.is_active ? "Hoạt động" : "Đã khóa"}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => setViewingHall(hall)}
                      className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Xem chi tiết"
                    >
                      <Eye size={18} />
                    </button>
                    <button
                      onClick={() => {
                        setEditingHall(hall);
                      }}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Sửa"
                    >
                      <Edit size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(hall.id)}
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
      <HallDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          onDrawerClose();
          setEditingHall(null);
        }}
        onSave={handleSave}
        editingHall={editingHall}
      />

      {/* Detail Modal */}
      <HallDetailModal
        isOpen={viewingHall !== null}
        onClose={() => setViewingHall(null)}
        hall={viewingHall}
      />
    </div>
  );
};
