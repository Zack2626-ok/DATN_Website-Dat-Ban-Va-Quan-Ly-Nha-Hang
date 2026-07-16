import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  CalendarDays,
  User,
  Phone,
  CheckCircle,
  XCircle,
  UserCheck,
  MapPin,
  Users,
  Clock,
  FileText,
  Table2,
  ChevronDown,
  Trash2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Modal } from "../../../components/Modal";
import { Badge } from "../../../components/Badge";
import {
  getBookings,
  updateBookingStatus,
  createBooking,
  deleteBooking,
  Booking,
} from "../../../services/bookingService";
import { getEmptyTables, ResmanagerTable } from "../../../services/tableService";
import { useAppSelector } from "../../../store/hooks";
import { CancelledBookings } from "./components/CancelledBookings";

/**
 * BookingListPage — Quản lý đặt bàn
 * Redesigned: light modal, 2-column form, chỉ lấy bàn trống
 */
export const BookingListPage: React.FC = () => {
  const { user } = useAppSelector((state: any) => state.auth);
  const [activeMainTab, setActiveMainTab] = useState<"active" | "cancelled">("active");

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [emptyTables, setEmptyTables] = useState<ResmanagerTable[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const getLocalNowString = () => {
    const now = new Date();
    // Adjust to local timezone offset for input[type="datetime-local"]
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [formData, setFormData] = useState({
    guest_name: "",
    guest_phone: "",
    party_size: 2,
    table_id: "",
    start_time: getLocalNowString(),
    guest_note: "",
  });

  const fetchData = async () => {
    try {
      const [bookingsData, tablesData] = await Promise.all([
        getBookings(),
        getEmptyTables(formData.start_time), // Truyền start_time để lọc bàn trống thực sự
      ]);
      setBookings(bookingsData);
      setEmptyTables(tablesData);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải dữ liệu đặt bàn");
    }
  };

  useEffect(() => {
    fetchData();
  }, [formData.start_time]); // Fetch lại khi start_time thay đổi

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
      toast.success(`Cập nhật booking #${id} thành công`);
    } catch (err) {
      toast.error("Lỗi cập nhật trạng thái");
    }
  };

  const handleDeleteBooking = async (id: number) => {
    if (!window.confirm("Xóa booking đã hủy này khỏi danh sách?")) return;
    try {
      await deleteBooking(id);
      setBookings((prev) => prev.filter((b) => b.id !== id));
      toast.success("Đã xóa booking");
    } catch {
      toast.error("Chỉ xóa được booking đã hủy");
    }
  };

  const handleCreateBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.guest_name.trim()) {
      toast.error("Vui lòng nhập tên khách hàng");
      return;
    }
    if (!formData.guest_phone.trim()) {
      toast.error("Vui lòng nhập số điện thoại");
      return;
    }
    if (!formData.table_id) {
      toast.error("Vui lòng chọn bàn");
      return;
    }
    if (!formData.start_time) {
      toast.error("Vui lòng chọn ngày giờ đặt bàn");
      return;
    }
    setSubmitting(true);
    try {
      const startDate = new Date(formData.start_time);
      const endDate = new Date(startDate.getTime() + 2 * 60 * 60 * 1000); // +2h

      await createBooking({
        table_id: Number(formData.table_id),
        guest_name: formData.guest_name,
        guest_phone: formData.guest_phone,
        party_size: Number(formData.party_size),
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
        guest_note: formData.guest_note,
      });

      toast.success("✅ Tạo booking mới thành công!");
      setIsAddModalOpen(false);
      setFormData({ guest_name: "", guest_phone: "", party_size: 2, table_id: "", start_time: getLocalNowString(), guest_note: "" });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Lỗi khi tạo booking, vui lòng thử lại");
    } finally {
      setSubmitting(false);
    }
  };

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

  const statusCount = {
    all: bookings.length,
    pending: bookings.filter((b) => b.status === "pending").length,
    confirmed: bookings.filter((b) => b.status === "confirmed").length,
    completed: bookings.filter((b) => b.status === "completed").length,
    cancelled: bookings.filter((b) => b.status === "cancelled").length,
  };

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-admin-text-main font-display">Đặt bàn</h1>
          <p className="text-sm text-admin-text-sub mt-0.5">Quản lý lịch đặt bàn hệ thống</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-admin-primary text-white rounded-xl font-bold text-sm hover:bg-admin-primary-hover transition-all flex items-center gap-2 shadow-sm"
        >
          <Plus size={16} /> Tạo booking
        </button>
      </div>

      {/* ── Role-based Main Tabs (Manager/Admin Only) ── */}
      {(user?.role === "manager" || user?.role === "admin") && (
        <div className="flex border-b border-admin-border gap-6 mb-2">
          <button
            onClick={() => setActiveMainTab("active")}
            className={`flex items-center gap-1.5 pb-3 text-sm font-bold transition-all relative cursor-pointer ${
              activeMainTab === "active" ? "text-admin-primary" : "text-admin-text-sub hover:text-admin-text-main"
            }`}
          >
            Lịch đặt hiện tại
            {activeMainTab === "active" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-admin-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveMainTab("cancelled")}
            className={`flex items-center gap-1.5 pb-3 text-sm font-bold transition-all relative cursor-pointer ${
              activeMainTab === "cancelled" ? "text-[#FF5A5F]" : "text-admin-text-sub hover:text-[#FF5A5F]"
            }`}
          >
            Lịch sử khách hủy bàn
            {activeMainTab === "cancelled" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5A5F] rounded-full" />
            )}
          </button>
        </div>
      )}

      {activeMainTab === "cancelled" ? (
        <CancelledBookings />
      ) : (
        <>
          {/* ── Toolbar ── */}
          <div className="bg-admin-card rounded-2xl border border-admin-border p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-sub" size={15} />
          <input
            placeholder="Tìm mã, tên, SĐT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm outline-none border border-admin-border focus:ring-2 focus:ring-admin-primary/20"
          />
        </div>
        {/* Status filter tabs */}
        <div className="flex gap-1 flex-wrap">
          {[
            { key: "all", label: "Tất cả" },
            { key: "pending", label: "Chờ xác nhận" },
            { key: "confirmed", label: "Đã xác nhận" },
            { key: "completed", label: "Hoàn thành" },
            { key: "cancelled", label: "Đã hủy" },
          ].map((s) => (
            <button
              key={s.key}
              onClick={() => setFilterStatus(s.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterStatus === s.key
                ? "bg-admin-primary text-white"
                : "bg-gray-100 text-admin-text-sub hover:bg-gray-200"
                }`}
            >
              {s.label}
              <span className="ml-1 opacity-70">({statusCount[s.key as keyof typeof statusCount]})</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-admin-card rounded-2xl border border-admin-border shadow-sm overflow-hidden">
        <table className="w-full text-left text-base">
          <thead className="bg-gray-50 text-admin-text-sub font-semibold uppercase text-sm">
            <tr>
              <th className="px-6 py-4">Mã</th>
              <th className="px-6 py-4">Khách</th>
              <th className="px-6 py-4">SĐT</th>
              <th className="px-6 py-4">Ngày giờ</th>
              <th className="px-6 py-4">Bàn</th>
              <th className="px-6 py-4">Người</th>
              <th className="px-6 py-4">Trạng thái</th>
              <th className="px-6 py-4 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-admin-border">
            {filteredBookings.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-6 py-12 text-center text-admin-text-sub">
                  <CalendarDays className="mx-auto mb-2 opacity-30" size={32} />
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
                      <span className="font-medium text-admin-text-main">{dt.date}</span>
                      <span className="text-xs ml-1">{dt.time}</span>
                    </td>
                    <td className="px-6 py-4 font-medium">{b.table_name || "—"}</td>
                    <td className="px-6 py-4">{b.party_size} người</td>
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
                        {b.status === "cancelled" && (
                          <button
                            onClick={() => handleDeleteBooking(b.id)}
                            className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-red-50 hover:text-red-600"
                            title="Xóa booking đã hủy"
                          >
                            <Trash2 size={16} />
                          </button>
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
    </>
  )}

      {/* ── Modal Chi tiết ── */}
      <Modal
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        title="Chi tiết đặt bàn"
        size="md"
        theme="light"
      >
        {selectedBooking && (
          <div className="space-y-5">
            <div className="flex justify-between items-center p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div>
                <p className="text-xs text-gray-500 font-medium mb-0.5">Mã xác nhận</p>
                <span className="font-black text-blue-700 text-lg">#{selectedBooking.confirmation_code}</span>
              </div>
              <Badge status={selectedBooking.status as any} type="booking" theme="light" />
            </div>

            <div className="grid gap-3 text-sm">
              {[
                { icon: <User size={15} className="text-admin-primary" />, label: "Khách hàng", value: selectedBooking.guest_name },
                { icon: <Phone size={15} className="text-admin-primary" />, label: "Số điện thoại", value: selectedBooking.guest_phone },
                {
                  icon: <CalendarDays size={15} className="text-admin-primary" />,
                  label: "Thời gian",
                  value: `${formatDateTime(selectedBooking.start_time).date} lúc ${formatDateTime(selectedBooking.start_time).time}`,
                },
                { icon: <MapPin size={15} className="text-admin-primary" />, label: "Bàn", value: selectedBooking.table_name || "Chưa gán bàn" },
                { icon: <Users size={15} className="text-admin-primary" />, label: "Số người", value: `${selectedBooking.party_size} người` },
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                  <span className="mt-0.5 shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">{item.label}</p>
                    <p className="font-medium text-gray-800">{item.value}</p>
                  </div>
                </div>
              ))}
              {selectedBooking.guest_note && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <FileText size={15} className="text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-[10px] font-bold text-amber-600 uppercase">Ghi chú khách</p>
                    <p className="font-medium text-gray-700 italic">"{selectedBooking.guest_note}"</p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              {selectedBooking.status === "pending" && (
                <button
                  onClick={() => { handleStatusChange(selectedBooking.id, "confirmed"); setSelectedBooking(null); }}
                  className="flex-1 py-2.5 bg-admin-primary text-white rounded-xl font-bold text-sm hover:bg-admin-primary-hover"
                >
                  ✓ Xác nhận đặt bàn
                </button>
              )}
              <button
                onClick={() => setSelectedBooking(null)}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Modal Tạo Booking — Redesigned ── */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tạo Booking mới" size="lg" theme="light">
        <form className="space-y-0" onSubmit={handleCreateBooking}>
          {/* Section 1: Thông tin khách */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <User size={14} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-700 text-sm">Thông tin khách hàng</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tên khách */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Tên khách hàng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={formData.guest_name}
                    onChange={(e) => setFormData({ ...formData, guest_name: e.target.value })}
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-gray-800 placeholder-gray-400"
                  />
                </div>
              </div>
              {/* SĐT */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Số điện thoại <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    required
                    placeholder="0901 234 567"
                    value={formData.guest_phone}
                    onChange={(e) => setFormData({ ...formData, guest_phone: e.target.value })}
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-gray-800 placeholder-gray-400"
                  />
                </div>
              </div>
              {/* Số người */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Số lượng người <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Users size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    placeholder="2"
                    value={formData.party_size}
                    onChange={(e) => setFormData({ ...formData, party_size: Number(e.target.value) })}
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-gray-800"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Thông tin bàn */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                <Table2 size={14} className="text-green-600" />
              </div>
              <h3 className="font-bold text-gray-700 text-sm">Thông tin đặt bàn</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ngày giờ */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Ngày & Giờ đặt <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="datetime-local"
                    required
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-gray-800"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 ml-1">Vui lòng chọn ngày giờ TRƯỚC khi chọn bàn</p>
              </div>

              {/* Chọn bàn - chỉ bàn trống */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Chọn bàn trống <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Table2 size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <ChevronDown size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  <select
                    required
                    value={formData.table_id}
                    onChange={(e) => setFormData({ ...formData, table_id: e.target.value })}
                    className="w-full pl-9 pr-8 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-gray-800 appearance-none"
                  >
                    <option value="">-- Chọn bàn --</option>
                    {emptyTables.length === 0 ? (
                      <option disabled>Không có bàn trống</option>
                    ) : (
                      emptyTables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} — {t.capacity} chỗ — {t.area_name}
                        </option>
                      ))
                    )}
                  </select>
                </div>
                {emptyTables.length === 0 && formData.start_time && (
                  <p className="text-[10px] text-amber-600 mt-1 ml-1 font-medium">
                    ⚠ Hiện không có bàn trống lúc này
                  </p>
                )}
              </div>

              {/* Ghi chú */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Ghi chú (tùy chọn)
                </label>
                <div className="relative">
                  <FileText size={15} className="absolute left-3 top-3.5 text-gray-400" />
                  <textarea
                    placeholder="Yêu cầu đặc biệt, vị trí ngồi, dịp đặc biệt..."
                    value={formData.guest_note}
                    onChange={(e) => setFormData({ ...formData, guest_note: e.target.value })}
                    rows={3}
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-gray-800 placeholder-gray-400 resize-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-3 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(false)}
              className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || emptyTables.length === 0}
              className="flex-2 flex-1 py-3 bg-admin-primary text-white rounded-xl font-bold text-sm hover:bg-admin-primary-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="animate-spin w-4 h-4 border-2 border-white/30 border-t-white rounded-full" />
                  Đang tạo...
                </>
              ) : (
                <>
                  <Plus size={15} />
                  Tạo Booking
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
