import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
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
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Modal } from "../../../components/Modal";
import { Badge } from "../../../components/Badge";
import { io } from "socket.io-client";
import {
  getBookings,
  updateBookingStatus,
  createDirectBooking,
  deleteBooking,
  assignBookingApi,
  Booking,
} from "../../../services/bookingService";
import {
  getEmptyTables,
  getTablesV1,
  ResmanagerTable,
} from "../../../services/tableService";
import { userService } from "../../../services/userService";
import { getBookingValidationStatus } from "../../../services/systemService";
import { useAppSelector } from "../../../store/hooks";
import { CancelledBookings } from "./components/CancelledBookings";
import {
  BOOKING_DURATION_MINUTES,
  BOOKING_MAX_ADVANCE_DAYS,
  MAX_BOOKING_PARTY_SIZE,
} from "../../../constants/booking";

/** Calculates the fixed booking slot end time from a datetime-local input. */
const calculateScheduledEndTime = (startTime: string): string => {
  const start = new Date(`${startTime}:00+07:00`);
  const end = new Date(start.getTime() + BOOKING_DURATION_MINUTES * 60 * 1000);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
    .format(end)
    .replace("T", " ");
};

/** Returns the latest datetime permitted in the advance-booking form. */
const getMaximumBookingDateTime = (): string => {
  const maximum = new Date();
  maximum.setDate(maximum.getDate() + BOOKING_MAX_ADVANCE_DAYS);
  maximum.setMinutes(maximum.getMinutes() - maximum.getTimezoneOffset());
  return maximum.toISOString().slice(0, 16);
};

/** Checks whether a booking belongs to the restaurant's current calendar day. */
const isBookingScheduledToday = (startTime: string): boolean => {
  const normalized = startTime.replace(" ", "T");
  const bookingDate = new Date(
    normalized.endsWith("Z") || normalized.includes("+")
      ? normalized
      : `${normalized}+07:00`,
  );
  const formatter = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(bookingDate) === formatter.format(new Date());
};

/**
 * BookingListPage — Quản lý đặt bàn
 * Redesigned: light modal, 2-column form, chỉ lấy bàn trống
 */
