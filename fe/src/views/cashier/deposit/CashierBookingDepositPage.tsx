import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  RefreshCw,
  CheckCircle,
  Clock,
  Wallet,
  Utensils,
  Calendar,
  User,
  Phone,
  Hash,
  Eye,
  Check,
  XCircle,
  AlertCircle,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { getBookings, payBookingDeposit, Booking } from "../../../services/bookingService";

export const CashierBookingDepositPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "unpaid" | "paid" | "cancelled">("all");
  const [selectedBookingForModal, setSelectedBookingForModal] = useState<Booking | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const fetchBookingDeposits = async () => {
    setLoading(true);
    try {
      const data = await getBookings();
      // Chỉ lấy các booking có đặt cọc (hoặc có món đặt trước có tổng tiền cọc > 0 hoặc deposit_status !== 'none')
      const withDeposit = data.filter(
        (b) =>
          (Number(b.deposit_amount) > 0 ||
            b.deposit_status === "unpaid" ||
            b.deposit_status === "paid" ||
            (b.pre_ordered_items && b.pre_ordered_items.length > 0)) &&
          b.deposit_status !== "none"
      );
      setBookings(withDeposit);
    } catch (error) {
      toast.error("Không thể tải danh sách tiền cọc đặt bàn");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookingDeposits();
  }, []);

  const handleConfirmPayDeposit = async (id: number, code: string) => {
    if (!window.confirm(`Xác nhận thu tiền cọc cho mã đặt bàn ${code}?`)) return;
    setProcessingId(id);
    try {
      await payBookingDeposit(id);
      toast.success(`✅ Đã thu tiền cọc cho booking ${code}`);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, deposit_status: "paid" } : b))
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Lỗi khi xác nhận thanh toán cọc");
    } finally {
      setProcessingId(null);
    }
  };

  // Thống kê nhanh
  const stats = useMemo(() => {
    let totalDepositAmount = 0;
    let unpaidCount = 0;
    let paidCount = 0;

    bookings.forEach((b) => {
      if (b.status !== "cancelled") {
        const dep = Number(b.deposit_amount) || 0;
        if (b.deposit_status === "paid") {
          paidCount++;
          totalDepositAmount += dep;
        } else if (b.deposit_status === "unpaid") {
          unpaidCount++;
        }
      }
    });

    return { total: bookings.length, unpaidCount, paidCount, totalDepositAmount };
  }, [bookings]);

  // Bộ lọc và tìm kiếm
  const filteredBookings = useMemo(() => {
    return bookings.filter((b) => {
      const matchSearch =
        b.guest_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        b.guest_phone.includes(searchQuery) ||
        b.confirmation_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (b.table_name && b.table_name.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchFilter = true;
      if (filterStatus === "unpaid") {
        matchFilter = b.deposit_status === "unpaid" && b.status !== "cancelled";
      } else if (filterStatus === "paid") {
        matchFilter = b.deposit_status === "paid" && b.status !== "cancelled";
      } else if (filterStatus === "cancelled") {
        matchFilter = b.status === "cancelled";
      }

      return matchSearch && matchFilter;
    }).sort((a, b) => {
      // Ưu tiên cao nhất cho các đơn "Chưa thanh toán cọc" (unpaid) lên đầu danh sách
      const getPriority = (item: Booking) => {
        if (item.status === "cancelled") return 3;
        if (item.deposit_status === "unpaid") return 1;
        if (item.deposit_status === "paid") return 2;
        return 2;
      };
      const pA = getPriority(a);
      const pB = getPriority(b);
      if (pA !== pB) return pA - pB;

      // Trong cùng nhóm ưu tiên, sắp xếp theo thời gian mới nhất
      return new Date(b.start_time).getTime() - new Date(a.start_time).getTime();
    });
  }, [bookings, searchQuery, filterStatus]);

  const formatCurrency = (val?: number | string) => {
    return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(Number(val) || 0);
  };

  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "---";
    const d = new Date(dateStr);
    return `${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} - ${d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    })}`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-3">
            <Wallet className="w-8 h-8 text-amber-300" />
            <h1 className="text-2xl font-black tracking-tight">Quản Lý Tiền Cọc Đặt Bàn (Booking)</h1>
          </div>
          <p className="text-blue-100 text-sm mt-1">
            Theo dõi, xác nhận và quản lý tiền đặt cọc trước khi khách đến bàn & thanh toán hóa đơn
          </p>
        </div>
        <button
          onClick={fetchBookingDeposits}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-xl font-medium transition text-sm backdrop-blur-sm border border-white/20"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Thống kê cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Tổng đơn có cọc</p>
            <p className="text-2xl font-extrabold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center">
            <Calendar size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Chưa thu tiền cọc</p>
            <p className="text-2xl font-extrabold text-amber-600 mt-1">{stats.unpaidCount}</p>
          </div>
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center">
            <Clock size={24} />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500">Đã thu cọc (Chờ trừ bill)</p>
            <p className="text-2xl font-extrabold text-emerald-600 mt-1">{stats.paidCount}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center">
            <CheckCircle size={24} />
          </div>
        </div>

        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white p-5 rounded-2xl shadow-md flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-emerald-100">Tổng cọc đã thực thu</p>
            <p className="text-2xl font-black mt-1">{formatCurrency(stats.totalDepositAmount)}</p>
          </div>
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
            <Wallet size={24} className="text-white" />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus("all")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filterStatus === "all"
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Tất cả ({bookings.length})
          </button>
          <button
            onClick={() => setFilterStatus("unpaid")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filterStatus === "unpaid"
                ? "bg-amber-500 text-white shadow-sm"
                : "bg-amber-50 text-amber-700 hover:bg-amber-100"
            }`}
          >
            Chưa thanh toán cọc ({stats.unpaidCount})
          </button>
          <button
            onClick={() => setFilterStatus("paid")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filterStatus === "paid"
                ? "bg-emerald-600 text-white shadow-sm"
                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
            }`}
          >
            Đã thanh toán cọc ({stats.paidCount})
          </button>
          <button
            onClick={() => setFilterStatus("cancelled")}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              filterStatus === "cancelled"
                ? "bg-gray-600 text-white shadow-sm"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            Đã hủy / Hoàn
          </button>
        </div>

        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-2.5 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Tìm tên, SĐT, mã booking, bàn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Danh sách Bookings */}
      {loading ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
          <RefreshCw size={32} className="animate-spin text-blue-500 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Đang tải thông tin tiền cọc đặt bàn...</p>
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="bg-white rounded-2xl p-16 text-center border border-gray-100 shadow-sm">
          <AlertCircle size={40} className="text-gray-300 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-gray-700">Không tìm thấy đơn đặt cọc nào</h3>
          <p className="text-gray-400 text-sm mt-1">
            {searchQuery
              ? "Hãy thử thay đổi từ khóa tìm kiếm hoặc bộ lọc trạng thái"
              : "Hiện tại chưa có đơn đặt bàn nào kèm yêu cầu đặt cọc"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 text-xs font-bold uppercase tracking-wider">
                  <th className="py-4 px-6">Mã & Thời gian</th>
                  <th className="py-4 px-6">Khách hàng & Bàn</th>
                  <th className="py-4 px-6">Món đặt trước</th>
                  <th className="py-4 px-6">Tiền đặt món</th>
                  <th className="py-4 px-6">Tiền Cọc (20%)</th>
                  <th className="py-4 px-6">Trạng thái cọc</th>
                  <th className="py-4 px-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredBookings.map((b) => {
                  const isCancelled = b.status === "cancelled";
                  const isPaid = b.deposit_status === "paid";
                  const itemCount = b.pre_ordered_items ? b.pre_ordered_items.length : 0;

                  return (
                    <tr
                      key={b.id}
                      className={`hover:bg-gray-50/60 transition ${
                        isCancelled ? "bg-gray-50/40 opacity-70" : ""
                      }`}
                    >
                      {/* Mã & Thời gian */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <Hash size={16} className="text-blue-500 shrink-0" />
                          <span className="font-extrabold text-blue-700 text-base">
                            {b.confirmation_code || `#${b.id}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-1">
                          <Calendar size={13} />
                          <span>{formatDateTime(b.start_time)}</span>
                        </div>
                      </td>

                      {/* Khách hàng & Bàn */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 font-bold text-gray-900">
                          <User size={15} className="text-gray-400" />
                          <span>{b.guest_name}</span>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                            {b.party_size} khách
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Phone size={13} /> {b.guest_phone}
                          </span>
                          {b.table_name && (
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-bold">
                              Bàn: {b.table_name} {b.area_name ? `(${b.area_name})` : ""}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Món đặt trước */}
                      <td className="py-4 px-6">
                        {itemCount > 0 ? (
                          <button
                            onClick={() => setSelectedBookingForModal(b)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl text-xs font-bold transition shadow-sm"
                          >
                            <Utensils size={14} />
                            <span>{itemCount} món đặt trước</span>
                            <Eye size={13} className="ml-1 opacity-70" />
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Không đặt món trước</span>
                        )}
                      </td>

                      {/* Tiền đặt món */}
                      <td className="py-4 px-6 font-semibold text-gray-700">
                        {formatCurrency(b.pre_order_total)}
                      </td>

                      {/* Tiền Cọc (20%) */}
                      <td className="py-4 px-6">
                        <span className="text-base font-extrabold text-blue-700">
                          {formatCurrency(b.deposit_amount)}
                        </span>
                      </td>

                      {/* Trạng thái cọc */}
                      <td className="py-4 px-6">
                        {isCancelled ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
                            <XCircle size={14} />
                            Đã hủy booking
                          </span>
                        ) : isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle size={14} className="text-emerald-500" />
                            Đã thu cọc
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                            <Clock size={14} className="text-amber-500" />
                            Chưa thanh toán cọc
                          </span>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="py-4 px-6 text-right">
                        {isCancelled ? (
                          <span className="text-xs text-gray-400 italic">---</span>
                        ) : isPaid ? (
                          <div className="text-xs font-semibold text-emerald-600 bg-emerald-50/50 px-3 py-1.5 rounded-lg inline-block border border-emerald-100">
                            ✓ Sẽ tự trừ khi ra bill
                          </div>
                        ) : (
                          <button
                            onClick={() => handleConfirmPayDeposit(b.id, b.confirmation_code || `#${b.id}`)}
                            disabled={processingId === b.id}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-95 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-50"
                          >
                            <Check size={14} />
                            <span>{processingId === b.id ? "Đang xử lý..." : "Xác nhận đã thu cọc"}</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Xem chi tiết món đặt trước */}
      {selectedBookingForModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center pb-4 border-b border-gray-100">
              <div>
                <h3 className="text-lg font-black text-gray-900 flex items-center gap-2">
                  <Utensils className="text-blue-600" size={20} />
                  <span>Chi tiết món đặt trước - {selectedBookingForModal.confirmation_code}</span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Khách hàng: <span className="font-bold text-gray-700">{selectedBookingForModal.guest_name}</span> ({selectedBookingForModal.guest_phone})
                </p>
              </div>
              <button
                onClick={() => setSelectedBookingForModal(null)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3 max-h-80 overflow-y-auto">
              {selectedBookingForModal.pre_ordered_items && selectedBookingForModal.pre_ordered_items.length > 0 ? (
                <div className="divide-y divide-gray-100 border rounded-xl overflow-hidden">
                  {selectedBookingForModal.pre_ordered_items.map((item: any, idx: number) => (
                    <div key={idx} className="p-3 bg-gray-50/50 flex justify-between items-center text-sm">
                      <div>
                        <p className="font-bold text-gray-800">{item.menu_item_name || `Món #${item.menu_item_id}`}</p>
                        {item.unit_price && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Đơn giá: {formatCurrency(item.unit_price)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <span className="bg-blue-100 text-blue-800 font-bold px-2 py-1 rounded-lg text-xs">
                          x{item.quantity}
                        </span>
                        <p className="font-extrabold text-gray-900 text-sm mt-1">
                          {formatCurrency((Number(item.unit_price) || 0) * (Number(item.quantity) || 1))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-6 italic text-sm">Không có thông tin món đặt trước</p>
              )}
            </div>

            <div className="pt-4 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-2xl space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Tổng tiền đặt món (dự kiến):</span>
                <span className="font-bold">{formatCurrency(selectedBookingForModal.pre_order_total)}</span>
              </div>
              <div className="flex justify-between text-base font-black text-blue-700">
                <span>Tiền cọc quy định (20%):</span>
                <span>{formatCurrency(selectedBookingForModal.deposit_amount)}</span>
              </div>
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedBookingForModal(null)}
                  className="px-5 py-2 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 text-gray-800 rounded-xl font-bold text-sm transition"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
