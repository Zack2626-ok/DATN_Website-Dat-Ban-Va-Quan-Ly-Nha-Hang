import React, { useState } from "react";
import { Plus, Edit, Trash2, Search, Eye } from "lucide-react";
import toast from "react-hot-toast";
import { useAppSelector, useAppDispatch } from "../../../store/hooks";
import { addMenuItem, updateMenuItem, deleteMenuItem, toggleMenuItemActive } from "../../../store/menuSlice";
import { MenuDrawer } from "./components/MenuDrawer";
import { MenuDetailModal } from "./components/MenuDetailModal";
import type { MenuItem } from "../../../interfaces";

/**
 * MenuManagement - Main view for managing menu items
 */
const MenuManagement: React.FC = () => {
  const dispatch = useAppDispatch();
  const menuItems = useAppSelector((state) => state.menu.items);
  const categories = useAppSelector((state) => state.menu.categories);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [viewingItem, setViewingItem] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  // Filter menu items
  const filteredItems = menuItems.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle save
  const handleSave = (data: any) => {
    if (editingItem) {
      // Update existing item
      const updatedItem: MenuItem = {
        ...editingItem,
        ...data,
        category_name: categories.find((c) => String(c.id) === data.category_id)?.name || "",
      };
      dispatch(updateMenuItem(updatedItem));
      toast.success("Cập nhật món ăn thành công!");
    } else {
      // Create new item
      const newItem: MenuItem = {
        ...data,
        id: Date.now().toString(),
        category_name: categories.find((c) => String(c.id) === data.category_id)?.name || "",
      };
      dispatch(addMenuItem(newItem));
      toast.success("Thêm món ăn thành công!");
    }
    setIsDrawerOpen(false);
    setEditingItem(null);
  };

  // Handle toggle active
  const handleToggleActive = (item: MenuItem) => {
    dispatch(toggleMenuItemActive(item.id));
    toast.success("Cập nhật trạng thái thành công!");
  };

  // Handle delete
  const handleDelete = (item: MenuItem) => {
    if (!window.confirm(`Bạn có chắc muốn xóa món "${item.name}"?`)) return;
    dispatch(deleteMenuItem(item.id));
    toast.success("Xóa món ăn thành công!");
  };

  // Get kitchen station label
  const getKitchenStationLabel = (station: string) => {
    const labels: Record<string, string> = {
      hot_kitchen: "Bếp nóng",
      bar: "Bar",
      cold_kitchen: "Bếp lạnh",
    };
    return labels[station] || station;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý thực đơn</h1>
          <p className="text-gray-600 mt-1">Quản lý tất cả món ăn trong nhà hàng</p>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setIsDrawerOpen(true);
          }}
          className="px-5 py-2.5 bg-[#FF5A5F] text-white rounded-lg hover:bg-[#ff4449] transition-colors font-medium flex items-center gap-2 shadow-sm"
        >
          <Plus size={20} />
          Thêm món mới
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm món ăn..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/50 focus:border-[#FF5A5F]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Món ăn
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Giá
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Trạm bếp
                </th>
                <th className="px-6 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-6 py-3 text-right text-xs font-bold text-gray-600 uppercase tracking-wider">
                  Hành động
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                  {/* Image & Name */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <svg
                              className="w-6 h-6"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                      </div>
                    </div>
                  </td>

                  {/* Category */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {item.category_name}
                    </span>
                  </td>

                  {/* Price */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm font-bold text-gray-900">
                      {item.price.toLocaleString("vi-VN")}₫
                    </span>
                  </td>

                  {/* Kitchen Station */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {getKitchenStationLabel(item.kitchen_station)}
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => handleToggleActive(item)}
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        item.is_active
                          ? "bg-green-100 text-green-800 hover:bg-green-200"
                          : "bg-red-100 text-red-800 hover:bg-red-200"
                      }`}
                    >
                      {item.is_active ? "Đang bán" : "Ngừng bán"}
                    </button>
                  </td>

                  {/* Actions */}
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setViewingItem(item);
                          setIsDetailModalOpen(true);
                        }}
                        className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Xem chi tiết"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        onClick={() => {
                          setEditingItem(item);
                          setIsDrawerOpen(true);
                        }}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Sửa"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDelete(item)}
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

        {/* Empty State */}
        {filteredItems.length === 0 && (
          <div className="px-6 py-12 text-center">
            <div className="text-gray-400 mb-2">
              <Search size={48} className="mx-auto opacity-50" />
            </div>
            <p className="text-gray-600 font-medium">Không tìm thấy món ăn nào</p>
          </div>
        )}
      </div>

      {/* Drawer */}
      <MenuDrawer
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSave}
        editingItem={editingItem}
        categories={categories}
      />

      {/* Detail Modal */}
      <MenuDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setViewingItem(null);
        }}
        menuItem={viewingItem}
      />
    </div>
  );
};

export default MenuManagement;
