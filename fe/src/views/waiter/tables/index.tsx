import React, { useState, useMemo, useEffect, useCallback } from "react";
import { isAxiosError } from "axios";
import { io } from "socket.io-client";
import {
  RefreshCw,
  LayoutGrid,
  Info,
  Plus,
  Utensils,
  AlertTriangle,
  Trash2,
  Printer,
  ArrowRightLeft,
  GitMerge,
  Wrench,
  CheckCircle,
  Phone,
  XCircle,
  FileText,
  Loader2,
  Copy,
  Link2,
  UsersRound,
} from "lucide-react";
import { useAppSelector } from "../../../store/hooks";
import { useNavigate, useLocation } from "react-router-dom";
import OpenTableModal from "../../../components/tables/OpenTableModal";
import { TableArea } from "../../../interfaces/table.interface";
import { toast } from "react-hot-toast";
import { TransferTableModal } from "./TransferTableModal";
import { MergeTableModal } from "./MergeTableModal";
import { GroupSeatingModal } from "./GroupSeatingModal";
import { SplitTableModal } from "./SplitTableModal";
import { SubOrderSelectionModal } from "./SubOrderSelectionModal";
import {
  getTableAreas,
  getTablesV1,
  getActiveOrderForTable,
  updateTableStatus,
  createResmanagerTable,
  deleteResmanagerTable,
  getTableBookingSchedule,
  checkInTableBooking,
  type ResmanagerTable,
} from "../../../services/tableService";
import type { BookingScheduleItem, BookingScheduleMode } from "../../../services/bookingService";
import {
  getOrdersByTable,
  getOrderItems,
  createOrder,
  addOrderItem,
  getWaiterMenuItems,
  voidOrderItem,
  requestPayment,
  markItemAsServed,
  type WaiterOrderItem,
} from "../../../services/waiterService";
import { Modal } from "../../../components/Modal";
import { AddTableModal } from "./AddTableModal";
import { AddDishModal } from "./AddDishModal";
import { ProvisionalBillModal } from "./ProvisionalBillModal";
import { updateBookingStatus } from "../../../services/bookingService";

type TableAction = "transfer" | "merge" | "groupSeating" | "split" | null;

const TABLE_SCHEDULE_MODE: Record<"CURRENT" | "HISTORY", BookingScheduleMode> = {
  CURRENT: "current",
  HISTORY: "history",
};

const SCHEDULE_CLOCK_REFRESH_MS = 1_000;

interface ActiveOrderInfo {
  id: number;
  items: WaiterOrderItem[];
  subtotal?: number;
  depositAmount?: number;
  tax?: number;
  totalAmount: number;
  status: string;
}

interface OpenTableApiErrorResponse {
  message?: string;
}

/** Extracts the server-side reason when a physical-table opening request is rejected. */
const getOpenTableErrorMessage = (error: unknown): string => {
  if (isAxiosError<OpenTableApiErrorResponse>(error)) {
    return error.response?.data?.message || "Không thể mở bàn. Vui lòng thử lại.";
  }
  return "Không thể mở bàn. Vui lòng thử lại.";
};

const getCurrentUserId = (): number => {
  try {
    const token = localStorage.getItem("accessToken");
    if (!token) return 4;
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.userId || payload.id || 4;
  } catch {
    return 4;
  }
};

const getCurrentUserInfo = () => {
  try {
    const userStr = localStorage.getItem("user");
    if (!userStr) return { name: "Nhân viên Phục vụ", code: "NV004" };
    const u = JSON.parse(userStr);
    return {
      name: u.full_name || "Nhân viên Phục vụ",
      code: u.employee_code || `NV${String(u.id || 4).padStart(3, "0")}`,
    };
  } catch {
    return { name: "Nhân viên Phục vụ", code: "NV004" };
  }
};

/** Return the total physical capacity available to a table or its merged cluster. */
const getTableClusterCapacity = (table: ResmanagerTable): number =>
  table.group_seating_capacity ?? table.cluster_capacity ?? table.capacity;

/** Check whether a table's current guest count exceeds its physical cluster capacity. */
const isTableOverClusterCapacity = (table: ResmanagerTable): boolean =>
  typeof table.guest_count === "number" && table.guest_count > getTableClusterCapacity(table);

/** Formats a date as a date-input value for the staff booking calendar. */
const toDateInputValue = (date: Date): string => date.toISOString().slice(0, 10);

/** Formats one scheduled booking timestamp for staff without exposing raw SQL/UTC text. */
const formatScheduleTimestamp = (value: string): string => new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
}).format(new Date(value));

/** Converts a SQL booking timestamp into an absolute instant in the restaurant timezone. */
const parseScheduleTimestamp = (value: string): number =>
  new Date(value.includes("T") ? value : `${value.replace(" ", "T")}+07:00`).getTime();

/** Derives the client-side display state for a server-enforced booking check-in window. */
const getScheduleCheckInState = (
  booking: BookingScheduleItem,
  nowMilliseconds: number,
): { canCheckIn: boolean; message: string } => {
  const opensAt = parseScheduleTimestamp(booking.check_in_open_at);
  const closesAt = parseScheduleTimestamp(booking.check_in_close_at);
  if (nowMilliseconds < opensAt) {
    return { canCheckIn: false, message: `Mở lúc ${formatScheduleTimestamp(booking.check_in_open_at)}` };
  }
  if (nowMilliseconds > closesAt) {
    return { canCheckIn: false, message: "Đã quá giờ nhận khách" };
  }
  return { canCheckIn: true, message: "Có thể mở bàn" };
};

const STATUS_CONFIG: Record<
  string,
  { label: string; bg: string; text: string; border: string; dot: string }
> = {
  empty: {
    label: "Trống",
    bg: "bg-slate-50",
    text: "text-slate-700",
    border: "border-slate-200",
    dot: "bg-slate-400",
  },
  serving: {
    label: "Đang phục vụ",
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    border: "border-emerald-300",
    dot: "bg-emerald-500",
  },
  reserved: {
    label: "Đặt trước",
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-300",
    dot: "bg-amber-500",
  },
  pending_payment: {
    label: "Chờ thanh toán",
    bg: "bg-rose-50",
    text: "text-rose-700",
    border: "border-rose-300",
    dot: "bg-rose-500",
  },
  cleaning: {
    label: "Đã thanh toán",
    bg: "bg-blue-50",
    text: "text-blue-700",
    border: "border-blue-300",
    dot: "bg-blue-500",
  },
  maintenance: {
    label: "Bảo trì",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-300",
    dot: "bg-purple-500",
  },
};

const ITEM_STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  pending: { label: "⏳ Chờ gửi", badge: "bg-sky-100 text-slate-600" },
  waiting_kitchen: { label: "📋 Chờ bếp", badge: "bg-amber-100 text-amber-700" },
  cooking: { label: "🔥 Đang nấu", badge: "bg-orange-100 text-orange-700" },
  done: { label: "✅ Hoàn thành", badge: "bg-green-100 text-green-700" },
  served: { label: "🛎 Đã mang ra", badge: "bg-blue-100 text-blue-700" },
  voided: { label: "✗ Đã hủy", badge: "bg-red-100 text-red-600 line-through" },
  cancelled: { label: "✗ Đã hủy", badge: "bg-red-100 text-red-600 line-through" },
};

interface WaiterTableMapProps {
  isManager?: boolean;
}

