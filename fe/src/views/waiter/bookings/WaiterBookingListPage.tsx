import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Calendar,
  Search,
  RefreshCw,
  XCircle,
  X,
  FileText,
  Check,
  Clock,
  User,
  Phone,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import { io, Socket } from "socket.io-client";
import {
  getBookings,
  updateBookingStatus,
} from "../../../services/bookingService";
import type { Booking } from "../../../services/bookingService";

const formatYMD = (dateObj: Date): string => {
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, "0");
  const dd = String(dateObj.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

const getBookingYMD = (startTimeStr?: string): string => {
  if (!startTimeStr) return "";
  const cleaned = startTimeStr.replace(" ", "T");
  const dateObj = new Date(cleaned);
  if (isNaN(dateObj.getTime())) {
    return startTimeStr.split(" ")[0] || "";
  }
  return formatYMD(dateObj);
};

const formatTimeHHMM = (startTimeStr?: string): string => {
  if (!startTimeStr) return "--:--";
  const parts = startTimeStr.split(" ");
  if (parts.length >= 2) {
    return parts[1].substring(0, 5);
  }
  const dateObj = new Date(startTimeStr.replace(" ", "T"));
  if (!isNaN(dateObj.getTime())) {
    return dateObj.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  }
  return startTimeStr;
};

const formatShortDate = (dateStr?: string): string => {
  if (!dateStr) return "";
  const dateObj = new Date(dateStr.replace(" ", "T"));
  if (isNaN(dateObj.getTime())) return dateStr.split(" ")[0] || "";
  return `${dateObj.getDate()}/${dateObj.getMonth() + 1}/${dateObj.getFullYear()}`;
};

/**
 * Trả về toàn bộ cụm bàn đã được hệ thống giữ hoặc gán cho một booking.
 */
const getHeldTableGroupLabel = (booking: Booking): string => {
  return booking.table_names || booking.table_name || "";
};

const COMMON_CANCEL_REASONS = [
  "Khách gọi điện báo bận / hủy đơn",
  "Khách không đến (No-show)",
  "Khách muốn dời lịch hẹn",
  "Hết bàn trống phù hợp",
  "Yêu cầu khác từ phía khách",
];

export const WaiterBookingListPage: React.FC = () => {
  const navigate = useNavigate();
  const todayYMD = useMemo(() => formatYMD(new Date()), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayYMD);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [assignmentMap, setAssignmentMap] = useState<Record<string, any>>({});

  // Modal Hủy Bàn
  const [cancelModalBooking, setCancelModalBooking] = useState<Booking | null>(null);
  const [cancelReason, setCancelReason] = useState<string>("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState<boolean>(false);

  // Modal Chi Tiết
  const [detailModalBooking, setDetailModalBooking] = useState<Booking | null>(null);

  // Tải thông tin phân công từ LocalStorage
  const loadAssignments = useCallback(() => {
    try {
      const stored = localStorage.getItem("booking_assignments_map");
      if (stored) {
        setAssignmentMap(JSON.parse(stored));
      }
    } catch (e) {
      console.warn("Lỗi đọc booking_assignments_map:", e);
    }
  }, []);

  // Tải danh sách đặt bàn
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getBookings();
      setBookings(data);
      loadAssignments();
    } catch (err) {
      console.error(err);
      toast.error("Không thể tải danh sách đặt bàn");
    } finally {
      setLoading(false);
    }
  }, [loadAssignments]);

  useEffect(() => {
    loadData();

    // Socket.io Real-time Event Listener cho nhiều Phục vụ
    const socketUrl = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace("/api", "");
    const socket: Socket = io(socketUrl, {
      transports: ["polling", "websocket"],
      reconnectionAttempts: 10,
    });

    const handleRealtimeRefresh = () => {
      loadData();
    };

    socket.on("booking:assigned", handleRealtimeRefresh);
    socket.on("booking:created", handleRealtimeRefresh);
    socket.on("booking:claimed", handleRealtimeRefresh);
    socket.on("table:booking_checked_in", handleRealtimeRefresh);
    socket.on("booking:updated", handleRealtimeRefresh);
    socket.on("table:status_changed", handleRealtimeRefresh);

    return () => {
      socket.disconnect();
    };
  }, [loadData]);

  // Kiểm tra có phải ngày HÔM NAY hay không
  const isToday = useMemo(() => selectedDate === todayYMD, [selectedDate, todayYMD]);

  // Lọc duy nhất theo NGÀY ĐANG CHỌN
  const dateBookings = useMemo(() => {
    return bookings.filter((b) => {
      const bYMD = getBookingYMD(b.start_time);
      return bYMD === selectedDate;
    });
  }, [bookings, selectedDate]);

  // Lọc theo từ khóa & SẮP XẾP THEO THỨ TỰ YÊU CẦU:
  // 1. ĐẦU TIÊN (Ưu tiên 1): Khách chờ đến (pending / confirmed)
  // 2. Ở GIỮA (Ưu tiên 2): Đã hủy (cancelled)
  // 3. CUỐI CÙNG (Ưu tiên 3): Đã mở bàn cho khách / Khách đã đến (arrived / completed)
  const sortedAndFilteredBookings = useMemo(() => {
    let filtered = dateBookings;

    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      filtered = filtered.filter((b) => {
        const code = (b.confirmation_code || `#BK${b.id}`).toLowerCase();
        const name = (b.guest_name || "").toLowerCase();
        const phone = (b.guest_phone || "").toLowerCase();
        const table = (b.table_names || b.table_name || "").toLowerCase();
        return (
          code.includes(query) ||
          name.includes(query) ||
          phone.includes(query) ||
          table.includes(query)
        );
      });
    }

    const getGroupPriority = (status: string): number => {
      if (status === "pending" || status === "confirmed") return 1; // Đầu tiên: Chờ khách đến
      if (status === "cancelled") return 2;                        // Ở giữa: Đã hủy
      if (status === "arrived" || status === "completed") return 3; // Cuối cùng: Đã mở bàn cho khách
      return 4;
    };

    return [...filtered].sort((a, b) => {
      const priorityA = getGroupPriority(a.status);
      const priorityB = getGroupPriority(b.status);
      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return (a.start_time || "").localeCompare(b.start_time || "");
    });
  }, [dateBookings, searchTerm]);

  // Điều chuyển ngày nhanh
  const setQuickDate = (type: "yesterday" | "today" | "tomorrow") => {
    const d = new Date();
    if (type === "yesterday") d.setDate(d.getDate() - 1);
    if (type === "tomorrow") d.setDate(d.getDate() + 1);
    setSelectedDate(formatYMD(d));
  };

  // Nút Thao tác: "Khách đã đến" ➔ Cập nhật trạng thái + Nhảy sang Sơ đồ bàn tự điền dữ liệu
  const handleMarkArrivedAndNavigate = async (b: Booking) => {
    const assignedArea = b.area_name || assignmentMap[b.id]?.assignedArea || "Tầng 2";
    try {
      await updateBookingStatus(b.id, "arrived");
      toast.success(`✅ Đã nhận khách cho đơn #${b.confirmation_code || b.id}. Đang chuyển tới sơ đồ bàn...`);
      loadData();

      // Chuyển sang trang sơ đồ bàn và tự truyền dữ liệu khách để mở bàn
      navigate("/waiter/tables", {
        state: {
          targetArea: assignedArea,
          autoOpenAssignedBooking: {
            id: b.id,
            bookingId: b.id,
            guestName: b.guest_name,
            guestPhone: b.guest_phone,
            partySize: b.party_size,
            assignedArea: assignedArea,
            startTime: b.start_time,
          },
        },
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể cập nhật trạng thái nhận khách!");
    }
  };

  // Nút Thao tác: Xác nhận Hủy Đặt Bàn có lý do
  const handleConfirmCancel = async () => {
    if (!cancelModalBooking) return;
    if (!cancelReason.trim()) {
      toast.error("Vui lòng chọn hoặc nhập lý do hủy đặt bàn!");
      return;
    }
    setIsSubmittingCancel(true);
    try {
      await updateBookingStatus(cancelModalBooking.id, "cancelled", cancelReason.trim());
      toast.success(`✅ Đã hủy lịch đặt bàn #${cancelModalBooking.confirmation_code || cancelModalBooking.id}`);
      setCancelModalBooking(null);
      setCancelReason("");
      loadData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi thực hiện hủy đặt bàn!");
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 bg-[#F8F9FA] min-h-screen font-sans">
      {/* Top Header Card */}
      <div className="bg-white rounded-3xl p-6 shadow-xs border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] font-display tracking-tight flex items-center gap-2.5">
            <Calendar className="text-[#3E2016]" size={26} />
            Lịch Đặt Bàn Phục Vụ Theo Ngày
          </h1>
          <p className="text-xs text-[#8A8A8A] font-semibold mt-1">
            Chỉ cho phép thao tác <strong className="text-emerald-700">Nhận Khách / Mở bàn</strong> trong ngày <strong className="text-[#3E2016]">Hôm nay</strong>. Đơn đoàn lớn sẽ hiển thị vị trí khu vực phân công.
          </p>
        </div>

        <button
          onClick={loadData}
          disabled={loading}
          className="px-4 py-2.5 bg-white hover:bg-slate-50 text-[#1A1A1A] border border-slate-200 rounded-full text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 disabled:opacity-50 self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Làm mới
        </button>
      </div>

      {/* Date Selector & Search Bar */}
      <div className="bg-white p-6 rounded-3xl shadow-xs border border-slate-200/70 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Bộ chọn ngày */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-xs font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 mr-1">
            <Calendar size={15} className="text-[#3E2016]" /> CHỌN NGÀY:
          </span>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#3E2016]/20 shadow-2xs"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setQuickDate("yesterday")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDate === formatYMD(new Date(Date.now() - 86400000))
                  ? "bg-[#3E2016] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Hôm qua
            </button>
            <button
              type="button"
              onClick={() => setQuickDate("today")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
                selectedDate === todayYMD
                  ? "bg-[#3E2016] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              🔥 Hôm nay
            </button>
            <button
              type="button"
              onClick={() => setQuickDate("tomorrow")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                selectedDate === formatYMD(new Date(Date.now() + 86400000))
                  ? "bg-[#3E2016] text-white shadow-2xs"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Ngày mai
            </button>
          </div>
        </div>

        {/* Ô Tìm Kiếm Nhanh */}
        <div className="relative max-w-sm w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm tên khách, SĐT, mã..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#3E2016]/20 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-3xl shadow-xs border border-slate-200/70 overflow-hidden">
        {loading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw size={28} className="animate-spin text-[#3E2016] mx-auto" />
            <p className="text-xs font-bold text-slate-500">Đang đồng bộ dữ liệu real-time...</p>
          </div>
        ) : sortedAndFilteredBookings.length === 0 ? (
          <div className="py-20 text-center space-y-3">
            <div className="h-14 w-14 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <Calendar size={26} />
            </div>
            <h3 className="text-base font-extrabold text-slate-800">Không có lịch đặt bàn vào ngày này</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto font-medium">
              {searchTerm
                ? "Không tìm thấy thông tin phù hợp với từ khóa tìm kiếm."
                : `Không có lịch đặt bàn nào vào ngày ${selectedDate}.`}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-black uppercase text-slate-400 tracking-wider">
                  <th className="py-4 px-6">Mã</th>
                  <th className="py-4 px-6">Khách Hàng</th>
                  <th className="py-4 px-6">Số Điện Thoại</th>
                  <th className="py-4 px-6">Ngày Giờ Đến</th>
                  <th className="py-4 px-6">Số Khách</th>
                  <th className="py-4 px-6">Trạng Thái</th>
                  <th className="py-4 px-6 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-sans">
                {sortedAndFilteredBookings.map((b) => {
                  const isPendingOrConfirmed = b.status === "pending" || b.status === "confirmed";
                  const isCancelled = b.status === "cancelled";
                  const isArrivedOrCompleted = b.status === "arrived" || b.status === "completed";
                  const isLargeParty = Number(b.party_size) >= 10;
                  const explicitAssignment =
                    assignmentMap[b.id] ||
                    assignmentMap[String(b.id)] ||
                    (b.confirmation_code ? assignmentMap[b.confirmation_code] : null) ||
                    ((b as any).assigned_area ? { assignedArea: (b as any).assigned_area } : null);

                  const rawArea = explicitAssignment?.assignedArea || "";
                  const sanitizedArea = rawArea.toLowerCase().trim() === "tầng 1" ? "Tầng 2" : rawArea;
                  const hasAssignedArea = !!explicitAssignment?.assignedArea;
                  const assignedArea = sanitizedArea;
                  const codeDisplay = b.confirmation_code || `#BK${b.id}`;

                  return (
                    <tr
                      key={b.id}
                      onClick={() => setDetailModalBooking(b)}
                      className={`transition-colors group cursor-pointer ${
                        isPendingOrConfirmed
                          ? "bg-amber-50/30 hover:bg-amber-50/60 font-semibold"
                          : isCancelled
                            ? "bg-rose-50/20 hover:bg-rose-50/40 opacity-75"
                            : "bg-emerald-50/20 hover:bg-emerald-50/40 opacity-80"
                      }`}
                    >
                      {/* Mã */}
                      <td className="py-4 px-6 font-extrabold text-indigo-900 font-mono">
                        {codeDisplay}
                      </td>

                      {/* Khách Hàng */}
                      <td className="py-4 px-6 font-black text-slate-900">
                        <div className="flex items-center gap-2">
                          <User size={14} className="text-slate-400 shrink-0" />
                          <span>{b.guest_name}</span>
                          {isLargeParty && (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-700 text-[10px] font-black rounded-md animate-pulse">
                              Đoàn lớn
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Số Điện Thoại */}
                      <td className="py-4 px-6 font-bold text-slate-700">
                        <a
                          href={`tel:${b.guest_phone}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-indigo-600 hover:underline flex items-center gap-1.5"
                        >
                          <Phone size={13} className="text-slate-400" />
                          {b.guest_phone}
                        </a>
                      </td>

                      {/* Ngày Giờ Đến */}
                      <td className="py-4 px-6 font-extrabold">
                        <div className="flex items-center gap-1.5">
                          <Clock size={13} className="text-slate-400" />
                          <span className="text-slate-900">{formatShortDate(b.start_time)}</span>
                          <span className="ml-1 font-black text-indigo-700">{formatTimeHHMM(b.start_time)}</span>
                        </div>
                      </td>

                      {/* Số Khách */}
                      <td className="py-4 px-6 font-bold">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black ${
                            isLargeParty
                              ? "bg-rose-100 text-rose-800 border border-rose-200"
                              : "bg-slate-100 text-slate-800"
                          }`}
                        >
                          <Users size={13} />
                          {b.party_size} người
                        </span>
                      </td>

                      {/* Trạng Thái Badge */}
                      <td className="py-4 px-6">
                        {isPendingOrConfirmed && (
                          hasAssignedArea ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-100 text-indigo-950 border border-indigo-300 rounded-full text-xs font-black shadow-2xs">
                              <span className="h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
                              📍 {assignedArea} khách đến
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-100/80 text-amber-900 border border-amber-300 rounded-full text-xs font-black shadow-2xs">
                              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
                              Đang chờ khách đến
                            </span>
                          )
                        )}

                        {isCancelled && (
                          <div>
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-100/80 text-rose-800 border border-rose-300 rounded-full text-xs font-black">
                              <span className="h-2 w-2 rounded-full bg-rose-500" />
                              Đã hủy
                            </span>
                            {b.cancel_reason && (
                              <p className="text-[10px] text-rose-600 font-bold italic mt-1 max-w-xs truncate">
                                Lý do: {b.cancel_reason}
                              </p>
                            )}
                          </div>
                        )}

                        {isArrivedOrCompleted && (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-100/80 text-emerald-900 border border-emerald-300 rounded-full text-xs font-black">
                            <span className="h-2 w-2 rounded-full bg-emerald-600" />
                            Đã mở bàn chờ khách
                          </span>
                        )}
                      </td>

                      {/* Thao Tác Icons (CHỈ CHO PHÉP THAO TÁC KHI LÀ NGÀY HÔM NAY) */}
                      <td className="py-4 px-6 text-right space-x-2" onClick={(e) => e.stopPropagation()}>
                        {!isToday ? (
                          <span className="text-slate-400 italic text-[11px] font-medium">
                            Chờ đến ngày
                          </span>
                        ) : (
                          <>
                            {/* 1. Nhóm Khách Chờ Đến (HÔM NAY) ➔ Nút Khách đến + Nút Hủy */}
                            {isPendingOrConfirmed && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleMarkArrivedAndNavigate(b)}
                                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-full text-xs transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer active:scale-95"
                                  title="Khách đã đến ➔ Chuyển sang sơ đồ để mở bàn & phục vụ đoàn"
                                >
                                  <Check size={14} strokeWidth={3} />
                                  Mở bàn
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCancelModalBooking(b);
                                    setCancelReason("");
                                  }}
                                  className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 rounded-full transition-all cursor-pointer active:scale-95 shadow-2xs inline-flex items-center"
                                  title="Hủy lịch đặt bàn (Nhập lý do)"
                                >
                                  <X size={15} strokeWidth={2.5} />
                                </button>
                              </>
                            )}

                            {/* 2. Nhóm Đã Mở Bàn Cho Khách (HÔM NAY) ➔ Nút Hủy nếu cần */}
                            {isArrivedOrCompleted && (
                              <button
                                type="button"
                                onClick={() => {
                                  setCancelModalBooking(b);
                                  setCancelReason("");
                                }}
                                className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-200 rounded-full transition-all cursor-pointer active:scale-95 shadow-2xs inline-flex items-center"
                                title="Hủy đơn đặt bàn này"
                              >
                                <X size={15} strokeWidth={2.5} />
                              </button>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL HỦY ĐẶT BÀN (NHẬP LÝ DO) */}
      {cancelModalBooking && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-4 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-100 text-rose-700 rounded-2xl">
                  <XCircle size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Hủy Đặt Bàn Khách Hàng</h3>
                  <p className="text-xs text-slate-400 font-semibold">
                    {cancelModalBooking.guest_name} ({cancelModalBooking.guest_phone})
                  </p>
                </div>
              </div>
              <button
                onClick={() => setCancelModalBooking(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-rose-50/70 p-3.5 rounded-2xl border border-rose-100 text-xs text-slate-700 space-y-1">
              <p>
                <strong>Mã đơn đặt:</strong>{" "}
                <span className="font-mono text-rose-800 font-bold">
                  {cancelModalBooking.confirmation_code || `#BK${cancelModalBooking.id}`}
                </span>
              </p>
              <p>
                <strong>Thời gian đến:</strong> {formatShortDate(cancelModalBooking.start_time)} lúc {formatTimeHHMM(cancelModalBooking.start_time)} ({cancelModalBooking.party_size} người)
              </p>
            </div>

            {/* Chọn Lý Do Nhanh */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-700 block">
                Chọn nhanh lý do hủy:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_CANCEL_REASONS.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setCancelReason(r)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      cancelReason === r
                        ? "bg-rose-700 text-white shadow-xs"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Nhập Lý Do Chi Tiết */}
            <div className="space-y-1.5">
              <label className="text-xs font-black text-slate-700 block">
                Lý do hủy đặt bàn chi tiết <span className="text-rose-600">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="Nhập lý do chi tiết..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCancelModalBooking(null)}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold transition-all cursor-pointer"
              >
                Quay lại
              </button>
              <button
                type="button"
                disabled={isSubmittingCancel}
                onClick={handleConfirmCancel}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-full text-xs font-black shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-50"
              >
                {isSubmittingCancel ? "Đang xử lý..." : "Xác nhận hủy lịch đặt"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT ĐẶT BÀN */}
      {detailModalBooking && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 text-amber-900 rounded-2xl">
                  <FileText size={22} />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Chi Tiết Đơn Đặt Bàn</h3>
                  <p className="text-xs text-indigo-700 font-mono font-bold">
                    {detailModalBooking.confirmation_code || `#BK${detailModalBooking.id}`}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDetailModalBooking(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">KHÁCH HÀNG</span>
                <p className="font-black text-slate-900 text-sm">{detailModalBooking.guest_name}</p>
                <p className="font-bold text-slate-600">{detailModalBooking.guest_phone}</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">THỜI GIAN & SỐ KHÁCH</span>
                <p className="font-black text-indigo-700 text-sm">{formatTimeHHMM(detailModalBooking.start_time)}</p>
                <p className="font-bold text-slate-600">
                  {formatShortDate(detailModalBooking.start_time)} | <strong>{detailModalBooking.party_size} người</strong>
                </p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl space-y-1 col-span-2">
                <span className="text-slate-400 font-bold block text-[10px] uppercase">KHU VỰC & BÀN PHÂN CÔNG</span>
                <div className="flex items-center justify-between pt-1">
                  <span className="font-black text-indigo-950 text-xs bg-indigo-100 px-3 py-1 rounded-lg border border-indigo-200">
                    📍 Khu vực: {assignmentMap[detailModalBooking.id]?.assignedArea || (detailModalBooking as any).assigned_area || detailModalBooking.area_name || "Tầng 2"}
                  </span>
                  <span className="font-bold text-slate-700 text-xs text-right">
                    {getHeldTableGroupLabel(detailModalBooking)
                      ? `Cụm bàn đã giữ: ${getHeldTableGroupLabel(detailModalBooking)}`
                      : "Chưa có cụm bàn được hệ thống giữ"}
                  </span>
                </div>
              </div>

              {detailModalBooking.guest_note && (
                <div className="bg-amber-50/70 p-3.5 rounded-2xl border border-amber-100 col-span-2 space-y-1">
                  <span className="text-amber-900 font-extrabold block text-[10px] uppercase">GHI CHÚ CỦA KHÁCH:</span>
                  <p className="text-slate-800 font-medium italic">{detailModalBooking.guest_note}</p>
                </div>
              )}

              {detailModalBooking.cancel_reason && (
                <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-100 col-span-2 space-y-1">
                  <span className="text-rose-900 font-extrabold block text-[10px] uppercase">LÝ DO HỦY ĐẶT BÀN:</span>
                  <p className="text-rose-800 font-bold">{detailModalBooking.cancel_reason}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setDetailModalBooking(null)}
                className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-bold cursor-pointer"
              >
                Đóng
              </button>

              {isToday && (detailModalBooking.status === "pending" || detailModalBooking.status === "confirmed") && (
                <button
                  type="button"
                  onClick={() => {
                    const b = detailModalBooking;
                    setDetailModalBooking(null);
                    handleMarkArrivedAndNavigate(b);
                  }}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full text-xs font-black shadow-md cursor-pointer inline-flex items-center gap-2"
                >
                  <Check size={16} />
                  Khách Đến ➔ Mở Bàn Phục Vụ
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
