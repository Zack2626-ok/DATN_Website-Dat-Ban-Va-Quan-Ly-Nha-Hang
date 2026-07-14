import React, { useState, useMemo, useEffect, useCallback } from "react";
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
  Users,
  Clock,
  Wrench,
  CheckCircle,
  Phone,
  UserCheck,
} from "lucide-react";
import { useAppSelector } from "../../../store/hooks";
import OpenTableModal from "../../../components/tables/OpenTableModal";
import { TableArea } from "../../../interfaces/table.interface";
import { toast } from "react-hot-toast";
import { TransferTableModal } from "./TransferTableModal";
import { MergeTableModal } from "./MergeTableModal";
import { SplitTableModal } from "./SplitTableModal";
import {
  getTableAreas,
  getTablesV1,
  updateTableStatus,
  createResmanagerTable,
  deleteResmanagerTable,
  type ResmanagerTable,
} from "../../../services/tableService";
import {
  getOrdersByTable,
  getOrderItems,
  createOrder,
  addOrderItem,
  voidOrderItem,
  getWaiterMenuItems,
  type WaiterOrderItem,
} from "../../../services/waiterService";
import { AddTableModal } from "./AddTableModal";
import { AddDishModal } from "./AddDishModal";
import { ProvisionalBillModal } from "./ProvisionalBillModal";

type TableAction = "transfer" | "merge" | "split" | null;

interface ActiveOrderInfo {
  id: number;
  items: WaiterOrderItem[];
  totalAmount: number;
  status: string;
}

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
  maintenance: {
    label: "Bảo trì",
    bg: "bg-purple-50",
    text: "text-purple-700",
    border: "border-purple-300",
    dot: "bg-purple-500",
  },
};

const ITEM_STATUS_LABELS: Record<string, { label: string; badge: string }> = {
  pending: { label: "⏳ Chờ gửi", badge: "bg-gray-100 text-gray-700" },
  cooking: { label: "🔥 Đang nấu", badge: "bg-orange-100 text-orange-700" },
  done: { label: "✅ Hoàn thành", badge: "bg-green-100 text-green-700" },
  served: { label: "🛎 Đã mang ra", badge: "bg-blue-100 text-blue-700" },
  voided: { label: "✗ Đã hủy", badge: "bg-red-100 text-red-600 line-through" },
  cancelled: { label: "✗ Đã hủy", badge: "bg-red-100 text-red-600 line-through" },
};