export const WaiterTableMap: React.FC<WaiterTableMapProps> = ({ isManager = false }) => {
  const [tables, setTables] = useState<ResmanagerTable[]>([]);
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Layout 2 cột: bàn đang được chọn bên phải
  const [selectedTableId, setSelectedTableId] = useState<number | string | null>(null);
  const [tableSchedule, setTableSchedule] = useState<BookingScheduleItem[]>([]);
  const [tableScheduleMode, setTableScheduleMode] = useState<BookingScheduleMode>(TABLE_SCHEDULE_MODE.CURRENT);
  const [isTableScheduleOpen, setIsTableScheduleOpen] = useState(false);
  const [loadingTableSchedule, setLoadingTableSchedule] = useState(false);
  const [checkingInBookingId, setCheckingInBookingId] = useState<number | null>(null);
  const [scheduleNow, setScheduleNow] = useState(() => Date.now());

  const location = useLocation();
  const userInfo = getCurrentUserInfo();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isTableScheduleOpen) return undefined;
    const intervalId = window.setInterval(() => setScheduleNow(Date.now()), SCHEDULE_CLOCK_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [isTableScheduleOpen]);

  // Auto-select bàn khi quay lại từ trang Gọi món
  useEffect(() => {
    const stateTableId = (location.state as any)?.selectedTableId;
    if (stateTableId) {
      setSelectedTableId(stateTableId);
      window.history.replaceState({}, "");
    }
  }, [location.state]);

  // Khi tables đã load và có selectedTableId từ navigate-back → auto-switch tab khu vực
  useEffect(() => {
    const stateTableId = (location.state as any)?.selectedTableId;
    if (!stateTableId || tables.length === 0) return;
    const found = tables.find((t) => t.id.toString() === stateTableId.toString());
    if (found && found.area_id) {
      setSelectedAreaId(found.area_id);
    }
  }, [tables]);

  // Modals
  const [isOpenTableModalOpen, setIsOpenTableModalOpen] = useState(false);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isAddDishOpen, setIsAddDishOpen] = useState(false);
  const [isPrintBillOpen, setIsPrintBillOpen] = useState(false);
  const [isSubOrderModalOpen, setIsSubOrderModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<TableAction>(null);

  // State hủy booking từ sơ đồ bàn
  const [cancelBookingModal, setCancelBookingModal] = useState<{ tableId: number; tableName: string } | null>(null);
  const [cancelBookingReason, setCancelBookingReason] = useState("");

  // Active Order integrated management
  const [activeOrder, setActiveOrder] = useState<ActiveOrderInfo | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // State xử lý khi thanh toán mà bàn còn món chưa ra
  const [unfinishedPaymentModal, setUnfinishedPaymentModal] = useState<WaiterOrderItem[] | null>(null);
  const [unfinishedVoidReason, setUnfinishedVoidReason] = useState("Khách yêu cầu thanh toán sớm - Không chờ món nữa");
  const [processingPaymentRequest, setProcessingPaymentRequest] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tablesData, areasData] = await Promise.all([getTablesV1(), getTableAreas()]);
      const activeTables = (tablesData || []).filter((t: any) => !t.is_deleted);
      setTables(activeTables);
      setAreas(areasData || []);
      if (!selectedAreaId && areasData && areasData.length > 0) {
        setSelectedAreaId(areasData[0].id);
      }
    } catch (err) {
      console.error("Lỗi tải dữ liệu sơ đồ bàn:", err);
      toast.error("Không thể tải danh sách bàn ăn");
    } finally {
      setLoading(false);
    }
  }, [selectedAreaId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time socket synchronization
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("⚡ Connected to Socket.io Server for Waiter Table Map");
    });

    socket.on("table:status_changed", (data: { tableId: number; status: any; guest_name?: string }) => {
      setTables((prev) =>
        prev.map((t) =>
          t.id === Number(data.tableId)
            ? { ...t, status: data.status, guest_name: data.guest_name || null }
            : t
        )
      );
      if (selectedTableId?.toString() === data.tableId.toString()) {
        fetchData();
      }
    });

    socket.on("table:transferred", () => {
      fetchData();
    });

    socket.on("table:merged", () => {
      fetchData();
    });

    socket.on("table:merge_resolved", () => {
      fetchData();
    });

    socket.on("table:group_seating_changed", () => {
      fetchData();
    });

    return () => {
      socket.off("connect");
      socket.off("table:status_changed");
      socket.off("table:transferred");
      socket.off("table:merged");
      socket.off("table:merge_resolved");
      socket.off("table:group_seating_changed");
      socket.disconnect();
      console.log("🔌 Disconnected Socket.io Client for Waiter Table Map");
    };
  }, [fetchData, selectedTableId]);

  // Load integrated Order khi chọn bàn phục vụ / đặt trước / chờ thanh toán
  const loadActiveOrder = useCallback(async (tableId: number | string) => {
    const t = tables.find((item) => item.id.toString() === tableId.toString());
    if (!t || (t.status !== "serving" && t.status !== "pending_payment" && t.status !== "reserved")) {
      setActiveOrder(null);
      return;
    }
    setLoadingOrder(true);
    try {
      const resolution = await getActiveOrderForTable(Number(tableId));
      const orders = await getOrdersByTable(resolution.primaryTableId);
      if (orders.length === 0) {
        setActiveOrder(null);
        return;
      }
      const latestOrder = orders[0];
      const items = await getOrderItems(latestOrder.id);
      const validItems = items.filter((i) => i.status !== "voided" && i.status !== "cancelled");
      const subtotal = validItems.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0);
      const depositAmount = Number((latestOrder as any).depositAmount || (latestOrder as any).deposit_amount || (t as any).deposit_amount || 0);
      const tax = Number((latestOrder as any).tax !== undefined ? (latestOrder as any).tax : Math.round(subtotal * 0.10));
      const totalAmount = Number((latestOrder as any).totalAmount !== undefined ? (latestOrder as any).totalAmount : Math.max(0, subtotal + tax - depositAmount));
      setActiveOrder({
        id: latestOrder.id,
        items,
        subtotal,
        depositAmount,
        tax,
        totalAmount,
        status: t.status,
      });
    } catch (err) {
      console.error(err);
      setActiveOrder(null);
    } finally {
      setLoadingOrder(false);
    }
  }, [tables]);

  useEffect(() => {
    if (selectedTableId) {
      loadActiveOrder(selectedTableId);
    } else {
      setActiveOrder(null);
    }
  }, [selectedTableId, loadActiveOrder]);

  const searchQuery = useAppSelector((state) => state.ui.searchQuery);

  const filteredTables = useMemo(() => {
    let result = selectedAreaId ? tables.filter((t) => t.area_id === selectedAreaId) : tables;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      // Smart match: "25" → khớp "B25", "25"; "b25" → khớp "B25"
      result = result.filter((t) => {
        const name = t.name.toLowerCase();
        // Nếu query là số thuần, thử ghép thêm "b" phía trước
        const isNumeric = /^\d+$/.test(q);
        return name.includes(q) || (isNumeric && name.includes("b" + q));
      });
    }
    return result;
  }, [selectedAreaId, tables, searchQuery]);

  const selectedTable = useMemo(
    () => tables.find((t) => t.id.toString() === selectedTableId?.toString()) || null,
    [tables, selectedTableId],
  );

  const isSelectedTableInCluster = Boolean(
    selectedTable?.is_merged_primary
    || selectedTable?.is_merged_child
    || selectedTable?.is_group_seating_primary
    || selectedTable?.is_group_seating_child,
  );

  // Mở bàn + tự động thêm Khăn ướt theo số khách
  const handleOpenTable = async (data: { guestCount: number; customerName: string; customerPhone: string }) => {
    if (!selectedTableId || !selectedTable) return;
    try {
      const userId = getCurrentUserId();
      const newOrder = await createOrder({
        table_id: Number(selectedTableId),
        created_by: userId,
        order_type: "dine_in",
        guest_name: data.customerName,
        guest_phone: data.customerPhone,
        guest_count: data.guestCount,
      });

      // Thêm mặc định Khăn ướt nếu có trong menu
      try {
        const menuItems = await getWaiterMenuItems();
        const wetTissue = menuItems.find(
          (m) =>
            m.name.toLowerCase().includes("khăn ướt") ||
            m.name.toLowerCase().includes("khăn lạnh")
        );
        if (wetTissue && data.guestCount > 0) {
          await addOrderItem(newOrder.id, {
            menu_item_id: wetTissue.id,
            quantity: data.guestCount,
            unit_price: wetTissue.price,
            kitchen_note: "Mặc định theo số khách",
            created_by: userId,
          });
        }
      } catch (err) {
        console.warn("Lỗi tự động thêm Khăn ướt:", err);
      }

      setTables((prev) =>
        prev.map((t) =>
          t.id.toString() === selectedTableId.toString()
            ? ({
              ...t,
              status: "serving" as const,
              guest_name: data.customerName,
              guest_phone: data.customerPhone,
              guest_count: data.guestCount,
              start_time: new Date().toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" }),
            } as any)
            : t,
        ),
      );
      toast.success(`✅ Đã mở bàn ${selectedTable?.name} cho ${data.guestCount} khách`);
      setIsOpenTableModalOpen(false);
      navigate(`/waiter/orders/${selectedTableId}`);
    } catch (error: unknown) {
      toast.error(getOpenTableErrorMessage(error));
      console.error(error);
    }
  };

  // Thêm bàn nhanh
  const handleAddTableConfirm = async (data: { name: string; capacity: number; area_id: number }) => {
    try {
      // Tự động tìm kiếm tọa độ trống kế tiếp trong khu vực để tránh trùng lặp vị trí
      let selectedRow = "A";
      let selectedCol = 1;
      let found = false;

      const areaTables = tables.filter((t) => t.area_id === data.area_id);
      for (let rCode = 65; rCode <= 90; rCode++) { // Hàng từ A đến Z
        const row = String.fromCharCode(rCode);
        for (let col = 1; col <= 12; col++) { // Cột từ 1 đến 12
          const isOccupied = areaTables.some(
            (t) => t.row_pos.toUpperCase() === row && Number(t.col_pos) === col
          );
          if (!isOccupied) {
            selectedRow = row;
            selectedCol = col;
            found = true;
            break;
          }
        }
        if (found) break;
      }

      await createResmanagerTable({
        ...data,
        row_pos: selectedRow,
        col_pos: selectedCol,
      });
      toast.success(`✅ Đã thêm bàn mới: ${data.name}`);
      fetchData();
    } catch {
      toast.error("Lỗi khi thêm bàn mới");
    }
  };

  // Xóa bàn
  const handleDeleteTable = async (table: ResmanagerTable) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa bàn ${table.name}?`)) return;
    try {
      await deleteResmanagerTable(table.id);
      toast.success(`Đã xóa bàn ${table.name}`);
      if (selectedTableId === table.id) setSelectedTableId(null);
      fetchData();
    } catch {
      toast.error("Không thể xóa bàn (bàn đang có order hoặc bị khóa)");
    }
  };

  // Thêm món trực tiếp từ sơ đồ bàn
  const handleAddDish = async (item: any, quantity: number, note?: string) => {
    if (!selectedTableId) return;
    let orderId = activeOrder?.id;
    if (!orderId) {
      const currentUserId = getCurrentUserId();
      const newOrder = await createOrder({
        table_id: Number(selectedTableId),
        created_by: currentUserId,
        order_type: "dine_in",
      });
      orderId = newOrder.id;
    }
    await addOrderItem(orderId, {
      menu_item_id: item.id,
      quantity,
      unit_price: item.price,
      kitchen_note: note,
      created_by: getCurrentUserId(),
    });
    toast.success(`✅ Đã thêm ${quantity} x ${item.name}`);
    setIsAddDishOpen(false);
    loadActiveOrder(selectedTableId);
  };

  const handleStatusChange = async (
    newStatus: "empty" | "serving" | "pending_payment" | "maintenance",
    maintenanceNote?: string,
  ) => {
    if (!selectedTableId) return;
    try {
      await updateTableStatus(Number(selectedTableId), newStatus, maintenanceNote);
      toast.success("Đã cập nhật trạng thái bàn");
      fetchData();
    } catch {
      toast.error("Không thể thay đổi trạng thái");
    }
  };

  /** Loads one operational view of the selected table's booking calendar. */
  const loadTableSchedule = async (mode: BookingScheduleMode): Promise<void> => {
    if (!selectedTable) return;
    const startDate = toDateInputValue(new Date());
    const endDateValue = new Date();
    endDateValue.setDate(endDateValue.getDate() + 30);
    try {
      setLoadingTableSchedule(true);
      const result = await getTableBookingSchedule(
        selectedTable.id,
        mode === TABLE_SCHEDULE_MODE.CURRENT
          ? { startDate, endDate: toDateInputValue(endDateValue), mode }
          : { mode },
      );
      setTableSchedule(result.schedule);
      setTableScheduleMode(mode);
    } catch {
      toast.error("Không thể tải lịch đặt của bàn này");
    } finally {
      setLoadingTableSchedule(false);
    }
  };

  /** Opens the current booking list for the selected physical table. */
  const handleOpenTableSchedule = async (): Promise<void> => {
    setIsTableScheduleOpen(true);
    await loadTableSchedule(TABLE_SCHEDULE_MODE.CURRENT);
  };

  /** Checks a scheduled party in after the backend verifies timing and table readiness. */
  const handleCheckInScheduledBooking = async (booking: BookingScheduleItem): Promise<void> => {
    if (!selectedTable) return;
    try {
      setCheckingInBookingId(booking.id);
      const result = await checkInTableBooking(
        Number(selectedTable.id),
        booking.id,
        getCurrentUserId(),
      );
      toast.success(`Khách ${booking.guest_name} đã đến — đã mở bàn ${selectedTable.name}`);
      setIsTableScheduleOpen(false);
      await fetchData();
      navigate(`/waiter/orders/${result.primaryTableId}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Không thể mở bàn cho lịch đặt này";
      toast.error(message);
    } finally {
      setCheckingInBookingId(null);
    }
  };

  const handleRequestPaymentFromTable = async () => {
    if (!selectedTableId || !selectedTable || !activeOrder || activeOrder.items.filter(i => i.status !== "voided" && i.status !== "cancelled").length === 0) return;
    const unfinished = activeOrder.items.filter((i) => i.status === "pending" || i.status === "waiting_kitchen" || i.status === "cooking" || i.status === "done");
    if (unfinished.length > 0) {
      setUnfinishedPaymentModal(unfinished);
      return;
    }
    await executeRequestPaymentFromTable();
  };

  const executeRequestPaymentFromTable = async () => {
    if (!selectedTableId) return;
    try {
      setProcessingPaymentRequest(true);
      if (activeOrder?.id) {
        await requestPayment(Number(activeOrder.id));
      } else {
        await updateTableStatus(Number(selectedTableId), "pending_payment");
      }
      toast.success("Đã gửi yêu cầu thanh toán — thu ngân sẽ xử lý tại quầy");
      fetchData();
      if (selectedTableId) loadActiveOrder(selectedTableId);
    } catch {
      toast.error("Không thể gửi yêu cầu thanh toán");
    } finally {
      setProcessingPaymentRequest(false);
    }
  };

  const executeRequestEarlyPaymentFromTable = async () => {
    if (!selectedTableId || !activeOrder) return;
    try {
      setProcessingPaymentRequest(true);
      await requestPayment(activeOrder.id, undefined, true);
      toast.success("Đã gửi yêu cầu thanh toán sớm cho thu ngân");
      fetchData();
      if (selectedTableId) loadActiveOrder(selectedTableId);
    } catch {
      toast.error("Không thể gửi yêu cầu thanh toán sớm");
    } finally {
      setProcessingPaymentRequest(false);
    }
  };

  const handleVoidUnfinishedAndRequestPaymentFromTable = async () => {
    if (!selectedTableId || !activeOrder || !unfinishedPaymentModal) return;
    try {
      setProcessingPaymentRequest(true);
      for (const item of unfinishedPaymentModal) {
        await voidOrderItem(activeOrder.id, item.id, unfinishedVoidReason.trim() || "Khách yêu cầu thanh toán sớm");
      }
      const remainingActive = activeOrder.items.filter(
        (i) => i.status !== "voided" && i.status !== "cancelled" && !unfinishedPaymentModal.some((u) => u.id === i.id)
      ).length;

      if (remainingActive === 0) {
        await updateTableStatus(Number(selectedTableId), "empty");
        toast.success("Đã hủy toàn bộ món chưa ra và trả bàn trống thành công!");
      } else {
        await updateTableStatus(Number(selectedTableId), "pending_payment");
        toast.success("Đã hủy các món chưa ra & gửi yêu cầu thanh toán thành công!");
      }
      setUnfinishedPaymentModal(null);
      fetchData();
      if (selectedTableId) loadActiveOrder(selectedTableId);
    } catch {
      toast.error("Có lỗi xảy ra khi hủy món và yêu cầu thanh toán");
    } finally {
      setProcessingPaymentRequest(false);
    }
  };


  // Handler hủy booking từ sơ đồ bàn
  const handleCancelBookingFromMap = async () => {
    if (!cancelBookingModal || !cancelBookingReason.trim()) {
      toast.error("Vui lòng nhập lý do hủy");
      return;
    }
    try {
      // Tìm booking pending/confirmed của bàn này
      const { getBookings } = await import("../../../services/bookingService");
      const allBookings = await getBookings();
      const booking = allBookings.find(
        (b: any) => b.table_id === cancelBookingModal.tableId && ["pending", "confirmed"].includes(b.status)
      );
      if (!booking) {
        toast.error("Không tìm thấy booking cần hủy");
        return;
      }
      await updateBookingStatus(booking.id, "cancelled", cancelBookingReason.trim());
      toast.success(`Đã hủy booking bàn ${cancelBookingModal.tableName}`);
      setCancelBookingModal(null);
      setCancelBookingReason("");
      fetchData();
    } catch {
      toast.error("Không thể hủy booking");
    }
  };

  // State modal bảo trì
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [maintenanceReason, setMaintenanceReason] = useState("");

  const handleMaintenanceConfirm = async () => {
    if (!maintenanceReason.trim()) {
      toast.error("Vui lòng nhập lý do bảo trì");
      return;
    }
    await handleStatusChange("maintenance", maintenanceReason.trim());
    setIsMaintenanceModalOpen(false);
    setMaintenanceReason("");
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tiêu đề trang & Thanh thao tác */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-700 font-display flex items-center gap-2.5">
            <LayoutGrid className="text-sky-600" />
            {isManager ? "Sơ đồ bàn & Tiền sảnh" : "Sơ đồ bàn & Phục vụ nhanh"}
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            {isManager
              ? "Giao diện Quản lý: Theo dõi, phân phối chỗ ngồi và điều khiển dòng phục vụ của bàn ăn theo thời gian thực (Real-time)."
              : "Giao diện Phục vụ: Chọn bàn trên lưới để thao tác mở bàn, gọi món trực tiếp và in phiếu tạm tính."}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddTableOpen(true)}
            className="px-5 py-2.5 bg-[#3E2016] hover:bg-[#5C2E17] text-[#FFFFFF] text-xs font-black rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
          >
            <Plus size={15} />
            Thêm bàn ăn
          </button>
          <button
            onClick={() => {
              fetchData();
              toast.success("Đã cập nhật dữ liệu mới nhất!");
            }}
            disabled={loading}
            className="flex items-center gap-2 rounded-xl border border-sky-100 bg-white px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-sky-50/50 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Chú thích trạng thái */}
      <div className="flex flex-wrap items-center gap-4 bg-white/90 backdrop-blur-md p-3.5 rounded-xl border border-sky-100 text-xs shadow-xs">
        <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mr-1">Trạng thái:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-full ${cfg.dot}`} />
            <span className="font-semibold text-slate-600">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs Chuyển đổi Khu Vực */}
      <div className="border-b border-sky-100 pb-px">
        <div className="flex gap-2 overflow-x-auto">
          {areas.map((area) => {
            const isActive = selectedAreaId === area.id;
            return (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-t border-x cursor-pointer whitespace-nowrap ${isActive
                  ? "bg-white border-sky-100 text-sky-600 border-b-white z-10"
                  : "bg-sky-50/50 border-transparent text-slate-400 hover:text-slate-700 hover:bg-sky-100/50"
                  }`}
              >
                {area.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* BỐ CỤC 2 CỘT: Lưới bàn bên trái + Bảng điều khiển sticky bên phải */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Cột trái: Lưới Bàn Ăn */}
        <div className="flex-1 w-full min-w-0">
          <div className="bg-white/80 backdrop-blur-xl border border-sky-100 shadow-sm p-5 min-h-[460px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-9 h-9 border-3 border-sky-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-400 font-semibold">Đang tải sơ đồ bàn...</p>
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-sm">
                Chưa có bàn nào trong khu vực này. Nhấn &ldquo;Thêm bàn ăn&rdquo; để tạo bàn.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {filteredTables.map((t) => {
                  const isSelected = selectedTableId?.toString() === t.id.toString();
                  const mergedTableNames = t.merged_tables?.map((table) => table.name).join(", ") ?? "";

                  return (
                    <div
                      key={t.id}
                      onClick={() => {
                        setSelectedTableId(t.id);
                        if (t.is_split) {
                          setIsSubOrderModalOpen(true);
                        }
                      }}
                      className={`relative flex items-center justify-center p-8 transition-all cursor-pointer select-none rounded-2xl border-2 ${isSelected
                        ? "border-sky-500 bg-sky-500/5 ring-4 ring-sky-500/15"
                        : "border-transparent bg-slate-50/50 hover:bg-slate-100/30"
                        }`}
                    >
                      {/* Main Table Shape */}
                      <div
                        className={`relative w-28 h-16 rounded-full border-2 flex flex-col items-center justify-center z-10 shadow-xs hover:scale-105 transition-transform ${t.status === "serving"
                          ? "bg-red-50 border-red-300 text-red-700"
                          : t.status === "reserved"
                            ? "bg-amber-50 border-amber-300 text-amber-700"
                            : t.status === "pending_payment"
                              ? "bg-purple-50 border-purple-300 text-purple-700"
                              : t.status === "cleaning"
                                ? "bg-blue-50 border-blue-300 text-blue-700"
                                : t.status === "maintenance"
                                  ? "bg-purple-50 border-purple-300 text-purple-700"
                                  : "bg-white border-slate-300 text-slate-700"
                          }`}
                      >
                        <span className="font-extrabold text-sm tracking-wide">{t.name}</span>
                        {t.status !== "empty" && (
                          <span className="text-[10px] opacity-90 mt-0.5 leading-none font-bold">
                            {t.status === "serving"
                              ? (t.is_early_paid ? "Đã thanh toán" : t.is_early_payment ? "TT Sớm" : "Có khách")
                              : t.status === "reserved"
                                ? "Đã đặt"
                                : t.status === "pending_payment"
                                  ? "Chờ TT"
                                  : t.status === "cleaning"
                                    ? "Đã thanh toán"
                                    : "Bảo trì"}
                          </span>
                        )}
                      </div>

                      {t.is_split && (t.split_labels?.length ?? 0) > 0 && (
                        <span
                          className="absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-pink-300 bg-pink-100 px-2 py-0.5 text-[9px] font-black text-pink-700 shadow-xs animate-pulse"
                          title={`Đang tách bàn thành: ${t.split_labels?.join(", ")}`}
                        >
                          <Copy size={10} className="text-pink-600" /> Tách · {t.split_labels?.join(", ")}
                        </span>
                      )}
                      {t.is_merged_primary && mergedTableNames && (
                        <span
                          className="absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-black text-violet-700 shadow-xs"
                          title={`Bàn chính, gộp với ${mergedTableNames}`}
                        >
                          <Link2 size={10} /> Chính · {mergedTableNames}
                        </span>
                      )}
                      {t.is_merged_child && t.merged_into && (
                        <span
                          className="absolute -top-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[9px] font-black text-sky-700 shadow-xs"
                          title={`Bàn phụ, đang gộp vào ${t.merged_into.name}`}
                        >
                          <Link2 size={10} /> Gộp → {t.merged_into.name}
                        </span>
                      )}
                      {t.is_group_seating_primary && (t.group_seating_tables?.length ?? 0) > 0 && (
                        <span
                          className="absolute -bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[9px] font-black text-cyan-700 shadow-xs"
                          title={`Đoàn chung với ${t.group_seating_tables?.map((table) => table.name).join(", ")}`}
                        >
                          <UsersRound size={10} /> Đoàn · {(t.group_seating_tables?.length ?? 0) + 1} bàn
                        </span>
                      )}
                      {t.is_group_seating_child && t.group_seating_into && (
                        <span
                          className="absolute -bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[9px] font-black text-cyan-700 shadow-xs"
                          title={`Bàn đoàn, order chung tại ${t.group_seating_into.name}`}
                        >
                          <UsersRound size={10} /> Đoàn → {t.group_seating_into.name}
                        </span>
                      )}

                      {/* Chairs arranged around the table */}
                      {Array.from({ length: t.capacity }).map((_, i) => {
                        const angle = (2 * Math.PI * i) / t.capacity;
                        const rx = 64; // horizontal spacing radius
                        const ry = 40; // vertical spacing radius
                        const x = rx * Math.cos(angle);
                        const y = ry * Math.sin(angle);

                        return (
                          <span
                            key={i}
                            className={`absolute w-3.5 h-3.5 rounded-full border shadow-2xs z-0 transition-colors ${t.status === "serving"
                              ? "bg-red-200 border-red-300"
                              : t.status === "reserved"
                                ? "bg-amber-200 border-amber-300"
                                : t.status === "pending_payment"
                                  ? "bg-purple-200 border-purple-300"
                                  : t.status === "cleaning"
                                    ? "bg-blue-200 border-blue-300"
                                    : t.status === "maintenance"
                                      ? "bg-purple-200 border-purple-300"
                                      : "bg-slate-200 border-slate-300"
                              }`}
                            style={{
                              left: `calc(50% + ${x}px - 7px)`,
                              top: `calc(50% + ${y}px - 7px)`,
                            }}
                          />
                        );
                      })}

                      {/* Warning🍳 indicator for pre-ordered items */}
                      {((t.pre_ordered_items && t.pre_ordered_items.length > 0) || (t.guest_note && t.guest_note.includes("Món đặt trước"))) && (
                        <span className="absolute top-2.5 right-2.5 text-xs bg-amber-100 text-amber-800 border border-amber-200 rounded-full p-1 leading-none font-bold" title="Có món đặt trước">
                          🍳
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Cột phải: Sticky Panel Quản Lý Bàn & Gọi Món */}
        <div className="w-full lg:w-96 shrink-0 lg:sticky lg:top-20 space-y-4">
          {selectedTable ? (
            <div className="bg-white/80 backdrop-blur-xl border border-sky-100 shadow-md overflow-hidden animate-fade-in">
              {/* Panel Header */}
              <div className="border-b border-sky-50 bg-sky-50/50 px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-800">Bàn {selectedTable.name}</h3>
                  <p className="text-xs text-slate-400">
                    Khu vực: {selectedTable.area_name} • {selectedTable.is_merged_child
                      ? `Bàn phụ của ${selectedTable.merged_into?.name ?? "bàn chính"}`
                      : selectedTable.is_group_seating_child
                        ? `Bàn đoàn của ${selectedTable.group_seating_into?.name ?? "bàn chính"}`
                        : selectedTable.status !== "empty"
                        ? `Khách: ${selectedTable.guest_count || "?"}/${getTableClusterCapacity(selectedTable)} người`
                        : `Sức chứa: ${getTableClusterCapacity(selectedTable)} khách`}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      selectedTable.status === "serving" && selectedTable.is_early_paid
                        ? "text-emerald-700 bg-emerald-50 border-emerald-300"
                        : selectedTable.status === "serving" && selectedTable.is_early_payment
                        ? "text-amber-700 bg-amber-50 border-amber-300"
                        : (STATUS_CONFIG[selectedTable.status] || STATUS_CONFIG.empty).text
                    } bg-white border border-sky-100 shadow-2xs`}
                  >
                    {selectedTable.status === "serving" && selectedTable.is_early_paid
                      ? "Đang phục vụ (đã thanh toán)"
                      : selectedTable.status === "serving" && selectedTable.is_early_payment
                      ? "Đang phục vụ (thanh toán sớm)"
                      : (STATUS_CONFIG[selectedTable.status] || STATUS_CONFIG.empty).label}
                  </span>
                  <button
                    type="button"
                    onClick={handleOpenTableSchedule}
                    disabled={loadingTableSchedule}
                    title="Xem lịch đặt 30 ngày"
                    className="rounded-lg border border-sky-100 bg-white px-2 py-1.5 text-[10px] font-black text-sky-700 hover:bg-sky-50 disabled:opacity-50 transition-colors"
                  >
                    {loadingTableSchedule ? "Đang tải" : "Lịch đặt"}
                  </button>
                  <button
                    onClick={() => handleDeleteTable(selectedTable)}
                    title="Xóa bàn"
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {selectedTable.is_split && (
                <div className="mx-5 mt-4 flex flex-col gap-2 rounded-xl border-2 border-pink-300 bg-pink-50 p-3.5 text-xs text-pink-900 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Copy size={16} className="text-pink-600 shrink-0" />
                      <span className="font-black text-sm text-pink-900">Bàn đang tách thành {selectedTable.split_labels?.length || 2} nhóm sub-orders</span>
                    </div>
                    <span className="font-extrabold text-[11px] text-pink-700 bg-pink-100 px-2 py-0.5 rounded-full border border-pink-200">
                      {selectedTable.split_labels?.join(", ") || "Sub-orders"}
                    </span>
                  </div>
                  <p className="text-[11px] text-pink-800">
                    Mỗi nhóm khách có order và hóa đơn riêng độc lập ({selectedTable.split_labels?.join(", ")}). Nhấn bên dưới để gọi món hoặc thanh toán từng nhóm:
                  </p>
                  <button
                    onClick={() => setIsSubOrderModalOpen(true)}
                    className="w-full py-2.5 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer mt-1"
                  >
                    <Copy size={14} />
                    Xem & Thao tác Sub-Orders ({selectedTable.split_labels?.join(", ") || "B04:1, B04:2"})
                  </button>
                </div>
              )}

              {selectedTable.is_merged_primary && (selectedTable.merged_tables?.length ?? 0) > 0 && (
                <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-violet-200 bg-violet-50 px-3 py-2.5 text-xs text-violet-800">
                  <Link2 size={15} className="mt-0.5 shrink-0 text-violet-600" />
                  <p>
                    <span className="font-black">Bàn chính của cụm:</span>{" "}
                    {selectedTable.name} + {selectedTable.merged_tables?.map((table) => table.name).join(", ")}. Sức chứa cụm: {getTableClusterCapacity(selectedTable)} khách. Món ăn và thanh toán được xử lý chung tại đây.
                  </p>
                </div>
              )}

              {selectedTable.is_merged_child && selectedTable.merged_into && (
                <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-800">
                  <div className="flex items-start gap-2">
                    <Link2 size={15} className="mt-0.5 shrink-0 text-sky-600" />
                    <p>
                      <span className="font-black">Bàn phụ:</span> {selectedTable.name} đang gộp vào {selectedTable.merged_into.name}. Món ăn và thanh toán dùng chung với bàn chính.
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedTableId(selectedTable.merged_into?.id ?? null)}
                    className="shrink-0 rounded-lg border border-sky-200 bg-white px-2 py-1.5 text-[10px] font-black text-sky-700 hover:bg-sky-100 transition-colors"
                  >
                    Mở {selectedTable.merged_into.name}
                  </button>
                </div>
              )}

              {/* Status control buttons */}
              {selectedTable.is_group_seating_primary && (selectedTable.group_seating_tables?.length ?? 0) > 0 && (
                <div className="mx-5 mt-4 flex items-start gap-2 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs text-cyan-900">
                  <UsersRound size={15} className="mt-0.5 shrink-0 text-cyan-700" />
                  <p>
                    <span className="font-black">Bàn chính của đoàn:</span>{" "}
                    {selectedTable.name} + {selectedTable.group_seating_tables?.map((table) => table.name).join(", ")}. Tổng sức chứa: {getTableClusterCapacity(selectedTable)} khách. Các bàn cùng dùng chung order và hóa đơn.
                  </p>
                </div>
              )}

              {selectedTable.is_group_seating_child && selectedTable.group_seating_into && (
                <div className="mx-5 mt-4 flex items-center justify-between gap-3 rounded-xl border border-cyan-200 bg-cyan-50 px-3 py-2.5 text-xs text-cyan-800">
                  <div className="flex items-start gap-2">
                    <UsersRound size={15} className="mt-0.5 shrink-0 text-cyan-700" />
                    <p><span className="font-black">Bàn của đoàn:</span> {selectedTable.name} dùng chung order và hóa đơn tại {selectedTable.group_seating_into.name}.</p>
                  </div>
                  <button onClick={() => setSelectedTableId(selectedTable.group_seating_into?.id ?? null)} className="shrink-0 rounded-lg border border-cyan-200 bg-white px-2 py-1.5 text-[10px] font-black text-cyan-700 hover:bg-cyan-100 transition-colors">Mở {selectedTable.group_seating_into.name}</button>
                </div>
              )}

              <div className="p-5 space-y-4">
                {selectedTable.status === "empty" && (
                  <div className="space-y-2">
                    <button
                      onClick={() => setIsOpenTableModalOpen(true)}
                      className="w-full rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={16} />
                      Mở bàn phục vụ ngay
                    </button>
                    <button
                      onClick={() => setIsMaintenanceModalOpen(true)}
                      className="w-full rounded-xl border border-purple-200 bg-purple-50 px-4 py-2.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Wrench size={14} />
                      Chuyển sang trạng thái Bảo trì
                    </button>
                  </div>
                )}

                {selectedTable.status === "maintenance" && (
                  <button
                    onClick={() => handleStatusChange("empty")}
                    className="w-full rounded-xl bg-slate-800 px-4 py-3 text-xs font-bold text-white hover:bg-slate-900 transition-colors cursor-pointer"
                  >
                    Đưa về bàn Trống (Đã bảo trì xong)
                  </button>
                )}

                {selectedTable.status === "cleaning" && (
                  <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 space-y-3.5 text-center shadow-xs">
                    <div className="w-11 h-11 rounded-full bg-blue-100 flex items-center justify-center mx-auto text-blue-600 shadow-2xs">
                      <CheckCircle size={24} />
                    </div>
                    <div>
                      <h5 className="font-bold text-blue-900 text-sm">
                        Đã thanh toán — Chờ dọn dẹp bàn
                      </h5>
                      <p className="text-xs text-blue-700 mt-1 leading-relaxed">
                        Hóa đơn đã được thu ngân thu tiền hoàn tất. Vui lòng thu dọn bát đĩa và lau sạch bàn ăn.
                      </p>
                    </div>
                    <button
                      onClick={async () => {
                        await handleStatusChange("empty");
                      }}
                      className="w-full rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white hover:bg-blue-700 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                    >
                      ✨ Đã dọn xong — Trả bàn trống
                    </button>
                  </div>
                )}

                {/* Khách hàng & Cảnh báo vượt sức chứa */}
                {(selectedTable.status === "serving" ||
                  selectedTable.status === "pending_payment" ||
                  selectedTable.status === "reserved") && (
                    <>
                      {/* Customer details card */}
                      <div className="rounded-xl bg-sky-50/50 p-3.5 border border-sky-100 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-slate-400">Khách hàng:</span>
                          <span className="font-bold text-slate-800">
                            {selectedTable.guest_name || "Khách tại bàn"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400 flex items-center gap-1"><Phone size={11} /> SĐT:</span>
                          <span className="font-medium text-slate-700">
                            {selectedTable.guest_phone || <span className="italic text-gray-400">Không ghi</span>}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-400">Thời gian đến / đặt:</span>
                          <span className="font-semibold text-slate-700">
                            {selectedTable.start_time || "Vừa đến"}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-gray-500">Số khách đặt/đang ngồi:</span>
                          <span className={`font-bold ${isTableOverClusterCapacity(selectedTable) ? "text-rose-600" : "text-emerald-700"}`}>
                            {selectedTable.is_merged_child
                              ? `Xem tại ${selectedTable.merged_into?.name ?? "bàn chính"}`
                              : `${selectedTable.guest_count || "?"} / ${getTableClusterCapacity(selectedTable)} người`}
                          </span>
                        </div>
                        {selectedTable.booking_code && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Mã đặt bàn:</span>
                            <span className="font-mono font-bold text-amber-700">
                              {selectedTable.booking_code}
                            </span>
                          </div>
                        )}
                        {((selectedTable.pre_ordered_items && selectedTable.pre_ordered_items.length > 0) || (selectedTable.guest_note && selectedTable.guest_note.includes("Món đặt trước"))) && (
                          <div className="mt-2.5 pt-2 border-t border-amber-200/80 bg-amber-50/80 p-2 rounded-lg">
                            <span className="font-extrabold text-amber-900 block flex items-center gap-1 mb-1">
                              🍳 Món ăn đã đặt trước:
                            </span>
                            {selectedTable.pre_ordered_items && selectedTable.pre_ordered_items.length > 0 ? (
                              <ul className="list-disc list-inside text-amber-800 font-semibold space-y-0.5 ml-1">
                                {selectedTable.pre_ordered_items.map((item, idx) => (
                                  <li key={idx}>
                                    {item.name} <span className="text-amber-950 font-black">x{item.quantity}</span>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p className="text-amber-800 font-medium whitespace-pre-line">
                                {selectedTable.guest_note}
                              </p>
                            )}
                          </div>
                        )}
                      </div>

                      {/* CẢNH BÁO PHÁT SINH NGƯỜI */}
                      {isTableOverClusterCapacity(selectedTable) && (
                        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-2">
                          <div className="flex items-start gap-2">
                            <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-bold text-amber-800">
                                Bàn phát sinh thêm người ({selectedTable.guest_count}/{getTableClusterCapacity(selectedTable)} khách)
                              </p>
                              <p className="text-[11px] text-amber-700 mt-0.5">
                                Bạn có thể chuyển sang bàn lớn hơn hoặc gộp bàn để phục vụ thuận tiện.
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button
                              onClick={() => setActiveAction("transfer")}
                              className="flex-1 rounded-lg bg-white border border-amber-300 px-3 py-1.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              <ArrowRightLeft size={12} /> Chuyển bàn
                            </button>
                            <button
                              onClick={() => setActiveAction("merge")}
                              className="flex-1 rounded-lg bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-amber-700 transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              <GitMerge size={12} /> Gộp bàn
                            </button>
                            <button
                              onClick={() => setActiveAction("groupSeating")}
                              className="flex-1 rounded-lg border border-cyan-300 bg-cyan-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-cyan-700 transition-colors cursor-pointer flex items-center justify-center gap-1"
                            >
                              <UsersRound size={12} /> Xếp đoàn
                            </button>
                          </div>
                        </div>
                      )}

                      {/* DANH SÁCH MÓN ĐÃ GỌI (chỉ hiển khi đang phục vụ / chờ thanh toán) */}
                      {(selectedTable.status === "serving" || selectedTable.status === "pending_payment") && (
                        <div className="border-t border-sky-50 pt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Utensils size={15} className="text-sky-600" />
                              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                                Món ăn đã gọi
                              </h4>
                            </div>
                            {selectedTable.status === "serving" && !selectedTable.is_merged_child && (
                              <button
                                onClick={() => navigate(`/waiter/orders/${selectedTableId}`)}
                                className="flex items-center gap-1 rounded-lg bg-sky-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-sky-600 transition-colors cursor-pointer shadow-2xs"
                              >
                                <Plus size={13} /> Thêm món
                              </button>
                            )}
                          </div>

                          {loadingOrder ? (
                            <div className="py-8 text-center text-xs text-gray-400">
                              Đang tải danh sách món...
                            </div>
                          ) : !activeOrder || activeOrder.items.length === 0 ? (
                            <div className="rounded-xl border border-dashed border-sky-100 py-8 text-center text-xs text-gray-400">
                              Chưa có món ăn nào trong order. Nhấn &ldquo;Thêm món&rdquo; để gọi món.
                            </div>
                          ) : (
                            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                              {activeOrder.items
                                .filter((i) => i.status !== "voided" && i.status !== "cancelled")
                                .map((item) => {
                                  const st = ITEM_STATUS_LABELS[item.status] || ITEM_STATUS_LABELS.pending;
                                  return (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between p-2.5 rounded-xl border border-sky-50 bg-sky-50/50/50 text-xs"
                                    >
                                      <div className="min-w-0 flex-1 pr-2">
                                        <p className="font-bold text-slate-700 truncate">{item.item_name}</p>
                                        <p className="text-[11px] text-slate-400">
                                          {item.quantity} x {Number(item.unit_price).toLocaleString()}đ
                                        </p>
                                        {item.kitchen_note && (
                                          <p className="text-[10px] text-amber-600 italic">
                                            📝 {item.kitchen_note}
                                          </p>
                                        )}
                                      </div>

                                      <div className="flex items-center gap-1.5 shrink-0">
                                        <span
                                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${st.badge}`}
                                        >
                                          {st.label}
                                        </span>
                                        {item.status === "done" && (
                                          <button
                                            onClick={async (e) => {
                                              e.stopPropagation();
                                              if (!activeOrder) return;
                                              try {
                                                await markItemAsServed(activeOrder.id, item.id);
                                                toast.success(`Đã mang "${item.item_name}" ra bàn`);
                                                loadActiveOrder(selectedTable.id);
                                              } catch {
                                                toast.error("Không thể cập nhật món đã mang ra");
                                              }
                                            }}
                                            className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors cursor-pointer"
                                          >
                                            🛎 Đã mang ra
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}
                            </div>
                          )}

                          {/* TỔNG TIỀN VÀ IN PHIẾU TẠM TÍNH — chỉ hiển thị khi có món */}
                          {activeOrder && activeOrder.items.filter(i => i.status !== "voided" && i.status !== "cancelled").length > 0 && (
                            <div className="rounded-xl bg-gray-900 p-3.5 text-white space-y-2 mt-3">
                              <div className="flex justify-between items-center text-xs text-gray-300">
                                <span>Tạm tính (món):</span>
                                <span className="font-bold">{(activeOrder.subtotal !== undefined ? activeOrder.subtotal : activeOrder.totalAmount || 0).toLocaleString("vi-VN")} đ</span>
                              </div>
                              <div className="flex justify-between items-center text-xs text-gray-300">
                                <span>VAT (10%):</span>
                                <span className="font-bold">+{(activeOrder.tax !== undefined ? activeOrder.tax : Math.round((activeOrder.subtotal || activeOrder.totalAmount || 0) * 0.10)).toLocaleString("vi-VN")} đ</span>
                              </div>
                              {(activeOrder.depositAmount || 0) > 0 && (
                                <div className="flex justify-between items-center text-xs text-amber-400">
                                  <span>Tiền cọc đặt bàn:</span>
                                  <span className="font-bold">-{(activeOrder.depositAmount || 0).toLocaleString("vi-VN")} đ</span>
                                </div>
                              )}
                              <div className="border-t border-gray-700 pt-2 flex items-center justify-between">
                                <div>
                                  <p className="text-[10px] text-gray-400 uppercase font-bold">Tổng thanh toán dự kiến:</p>
                                  <p className="text-base font-black text-sky-400">
                                    {(activeOrder.totalAmount || 0).toLocaleString("vi-VN")} đ
                                  </p>
                                </div>
                                <button
                                  onClick={() => setIsPrintBillOpen(true)}
                                  className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-slate-800 hover:bg-sky-100 transition-colors cursor-pointer shadow-md"
                                >
                                  <Printer size={14} /> In phiếu tạm tính
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Nút thao tác chuyển/gộp/tách — CHỈ HIỂN THỊ khi bàn đang ở trạng thái phục vụ và chưa thanh toán */}
                          {selectedTable.status === "serving" && !selectedTable.is_early_paid && !selectedTable.is_merged_child && (
                            <div className={`grid ${((selectedTable.guest_count || 0) > 1) ? "grid-cols-3" : "grid-cols-2"} gap-2 pt-1`}>
                              <button
                                onClick={() => setActiveAction("transfer")}
                                disabled={isSelectedTableInCluster}
                                title={isSelectedTableInCluster ? "Tách hoặc hoàn tất cụm trước khi chuyển bàn" : "Chuyển toàn bộ order sang bàn trống"}
                                className="rounded-xl border border-sky-100 bg-white px-2 py-2 text-xs font-bold text-slate-600 hover:bg-sky-50/50 disabled:cursor-not-allowed disabled:opacity-45 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <ArrowRightLeft size={13} /> Chuyển bàn
                              </button>
                              <button
                                onClick={() => setActiveAction("merge")}
                                className="rounded-xl border border-sky-100 bg-white px-2 py-2 text-xs font-bold text-slate-600 hover:bg-sky-50/50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <GitMerge size={13} /> Gộp bàn
                              </button>
                              {((selectedTable.guest_count || 0) > 1) && (
                                <button
                                  onClick={() => setActiveAction("split")}
                                  className="rounded-xl border border-sky-100 bg-white px-2 py-2 text-xs font-bold text-slate-600 hover:bg-sky-50/50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Copy size={13} className="text-pink-600" /> Tách bàn
                                </button>
                              )}
                            </div>
                          )}

                          {selectedTable.status === "serving" && !selectedTable.is_early_paid && activeOrder && activeOrder.items.filter(i => i.status !== "voided" && i.status !== "cancelled").length > 0 && (
                            <button
                              onClick={handleRequestPaymentFromTable}
                              className="w-full rounded-xl border-2 border-purple-200 bg-purple-50/60 px-3 py-2.5 text-xs font-bold text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-1.5 shadow-2xs"
                            >
                              <FileText size={14} className="text-purple-600" /> Yêu cầu thanh toán (Thu ngân)
                            </button>
                          )}

                          {selectedTable.status === "serving" && selectedTable.is_early_paid && (
                            <button
                              onClick={async () => {
                                await updateTableStatus(Number(selectedTable.id), "empty");
                                toast.success("Đã dọn dẹp và trả bàn trống thành công!");
                                fetchData();
                              }}
                              className="w-full rounded-xl bg-emerald-600 text-white px-3 py-2.5 text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-1.5 mt-2 shadow-sm"
                            >
                              <CheckCircle size={15} /> 🧹 Đã dọn dẹp (Khách rời đi, trả bàn trống)
                            </button>
                          )}
                        </div>
                      )}
                    </>
                  )}
              </div>
            </div>
          ) : (
            <div className="bg-white/90 backdrop-blur-md rounded-2xl border border-sky-100 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-sky-100 flex items-center justify-center mx-auto text-gray-400">
                <Utensils size={22} />
              </div>
              <div>
                <h4 className="font-bold text-slate-700 text-sm">Chưa chọn bàn nào</h4>
                <p className="text-xs text-gray-400 mt-1">
                  Chọn một bàn bên trái để xem chi tiết, mở bàn, gọi món trực tiếp hoặc in phiếu tạm tính.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hướng dẫn cho Phục vụ */}
      <div className="bg-sky-50/50 border border-sky-100 rounded-xl p-4 flex items-start gap-3">
        <Info size={16} className="text-gray-400 mt-0.5 shrink-0" />
        <div className="text-xs text-slate-400 space-y-1">
          <p className="font-bold text-slate-600">Quy trình nghiệp vụ Phục vụ:</p>
          <p>• <strong>Mở bàn & Gọi món:</strong> Chọn bàn trên sơ đồ → Nhấn &ldquo;Mở bàn phục vụ&rdquo; → Chọn &ldquo;Thêm món&rdquo; để gọi món cho khách.</p>
          <p>• <strong>Phát sinh khách:</strong> Nếu khách đi đông hơn sức chứa, hệ thống tự động cảnh báo và cho phép chuyển/gộp bàn mang theo toàn bộ danh sách món.</p>
          <p>• <strong>Thanh toán:</strong> Nhấn &ldquo;In phiếu tạm tính&rdquo; (có ghi ngày giờ in và Mã nhân viên) đưa cho khách cầm ra thu ngân.</p>
        </div>
      </div>

      {/* ── MODALS ── */}
      <OpenTableModal
        isOpen={isOpenTableModalOpen}
        onClose={() => setIsOpenTableModalOpen(false)}
        onConfirm={handleOpenTable}
        table={selectedTable}
      />

      <AddTableModal
        isOpen={isAddTableOpen}
        onClose={() => setIsAddTableOpen(false)}
        areas={areas}
        onConfirm={handleAddTableConfirm}
      />

      {selectedTable && (
        <AddDishModal
          isOpen={isAddDishOpen}
          onClose={() => setIsAddDishOpen(false)}
          tableName={selectedTable.name}
          onAddItem={handleAddDish}
        />
      )}

      {selectedTable && (
        <ProvisionalBillModal
          isOpen={isPrintBillOpen}
          onClose={() => setIsPrintBillOpen(false)}
          tableName={selectedTable.name}
          orderId={activeOrder?.id}
          items={activeOrder?.items || []}
          subtotal={activeOrder?.subtotal}
          tax={activeOrder?.tax}
          depositAmount={activeOrder?.depositAmount ?? selectedTable.deposit_amount ?? undefined}
          totalAmount={activeOrder?.totalAmount}
          waiterName={userInfo.name}
          employeeCode={userInfo.code}
          guestName={selectedTable.guest_name}
          guestPhone={selectedTable.guest_phone}
          startTime={selectedTable.start_time}
        />
      )}

      <TransferTableModal
        isOpen={activeAction === "transfer"}
        onClose={() => setActiveAction(null)}
        sourceTable={selectedTable}
        availableTables={tables}
        onConfirm={async (_src, targetId) => {
          await fetchData();
          setSelectedTableId(targetId);
          setActiveAction(null);
        }}
        onSuccess={() => {
          fetchData();
          setActiveAction(null);
        }}
      />

      <MergeTableModal
        isOpen={activeAction === "merge"}
        onClose={() => setActiveAction(null)}
        sourceTable={selectedTable}
        availableTables={tables}
        onConfirm={async () => {
          await fetchData();
          setActiveAction(null);
        }}
        onSuccess={() => {
          fetchData();
          setActiveAction(null);
        }}
      />

      <GroupSeatingModal
        isOpen={activeAction === "groupSeating"}
        onClose={() => setActiveAction(null)}
        sourceTable={selectedTable}
        availableTables={tables}
        onSuccess={() => {
          fetchData();
          setActiveAction(null);
        }}
      />

      {selectedTable && (
        <SplitTableModal
          isOpen={activeAction === "split"}
          onClose={() => setActiveAction(null)}
          tableName={selectedTable.name}
          tableCapacity={selectedTable.capacity}
          sourceTableId={Number(selectedTable.id)}
          orderItems={(activeOrder?.items || []).map((i) => ({
            id: i.id,
            name: i.item_name,
            quantity: i.quantity,
            price: i.unit_price,
            status: i.status,
          }))}
          onSuccess={() => {
            fetchData();
            setActiveAction(null);
            setIsSubOrderModalOpen(true);
          }}
        />
      )}

      {selectedTable && (
        <SubOrderSelectionModal
          isOpen={isSubOrderModalOpen}
          onClose={() => setIsSubOrderModalOpen(false)}
          tableId={Number(selectedTable.id)}
          tableName={selectedTable.name}
        />
      )}

      <Modal
        isOpen={isTableScheduleOpen}
        onClose={() => setIsTableScheduleOpen(false)}
        title={`Lịch đặt — Bàn ${selectedTable?.name ?? ""}`}
        size="lg"
        theme="light"
      >
        <div className="mb-4 flex gap-2 border-b border-slate-100 pb-3">
          <button
            type="button"
            onClick={() => void loadTableSchedule(TABLE_SCHEDULE_MODE.CURRENT)}
            disabled={loadingTableSchedule}
            className={`rounded-lg px-3 py-2 text-xs font-black transition-colors ${
              tableScheduleMode === TABLE_SCHEDULE_MODE.CURRENT
                ? "bg-sky-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Lịch đặt hiện tại
          </button>
          <button
            type="button"
            onClick={() => void loadTableSchedule(TABLE_SCHEDULE_MODE.HISTORY)}
            disabled={loadingTableSchedule}
            className={`rounded-lg px-3 py-2 text-xs font-black transition-colors ${
              tableScheduleMode === TABLE_SCHEDULE_MODE.HISTORY
                ? "bg-slate-700 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            Lịch sử đặt bàn
          </button>
        </div>
        {tableSchedule.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-400">
            {tableScheduleMode === TABLE_SCHEDULE_MODE.CURRENT
              ? "Bàn này chưa có lịch đặt hiện tại nào trong 30 ngày tới."
              : "Chưa có lịch sử booking đã hoàn tất hoặc đã hủy."}
          </p>
        ) : (
          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
            {tableSchedule.map((booking) => {
              const checkInState = getScheduleCheckInState(booking, scheduleNow);
              const isCurrentSchedule = tableScheduleMode === TABLE_SCHEDULE_MODE.CURRENT;
              const isCheckingIn = checkingInBookingId === booking.id;
              return (
                <div key={booking.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="font-black text-slate-800">#{booking.confirmation_code} · {booking.guest_name}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{booking.guest_phone} · {booking.party_size} khách</p>
                    </div>
                    <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                      {formatScheduleTimestamp(booking.start_time)}
                    </span>
                  </div>
                  <div className="mt-3 rounded-lg bg-sky-50/70 p-2.5 border border-sky-100/80">
                    <p className="text-xs font-bold text-sky-900">
                      🔗 Cụm bàn tiệc gộp: <span className="text-sky-700">{booking.table_names}</span> (Tổng sức chứa: {booking.total_capacity} khách)
                    </p>
                  </div>
                  {booking.guest_note && <p className="mt-2 text-xs italic text-slate-500">Ghi chú: {booking.guest_note}</p>}
                  {isCurrentSchedule && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 pt-3">
                      <span className={`text-xs font-semibold ${checkInState.canCheckIn ? "text-emerald-700" : "text-slate-500"}`}>
                        {checkInState.message}
                      </span>
                      <button
                        type="button"
                        disabled={!checkInState.canCheckIn || isCheckingIn}
                        onClick={() => void handleCheckInScheduledBooking(booking)}
                        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-black text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                      >
                        {isCheckingIn ? "Đang mở bàn..." : "Khách đã đến – Mở bàn"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Modal>

      <GroupSeatingModal
        isOpen={activeAction === "groupSeating"}
        onClose={() => setActiveAction(null)}
        sourceTable={selectedTable}
        availableTables={tables}
        onSuccess={() => {
          fetchData();
          setActiveAction(null);
        }}
      />

      <SplitTableModal
        isOpen={activeAction === "split"}
        onClose={() => setActiveAction(null)}
        tableName={selectedTable?.name || ""}
        sourceTableId={selectedTable ? Number(selectedTable.id) : undefined}
        orderItems={
          activeOrder?.items.map((item) => ({
            id: item.id.toString(),
            name: item.item_name,
            quantity: item.quantity,
            price: Number(item.unit_price),
          })) || []
        }
        availableEmptyTables={tables.filter((t) => t.status === "empty")}
        onConfirm={async () => {
          await fetchData();
          setActiveAction(null);
        }}
        onSuccess={() => {
          fetchData();
          setActiveAction(null);
        }}
      />

      <SubOrderSelectionModal
        isOpen={isSubOrderModalOpen}
        onClose={() => setIsSubOrderModalOpen(false)}
        tableId={selectedTableId ? Number(selectedTableId) : 0}
        tableName={selectedTable?.name || ""}
      />

      {/* ── Modal Lý Do Bảo Trì ── */}
      {isMaintenanceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl animate-fade-in p-6 space-y-4">
            <div className="flex items-center gap-2 text-purple-700">
              <Wrench size={18} />
              <h3 className="font-bold text-base">Lý do bảo trì — Bàn {selectedTable?.name}</h3>
            </div>
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-100 text-xs text-purple-700">
              Bàn sẽ được chuyển sang trạng thái <strong>Bảo trì</strong> và tạm thời không nhận khách. Vui lòng ghi rõ lý do để theo dõi.
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">
                Lý do bảo trì <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="VD: Sửa chữa ghế, vệ sinh bàn, thay bóng đèn..."
                value={maintenanceReason}
                onChange={(e) => setMaintenanceReason(e.target.value)}
                className="w-full px-4 py-3 border border-sky-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400 resize-none bg-sky-50/50"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setIsMaintenanceModalOpen(false); setMaintenanceReason(""); }}
                className="flex-1 py-2.5 bg-sky-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-gray-200"
              >
                Hủy
              </button>
              <button
                onClick={handleMaintenanceConfirm}
                disabled={!maintenanceReason.trim()}
                className="flex-1 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xác nhận Bảo trì
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Hủy Booking từ Sơ đồ Bàn ── */}
      {cancelBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl animate-fade-in p-6 space-y-4">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle size={18} />
              <h3 className="font-bold text-base">Hủy booking — Bàn {cancelBookingModal.tableName}</h3>
            </div>
            <div className="p-3 bg-red-50 rounded-xl border border-red-100 text-xs text-red-700">
              Booking sẽ bị hủy và bàn chuyển về trạng thái <strong>Trống</strong>. Vui lòng ghi rõ lý do để theo dõi.
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-600 uppercase tracking-wide mb-2">
                Lý do hủy <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={3}
                placeholder="VD: Khách gọi báo hủy, khách không đến sau 30 phút..."
                value={cancelBookingReason}
                onChange={(e) => setCancelBookingReason(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 resize-none bg-gray-50"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => { setCancelBookingModal(null); setCancelBookingReason(""); }}
                className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200"
              >
                Giữ lại
              </button>
              <button
                onClick={handleCancelBookingFromMap}
                disabled={!cancelBookingReason.trim()}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-bold text-sm hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Xác nhận Hủy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal cảnh báo và xử lý nghiệp vụ khi bàn còn món chưa mang ra mà Yêu cầu thanh toán */}
      <Modal
        isOpen={!!unfinishedPaymentModal}
        onClose={() => !processingPaymentRequest && setUnfinishedPaymentModal(null)}
        title="⚠️ Cảnh báo: Bàn vẫn còn món chưa hoàn thành / chưa mang ra"
        size="md"
        theme="light"
      >
        {unfinishedPaymentModal && (
          <div className="space-y-4 text-sm">
            <p className="text-gray-600">
              Bàn <strong className="text-gray-900">{selectedTable?.name}</strong> đang có{" "}
              <strong className="text-amber-600">{unfinishedPaymentModal.length} món</strong> chưa hoàn thành hoặc chưa mang ra bàn:
            </p>

            <div className="max-h-48 overflow-y-auto border border-amber-100 rounded-xl bg-amber-50/40 p-3 space-y-2">
              {unfinishedPaymentModal.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-amber-200/60 shadow-2xs text-xs">
                  <div>
                    <p className="font-bold text-gray-800">{item.item_name}</p>
                    <p className="text-gray-500">Số lượng: <span className="font-bold text-gray-700">{item.quantity}</span></p>
                  </div>
                  <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${
                    item.status === "cooking" ? "bg-amber-100 text-amber-800" :
                    item.status === "done" ? "bg-emerald-100 text-emerald-800" :
                    item.status === "waiting_kitchen" ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"
                  }`}>
                    {item.status === "cooking" ? "⏳ Đang nấu" :
                     item.status === "done" ? "✅ Bếp đã nấu xong (chờ bưng ra)" :
                     item.status === "waiting_kitchen" ? "📋 Đã gửi bếp" : "📋 Chờ gửi bếp"}
                  </span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-900 space-y-1">
                <p className="font-bold text-sky-900 flex items-center gap-1.5">
                  💡 Lựa chọn xử lý nghiệp vụ cho bàn:
                </p>
                <p>• <strong>Thanh toán sớm:</strong> Khách muốn trả tiền trước tất cả món nhưng vẫn tiếp tục ngồi ăn (Bếp & Phục vụ tiếp tục hoàn thành các món).</p>
                <p>• <strong>Hủy món chưa ra:</strong> Khách không muốn chờ nữa, hủy các món chưa ra và chỉ thanh toán các món đã ăn.</p>
              </div>

              <div className="flex flex-col gap-2 pt-1">
                {/* Lựa chọn 1: Thanh toán sớm (chỉ hiện khi đã gửi bếp tất cả món & không có món Chờ gửi) */}
                {(() => {
                  const activeItems = activeOrder?.items.filter((i) => i.status !== "voided" && i.status !== "cancelled") || [];
                  const hasPendingItems = activeItems.some((i) => i.status === "pending");
                  const hasSentToKitchen = activeItems.some(
                    (i) => i.status === "waiting_kitchen" || i.status === "cooking" || i.status === "done" || i.status === "served"
                  );
                  const canEarlyPay = hasSentToKitchen && !hasPendingItems;

                  if (canEarlyPay) {
                    return (
                      <button
                        onClick={async () => {
                          setUnfinishedPaymentModal(null);
                          await executeRequestEarlyPaymentFromTable();
                        }}
                        disabled={processingPaymentRequest}
                        className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                      >
                        {processingPaymentRequest ? <Loader2 size={15} className="animate-spin" /> : <Printer size={15} />}
                        💳 Thanh toán sớm (Khách trả tiền trước tất cả món, vẫn tiếp tục ăn / chờ bếp ra món)
                      </button>
                    );
                  } else {
                    return (
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium space-y-1">
                        <p className="font-bold text-amber-900">
                          ⛔ Chưa thể chọn Thanh toán sớm
                        </p>
                        <p>
                          {hasPendingItems
                            ? 'Đơn hàng còn món ở trạng thái "Chờ gửi". Vui lòng bấm Đóng rồi nhấn "Gửi bếp" tất cả món trước khi thanh toán sớm!'
                            : 'Đơn hàng chưa có món nào được gửi xuống bếp. Vui lòng bấm Đóng rồi nhấn "Gửi bếp" trước!'}
                        </p>
                      </div>
                    );
                  }
                })()}

                {/* Lựa chọn 2: Hủy món chưa ra & Thanh toán */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-bold text-gray-700">
                    Hoặc Hủy món chưa ra (nếu khách không muốn chờ nữa):
                  </label>
                  <input
                    type="text"
                    value={unfinishedVoidReason}
                    onChange={(e) => setUnfinishedVoidReason(e.target.value)}
                    placeholder="Lý do hủy: Khách không muốn chờ món nữa..."
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-rose-500/20"
                  />
                  <button
                    onClick={handleVoidUnfinishedAndRequestPaymentFromTable}
                    disabled={processingPaymentRequest}
                    className="w-full py-2.5 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm mt-1"
                  >
                    {processingPaymentRequest ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                    🚫 Hủy các món chưa ra & Yêu cầu thanh toán các món đã ra
                  </button>
                </div>

                {/* Lựa chọn 3: Đóng / Hủy thao tác */}
                <button
                  onClick={() => setUnfinishedPaymentModal(null)}
                  disabled={processingPaymentRequest}
                  className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-xs hover:bg-gray-200 transition-colors cursor-pointer mt-1"
                >
                  Đóng / Tiếp tục chờ bếp phục vụ xong
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
