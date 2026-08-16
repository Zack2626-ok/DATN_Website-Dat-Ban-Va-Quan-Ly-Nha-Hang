import React, { useState, useEffect, useMemo } from "react";
import { Plus, Edit, Trash2, Search, Eye, RefreshCw, Layers } from "lucide-react";
import toast from "react-hot-toast";
import { menuService } from "../../../services/menuService";
import { MenuDrawer } from "./components/MenuDrawer";
import { MenuDetailModal } from "./components/MenuDetailModal";
import { RecipeModal } from "./components/RecipeModal";
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
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [viewingItem, setViewingItem] = useState<MenuItem | null>(null);
  const [recipeItem, setRecipeItem] = useState<MenuItem | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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

  // Reset page when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedCategory]);

  // Filter items: search term, selected category, and absolutely exclude soft-deleted items
  const filteredItems = menuItems.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || String(item.category_id) === selectedCategory;
    const isNotDeleted = !item.is_deleted;
    return matchesSearch && matchesCategory && isNotDeleted;
  });

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

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
    <div className="space-y-4 font-sans text-[#1A1A1A]">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#FFFFFF] p-5 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            Quản lý thực đơn
          </h1>
          <p className="text-xs font-semibold text-[#8A8A8A] mt-0.5">
            Thiết lập danh sách món ăn, quy định trạm bếp, giá bán và nhóm món kèm
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-[#1A1A1A] transition-colors shadow-2xs focus:outline-none disabled:opacity-50 cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={17} className={loading ? "animate-spin text-[#3E2016]" : ""} />
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingItem(null);
              setIsDrawerOpen(true);
            }}
            className="px-5 py-2.5 bg-[#3E2016] hover:bg-[#5C2E17] text-[#FFFFFF] text-xs font-black rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Plus size={18} />
            Thêm món mới
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FFFFFF] p-3.5 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8A8A]" size={17} />
          <input
            type="text"
            placeholder="Tìm kiếm món ăn theo tên..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-[#F8F6F2] rounded-full text-xs font-bold text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#3E2016]/30 transition-all border-0"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Layers size={17} className="text-[#8A8A8A] ml-2" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-[#F8F6F2] rounded-full text-xs font-bold text-[#1A1A1A] cursor-pointer focus:outline-none border-0"
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

      {/* Main Table Container */}
      <div className="bg-[#FFFFFF] rounded-3xl border border-slate-200/70 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex flex-col items-center justify-center gap-3">
            <div className="w-9 h-9 border-3 border-amber-100 border-t-[#3E2016] rounded-full animate-spin" />
            <p className="text-xs font-extrabold text-[#8A8A8A]">Đang tải dữ liệu thực đơn...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="border-b border-slate-100 bg-[#FFFFFF]">
                <tr>
                  <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">
                    Món ăn
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">
                    Danh mục
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">
                    Giá bán
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">
                    Nhóm tùy chọn
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">
                    Trạm bếp
                  </th>
                  <th className="px-6 py-4 text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">
                    Trạng thái
                  </th>
                  <th className="px-6 py-4 text-right text-[11px] font-black text-[#8A8A8A] uppercase tracking-wider">
                    Hành động
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-[#FFFFFF]">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className="hover:bg-[#FAF8F5] transition-colors">
                    {/* Image & Name */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-3.5">
                        <div className="w-11 h-11 bg-slate-100 rounded-2xl overflow-hidden border border-slate-200/60 flex-shrink-0 flex items-center justify-center">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span className="text-xl">🍽️</span>
                          )}
                        </div>
                        <div>
                          <div className="text-xs font-black text-[#1A1A1A] flex items-center gap-2">
                            {item.name}
                            {item.is_featured ? (
                              <span className="inline-flex px-2 py-0.5 rounded-full text-[9px] font-black bg-[#3E2016]/10 text-[#3E2016] border border-[#3E2016]/20 uppercase">
                                Hot
                              </span>
                            ) : null}
                          </div>
                          {item.description && (
                            <div className="text-[11px] font-medium text-[#8A8A8A] max-w-[200px] truncate mt-0.5">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-3.5 whitespace-nowrap text-xs font-bold text-[#1A1A1A]">
                      {item.category_name || "Món chính"}
                    </td>

                    {/* Price */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-black text-[#1A1A1A]">
                        {Number(item.price).toLocaleString("vi-VN")}₫
                      </span>
                    </td>

                    {/* Modifier Count */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      {item.modifier_groups && item.modifier_groups.length > 0 ? (
                        <span className="inline-flex items-center text-[11px] font-bold text-[#1A1A1A] bg-slate-100 px-3 py-1 rounded-full">
                          {item.modifier_groups.length} tùy chọn
                        </span>
                      ) : (
                        <span className="text-[11px] text-[#8A8A8A] italic">Không</span>
                      )}
                    </td>

                    {/* Kitchen Station */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-[#3E2016]/10 text-[#3E2016] border border-[#3E2016]/20">
                        {getKitchenStationLabel(item.kitchen_station)}
                      </span>
                    </td>

                    {/* Status Toggle Button */}
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleToggleActive(item)}
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold transition-colors cursor-pointer ${
                          item.is_active
                            ? "bg-[#3E2016]/10 text-[#3E2016] hover:bg-[#3E2016]/20 border border-[#3E2016]/20"
                            : "bg-slate-100 text-[#8A8A8A] hover:bg-slate-200"
                        }`}
                      >
                        {item.is_active ? "Đang bán" : "Ngừng bán"}
                      </button>
                    </td>

                    {/* Actions */}
                    <td className="px-6 py-3.5 whitespace-nowrap text-right text-xs font-medium">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingItem(item);
                            setIsDetailModalOpen(true);
                          }}
                          className="p-1.5 text-[#8A8A8A] hover:text-[#1A1A1A] hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
                          title="Xem chi tiết"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setRecipeItem(item);
                            setIsRecipeModalOpen(true);
                          }}
                          className="p-1.5 text-[#3E2016] hover:bg-[#3E2016]/10 rounded-full transition-colors cursor-pointer"
                          title="Định lượng món ăn"
                        >
                          <Layers size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingItem(item);
                            setIsDrawerOpen(true);
                          }}
                          className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-full transition-colors cursor-pointer"
                          title="Chỉnh sửa món"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                          title="Xóa món ăn"
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
        )}

        {/* Pagination Controls */}
        {!loading && filteredItems.length > 0 && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-[#FFFFFF] px-6 py-3.5">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-full border border-slate-200 bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1A1A1A] hover:bg-slate-50 disabled:opacity-50"
              >
                Trước
              </button>
              <button
                type="button"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-full border border-slate-200 bg-[#FFFFFF] px-4 py-2 text-xs font-bold text-[#1A1A1A] hover:bg-slate-50 disabled:opacity-50"
              >
                Sau
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold text-[#8A8A8A]">
                  Hiển thị <span className="text-[#1A1A1A] font-extrabold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> -{" "}
                  <span className="text-[#1A1A1A] font-extrabold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)}</span> /{" "}
                  <span className="text-[#1A1A1A] font-extrabold">{filteredItems.length}</span> món
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex rounded-full gap-1" aria-label="Pagination">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-[#1A1A1A] hover:bg-slate-200 disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    Trước
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      type="button"
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center rounded-full px-3.5 py-1.5 text-xs font-black transition-all cursor-pointer ${
                        currentPage === page
                          ? "bg-[#3E2016] text-[#FFFFFF] shadow-xs"
                          : "text-[#1A1A1A] hover:bg-slate-100"
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-full bg-slate-100 px-3 py-1.5 text-xs font-extrabold text-[#1A1A1A] hover:bg-slate-200 disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    Sau
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredItems.length === 0 && (
          <div className="px-6 py-16 text-center bg-[#FFFFFF]">
            <div className="text-[#8A8A8A] mb-3">
              <Search size={44} className="mx-auto opacity-40 text-[#3E2016]" />
            </div>
            <h4 className="text-[#1A1A1A] font-black text-base">Không tìm thấy món ăn nào</h4>
            <p className="text-[#8A8A8A] text-xs mt-1 font-medium">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
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

      {/* Recipe Modal */}
      <RecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        item={recipeItem}
      />
    </div>
  );
};

export default MenuManagement;
