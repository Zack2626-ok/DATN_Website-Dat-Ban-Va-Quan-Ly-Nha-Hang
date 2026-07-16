import React, { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { eventService } from "../../../services/eventService";
import { BanquetEvent } from "../../../interfaces/event";
import { formatCurrency } from "../../../utils/formatCurrency";

export const EventsManagement: React.FC = () => {
  const [events, setEvents] = useState<BanquetEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const data = await eventService.getEvents();
      setEvents(data || []);
    } catch (error) {
      console.error("Failed to fetch events", error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusLabel = (status: string) => {
    switch(status) {
      case 'lead': return 'Nháp (Lead)';
      case 'quoting': return 'Đang báo giá';
      case 'deposited': return 'Đã cọc';
      case 'confirmed': return 'Đã xác nhận';
      case 'completed': return 'Hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return status;
    }
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-admin-text-main">
      <div className="border-b border-admin-border pb-4">
        <h3 className="text-xl font-extrabold font-display">Quản lý Sự kiện & Tiệc</h3>
        <p className="text-xs text-admin-text-sub mt-1">Quản lý đặt tiệc và tránh trùng lịch</p>
      </div>

      <div className="bg-white p-6 rounded-2xl border border-admin-border shadow-xs">
        <div className="flex justify-between items-center mb-6">
          <h4 className="text-sm font-bold font-display">Danh sách tiệc</h4>
          <button className="px-4 py-1.5 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs">
            <Plus size={12} /> Tiệc mới
          </button>
        </div>

        {loading ? (
          <div className="text-center py-10 text-slate-500">Đang tải dữ liệu...</div>
        ) : events.length === 0 ? (
          <div className="text-center py-10 text-slate-500 border border-dashed rounded-lg">Chưa có dữ liệu tiệc nào.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3 rounded-tl-lg">Khách hàng</th>
                  <th className="p-3">Thông tin tiệc</th>
                  <th className="p-3">Thời gian</th>
                  <th className="p-3">Tài chính</th>
                  <th className="p-3">Trạng thái</th>
                  <th className="p-3 text-right rounded-tr-lg">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-slate-50/50">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{event.customer_name}</div>
                      <div className="text-[10px] text-slate-500">{event.customer_phone}</div>
                    </td>
                    <td className="p-3">
                      <div>Khu vực: {event.area_name || "Chưa chọn"}</div>
                      <div className="text-[10px] text-slate-500">Loại: {event.event_type || "Khác"} - {event.guest_count} khách</div>
                    </td>
                    <td className="p-3">
                      <div className="font-bold text-slate-700">{new Date(event.event_date).toLocaleDateString("vi-VN")}</div>
                      <div className="text-[10px] text-slate-500">{event.start_time} - {event.end_time}</div>
                    </td>
                    <td className="p-3">
                      <div className="text-[10px]">Cọc: <span className="text-rose-600 font-bold">{formatCurrency(event.deposit_amount)}</span></div>
                      <div className="text-[10px]">Tổng: <span className="text-emerald-600 font-bold">{formatCurrency(event.total_estimated_amount)}</span></div>
                    </td>
                    <td className="p-3">
                      <span className="px-2 py-1 rounded bg-slate-100 text-[10px] font-bold">
                        {getStatusLabel(event.status)}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <button className="px-2 py-1 bg-white border border-slate-200 hover:bg-slate-50 rounded text-[10px] font-bold text-slate-600">
                        Chi tiết
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