export const WaiterTableMap: React.FC = () => {
  const [tables, setTables] = useState<ResmanagerTable[]>([]);
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Layout 2 cột: bàn đang được chọn bên phải
  const [selectedTableId, setSelectedTableId] = useState<number | string | null>(null);

  // Modals
  const [isOpenTableModalOpen, setIsOpenTableModalOpen] = useState(false);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [isAddDishOpen, setIsAddDishOpen] = useState(false);
  const [isPrintBillOpen, setIsPrintBillOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<TableAction>(null);

  // Active Order integrated management
  const [activeOrder, setActiveOrder] = useState<ActiveOrderInfo | null>(null);
  const [loadingOrder, setLoadingOrder] = useState(false);

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

  // Load integrated Order khi chọn bàn phục vụ / đặt trước / chờ thanh toán
  const loadActiveOrder = useCallback(async (tableId: number | string) => {
    const t = tables.find((item) => item.id.toString() === tableId.toString());
    if (!t || (t.status !== "serving" && t.status !== "pending_payment" && t.status !== "reserved")) {
      setActiveOrder(null);
      return;
    }
    setLoadingOrder(true);
    try {
      const orders = await getOrdersByTable(Number(tableId));
      if (orders.length === 0) {
        setActiveOrder(null);
        return;
      }
      const latestOrder = orders[0];
      const items = await getOrderItems(latestOrder.id);
      const validItems = items.filter((i) => i.status !== "voided" && i.status !== "cancelled");
      const total = validItems.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0);
      setActiveOrder({
        id: latestOrder.id,
        items,
        totalAmount: total,
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
      loadActiveOrder(selectedTableId);
    } catch (err) {
      toast.error("Không thể mở bàn. Vui lòng thử lại.");
      console.error(err);
    }
  };

  // Thêm bàn nhanh
  const handleAddTableConfirm = async (data: { name: string; capacity: number; area_id: number }) => {
    try {
      await createResmanagerTable({
        ...data,
        row_pos: "A",
        col_pos: 1,
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
      const userId = getCurrentUserId();
      const newOrder = await createOrder({
        table_id: Number(selectedTableId),
        created_by: userId,
        order_type: "dine_in",
      });
      orderId = newOrder.id;
    }
    await addOrderItem(orderId, {
      menu_item_id: item.id,
      quantity,
      unit_price: item.price,
      kitchen_note: note,
    });
    toast.success(`✅ Đã thêm ${quantity} x ${item.name}`);
    setIsAddDishOpen(false);
    loadActiveOrder(selectedTableId);
  };

  // Xóa món khỏi order
  const handleVoidItem = async (item: WaiterOrderItem) => {
    if (!activeOrder) return;
    const itemDisplayName = item.item_name || (item as any).menu_item_name || "(không xác định)";
    if (!window.confirm(`Xác nhận xóa món "${itemDisplayName}" khỏi đơn hàng?`)) return;
    try {
      await voidOrderItem(activeOrder.id, item.id, "Khách yêu cầu hủy");
      toast.success(`Đã xóa món ${item.item_name}`);
      loadActiveOrder(selectedTableId!);
    } catch {
      toast.error("Không thể xóa món ăn này");
    }
  };

  const handleStatusChange = async (newStatus: "empty" | "serving" | "pending_payment" | "maintenance") => {
    if (!selectedTableId) return;
    try {
      await updateTableStatus(Number(selectedTableId), newStatus);
      toast.success("Đã cập nhật trạng thái bàn");
      fetchData();
    } catch {
      toast.error("Không thể thay đổi trạng thái");
    }
  };

  const userInfo = getCurrentUserInfo();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tiêu đề trang & Thanh thao tác */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 font-display flex items-center gap-2.5">
            <LayoutGrid className="text-[#FF5A5F]" />
            Sơ đồ bàn & Phục vụ nhanh
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Giao diện Phục vụ: Chọn bàn trên lưới để thao tác mở bàn, gọi món trực tiếp và in phiếu tạm tính.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAddTableOpen(true)}
            className="flex items-center gap-2 rounded-xl bg-[#FF5A5F] px-4 py-2.5 text-xs font-bold text-white hover:bg-[#e0484d] transition-all shadow-md cursor-pointer"
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
            className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Chú thích trạng thái */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-3.5 rounded-xl border border-gray-200 text-xs shadow-xs">
        <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mr-1">Trạng thái:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={`h-3 w-3 rounded-full ${cfg.dot}`} />
            <span className="font-semibold text-gray-700">{cfg.label}</span>
          </div>
        ))}
      </div>

      {/* Tabs Chuyển đổi Khu Vực */}
      <div className="border-b border-gray-200 pb-px">
        <div className="flex gap-2 overflow-x-auto">
          {areas.map((area) => {
            const isActive = selectedAreaId === area.id;
            return (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-t border-x cursor-pointer whitespace-nowrap ${
                  isActive
                    ? "bg-white border-gray-200 text-[#FF5A5F] border-b-white z-10"
                    : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
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
          <div className="bg-white rounded-2xl border border-gray-200 shadow-xs p-5 min-h-[460px]">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <div className="w-9 h-9 border-3 border-[#FF5A5F] border-t-transparent rounded-full animate-spin" />
                <p className="text-xs text-gray-400 font-semibold">Đang tải sơ đồ bàn...</p>
              </div>
            ) : filteredTables.length === 0 ? (
              <div className="text-center py-20 text-gray-400 text-sm">
                Chưa có bàn nào trong khu vực này. Nhấn &ldquo;Thêm bàn ăn&rdquo; để tạo bàn.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3.5">
                {filteredTables.map((t) => {
                  const cfg = STATUS_CONFIG[t.status] || STATUS_CONFIG.empty;
                  const isSelected = selectedTableId?.toString() === t.id.toString();

                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTableId(t.id)}
                      className={`relative flex flex-col justify-between rounded-2xl border-2 p-3.5 transition-all cursor-pointer select-none min-h-[120px] ${
                        isSelected
                          ? "border-[#FF5A5F] ring-4 ring-[#FF5A5F]/15 shadow-md scale-[1.01]"
                          : `${cfg.border} ${cfg.bg} hover:shadow-md`
                      }`}
                    >
                      {/* Top Header Card */}
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className="text-base font-black text-gray-800 leading-none">{t.name}</p>
                          <p className="text-[11px] text-gray-500 mt-1 flex items-center gap-1">
                            <Users size={12} /> {t.capacity} chỗ
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${cfg.text} bg-white/80 shadow-2xs`}
                        >
                          {cfg.label}
                        </span>
                      </div>

                      {/* Customer Info inside Card */}
                      {(t.status === "serving" || t.status === "reserved" || t.status === "pending_payment") && (
                        <div className="mt-3 border-t border-gray-200/60 pt-2 text-[11px] text-gray-700 space-y-0.5">
                          {t.guest_name && (
                            <p className="font-bold text-gray-900 truncate">Khách: {t.guest_name}</p>
                          )}
                          <p className="text-gray-500 truncate flex items-center gap-1">
                            <Phone size={10} />
                            {t.guest_phone || <span className="italic text-gray-400">Không ghi</span>}
                          </p>
                          {t.start_time && (
                            <p className="text-gray-500 flex items-center gap-1">
                              <Clock size={11} /> Đến: {t.start_time}
                            </p>
                          )}
                        </div>
                      )}

                      {t.status === "maintenance" && (
                        <div className="mt-3 border-t border-purple-200 pt-2 text-[11px] font-bold text-purple-700 flex items-center gap-1">
                          <Wrench size={13} /> Bảo trì thiết bị
                        </div>
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
            <div className="bg-white rounded-2xl border border-gray-200 shadow-md overflow-hidden animate-fade-in">
              {/* Panel Header */}
              <div className="border-b border-gray-100 bg-gray-50 px-5 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-gray-900">Bàn {selectedTable.name}</h3>
                  <p className="text-xs text-gray-500">
                    Khu vực: {selectedTable.area_name} • Sức chứa: {selectedTable.capacity} khách
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <span
                    className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                      (STATUS_CONFIG[selectedTable.status] || STATUS_CONFIG.empty).text
                    } bg-white border border-gray-200 shadow-2xs`}
                  >
                    {(STATUS_CONFIG[selectedTable.status] || STATUS_CONFIG.empty).label}
                  </span>
                  <button
                    onClick={() => handleDeleteTable(selectedTable)}
                    title="Xóa bàn"
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Status control buttons */}
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
                      onClick={() => handleStatusChange("maintenance")}
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

                {/* Khách hàng & Cảnh báo vượt sức chứa */}
                {(selectedTable.status === "serving" ||
                  selectedTable.status === "pending_payment" ||
                  selectedTable.status === "reserved") && (
                  <>
                    {/* Customer details card */}
                    <div className="rounded-xl bg-gray-50 p-3.5 border border-gray-200 text-xs space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Khách hàng:</span>
                        <span className="font-bold text-gray-900">
                          {selectedTable.guest_name || "Khách tại bàn"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 flex items-center gap-1"><Phone size={11} /> SĐT:</span>
                        <span className="font-medium text-gray-800">
                          {selectedTable.guest_phone || <span className="italic text-gray-400">Không ghi</span>}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Thời gian đến / đặt:</span>
                        <span className="font-semibold text-gray-800">
                          {selectedTable.start_time || "Vừa đến"}
                        </span>
                      </div>
                    </div>

                    {/* NÚT KHÁCH ĐÃ ĐẾN — chỉ hiện khi bàn là reserved */}
                    {selectedTable.status === "reserved" && (
                      <button
                        onClick={async () => {
                          try {
                            await handleStatusChange("serving");
                            toast.success(`✅ Khách đã đến — Bàn ${selectedTable.name} đang phục vụ`);
                          } catch {
                            toast.error("Không thể cập nhật trạng thái");
                          }
                        }}
                        className="w-full rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
                      >
                        <UserCheck size={15} /> Khách đã đến — Bắt đầu phục vụ
                      </button>
                    )}

                    {/* CẢNH BÁO PHÁT SINH NGƯỜI */}
                    {selectedTable.guest_count && selectedTable.guest_count > selectedTable.capacity && (
                      <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900 space-y-2">
                        <div className="flex items-start gap-2">
                          <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-amber-800">
                              Bàn phát sinh thêm người ({selectedTable.guest_count}/{selectedTable.capacity} khách)
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
                        </div>
                      </div>
                    )}

                    {/* DANH SÁCH MÓN ĐÃ GỌI (TÍCH HỢP GỌI MÓN) */}
                    <div className="border-t border-gray-100 pt-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Utensils size={15} className="text-[#FF5A5F]" />
                          <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wide">
                            Món ăn đã gọi
                          </h4>
                        </div>
                        <button
                          onClick={() => setIsAddDishOpen(true)}
                          className="flex items-center gap-1 rounded-lg bg-[#FF5A5F] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#e0484d] transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus size={13} /> Thêm món
                        </button>
                      </div>

                      {loadingOrder ? (
                        <div className="py-8 text-center text-xs text-gray-400">
                          Đang tải danh sách món...
                        </div>
                      ) : !activeOrder || activeOrder.items.length === 0 ? (
                        <div className="rounded-xl border border-dashed border-gray-200 py-8 text-center text-xs text-gray-400">
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
                                  className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 bg-gray-50/50 text-xs"
                                >
                                  <div className="min-w-0 flex-1 pr-2">
                                    <p className="font-bold text-gray-800 truncate">{item.item_name}</p>
                                    <p className="text-[11px] text-gray-500">
                                      {item.quantity} x {Number(item.unit_price).toLocaleString()}đ
                                    </p>
                                    {item.kitchen_note && (
                                      <p className="text-[10px] text-amber-600 italic">
                                        📝 {item.kitchen_note}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                                    <span
                                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${st.badge}`}
                                    >
                                      {st.label}
                                    </span>
                                    <button
                                      onClick={() => handleVoidItem(item)}
                                      className="text-[10px] text-rose-500 hover:text-rose-700 underline font-semibold cursor-pointer"
                                    >
                                      Xóa món
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      )}

                      {/* TỔNG TIỀN VÀ IN PHIẾU TẠM TÍNH — chỉ hiển thị khi có món */}
                      {activeOrder && activeOrder.items.filter(i => i.status !== "voided" && i.status !== "cancelled").length > 0 && (
                        <div className="rounded-xl bg-gray-900 p-3.5 text-white flex items-center justify-between mt-3">
                          <div>
                            <p className="text-[10px] text-gray-400 uppercase font-bold">Tạm tính order:</p>
                            <p className="text-base font-black text-[#FF5A5F]">
                              {(activeOrder?.totalAmount || 0).toLocaleString("vi-VN")} đ
                            </p>
                          </div>
                          <button
                            onClick={() => setIsPrintBillOpen(true)}
                            className="flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-bold text-gray-900 hover:bg-gray-100 transition-colors cursor-pointer shadow-md"
                          >
                            <Printer size={14} /> In phiếu tạm tính
                          </button>
                        </div>
                      )}

                      {/* Nút thao tác chuyển/gộp */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => setActiveAction("transfer")}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <ArrowRightLeft size={13} /> Chuyển bàn
                        </button>
                        <button
                          onClick={() => setActiveAction("merge")}
                          className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <GitMerge size={13} /> Gộp bàn
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                <Utensils size={22} />
              </div>
              <div>
                <h4 className="font-bold text-gray-800 text-sm">Chưa chọn bàn nào</h4>
                <p className="text-xs text-gray-400 mt-1">
                  Chọn một bàn bên trái để xem chi tiết, mở bàn, gọi món trực tiếp hoặc in phiếu tạm tính.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hướng dẫn cho Phục vụ */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={16} className="text-gray-400 mt-0.5 shrink-0" />
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-bold text-gray-700">Quy trình nghiệp vụ Phục vụ:</p>
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
        table={selectedTable as any}
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
        sourceTable={selectedTable as any}
        availableTables={tables as any}
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
        sourceTable={selectedTable as any}
        availableTables={tables as any}
        onConfirm={async () => {
          await fetchData();
          setActiveAction(null);
        }}
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
    </div>
  );
};
