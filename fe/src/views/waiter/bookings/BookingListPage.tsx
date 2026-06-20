import React, { useState } from "react";
import { Search, Plus, MoreVertical, CalendarDays, User, Phone, CheckCircle, XCircle, UserCheck, Clock, MapPin } from "lucide-react";
import { MOCK_BOOKINGS, Booking } from "../../../data/mockBookings";
import { MOCK_TABLES } from "../../../data/mockTables";
import { toast } from "react-hot-toast";
import { Modal } from "../../../components/Modal";
import { Badge } from "../../../components/Badge";

/**
 * BookingListPage — Quản lý đặt bàn (Refactored SaaS Style)
 */
export const BookingListPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>(MOCK_BOOKINGS);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const filteredBookings = bookings.filter(b => {
      const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || b.phone.includes(searchTerm);
      const matchesStatus = filterStatus === "all" || b.status === filterStatus;
      return matchesSearch && matchesStatus;
  });

  const handleStatusChange = (id: string, newStatus: Booking['status']) => {
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: newStatus } : b));
    toast.success(`Booking #${id} updated to ${newStatus}`);
  };

  const getStatus = (status: string) => {
    switch (status) {
        case 'pending': return 'CONFIRMED';
        case 'confirmed': return 'RESERVED';
        case 'completed': return 'SERVING';
        case 'cancelled': return 'CANCELLED';
        default: return 'DRAFT';
    }
  }

  return (
    <div className="p-8 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-admin-text-main font-display">Đặt bàn</h1>
          <p className="text-sm text-admin-text-sub">Quản lý lịch đặt bàn hệ thống</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="px-5 py-2.5 bg-admin-primary text-white rounded-xl font-bold text-sm hover:bg-admin-primary-hover transition-all flex items-center gap-2 shadow-sm">
          <Plus size={16} /> Tạo booking
        </button>
      </div>

      {/* Toolbar */}
      <div className="bg-admin-card rounded-2xl border border-admin-border p-4 flex gap-4">
           <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 text-admin-text-sub" size={16} />
            <input placeholder="Tìm booking..." onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-sm outline-none border border-admin-border focus:ring-2 focus:ring-admin-primary/20" />
           </div>
           <select onChange={(e) => setFilterStatus(e.target.value)} className="px-4 py-2 bg-gray-50 rounded-lg text-sm border border-admin-border outline-none font-bold text-admin-text-main">
                <option value="all">Tất cả</option>
                <option value="pending">Chờ xác nhận</option>
                <option value="confirmed">Đã xác nhận</option>
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
            {filteredBookings.map((b) => (
              <tr key={b.id} className="hover:bg-admin-primary-light/30 cursor-pointer transition-colors" onClick={() => setSelectedBooking(b)}>
                <td className="px-6 py-4 font-bold text-admin-primary">#{b.id}</td>
                <td className="px-6 py-4 font-medium text-admin-text-main">{b.customerName}</td>
                <td className="px-6 py-4 text-admin-text-sub">{b.phone}</td>
                <td className="px-6 py-4 text-admin-text-sub">{b.date} {b.time}</td>
                <td className="px-6 py-4">{b.tableName || '—'}</td>
                <td className="px-6 py-4">{b.guests}</td>
                <td className="px-6 py-4"><Badge status={getStatus(b.status) as any} type="order" theme="light" /></td>
                <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                        {b.status === 'pending' && (
                            <>
                                <button onClick={() => handleStatusChange(b.id, 'confirmed')} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><CheckCircle size={16}/></button>
                                <button onClick={() => handleStatusChange(b.id, 'cancelled')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><XCircle size={16}/></button>
                            </>
                        )}
                        {b.status === 'confirmed' && (
                            <>
                                <button onClick={() => handleStatusChange(b.id, 'completed')} className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"><UserCheck size={16}/></button>
                                <button onClick={() => handleStatusChange(b.id, 'cancelled')} className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100"><XCircle size={16}/></button>
                            </>
                        )}
                    </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal - Detail */}
      <Modal isOpen={!!selectedBooking} onClose={() => setSelectedBooking(null)} title="Chi tiết đặt bàn" size="md">
        {selectedBooking && (
          <div className="space-y-6">
            <div className="p-4 bg-gray-50 rounded-xl border border-admin-border flex justify-between items-center shadow-sm">
                <span className="font-bold text-gray-900 text-lg">#{selectedBooking.id}</span>
                <Badge status={getStatus(selectedBooking.status) as any} type="order" theme="light" />
            </div>
            <div className="grid gap-4 text-sm text-admin-text-main bg-white p-4 rounded-xl border border-admin-border">
                <div className="flex items-center gap-3"><User size={16} className="text-admin-primary"/> {selectedBooking.customerName}</div>
                <div className="flex items-center gap-3"><Phone size={16} className="text-admin-primary"/> {selectedBooking.phone}</div>
                <div className="flex items-center gap-3"><CalendarDays size={16} className="text-admin-primary"/> {selectedBooking.date} • {selectedBooking.time}</div>
                <div className="flex items-center gap-3"><MapPin size={16} className="text-admin-primary"/> {selectedBooking.tableName || "Chưa chọn bàn"}</div>
            </div>
            <div className="flex gap-3 border-t border-admin-border pt-4">
                {selectedBooking.status === 'pending' && <button onClick={() => { handleStatusChange(selectedBooking.id, 'confirmed'); setSelectedBooking(null); }} className="flex-1 py-2.5 bg-admin-primary text-white rounded-lg font-bold text-sm">Xác nhận</button>}
                <button onClick={() => setSelectedBooking(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-bold text-sm">Đóng</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal - Add */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Tạo Booking mới" size="md">
         <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); setIsAddModalOpen(false); toast.success("Đã tạo booking!"); }}>
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-admin-text-sub uppercase tracking-wider border-b pb-2">Thông tin khách hàng</h3>
                <input required placeholder="Tên khách hàng" className="w-full p-2.5 bg-gray-50 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20" />
                <input required placeholder="Số điện thoại" className="w-full p-2.5 bg-gray-50 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20" />
            </div>
            <div className="space-y-4">
                <h3 className="text-xs font-bold text-admin-text-sub uppercase tracking-wider border-b pb-2">Thông tin bàn</h3>
                <input type="datetime-local" required className="w-full p-2.5 bg-gray-50 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20" />
                <select className="w-full p-2.5 bg-gray-50 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20">
                    <option>Chọn bàn...</option>
                    {MOCK_TABLES.map(t => <option key={t.id}>{t.name}</option>)}
                </select>
                <textarea placeholder="Ghi chú..." className="w-full p-2.5 bg-gray-50 border border-admin-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-admin-primary/20" />
            </div>
            <button type="submit" className="w-full py-3 bg-admin-primary text-white rounded-lg font-bold text-sm hover:bg-admin-primary-hover">Tạo booking</button>
         </form>
      </Modal>
    </div>
  );
};
