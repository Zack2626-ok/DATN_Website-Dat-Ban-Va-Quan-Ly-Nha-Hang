import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, Eye, RefreshCw, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { menuService } from "../../../services/menuService";
import { MenuDrawer } from "./components/MenuDrawer";
import { MenuDetailModal } from "./components/MenuDetailModal";
import type { MenuItem, Category } from "../../../interfaces";

/**
 * MenuManagement - Coordinator view for manager's menu items
 * Fetches data from menuService and handles basic CRUD operations including soft delete.
 */
const MenuManagement: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [viewingItem, setViewingItem] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  // Fetch data from backend service
  const fetchData = async () => {
    try {
      setLoading(true);
      const [itemsRes, categoriesRes] = await Promise.all([
        menuService.getMenuItems(),
        menuService.getCategories(),
      ]);
      setMenuItems(itemsRes);
      setCategories(categoriesRes);
    } catch (error) {
      console.error("Error loading menu data:", error);
      toast.error("Không thể tải danh sách thực đơn.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter items: search term, selected category, and absolutely exclude soft-deleted items
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || String(item.category_id) === selectedCategory;
    const isNotDeleted = !item.is_deleted;
    return matchesSearch && matchesCategory && isNotDeleted;
  });

  // Handle create or update menu item
  const handleSave = async (data: Omit<MenuItem, "id" | "created_at" | "updated_at">) => {
    try {
      if (editingItem) {
        // Update existing item
        const updated = await menuService.updateMenuItem(editingItem.id, data);
        setMenuItems((prev) =>
          prev.map((item) => (String(item.id) === String(editingItem.id) ? updated : item))
        );
        toast.success("Cập nhật món ăn thành công!");
      } else {
        // Create new item
        const created = await menuService.createMenuItem(data);
        setMenuItems((prev) => [created, ...prev]);
        toast.success("Thêm món ăn mới thành công!");
      }
      setIsDrawerOpen(false);
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast.error("Không thể lưu thông tin món ăn.");
    }
  };

  // Handle active status toggle
  const handleToggleActive = async (item: MenuItem) => {
    try {
      const updated = await menuService.toggleMenuItemActive(item.id, item.is_active);
      setMenuItems((prev) =>
        prev.map((i) => (String(i.id) === String(item.id) ? { ...i, is_active: updated.is_active } : i))
      );
      toast.success(
        `Đã ${updated.is_active ? "kích hoạt" : "ngừng bán"} món "${item.name}"!`
      );
    } catch (error) {
      console.error("Error toggling active status:", error);
      toast.error("Không thể cập nhật trạng thái món ăn.");
    }
  };

  // Handle soft delete menu item
  const handleDelete = async (item: MenuItem) => {
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa món "${item.name}"?`);
    if (!confirmed) return;

    try {
      // Calls soft delete PATCH API
      await menuService.deleteMenuItem(item.id);
      // Remove from list view state
      setMenuItems((prev) => prev.filter((i) => String(i.id) !== String(item.id)));
      toast.success("Xóa món ăn thành công!");
    } catch (error) {
      console.error("Error deleting menu item:", error);
      toast.error("Không thể xóa món ăn.");
    }
  };

  const getKitchenStationLabel = (station: string) => {
    const labels: Record<string, string> = {
      hot_kitchen: "Bếp nóng",
      bar: "Quầy Bar",
      cold_kitchen: "Bếp lạnh",
    };
    return labels[station] || station;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý thực đơn</h1>
          <p className="text-gray-600 mt-1">Thiết lập món ăn, giá cả và các nhóm tùy chọn modifier</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-150 transition-colors shadow-sm focus:outline-none disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => {
              setEditingItem(null);
              setIsDrawerOpen(true);
            }}
            className="px-5 py-2.5 bg-[#FF5A5F] text-white rounded-lg hover:bg-[#ff4449] transition-colors font-semibold flex items-center gap-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20"
          >
            <Plus size={20} />
            Thêm món mới
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Tìm kiếm món ăn theo tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F] transition-shadow text-sm"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Layers size={18} className="text-gray-400" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F] bg-white text-sm"
          >
            <option value="all">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-gray-200 border-t-[#FF5A5F] rounded-full animate-spin" />
            <p className="text-sm font-medium text-gray-500">Đang tải danh sách món ăn...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Món ăn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Danh mục
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Giá bán
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Nhóm tùy chọn
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Trạm bếp
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                    {/* Image & Name */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden border border-gray-200 flex-shrink-0 flex items-center justify-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-2xl">🍽️</span>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                            {item.name}
                            {item.is_featured ? (
                              <span className="inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                Hot
                              </span>
                            ) : null}
                          </div>
                          {item.description && (
                            <div className="text-xs text-gray-400 max-w-[200px] truncate">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {item.category_name || "Món chính"}
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-sm font-bold text-gray-900">
                        {item.price.toLocaleString("vi-VN")}₫
                      </span>
                    </td>

                    {/* Modifier Count */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      {item.modifier_groups && item.modifier_groups.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 px-2.5 py-0.5 rounded-full border border-gray-250">
                          {item.modifier_groups.length} nhóm tùy chọn
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Không có</span>
                      )}
                    </td>

                    {/* Kitchen Station */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-150">
                        {getKitchenStationLabel(item.kitchen_station)}
                      </span>
                    </td>

                    {/* Status Toggle Button */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
                          item.is_active
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100"
                            : "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                        }`}
                      >
                        {item.is_active ? "Đang bán" : "Ngừng bán"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => {
                            setViewingItem(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
                          title="Xem chi tiết"
                        >
                          <Eye size={18} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingItem(item);
                            setIsDrawerOpen(true);
                          }}
                          className="p-2 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors focus:outline-none"
                          title="Chỉnh sửa món"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors focus:outline-none"
                          title="Xóa món ăn"
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
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="px-6 py-16 text-center bg-white">
            <div className="text-gray-300 mb-3">
              <Search size={48} className="mx-auto opacity-40" />
            </div>
            <h4 className="text-gray-700 font-semibold text-base">Không tìm thấy món ăn nào</h4>
            <p className="text-gray-400 text-xs mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
          </div>
        )}
      </div>

      {/* Menu Form Drawer */}
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

      {/* Menu Detail Modal */}
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