export const BookingListPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state: any) => state.auth);
  console.log("LOGGED IN USER PROFILE:", user);
  const [activeMainTab, setActiveMainTab] = useState<"active" | "cancelled">(
    "active",
  );

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [emptyTables, setEmptyTables] = useState<ResmanagerTable[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [bookingValidationEnabled, setBookingValidationEnabled] =
    useState(true);

  // Assignment Modal States
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [assigningBooking, setAssigningBooking] = useState<Booking | null>(
    null,
  );
  const [assignArea, setAssignArea] = useState("Tầng 2");
  const [selectedWaiters, setSelectedWaiters] = useState<string[]>([]);
  const [staffWaiters, setStaffWaiters] = useState<
    { id: number; name: string; phone: string; email: string }[]
  >([]);
  const [allTables, setAllTables] = useState<any[]>([]);

  useEffect(() => {
    getTablesV1()
      .then((data) => setAllTables(data || []))
      .catch(() => {});
  }, [isAssignModalOpen]);

  const linkedTables = useMemo(() => {
    if (!assigningBooking || !allTables || allTables.length === 0) return [];
    const directMatches = allTables.filter(
      (t: any) =>
        (t.booking_id &&
          Number(t.booking_id) === Number(assigningBooking.id)) ||
        (assigningBooking.confirmation_code &&
          t.booking_code === assigningBooking.confirmation_code),
    );

    const tableSet = new Map<number, any>();
    directMatches.forEach((t) => {
      tableSet.set(t.id, t);
      if (t.group_seating_tables && Array.isArray(t.group_seating_tables)) {
        t.group_seating_tables.forEach((gt: any) => tableSet.set(gt.id, gt));
      }
      if (t.merged_tables && Array.isArray(t.merged_tables)) {
        t.merged_tables.forEach((mc: any) => tableSet.set(mc.id, mc));
      }
      if (t.merged_children && Array.isArray(t.merged_children)) {
        t.merged_children.forEach((mc: any) => tableSet.set(mc.id, mc));
      }
    });

    return Array.from(tableSet.values());
  }, [assigningBooking, allTables]);

  const bookingClusterMap = useMemo(() => {
    const map = new Map<
      number,
      { tables: any[]; totalCapacity: number; isReady: boolean }
    >();
    bookings.forEach((b) => {
      const directMatches = allTables.filter(
        (t: any) =>
          (t.booking_id && Number(t.booking_id) === Number(b.id)) ||
          (b.confirmation_code && t.booking_code === b.confirmation_code),
      );
      const tableSet = new Map<number, any>();
      directMatches.forEach((t) => {
        tableSet.set(t.id, t);
        if (t.group_seating_tables && Array.isArray(t.group_seating_tables)) {
          t.group_seating_tables.forEach((gt: any) => tableSet.set(gt.id, gt));
        }
        if (t.merged_tables && Array.isArray(t.merged_tables)) {
          t.merged_tables.forEach((mc: any) => tableSet.set(mc.id, mc));
        }
      });
      const list = Array.from(tableSet.values());
      const totalCapacity = list.reduce(
        (sum, t) => sum + Number(t.capacity || 4),
        0,
      );
      const isReady =
        list.length > 0 && totalCapacity >= Number(b.party_size || 1);
      map.set(Number(b.id), { tables: list, totalCapacity, isReady });
    });
    return map;
  }, [bookings, allTables]);

  useEffect(() => {
    getBookingValidationStatus()
      .then(setBookingValidationEnabled)
      .catch(() => {});
    userService
      .getUsers()
      .then((res) => {
        if (res.data && Array.isArray(res.data)) {
          const waiterOnly = res.data.filter((u: any) => {
            const rName = (u.role_name || u.role?.name || "").toLowerCase();
            if (rName)
              return (
                rName === "waiter" ||
                rName.includes("phục vụ") ||
                rName.includes("waiter")
              );
            const fName = (u.full_name || u.name || "").toLowerCase();
            return fName.includes("waiter") || fName.includes("phục vụ");
          });
          const list = waiterOnly.map((u: any) => ({
            id: u.id,
            name: u.full_name || u.name || u.email || `Nhân viên #${u.id}`,
            phone: u.phone || "",
            email: u.email || "",
          }));
          setStaffWaiters(list);
        }
      })
      .catch(() => {});
  }, []);

  const handleConfirmAssign = async () => {
    if (!assigningBooking) return;
    if (selectedWaiters.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 nhân viên phục vụ phụ trách!");
      return;
    }
    const waiterNames = selectedWaiters.join(", ");

    const existingAssign = assignmentMap[assigningBooking.id];
    if (
      existingAssign &&
      existingAssign.assignedArea === assignArea &&
      existingAssign.assignedWaiterName === waiterNames
    ) {
      toast("Thông tin phân công không có thay đổi.", { icon: "ℹ️" });
      setIsAssignModalOpen(false);
      return;
    }

    const selectedWaiterObjs = staffWaiters.filter((w) =>
      selectedWaiters.includes(w.name),
    );
    const selectedWaiterIds = selectedWaiterObjs.map((w) => w.id);

    const assignmentPayload = {
      id: `ASSIGN-${Date.now()}`,
      bookingId: assigningBooking.id,
      confirmationCode:
        assigningBooking.confirmation_code || `BK-${assigningBooking.id}`,
      guestName: assigningBooking.guest_name,
      guestPhone: assigningBooking.guest_phone,
      partySize: assigningBooking.party_size,
      startTime: assigningBooking.start_time,
      assignedArea: assignArea || "Tầng 2",
      assignedWaiterName: waiterNames,
      assignedWaiterId:
        selectedWaiterObjs.length === 1 ? selectedWaiterObjs[0].id : null,
      assignedWaiterIds: selectedWaiterIds,
      assignedAt: new Date().toLocaleString("vi-VN"),
      assignedTimestamp: Date.now(),
    };

    try {
      await assignBookingApi(assigningBooking.id, assignmentPayload);
    } catch (e) {
      console.warn("Lỗi gửi phân công qua API:", e);
    }

    const existing = JSON.parse(
      localStorage.getItem("booking_assignments_list") || "[]",
    );
    const updated = [
      assignmentPayload,
      ...existing.filter((a: any) => a.bookingId !== assigningBooking.id),
    ];
    localStorage.setItem("booking_assignments_list", JSON.stringify(updated));

    const assignMap = JSON.parse(
      localStorage.getItem("booking_assignments_map") || "{}",
    );
    if (assigningBooking.confirmation_code) {
      assignMap[assigningBooking.confirmation_code] = assignmentPayload;
    }
    assignMap[assigningBooking.id] = assignmentPayload;
    localStorage.setItem("booking_assignments_map", JSON.stringify(assignMap));
    setAssignmentMap(assignMap);

    window.dispatchEvent(
      new CustomEvent("booking_assigned_event", { detail: assignmentPayload }),
    );
    try {
      const channel = new BroadcastChannel("booking_notifications");
      channel.postMessage({
        type: "NEW_ASSIGNMENT",
        payload: assignmentPayload,
      });
      channel.close();
    } catch (e) {}

    toast.success(`Đã phân công ${assignArea} cho ${waiterNames}!`);
    setIsAssignModalOpen(false);
  };

  /** Formats the current local instant for a datetime-local input. */
  const getLocalNowString = () => {
    const now = new Date();
    // Adjust to local timezone offset for input[type="datetime-local"]
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

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
        getEmptyTables(
          formData.start_time,
          calculateScheduledEndTime(formData.start_time),
        ),
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

  // Reset page when filters or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const [assignmentMap, setAssignmentMap] = useState<Record<number, any>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(
        localStorage.getItem("booking_assignments_map") || "{}",
      );
      setAssignmentMap(stored);
    } catch (e) {}
  }, []);

  // Real-time socket updates for Manager
  useEffect(() => {
    const socketUrl = (
      import.meta.env.VITE_API_URL || "http://localhost:5000"
    ).replace("/api", "");
    const socket = io(socketUrl, {
      transports: ["polling", "websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    const handleRealtimeUpdate = (data: any) => {
      fetchData();
      if (
        (data?.status === "arrived" ||
          data?.status === "completed" ||
          data?.claimed) &&
        (data?.bookingId || data?.id)
      ) {
        const bId = data?.bookingId || data?.id;
        const waiterName = data?.waiterName || "Nhân viên";
        const tableName = data?.tableName || "bàn chính";
        const guestName = data?.guestName
          ? `đoàn khách ${data.guestName}`
          : `đơn đặt bàn #${bId}`;
        toast.success(`🛎 ${waiterName} đã mở ${tableName} cho ${guestName}!`, {
          duration: 6000,
        });
      }
    };

    socket.on("booking:claimed", handleRealtimeUpdate);
    socket.on("table:booking_checked_in", handleRealtimeUpdate);
    socket.on("booking:created", (data: any) => {
      fetchData();
      getTablesV1()
        .then((t) => setAllTables(t || []))
        .catch(() => {});
      const b = data?.booking || data;
      const guest = b?.guest_name
        ? `${b.guest_name} (${b.party_size || "?"} khách)`
        : "khách mới";
      toast.success(`📅 Có đơn đặt bàn mới từ ${guest}!`, {
        duration: 5000,
        icon: "📅",
      });
    });
    socket.on("booking:new", () => {
      fetchData();
      getTablesV1()
        .then((t) => setAllTables(t || []))
        .catch(() => {});
    });
    socket.on("new_booking", () => {
      fetchData();
      getTablesV1()
        .then((t) => setAllTables(t || []))
        .catch(() => {});
    });
    socket.on("booking:updated", () => {
      fetchData();
      getTablesV1()
        .then((t) => setAllTables(t || []))
        .catch(() => {});
    });
    socket.on("booking:assigned", () => {
      fetchData();
      getTablesV1()
        .then((t) => setAllTables(t || []))
        .catch(() => {});
    });
    socket.on("table:merged", (data: any) => {
      fetchData();
      getTablesV1()
        .then((t) => setAllTables(t || []))
        .catch(() => {});
      const primaryName =
        data?.primaryTable?.name ||
        (data?.primaryTableId ? `Bàn ${data.primaryTableId}` : "bàn");
      toast.success(`🎉 Nhân viên đã gộp bàn thành công (${primaryName})!`, {
        duration: 6000,
      });
    });
    socket.on("table:status_changed", () => {
      fetchData();
      getTablesV1()
        .then((t) => setAllTables(t || []))
        .catch(() => {});
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const statusCount = useMemo(() => {
    return {
      all: bookings.length,
      large: bookings.filter((b) => b.party_size >= 10).length,
      pending: bookings.filter((b) => b.status === "pending").length,
      confirmed: bookings.filter((b) => b.status === "confirmed").length,
      completed: bookings.filter((b) => b.status === "completed").length,
      cancelled: bookings.filter((b) => b.status === "cancelled").length,
    };
  }, [bookings]);

  const filteredBookings = bookings.filter((b) => {
    const matchesSearch =
      b.guest_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      b.guest_phone.includes(searchTerm) ||
      String(b.confirmation_code || "").toLowerCase().includes(searchTerm.toLowerCase());

    let matchesStatus = filterStatus === "all" || b.status === filterStatus;
    if (filterStatus === "large") {
      matchesStatus = b.party_size >= 10;
    }
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredBookings.length / ITEMS_PER_PAGE);

  const paginatedBookings = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBookings.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredBookings, currentPage]);

  const handleStatusChange = async (
    id: number,
    newStatus: Booking["status"],
  ) => {
    try {
      await updateBookingStatus(id, newStatus);
      setBookings((prev) =>
        prev.map((b) => (b.id === id ? { ...b, status: newStatus } : b)),
      );
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
      await createDirectBooking({
        table_id: Number(formData.table_id),
        guest_name: formData.guest_name,
        guest_phone: formData.guest_phone,
        party_size: Number(formData.party_size),
        start_time: formData.start_time,
        end_time: calculateScheduledEndTime(formData.start_time),
        guest_note: formData.guest_note,
      });

      toast.success("✅ Tạo booking mới thành công!");
      setIsAddModalOpen(false);
      setFormData({
        guest_name: "",
        guest_phone: "",
        party_size: 2,
        table_id: "",
        start_time: getLocalNowString(),
        guest_note: "",
      });
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
        time: d.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    } catch {
      return { date: "", time: "" };
    }
  };

  return (
    <div className="space-y-4 font-sans text-[#1A1A1A]">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#FFFFFF] p-5 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            Quản lý đặt bàn
          </h1>
          <p className="text-xs font-semibold text-[#8A8A8A] mt-0.5">
            Theo dõi danh sách đặt chỗ, gán bàn và xử lý booking khách hàng
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddModalOpen(true)}
          className="px-5 py-2.5 bg-[#3E2016] hover:bg-[#5C2E17] text-[#FFFFFF] text-xs font-black rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
        >
          <Plus size={18} /> Tạo booking mới
        </button>
      </div>

      {/* ── Main Tabs (Hiện tại vs Đã hủy) ── */}
      <div className="bg-[#FFFFFF] p-3 rounded-3xl border border-slate-200/70 shadow-xs flex items-center gap-3">
        <button
          type="button"
          onClick={() => setActiveMainTab("active")}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
            activeMainTab === "active"
              ? "bg-[#3E2016] text-[#FFFFFF] shadow-xs"
              : "bg-slate-100 text-[#8A8A8A] hover:text-[#1A1A1A]"
          }`}
        >
          Lịch đặt hiện tại
        </button>
        <button
          type="button"
          onClick={() => setActiveMainTab("cancelled")}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
            activeMainTab === "cancelled"
              ? "bg-rose-600 text-[#FFFFFF] shadow-xs"
              : "bg-slate-100 text-[#8A8A8A] hover:text-[#1A1A1A]"
          }`}
        >
          Lịch sử khách hủy bàn
        </button>
      </div>

      {activeMainTab === "cancelled" ? (
        <CancelledBookings />
      ) : (
        <>
          {/* ── Toolbar ── */}
          <div className="bg-[#FFFFFF] p-3.5 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="relative flex-1 w-full">
              <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8A8A]"
                size={17}
              />
              <input
                placeholder="Tìm mã, tên, SĐT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-11 pr-4 py-2 bg-[#F8F6F2] rounded-full text-xs font-bold text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#3E2016]/30 transition-all border-0"
              />
            </div>
            {/* Status filter tabs */}
            <div className="flex gap-1 flex-wrap shrink-0">
              {[
                { key: "all", label: "Tất cả" },
                { key: "large", label: "🔥 Đặt bàn lớn (≥ 10 người)" },
                { key: "pending", label: "Chờ xác nhận" },
                { key: "confirmed", label: "Đã xác nhận" },
                { key: "completed", label: "Hoàn thành" },
                { key: "cancelled", label: "Đã hủy" },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setFilterStatus(s.key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
                    filterStatus === s.key
                      ? "bg-[#3E2016] text-[#FFFFFF] shadow-xs"
                      : "bg-slate-100 text-[#8A8A8A] hover:text-[#1A1A1A]"
                  }`}
                >
                  {s.label}
                  <span className="ml-1 opacity-70">
                    ({statusCount[s.key as keyof typeof statusCount] || 0})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Table ── */}
          <div className="bg-admin-card rounded-2xl border border-admin-border shadow-sm overflow-hidden">
            <table className="w-full text-left text-base">
              <thead className="bg-gray-50 text-slate-500 font-bold uppercase text-xs tracking-wider border-b border-slate-200">
                <tr>
                  <th className="px-6 py-4">Mã</th>
                  <th className="px-6 py-4">Khách hàng</th>
                  <th className="px-6 py-4">Số điện thoại</th>
                  <th className="px-6 py-4">Ngày giờ đến</th>
                  <th className="px-6 py-4">Số khách</th>
                  <th className="px-6 py-4">Trạng thái</th>
                  <th className="px-6 py-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedBookings.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-6 py-12 text-center text-slate-400"
                    >
                      <CalendarDays
                        className="mx-auto mb-2 opacity-30"
                        size={32}
                      />
                      Không có dữ liệu đặt bàn nào
                    </td>
                  </tr>
                ) : (
                  paginatedBookings.map((b) => {
                    const dt = formatDateTime(b.start_time);
                    const rawAssignment =
                      assignmentMap[b.confirmation_code] || assignmentMap[b.id];
                    const assignment =
                      rawAssignment &&
                      ((rawAssignment.confirmationCode &&
                        rawAssignment.confirmationCode ===
                          b.confirmation_code) ||
                        rawAssignment.bookingId === b.id)
                        ? rawAssignment
                        : null;
                    return (
                      <tr
                        key={b.id}
                        className="hover:bg-slate-50/80 cursor-pointer transition-colors"
                        onClick={() => setSelectedBooking(b)}
                      >
                        <td className="px-6 py-4 font-black text-indigo-600">
                          #{b.confirmation_code}
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {b.guest_name}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-600">
                          {b.guest_phone}
                        </td>
                        <td className="px-6 py-4 text-slate-600">
                          <span className="font-bold text-slate-800">
                            {dt.date}
                          </span>
                          <span className="text-xs ml-1 font-semibold text-indigo-600">
                            {dt.time}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-bold text-slate-800">
                          {b.party_size >= 10 ? (
                            <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-black text-xs border border-rose-200">
                              🔥 {b.party_size} người
                            </span>
                          ) : (
                            <span>{b.party_size} người</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            status={b.status as any}
                            type="booking"
                            theme="light"
                          />
                        </td>
                        <td
                          className="px-6 py-4 text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex justify-end gap-2">
                            {b.party_size >= 10 &&
                              (b.status === "completed" ||
                              b.status === "arrived" ? (
                                <span className="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5 shadow-2xs">
                                  <CheckCircle
                                    size={14}
                                    className="text-emerald-600"
                                  />
                                  <span>
                                    {b.table_names || b.table_name
                                      ? `Đã mở ${b.table_names || b.table_name}`
                                      : "Đã nhận khách"}
                                  </span>
                                </span>
                              ) : (
                                (() => {
                                  const cluster = bookingClusterMap.get(
                                    Number(b.id),
                                  );
                                  const isClusterReady =
                                    cluster && cluster.isReady;
                                  return (
                                    <button
                                      onClick={() => {
                                        setAssigningBooking(b);
                                        const existingAssign = assignment;
                                        setAssignArea(
                                          existingAssign?.assignedArea ||
                                            "Tầng 2",
                                        );
                                        if (
                                          existingAssign?.assignedWaiterName
                                        ) {
                                          const names =
                                            existingAssign.assignedWaiterName
                                              .split(",")
                                              .map((s: string) => s.trim())
                                              .filter(
                                                (s: string) =>
                                                  s &&
                                                  !s
                                                    .toLowerCase()
                                                    .startsWith("tất cả"),
                                              );
                                          setSelectedWaiters(names);
                                        } else {
                                          setSelectedWaiters([]);
                                        }
                                        setIsAssignModalOpen(true);
                                      }}
                                      className={`px-3 py-1.5 rounded-xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-xs transition-all ${
                                        isClusterReady
                                          ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                                          : assignment
                                            ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200"
                                            : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200"
                                      }`}
                                      title="Phân công khu vực & Nhân viên"
                                    >
                                      {isClusterReady ? (
                                        <CheckCircle size={14} />
                                      ) : (
                                        <Users size={14} />
                                      )}
                                      <span>
                                        {isClusterReady
                                          ? "Đã xếp bàn"
                                          : assignment
                                            ? "Sửa phân công"
                                            : "Phân công"}
                                      </span>
                                    </button>
                                  );
                                })()
                              ))}
                            {b.status === "pending" && (
                              <>
                                <button
                                  onClick={() =>
                                    handleStatusChange(b.id, "confirmed")
                                  }
                                  className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                                  title="Xác nhận"
                                >
                                  <CheckCircle size={16} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(b.id, "cancelled")
                                  }
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
                                  onClick={() =>
                                    handleStatusChange(b.id, "completed")
                                  }
                                  className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100"
                                  title="Hoàn thành (Khách đã đến)"
                                >
                                  <UserCheck size={16} />
                                </button>
                                <button
                                  onClick={() =>
                                    handleStatusChange(b.id, "cancelled")
                                  }
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

          {/* Pagination Controls */}
          {filteredBookings.length > 0 && totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 bg-white px-6 py-4 mt-4 rounded-xl shadow-xs">
              <div className="flex flex-1 justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Trước
                </button>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="relative ml-3 inline-flex items-center rounded-md border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                >
                  Sau
                </button>
              </div>
              <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-slate-500">
                    Hiển thị từ{" "}
                    <span className="font-semibold text-slate-700">
                      {(currentPage - 1) * ITEMS_PER_PAGE + 1}
                    </span>{" "}
                    đến{" "}
                    <span className="font-semibold text-slate-700">
                      {Math.min(
                        currentPage * ITEMS_PER_PAGE,
                        filteredBookings.length,
                      )}
                    </span>{" "}
                    trong tổng số{" "}
                    <span className="font-semibold text-slate-700">
                      {filteredBookings.length}
                    </span>{" "}
                    lượt đặt bàn
                  </p>
                </div>
                <div>
                  <nav
                    className="isolate inline-flex -space-x-px rounded-md gap-1"
                    aria-label="Pagination"
                  >
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      Trước
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                      (page) => (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`relative inline-flex items-center rounded-lg px-3 py-2 text-xs font-bold transition-all cursor-pointer ${
                            currentPage === page
                              ? "z-10 bg-blue-600 text-white"
                              : "text-slate-900 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 focus:outline-none"
                          }`}
                        >
                          {page}
                        </button>
                      ),
                    )}
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="relative inline-flex items-center rounded-lg border border-slate-200 bg-white p-2 text-xs font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      Sau
                    </button>
                  </nav>
                </div>
              </div>
            </div>
          )}
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
                <p className="text-xs text-gray-500 font-medium mb-0.5">
                  Mã xác nhận
                </p>
                <span className="font-black text-blue-700 text-lg">
                  #{selectedBooking.confirmation_code}
                </span>
              </div>
              <Badge
                status={selectedBooking.status as any}
                type="booking"
                theme="light"
              />
            </div>

            <div className="grid gap-3 text-sm">
              {[
                {
                  icon: <User size={15} className="text-admin-primary" />,
                  label: "Khách hàng",
                  value: selectedBooking.guest_name,
                },
                {
                  icon: <Phone size={15} className="text-admin-primary" />,
                  label: "Số điện thoại",
                  value: selectedBooking.guest_phone,
                },
                {
                  icon: (
                    <CalendarDays size={15} className="text-admin-primary" />
                  ),
                  label: "Thời gian",
                  value: `${formatDateTime(selectedBooking.start_time).date} lúc ${formatDateTime(selectedBooking.start_time).time}`,
                },
                {
                  icon: <MapPin size={15} className="text-admin-primary" />,
                  label: "Bàn",
                  value:
                    selectedBooking.table_names ||
                    selectedBooking.table_name ||
                    "Chưa gán bàn",
                },
                {
                  icon: <Users size={15} className="text-admin-primary" />,
                  label: "Số người",
                  value: `${selectedBooking.party_size} người`,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  <span className="mt-0.5 shrink-0">{item.icon}</span>
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase">
                      {item.label}
                    </p>
                    <p className="font-medium text-gray-800">{item.value}</p>
                  </div>
                </div>
              ))}
              {selectedBooking.guest_note && (
                <div className="flex items-start gap-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <FileText
                    size={15}
                    className="text-amber-600 mt-0.5 shrink-0"
                  />
                  <div>
                    <p className="text-[10px] font-bold text-amber-600 uppercase">
                      Ghi chú khách
                    </p>
                    <p className="font-medium text-gray-700 italic">
                      "{selectedBooking.guest_note}"
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              {isBookingScheduledToday(selectedBooking.start_time) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedBooking(null);
                    navigate(`/waiter/orders/${selectedBooking.table_id}`);
                  }}
                  className="flex-1 py-2.5 bg-blue-50 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-100"
                >
                  Mở order hôm nay
                </button>
              )}
              {selectedBooking.status === "pending" && (
                <button
                  onClick={() => {
                    handleStatusChange(selectedBooking.id, "confirmed");
                    setSelectedBooking(null);
                  }}
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
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tạo Booking mới"
        size="lg"
        theme="light"
      >
        <form className="space-y-0" onSubmit={handleCreateBooking}>
          {/* Section 1: Thông tin khách */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
              <div className="w-7 h-7 bg-blue-100 rounded-lg flex items-center justify-center">
                <User size={14} className="text-blue-600" />
              </div>
              <h3 className="font-bold text-gray-700 text-sm">
                Thông tin khách hàng
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Tên khách */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Tên khách hàng <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <User
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    required
                    placeholder="Ví dụ: Nguyễn Văn A"
                    value={formData.guest_name}
                    onChange={(e) =>
                      setFormData({ ...formData, guest_name: e.target.value })
                    }
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
                  <Phone
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    required
                    placeholder="0901 234 567"
                    value={formData.guest_phone}
                    onChange={(e) =>
                      setFormData({ ...formData, guest_phone: e.target.value })
                    }
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
                  <Users
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="number"
                    min="1"
                    max={MAX_BOOKING_PARTY_SIZE}
                    required
                    placeholder="2"
                    value={formData.party_size}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        party_size: Number(e.target.value),
                      })
                    }
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
              <h3 className="font-bold text-gray-700 text-sm">
                Thông tin đặt bàn
              </h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Ngày giờ */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Ngày & Giờ đặt <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Clock
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <input
                    type="datetime-local"
                    required
                    min={
                      bookingValidationEnabled ? getLocalNowString() : undefined
                    }
                    max={
                      bookingValidationEnabled
                        ? getMaximumBookingDateTime()
                        : undefined
                    }
                    value={formData.start_time}
                    onChange={(e) =>
                      setFormData({ ...formData, start_time: e.target.value })
                    }
                    className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all text-gray-800"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1 ml-1">
                  Đặt trước tối đa 30 ngày, nhận khách từ 10:00 đến 19:00; mỗi
                  lịch kéo dài 3 giờ.
                </p>
              </div>

              {/* Chọn bàn - chỉ bàn trống */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                  Chọn bàn trống <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Table2
                    size={15}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  />
                  <ChevronDown
                    size={15}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
                  />
                  <select
                    required
                    value={formData.table_id}
                    onChange={(e) =>
                      setFormData({ ...formData, table_id: e.target.value })
                    }
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
                  <FileText
                    size={15}
                    className="absolute left-3 top-3.5 text-gray-400"
                  />
                  <textarea
                    placeholder="Yêu cầu đặc biệt, vị trí ngồi, dịp đặc biệt..."
                    value={formData.guest_note}
                    onChange={(e) =>
                      setFormData({ ...formData, guest_note: e.target.value })
                    }
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

      {/* Modal Phân công khu vực & Nhân viên (Thiết kế sáng, sang trọng) */}
      {isAssignModalOpen && assigningBooking && (
        <Modal
          isOpen={isAssignModalOpen}
          onClose={() => setIsAssignModalOpen(false)}
          title={`📍 Phân công khu vực & Phục vụ cho Đơn #${assigningBooking.confirmation_code || assigningBooking.id}`}
          size="md"
          theme="light"
        >
          <div className="space-y-5 font-sans bg-white p-1">
            {/* Card thông tin khách đặt bàn */}
            <div className="bg-gradient-to-br from-indigo-50/80 via-sky-50/50 to-white p-4.5 rounded-2xl border border-indigo-100/90 shadow-2xs space-y-2 text-slate-700">
              <div className="flex justify-between items-center pb-2 border-b border-indigo-100/80">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Thông tin khách tiệc
                </span>
                <span className="px-2.5 py-1 rounded-full bg-rose-100 text-rose-700 font-black text-xs">
                  🔥 {assigningBooking.party_size} người (Đoàn đông)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                <div>
                  <p className="text-slate-400 font-semibold text-[11px]">
                    Họ và tên khách:
                  </p>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {assigningBooking.guest_name}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-semibold text-[11px]">
                    Số điện thoại:
                  </p>
                  <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                    {assigningBooking.guest_phone}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-semibold text-[11px]">
                    Thời gian dự kiến đến:
                  </p>
                  <p className="font-extrabold text-indigo-700 text-sm mt-0.5">
                    {assigningBooking.start_time}
                  </p>
                </div>
              </div>
            </div>

            {/* Card thông tin trạng thái xếp bàn */}
            {linkedTables.length > 0 && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-950 rounded-2xl text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center gap-1.5 font-black text-emerald-900 border-b border-emerald-200/80 pb-1.5">
                  <span className="p-1 bg-emerald-200 text-emerald-900 rounded-lg text-xs">
                    ✅
                  </span>
                  <span>ĐÃ XẾP BÀN</span>
                </div>
                <p className="font-extrabold text-xs text-emerald-900">
                  Bàn đã xếp:{" "}
                  <span className="text-indigo-800 font-black">
                    {linkedTables.map((t) => t.name).join(", ")}
                  </span>
                </p>
              </div>
            )}

            {/* Trạng thái phân công & Khóa phân công */}
            {(() => {
              const existing = assignmentMap[assigningBooking.id];
              const isCheckedIn =
                (assigningBooking.status as string) === "completed" ||
                (assigningBooking.status as string) === "checked_in" ||
                assigningBooking.status === "arrived";
              const isSeated = isCheckedIn || linkedTables.length > 0;

              if (isSeated) {
                return (
                  <div className="p-4 bg-sky-50 border border-sky-200/90 rounded-2xl text-xs text-sky-950 space-y-2">
                    <div className="flex items-center gap-2 font-black text-sky-900 border-b border-sky-200/60 pb-2">
                      <span className="p-1.5 bg-sky-200 text-sky-900 rounded-lg text-xs">
                        ✅
                      </span>
                      <span className="uppercase tracking-wider">
                        ĐÃ XẾP BÀN PHỤC VỤ TẠI NHÀ HÀNG
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div>
                        <span className="text-slate-500 font-semibold text-[11px]">
                          Khu vực:
                        </span>
                        <p className="font-extrabold text-slate-900 mt-0.5">
                          {existing?.assignedArea || "Tầng 2"}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-500 font-semibold text-[11px]">
                          Nhân viên phụ trách:
                        </span>
                        <p className="font-extrabold text-slate-900 mt-0.5">
                          {existing?.assignedWaiterName || "Tất cả nhân viên"}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-sky-800 font-medium pt-1 italic">
                      * Đơn đặt bàn này đã được nhân viên hoàn tất xếp bàn tại
                      sơ đồ bàn.
                    </p>
                  </div>
                );
              }

              return (
                <div className="space-y-4 pt-1">
                  {/* 1. Chọn Khu vực */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-1.5">
                      1. Chọn Khu vực / Tầng phục vụ{" "}
                      {existing && (
                        <span className="text-amber-700 font-bold">
                          (Đã cố định khu vực 🔒)
                        </span>
                      )}{" "}
                      *
                    </label>
                    {existing ? (
                      <div className="w-full px-4 py-3 bg-amber-50/70 border border-amber-200 rounded-xl text-xs font-black text-amber-950 flex items-center justify-between">
                        <span>📍 {existing.assignedArea}</span>
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-200/60 px-2 py-0.5 rounded-md">
                          Khóa khu vực 🔒
                        </span>
                      </div>
                    ) : (
                      <select
                        value={assignArea}
                        onChange={(e) => setAssignArea(e.target.value)}
                        className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                      >
                        <option value="Tầng 2">Tầng 2</option>
                        <option value="Sân vườn">Sân vườn</option>
                      </select>
                    )}
                  </div>

                  {/* 2. Chọn/Thêm Nhân viên */}
                  <div>
                    <label className="block text-xs font-black text-slate-700 uppercase tracking-wider mb-2">
                      2.{" "}
                      {existing
                        ? "Thêm / Điều chỉnh Nhân viên Phục vụ"
                        : "Chọn Nhân viên Phục vụ nhận bàn"}{" "}
                      (Có thể chọn nhiều nhân viên) *
                    </label>

                    {/* Danh sách nhãn/thẻ nhân viên đã chọn hiển thị phía trên */}
                    <div className="flex flex-wrap items-center gap-1.5 mb-2.5 min-h-[38px] p-2 bg-slate-100/70 border border-slate-200/80 rounded-xl">
                      {selectedWaiters.length === 0 ? (
                        <span className="text-[11px] font-semibold text-rose-600 italic px-1 flex items-center gap-1">
                          ⚠️ Chưa chọn nhân viên. Vui lòng tích chọn nhân viên
                          phụ trách bên dưới.
                        </span>
                      ) : (
                        selectedWaiters.map((name) => (
                          <span
                            key={name}
                            className="inline-flex items-center gap-1.5 px-3 py-1 bg-indigo-600 text-white font-black text-xs rounded-lg shadow-2xs animate-in zoom-in-95 duration-150"
                          >
                            <span>👤 {name}</span>
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedWaiters((prev) =>
                                  prev.filter((n) => n !== name),
                                )
                              }
                              className="hover:bg-indigo-700 p-0.5 rounded-full text-indigo-100 hover:text-white cursor-pointer transition-colors"
                            >
                              <X size={12} />
                            </button>
                          </span>
                        ))
                      )}
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto bg-slate-50 border border-slate-200 rounded-xl p-3">
                      {staffWaiters.length === 0 ? (
                        <p className="text-xs text-slate-500 italic p-1">
                          Không tìm thấy nhân viên phục vụ nào.
                        </p>
                      ) : (
                        staffWaiters.map((w) => {
                          const isChecked = selectedWaiters.includes(w.name);
                          return (
                            <label
                              key={w.id}
                              className="flex items-center gap-2.5 text-xs font-bold text-slate-700 cursor-pointer select-none hover:text-slate-900"
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedWaiters((prev) => [
                                      ...prev,
                                      w.name,
                                    ]);
                                  } else {
                                    setSelectedWaiters((prev) =>
                                      prev.filter((name) => name !== w.name),
                                    );
                                  }
                                }}
                                className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600"
                              />
                              <span>{w.name}</span>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Action buttons */}
            <div className="flex gap-3 pt-3 border-t border-slate-100">
              {(assigningBooking.status as string) === "completed" ||
              (assigningBooking.status as string) === "checked_in" ||
              assigningBooking.status === "arrived" ||
              linkedTables.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setIsAssignModalOpen(false)}
                    className="flex-1 py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold rounded-2xl text-xs transition-colors cursor-pointer"
                  >
                    Hủy thao tác
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmAssign}
                    className="flex-1 py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-2xl text-xs shadow-lg shadow-indigo-200 transition-all cursor-pointer active:scale-95"
                  >
                    🚀{" "}
                    {assignmentMap[assigningBooking.id]
                      ? "Cập nhật & Bắn thông báo bổ sung"
                      : "Xác nhận & Bắn thông báo thời gian thực"}
                  </button>
                </>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
