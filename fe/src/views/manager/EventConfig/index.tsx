import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Search, ShieldAlert } from "lucide-react";
import { toast } from "react-hot-toast";
import { eventConfigService } from "./services/eventConfigService";
import type { Hall, EventPackage } from "./interfaces";
import { HallDrawer } from "./components/HallDrawer";
import { EventPackageDrawer } from "./components/EventPackageDrawer";

export const EventConfig: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"halls" | "packages">("halls");
  const [halls, setHalls] = useState<Hall[]>([]);
  const [packages, setPackages] = useState<EventPackage[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  // Drawer States
  const [isHallOpen, setIsHallOpen] = useState(false);
  const [editingHall, setEditingHall] = useState<Hall | null>(null);
  const [isPackageOpen, setIsPackageOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<EventPackage | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Load Data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === "halls") {
        const res = await eventConfigService.getHalls();
        setHalls(res.data);
      } else {
        const res = await eventConfigService.getEventPackages();
        setPackages(res.data);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể tải cấu hình sự kiện.");
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Search & Filter
  const filteredHalls = useMemo(() => {
    return halls.filter((hall) => {
      const matchesSearch = searchQuery.trim() === ""
        ? true
        : hall.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (hall.description && hall.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? hall.is_active === 1
        : hall.is_active === 0;

      return matchesSearch && matchesStatus;
    });
  }, [halls, searchQuery, statusFilter]);

  const filteredPackages = useMemo(() => {
    return packages.filter((pkg) => {
      const matchesSearch = searchQuery.trim() === ""
        ? true
        : pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (pkg.description && pkg.description.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesStatus = statusFilter === "all"
        ? true
        : statusFilter === "active"
        ? pkg.is_active === 1
        : pkg.is_active === 0;

      return matchesSearch && matchesStatus;
    });
  }, [packages, searchQuery, statusFilter]);

  // Hall Save Handler
  const handleSaveHall = async (formData: any) => {
    try {
      setActionLoading(true);
      if (editingHall) {
        await eventConfigService.updateHall(editingHall.id, formData);
        toast.success("Cập nhật sảnh tiệc thành công");
      } else {
        await eventConfigService.createHall(formData);
        toast.success("Thêm sảnh tiệc mới thành công");
      }
      setIsHallOpen(false);
      setEditingHall(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Lỗi lưu sảnh tiệc");
    } finally {
      setActionLoading(false);
    }
  };

  // Hall Archive/Toggle Handler
  const handleToggleHall = async (hall: Hall) => {
    const nextStatus = hall.is_active === 1 ? 0 : 1;
    try {
      setActionLoading(true);
      await eventConfigService.toggleHallActive(hall.id, nextStatus);
      toast.success(
        nextStatus === 1 ? `Kích hoạt sảnh ${hall.name} thành công` : `Vô hiệu hóa sảnh ${hall.name} thành công`
      );
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể thay đổi trạng thái sảnh tiệc.");
    } finally {
      setActionLoading(false);
    }
  };

  // Package Save Handler
  const handleSavePackage = async (formData: any) => {
    try {
      setActionLoading(true);
      if (editingPackage) {
        await eventConfigService.updateEventPackage(editingPackage.id, formData);
        toast.success("Cập nhật gói set menu thành công");
      } else {
        await eventConfigService.createEventPackage(formData);
        toast.success("Thêm gói set menu tiệc mới thành công");
      }
      setIsPackageOpen(false);
      setEditingPackage(null);
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error(err.response?.data?.message || "Lỗi lưu gói set menu");
    } finally {
      setActionLoading(false);
    }
  };

  // Package Archive/Toggle Handler
  const handleTogglePackage = async (pkg: EventPackage) => {
    const nextStatus = pkg.is_active === 1 ? 0 : 1;
    try {
      setActionLoading(true);
      await eventConfigService.togglePackageActive(pkg.id, nextStatus);
      toast.success(
        nextStatus === 1 ? `Kích hoạt gói ${pkg.name} thành công` : `Vô hiệu hóa gói ${pkg.name} thành công`
      );
      await loadData();
    } catch (err: any) {
      console.error(err);
      toast.error("Không thể thay đổi trạng thái gói set menu.");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-6">
      {/* Top Banner Warning */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6 flex gap-3 text-amber-800 text-sm">
        <ShieldAlert className="w-5 h-5 text-amber-600 flex-shrink-0" />
        <div>
          <span className="font-bold">Lưu ý Khóa ngoại (Soft Archive Only):</span> Cấu hình sảnh và gói tiệc liên kết trực tiếp tới các hợp đồng tiệc hiện tại. Do đó, hệ thống không dùng lệnh xóa cứng (DELETE) mà sử dụng tính năng **Lưu trữ/Vô hiệu hóa** để tắt hoạt động an toàn.
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-700">Cấu hình Sự kiện & Tiệc</h1>
          <p className="text-slate-400 mt-1">Cấu hình sảnh tổ chức tiệc và các gói set menu định lượng</p>
        </div>
        <button
          onClick={() => {
            if (activeTab === "halls") {
              setEditingHall(null);
              setIsHallOpen(true);
            } else {
              setEditingPackage(null);
              setIsPackageOpen(true);
            }
          }}
          className="px-4 py-2 bg-sky-500 text-white rounded-lg hover:bg-[#ff4449] transition-colors font-medium flex items-center gap-2 shadow-sm"
        >
          <Plus size={18} />
          {activeTab === "halls" ? "Thêm sảnh tiệc" : "Thêm gói set menu"}
        </button>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-sky-100 mb-6">
        <div className="flex gap-8">
          <button
            onClick={() => {
              setActiveTab("halls");
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "halls"
                ? "border-sky-500 text-sky-600"
                : "border-transparent text-gray-400 hover:text-slate-500"
            }`}
          >
            Quản lý Sảnh Tiệc ({halls.length})
          </button>
          <button
            onClick={() => {
              setActiveTab("packages");
              setSearchQuery("");
              setStatusFilter("all");
            }}
            className={`pb-4 text-sm font-semibold transition-colors border-b-2 ${
              activeTab === "packages"
                ? "border-sky-500 text-sky-600"
                : "border-transparent text-gray-400 hover:text-slate-500"
            }`}
          >
            Gói Set Menu Tiệc ({packages.length})
          </button>
        </div>
      </div>

      {/* Filters Area */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
        <div className="relative flex-1 w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder={
              activeTab === "halls" ? "Tìm kiếm sảnh tiệc..." : "Tìm kiếm gói set menu..."
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 text-sm"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-full sm:w-auto px-4 py-2 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500 bg-white text-sm"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="inactive">Vô hiệu hóa</option>
        </select>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : activeTab === "halls" ? (
        // Halls Table
        <div className="overflow-x-auto rounded-lg border border-sky-100 shadow-sm">
          <table className="w-full text-left border-collapse bg-white">
            <thead>
              <tr className="bg-sky-50/50 border-b border-sky-100">
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Tên Sảnh</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Sức chứa tối đa</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Mô tả</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredHalls.map((hall) => (
                <tr key={hall.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-700">{hall.name}</td>
                  <td className="px-5 py-4 text-slate-500 font-semibold">{hall.capacity} Khách</td>
                  <td className="px-5 py-4 text-slate-400 max-w-sm truncate" title={hall.description}>
                    {hall.description || "-"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                      hall.is_active === 1
                        ? "bg-green-50 text-green-700 border border-green-150"
                        : "bg-sky-100 text-slate-400 border border-sky-100"
                    }`}>
                      {hall.is_active === 1 ? "Hoạt động" : "Vô hiệu hóa"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-2.5 justify-end">
                      <button
                        onClick={() => {
                          setEditingHall(hall);
                          setIsHallOpen(true);
                        }}
                        className="px-2.5 py-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleToggleHall(hall)}
                        disabled={actionLoading}
                        className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${
                          hall.is_active === 1
                            ? "border-red-200 text-red-600 hover:bg-red-50"
                            : "border-sky-200 text-slate-500 hover:bg-sky-50/50"
                        }`}
                      >
                        {hall.is_active === 1 ? "Vô hiệu hóa" : "Kích hoạt"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHalls.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400 text-sm">
                    Không tìm thấy sảnh tiệc nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        // Packages Table
        <div className="overflow-x-auto rounded-lg border border-sky-100 shadow-sm">
          <table className="w-full text-left border-collapse bg-white">
            <thead>
              <tr className="bg-sky-50/50 border-b border-sky-100">
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Tên Gói</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Đơn giá / Khách</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Số món ăn</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Mô tả</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider">Trạng thái</th>
                <th className="px-5 py-3.5 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPackages.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-sky-50/50 transition-colors">
                  <td className="px-5 py-4 font-bold text-slate-700">{pkg.name}</td>
                  <td className="px-5 py-4 text-slate-500 font-semibold">
                    {Number(pkg.price_per_person).toLocaleString("vi-VN")}đ / khách
                  </td>
                  <td className="px-5 py-4">
                    <span className="font-semibold text-slate-600 bg-sky-100 px-2 py-0.5 rounded">
                      {pkg.items?.length || 0} món
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-400 max-w-sm truncate" title={pkg.description}>
                    {pkg.description || "-"}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${
                      pkg.is_active === 1
                        ? "bg-green-50 text-green-700 border border-green-150"
                        : "bg-sky-100 text-slate-400 border border-sky-100"
                    }`}>
                      {pkg.is_active === 1 ? "Hoạt động" : "Vô hiệu hóa"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex gap-2.5 justify-end">
                      <button
                        onClick={() => {
                          setEditingPackage(pkg);
                          setIsPackageOpen(true);
                        }}
                        className="px-2.5 py-1.5 border border-blue-200 text-blue-600 hover:bg-blue-50 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleTogglePackage(pkg)}
                        disabled={actionLoading}
                        className={`px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${
                          pkg.is_active === 1
                            ? "border-red-200 text-red-600 hover:bg-red-50"
                            : "border-sky-200 text-slate-500 hover:bg-sky-50/50"
                        }`}
                      >
                        {pkg.is_active === 1 ? "Vô hiệu hóa" : "Kích hoạt"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredPackages.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400 text-sm">
                    Không tìm thấy gói set menu nào
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawers */}
      <HallDrawer
        isOpen={isHallOpen}
        onClose={() => {
          setIsHallOpen(false);
          setEditingHall(null);
        }}
        onSave={handleSaveHall}
        editingHall={editingHall}
        loading={actionLoading}
      />

      <EventPackageDrawer
        isOpen={isPackageOpen}
        onClose={() => {
          setIsPackageOpen(false);
          setEditingPackage(null);
        }}
        onSave={handleSavePackage}
        editingPackage={editingPackage}
        loading={actionLoading}
      />
    </div>
  );
};
export default EventConfig;
