import React, { useState, useEffect } from "react";
import { Search, Plus, CalendarDays, User, Phone, CheckCircle, XCircle, UserCheck, MapPin } from "lucide-react";
import { toast } from "react-hot-toast";
import { Modal } from "../../../components/Modal";
import { Badge } from "../../../components/Badge";
import { getBookings, updateBookingStatus, createBooking, Booking } from "../../../services/bookingService";
import { getTablesV1 } from "../../../services/tableService";

/**
 * BookingListPage — Quản lý đặt bàn
 */
export const BookingListPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [tables, setTables] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const [formData, setFormData] = useState({
    guest_name: "",
    guest_phone: "",
    party_size: 1,
    table_id: "",
    start_time: "",
    guest_note: "",
  });

  const fetchData = async () => {
    try {
      const [bookingsData, tablesData] = await Promise.all([
        getBookings(),
        getTablesV1(),
      ]);
      setBookings(bookingsData);
      setTables(tablesData);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải dữ liệu đặt bàn");
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.guest_phone.includes(searchTerm) ||
      b.confirmation_code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const handleStatusChange = async (id: number, newStatus: Booking["status"]) => {
    try {
      await updateBookingStatus(id, newStatus);
      setBookings((prev) => prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b)));
      toast.success(`Đã cập nhật Booking #${id} thành ${newStatus}`);
    } catch (err) {
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.table_id) {
      toast.error("Vui lòng chọn bàn");
      return;
    }
    try {
      // Mặc định thời gian đặt bàn là 2 tiếng
      const startDate = new Date(formData.start_time);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000);

      await createBooking({
        table_id: Number(formData.table_id),
        guest_name: formData.guest_name,
        guest_phone: formData.guest_phone,
        party_size: Number(formData.party_size),
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        guest_note: formData.guest_note,
      });

      toast.success("Đã tạo booking mới thành công!");
      setIsAddModalOpen(false);
      setFormData({
        guest_name: "",
        guest_phone: "",
        party_size: 1,
        table_id: "",
        start_time: "",
        guest_note: "",
      });
      fetchData(); // Tải lại danh sách
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tạo booking");
    }
  };

  // Badge component already handles booking statuses natively with Vietnamese now

  const formatDateTime = (dateString: string) => {
    try {
      const d = new Date(dateString);
      return {
        date: d.toLocaleDateString("vi-VN"),
        time: d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      };
    } catch {
      return { date: "", time: "" };
    }
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-admin-text-main font-display">Đặt bàn</h1>
          <p className="text-sm text-admin-text-sub">Quản lý lịch đặt bàn hệ thống</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-admin-primary text-white rounded-xl font-bold text-sm hover:bg-admin-primary-hover transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} /> Tạo booking
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-admin-card rounded-2xl border border-admin-border p-4 flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-3 text-admin-text-sub" size={16} />
          <input
            placeholder="Tìm mã, tên, SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm outline-none border border-admin-border focus:ring-2 focus:ring-admin-primary/20"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-4 py-2 bg-gray-50 rounded-lg text-sm border border-admin-border outline-none font-bold text-admin-text-main"
        >
          <option value="all">Tất cả</option>
          <option value="pending">Chờ xác nhận (Pending)</option>
          <option value="confirmed">Đã xác nhận (Confirmed)</option>
          <option value="completed">Đã hoàn thành</option>
          <option value="cancelled">Đã hủy</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-admin-card rounded-2xl border border-admin-border shadow-sm overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 text-admin-text-sub font-semibold uppercase text-xs">
            <tr>
              <th className="px-6 py-4">Mã</th>
              <th className="px-6 py-4">Khách</th>
              <th className="px-6 py-4">SĐT</th>
              <th className="px-6 py-4">Ngày giờ</th>
              <th className="px-6 py-4">Bàn</th>
              <th className="px-6 py-4">Người</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-admin-text-sub">
                  Không có dữ liệu đặt bàn nào
                </td>
              </tr>
            ) : (
              filteredBookings.map((b) => {
                const dt = formatDateTime(b.start_time);
                return (
                  <tr
                    key={b.id}
                    className="hover:bg-admin-primary-light/30 cursor-pointer transition-colors"
                    onClick={() => setSelectedBooking(b)}
                  >
                    <td className="px-6 py-4 font-bold text-admin-primary">#{b.confirmation_code}</td>
                    <td className="px-6 py-4 font-medium text-admin-text-main">{b.guest_name}</td>
                    <td className="px-6 py-4 text-admin-text-sub">{b.guest_phone}</td>
                    <td className="px-6 py-4 text-admin-text-sub">
                      {dt.date} {dt.time}
                    </td>
                    <td className="px-6 py-4">{b.table_name || "—"}</td>
                    <td className="px-6 py-4">{b.party_size}</td>
                    <td className="px-6 py-4">
                      <Badge status={b.status as any} type="booking" theme="light" />
                    </td>
                    <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-2">
                        {b.status === "pending" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(b.id, "confirmed")}
                              className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                              title="Xác nhận"
                            >
                              <CheckCircle size={16} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(b.id, "cancelled")}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                              title="Hủy"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                        {b.status === "confirmed" && (
                          <>
                            <button
                              onClick={() => handleStatusChange(b.id, "completed")}
                              className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                              title="Hoàn thành (Khách đã đến)"
                            >
                              <UserCheck size={16} />
                            </button>
                            <button
                              onClick={() => handleStatusChange(b.id, "cancelled")}
                              className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"
                              title="Hủy"
                            >
                              <XCircle size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal - Detail */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Chi tiết đặt bàn"
        size="md"
      >
        {selectedBooking && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl border border-admin-border flex justify-between items-center shadow-sm">
              <span className="font-bold text-gray-900 text-lg">#{selectedBooking.confirmation_code}</span>
              <Badge status={selectedBooking.status as any} type="booking" theme="light" />
            </div>
            <div className="grid gap-4 text-sm text-admin-text-main bg-white p-4 rounded-xl border border-admin-border">
              <div className="flex items-center gap-3">
                <User size={16} className="text-admin-primary" /> {selectedBooking.guest_name}
              </div>
              <div className="flex items-center gap-3">
                <Phone size={16} className="text-admin-primary" /> {selectedBooking.guest_phone}
              </div>
              <div className="flex items-center gap-3">
                <CalendarDays size={16} className="text-admin-primary" />{" "}
                {formatDateTime(selectedBooking.start_time).date} •{" "}
                {formatDateTime(selectedBooking.start_time).time}
              </div>
              <div className="flex items-center gap-3">
                <MapPin size={16} className="text-admin-primary" /> {selectedBooking.table_name || "Chưa gán bàn"}
              </div>
              {selectedBooking.guest_note && (
                <div className="pt-2 border-t text-gray-600 italic">
                  Ghi chú khách: "{selectedBooking.guest_note}"
                </div>
              )}
            </div>
            <div className="flex gap-3 border-t border-admin-border pt-4">
              {selectedBooking.status === "pending" && (
                <button
                  onClick={() => {
                    handleStatusChange(selectedBooking.id, "confirmed");
                    setSelectedBooking(null);
                  }}
                  className="flex-1 py-2.5 bg-admin-primary text-white rounded-lg font-bold text-sm hover:bg-admin-primary-hover"
                >
                  Xác nhận đặt bàn
                </button>
              )}
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm hover:bg-gray-200"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal - Add */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tạo Booking mới" size="md">
        <form className="space-y-6" onSubmit={handleCreateBooking}>
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-admin-text-sub uppercase tracking-wider border-b pb-2">
              Thông tin khách hàng
            </h3>
            <input
              required
              placeholder="Tên khách hàng"
              value={formData.guest_name}
              onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
              className="w-full p-2.5 bg-gray-50 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20"
            />
            <input
              required
              placeholder="Số điện thoại"
              value={formData.guest_phone}
              onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
              className="w-full p-2.5 bg-gray-50 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20"
            />
            <input
              type="number"
              min="1"
              required
              placeholder="Số lượng người"
              value={formData.party_size}
              onChange={(e) => setFormData({ ...formData, party_size: Number(e.target.value) })}
              className="w-full p-2.5 bg-gray-50 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20"
            />
          </div>
          <div className="space-y-4">
            <h3 className="text-xs font-bold text-admin-text-sub uppercase tracking-wider border-b pb-2">
              Thông tin bàn
            </h3>
            <input
              type="datetime-local"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
              className="w-full p-2.5 bg-gray-50 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20"
            />
            <select
              required
              value={formData.table_id}
              onChange={(e) => setFormData({ ...formData, table_id: e.target.value })}
              className="w-full p-2.5 bg-gray-50 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20"
            >
              <option value="">Chọn bàn...</option>
              {tables.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.capacity} chỗ) - {t.area_name}
                </option>
              ))}
            </select>
            <textarea
              placeholder="Ghi chú thêm..."
              value={formData.guest_note}
              onChange={(e) => setFormData({ ...formData, guest_note: e.target.value })}
              className="w-full p-2.5 bg-gray-50 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20"
            />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-admin-primary text-white rounded-lg font-bold text-sm hover:bg-admin-primary-hover"
          >
            Tạo booking
          </button>
        </form>
      </Modal>
    </div>
  );
};
