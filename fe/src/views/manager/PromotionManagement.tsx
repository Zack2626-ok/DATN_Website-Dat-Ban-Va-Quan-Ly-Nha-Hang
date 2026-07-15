import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, RefreshCw, Calendar, Tag, AlertCircle, CheckCircle, XCircle } from "lucide-react";
import toast from "react-hot-toast";
import { getPromotionsApi, createPromotionApi, updatePromotionApi, deletePromotionApi, Promotion } from "../../services/promotionService";
import { formatCurrency } from "../../utils/formatCurrency";

/**
 * PromotionManagement - Giao diện quản lý chương trình khuyến mãi/ưu đãi dành cho Manager
 */
export default function PromotionManagement() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  // Form State
  const [form, setForm] = useState({
    title: "",
    description: "",
    discount_type: "percent" as "percent" | "fixed",
    discount_value: 0,
    image_url: "",
    start_date: "",
    end_date: "",
    is_active: 1,
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const list = await getPromotionsApi();
      setPromotions(list);
    } catch (error) {
      console.error("Error loading promotions:", error);
      toast.error("Không thể tải danh sách khuyến mãi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter
  const filteredPromotions = promotions.filter((p) =>
    p.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenCreateModal = () => {
    setEditingPromo(null);
    setForm({
      title: "",
      description: "",
      discount_type: "percent",
      discount_value: 0,
      image_url: "",
      start_date: new Date().toISOString().split("T")[0],
      end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      is_active: 1,
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (promo: Promotion) => {
    setEditingPromo(promo);
    setForm({
      title: promo.title,
      description: promo.description || "",
      discount_type: promo.discount_type,
      discount_value: promo.discount_value,
      image_url: promo.image_url || "",
      // Định dạng lại YYYY-MM-DD từ ISO String hoặc Datetime DB
      start_date: promo.start_date.split("T")[0].split(" ")[0],
      end_date: promo.end_date.split("T")[0].split(" ")[0],
      is_active: promo.is_active,
    });
    setIsModalOpen(true);
  };

  const handleToggleActive = async (promo: Promotion) => {
    if (!promo.id) return;
    const newStatus = promo.is_active ? 0 : 1;
    try {
      await updatePromotionApi(promo.id, { is_active: newStatus });
      setPromotions((prev) =>
        prev.map((p) => (p.id === promo.id ? { ...p, is_active: newStatus } : p))
      );
      toast.success(`Đã ${newStatus ? "kích hoạt" : "hủy kích hoạt"} chương trình ưu đãi!`);
    } catch (error) {
      toast.error("Không thể cập nhật trạng thái chương trình.");
    }
  };

  const handleDelete = async (promo: Promotion) => {
    if (!promo.id) return;
    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa chương trình "${promo.title}"?`);
    if (!confirmed) return;

    try {
      await deletePromotionApi(promo.id);
      setPromotions((prev) => prev.filter((p) => p.id !== promo.id));
      toast.success("Xóa chương trình khuyến mãi thành công!");
    } catch (error) {
      toast.error("Không thể xóa chương trình khuyến mãi.");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề khuyến mãi!");
      return;
    }

    if (form.discount_value <= 0) {
      toast.error("Giá trị giảm giá phải lớn hơn 0!");
      return;
    }

    if (new Date(form.start_date) > new Date(form.end_date)) {
      toast.error("Ngày kết thúc phải sau ngày bắt đầu!");
      return;
    }

    try {
      if (editingPromo && editingPromo.id) {
        // Update
        const updated = await updatePromotionApi(editingPromo.id, form);
        setPromotions((prev) => prev.map((p) => (p.id === editingPromo.id ? updated : p)));
        toast.success("Cập nhật chương trình khuyến mãi thành công!");
      } else {
        // Create
        const created = await createPromotionApi(form);
        setPromotions((prev) => [created, ...prev]);
        toast.success("Tạo mới chương trình khuyến mãi thành công!");
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Không thể lưu chương trình khuyến mãi.");
    }
  };

  const getStatusBadge = (promo: Promotion) => {
    const now = new Date();
    const start = new Date(promo.start_date);
    const end = new Date(promo.end_date);

    if (!promo.is_active) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-150 text-gray-800">
          <XCircle size={12} /> Tắt hoạt động
        </span>
      );
    }

    if (now < start) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
          <Calendar size={12} /> Sắp diễn ra
        </span>
      );
    }

    if (now > end) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <AlertCircle size={12} /> Đã hết hạn
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
        <CheckCircle size={12} /> Đang chạy
      </span>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Quản lý ưu đãi &amp; khuyến mãi</h1>
          <p className="text-gray-600 mt-1">
            Thiết lập các chương trình giảm giá, khuyến mãi cho khách hàng trên Website.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            disabled={loading}
            className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors shadow-sm focus:outline-none disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={handleOpenCreateModal}
            className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold flex items-center gap-2 shadow-sm focus:outline-none"
          >
            <Plus size={20} />
            Tạo chương trình mới
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="relative max-w-md">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
            <Search size={18} />
          </span>
          <input
            type="text"
            placeholder="Tìm kiếm chương trình ưu đãi..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-700 text-xs font-semibold uppercase tracking-wider">
                <th className="px-6 py-4">Chương trình</th>
                <th className="px-6 py-4">Loại giảm giá</th>
                <th className="px-6 py-4">Thời hạn diễn ra</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-sm">
              {loading && promotions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải danh sách...
                  </td>
                </tr>
              ) : filteredPromotions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-10 text-gray-400">
                    Chưa có chương trình khuyến mãi nào được cấu hình.
                  </td>
                </tr>
              ) : (
                filteredPromotions.map((promo) => (
                  <tr key={promo.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {promo.image_url ? (
                          <img
                            src={promo.image_url.startsWith("http") ? promo.image_url : `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000"}/${promo.image_url}`}
                            alt={promo.title}
                            className="h-10 w-16 object-cover rounded-lg border border-gray-200"
                          />
                        ) : (
                          <div className="h-10 w-16 bg-blue-50 rounded-lg flex items-center justify-center border border-gray-200">
                            <Tag size={18} className="text-blue-500" />
                          </div>
                        )}
                        <div>
                          <div className="font-semibold text-gray-800">{promo.title}</div>
                          <div className="text-xs text-gray-400 line-clamp-1 mt-0.5">{promo.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-gray-800">
                      {promo.discount_type === "percent" ? (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-semibold">
                          Giảm {promo.discount_value}%
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded bg-purple-50 text-purple-700 text-xs font-semibold">
                          Giảm {formatCurrency(promo.discount_value)}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-gray-600 text-xs">
                      <div>Bắt đầu: {new Date(promo.start_date).toLocaleDateString("vi-VN")}</div>
                      <div className="mt-0.5">Kết thúc: {new Date(promo.end_date).toLocaleDateString("vi-VN")}</div>
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(promo)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => handleToggleActive(promo)}
                          className={`text-xs px-2.5 py-1 rounded border font-medium transition ${
                            promo.is_active
                              ? "bg-white text-gray-500 hover:bg-gray-50 border-gray-200"
                              : "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200"
                          }`}
                        >
                          {promo.is_active ? "Tạm ngưng" : "Kích hoạt"}
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(promo)}
                          className="p-1.5 text-gray-500 hover:text-blue-600 transition"
                          title="Sửa chương trình"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(promo)}
                          className="p-1.5 text-gray-500 hover:text-red-600 transition"
                          title="Xóa chương trình"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 text-lg">
                {editingPromo ? "Chỉnh sửa chương trình ưu đãi" : "Thêm chương trình ưu đãi mới"}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tiêu đề ưu đãi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Giảm giá khai vị"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Mô tả chi tiết
                </label>
                <textarea
                  placeholder="Ví dụ: Giảm 15% cho tất cả món khai vị từ thứ 2 đến thứ 6"
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Loại giảm giá *
                  </label>
                  <select
                    value={form.discount_type}
                    onChange={(e) => setForm({ ...form, discount_type: e.target.value as "percent" | "fixed" })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="percent">Phần trăm (%)</option>
                    <option value="fixed">Số tiền mặt (đ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Giá trị giảm giá *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: Number(e.target.value) })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày bắt đầu *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.start_date}
                    onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Ngày kết thúc *
                  </label>
                  <input
                    type="date"
                    required
                    value={form.end_date}
                    onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                    className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Đường dẫn hình ảnh (Image URL)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: promo_khai_vi.jpg hoặc đường dẫn link web"
                  value={form.image_url}
                  onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  className="w-full px-3.5 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={form.is_active === 1}
                  onChange={(e) => setForm({ ...form, is_active: e.target.checked ? 1 : 0 })}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-200 rounded"
                />
                <label htmlFor="is_active" className="text-sm text-gray-700 font-medium">
                  Kích hoạt chương trình ngay lập tức
                </label>
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
                >
                  {editingPromo ? "Lưu thay đổi" : "Tạo mới"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
