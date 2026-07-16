import React, { useState, useEffect } from "react";
import { Search, CalendarX, AlertCircle } from "lucide-react";
import { getBookings, Booking } from "../../../services/bookingService";
import { toast } from "react-hot-toast";

export const CancelledBookings: React.FC = () => {
  const [cancelledBookings, setCancelledBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchCancelledBookings = async () => {
    try {
      setLoading(true);
      const data = await getBookings("cancelled");
      setCancelledBookings(data);
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách lịch đặt đã hủy");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCancelledBookings();
  }, []);

  const filtered = cancelledBookings.filter((b) => {
    const term = searchTerm.toLowerCase();
    return (
      b.guest_name.toLowerCase().includes(term) ||
      b.guest_phone.includes(term) ||
      (b.confirmation_code && b.confirmation_code.toLowerCase().includes(term))
    );
  });

  const formatDateTime = (dateString: string) => {
    try {
      const d = new Date(dateString);
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, "0");
      const minutes = String(d.getMinutes()).padStart(2, "0");
      return `${day}/${month}/${year} ${hours}:${minutes}`;
    } catch {
      return "—";
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="bg-admin-card rounded-2xl border border-admin-border p-4 flex items-center justify-between shadow-xs">
        <div className="relative max-w-sm w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-admin-text-sub" size={15} />
          <input
            placeholder="Tìm tên khách hàng, số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 rounded-lg text-xs outline-none border border-admin-border focus:ring-2 focus:ring-[#FF5A5F]/20 focus:border-[#FF5A5F]"
          />
        </div>
        <div className="text-xs text-admin-text-sub font-semibold">
          Tổng số khách hủy: <span className="text-[#FF5A5F]">{filtered.length}</span>
        </div>
      </div>

      {/* Table grid */}
      <div className="bg-admin-card rounded-2xl border border-admin-border shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-gray-50 text-[10px] uppercase font-bold text-admin-text-sub border-b border-admin-border">
              <tr>
                <th className="px-6 py-4">Mã Booking</th>
                <th className="px-6 py-4">Tên khách hàng</th>
                <th className="px-6 py-4">Số điện thoại</th>
                <th className="px-6 py-4">Số người</th>
                <th className="px-6 py-4">Thời gian đặt</th>
                <th className="px-6 py-4">Lý do hủy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-admin-border text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-admin-text-sub">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#FF5A5F] border-t-transparent rounded-full animate-spin" />
                      <span>Đang tải thông tin...</span>
                    </div>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <div className="p-3 bg-red-50 text-red-500 rounded-full">
                        <CalendarX size={32} />
                      </div>
                      <span className="text-sm font-bold text-gray-500">Không có dữ liệu khách hủy bàn</span>
                      <span className="text-xs text-gray-400 max-w-xs">Không tìm thấy bất kỳ lịch đặt bàn nào có trạng thái đã hủy trong hệ thống.</span>
                    </div>
                  </td>
                </tr>
              ) : (
                filtered.map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-[#FF5A5F] font-mono">#{b.confirmation_code}</td>
                    <td className="px-6 py-4 font-bold text-admin-text-main">{b.guest_name}</td>
                    <td className="px-6 py-4 text-admin-text-sub font-mono">{b.guest_phone}</td>
                    <td className="px-6 py-4 font-semibold text-gray-700">{b.party_size} người</td>
                    <td className="px-6 py-4 text-gray-600 font-semibold font-mono">{formatDateTime(b.start_time)}</td>
                    <td className="px-6 py-4">
                      {b.note ? (
                        <div className="flex items-center gap-1.5 text-red-600 font-semibold bg-red-50/50 px-2.5 py-1 rounded-lg border border-red-100 max-w-xs truncate" title={b.note}>
                          <AlertCircle size={12} className="shrink-0" />
                          <span>{b.note}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 italic">Không có lý do</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
