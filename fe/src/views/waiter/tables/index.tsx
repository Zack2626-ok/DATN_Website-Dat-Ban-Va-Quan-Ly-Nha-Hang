import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../../components/Badge";
import {
  Utensils,
  Clock,
  Grid,
  RefreshCw,
  Loader2,
  User,
  Phone,
  Link2,
  Split,
  ArrowRightLeft,
  Merge,
  CheckCircle,
  ShoppingBag,
} from "lucide-react";
import AreaSelector from "../../../components/tables/AreaSelector";
import StatusLegend from "../../../components/tables/StatusLegend";
import OpenTableModal from "../../../components/tables/OpenTableModal";
import { Table, TableArea } from "../../../interfaces/table.interface";
import { toast } from "react-hot-toast";
import { TransferTableModal } from "./TransferTableModal";
import { MergeTableModal } from "./MergeTableModal";
import { SplitTableModal } from "./SplitTableModal";
import { getTableAreas, getTablesV1, updateTableStatus } from "../../../services/tableService";
import { getOrdersByTable, getOrderItems, createOrder } from "../../../services/waiterService";

type TableAction = "transfer" | "merge" | "split" | null;

interface ActiveOrderInfo {
  id: number;
  items: { id: number; name: string; quantity: number; price: number }[];
  totalAmount: number;
  status: string;
}

// Lấy user_id từ localStorage (JWT payload)
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

export const WaiterTableMap: React.FC = () => {
  const navigate = useNavigate();
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);
  const [selectedTableId, setSelectedTableId] = useState<string | number | null>(null);
  const [isOpenTableModalOpen, setIsOpenTableModalOpen] = useState(false);
  const [activeAction, setActiveAction] = useState<TableAction>(null);

  // Data từ API
  const [tables, setTables] = useState<Table[]>([]);
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [activeOrder, setActiveOrder] = useState<ActiveOrderInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingOrder, setLoadingOrder] = useState(false);

  // Tải areas và tables từ DB (kèm extra info: guest, merge, split)
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [areasData, tablesData] = await Promise.all([
        getTableAreas(),
        getTablesV1(), // Bây giờ trả về getResmanagerTablesWithExtra
      ]);
      setAreas(areasData);
      // Chuyển đổi format: giữ lại tất cả extra fields
      const mapped = tablesData.map((t: any) => ({
        id: t.id,
        area_id: t.area_id,
        area_name: t.area_name,
        name: t.name,
        capacity: t.capacity,
        row_pos: t.row_pos,
        col_pos: t.col_pos,
        status: t.status,
        // Extra fields
        guest_name: t.guest_name,
        guest_phone: t.guest_phone,
        is_merged_primary: t.is_merged_primary,
        merged_tables: t.merged_tables,
        is_merged_child: t.is_merged_child,
        merged_into: t.merged_into,
        is_split: t.is_split,
        split_labels: t.split_labels,
      }));
      setTables(mapped as Table[]);
      if (areasData.length > 0 && !selectedAreaId) {
        setSelectedAreaId(areasData[0].id);
      }
    } catch (err) {
      toast.error("Không thể tải dữ liệu bàn");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Tải active order khi chọn bàn đang phục vụ
  useEffect(() => {
    const selectedTable = tables.find((t) => t.id.toString() === selectedTableId?.toString());
    if (!selectedTable || (selectedTable.status !== "serving" && selectedTable.status !== "pending_payment")) {
      setActiveOrder(null);
      return;
    }
    setLoadingOrder(true);
    getOrdersByTable(Number(selectedTableId))
      .then(async (orders) => {
        if (orders.length === 0) { setActiveOrder(null); return; }
        const latestOrder = orders[0];
        const items = await getOrderItems(latestOrder.id);
        const activeItems = items.filter((i) => i.status !== "voided");
        const total = activeItems.reduce((sum, i) => sum + Number(i.unit_price) * i.quantity, 0);
        setActiveOrder({
          id: latestOrder.id,
          items: activeItems.map((i) => ({
            id: i.id,
            name: i.item_name,
            quantity: i.quantity,
            price: Number(i.unit_price),
          })),
          totalAmount: total,
          status: selectedTable.status,
        });
      })
      .catch(() => setActiveOrder(null))
      .finally(() => setLoadingOrder(false));
  }, [selectedTableId, tables]);

  const filteredTables = useMemo(() => {
    return selectedAreaId ? tables.filter((t) => t.area_id === selectedAreaId) : tables;
  }, [selectedAreaId, tables]);

  const selectedTable = useMemo(
    () => tables.find((t) => t.id.toString() === selectedTableId?.toString()) || null,
    [tables, selectedTableId],
  );

  const handleOpenTable = async (data: { guestCount: number; customerName: string; customerPhone: string }) => {
    if (!selectedTableId || !selectedTable) return;
    try {
      const userId = getCurrentUserId();
      await createOrder({
        table_id: Number(selectedTableId),
        created_by: userId,
        order_type: "dine_in",
        guest_name: data.customerName,
        guest_phone: data.customerPhone,
        guest_count: data.guestCount,
      });
      // updateTableStatus được gọi trong BE khi createOrder, nhưng cũng update local state
      setTables((prev) =>
        prev.map((t) =>
          t.id.toString() === selectedTableId.toString()
            ? { ...t, status: "serving" as const, guest_name: data.customerName, guest_phone: data.customerPhone } as any
            : t,
        ),
      );
      toast.success(`✅ Đã mở bàn ${selectedTable?.name} cho ${data.guestCount} khách`);
      setIsOpenTableModalOpen(false);
    } catch (err) {
      toast.error("Không thể mở bàn. Vui lòng thử lại.");
      console.error(err);
    }
  };

  const handleTransfer = async (_sourceId: string | number, targetId: string | number) => {
    // API đã gọi xong trong modal, chỉ cần reload
    await fetchData();
    setSelectedTableId(targetId);
  };

  const handleMerge = async () => {
    await fetchData();
  };

  const handleSplit = async () => {
    await fetchData();
  };

  const handleRequestPayment = async () => {
    if (!selectedTableId) return;
    try {
      await updateTableStatus(Number(selectedTableId), "pending_payment");
      await fetchData();
      toast.success("Đã gửi yêu cầu thanh toán — thu ngân sẽ xử lý");
    } catch {
      toast.error("Không thể gửi yêu cầu thanh toán");
    }
  };

  const goToOrder = () => {
    if (selectedTable) navigate(`/waiter/orders/${selectedTable.id}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={32} className="animate-spin text-blue-500" />
        <span className="ml-3 text-gray-500 font-medium">Đang tải dữ liệu bàn...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in">
      {/* ── Left: Sơ đồ bàn ── */}
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800 font-display">Sơ đồ trạng thái bàn</h3>
            <p className="text-sm text-gray-500 mt-1">Quản lý khu vực và trạng thái phục vụ thời gian thực</p>
          </div>
          <button onClick={fetchData} className="p-2 hover:bg-gray-100 rounded-full transition-colors" title="Làm mới">
            <RefreshCw size={20} className="text-gray-400" />
          </button>
        </div>

        <AreaSelector areas={areas} selectedAreaId={selectedAreaId} onSelectArea={setSelectedAreaId} />

        <div className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100 min-h-[500px] shadow-inner">
          {filteredTables.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p className="text-sm">Không có bàn trong khu vực này</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {filteredTables.map((table) => {
                const tableExt = table as any;
                const isSelected = selectedTableId?.toString() === table.id.toString();

                const statusStyles = {
                  empty:           "bg-green-50  border-green-200  text-green-700  hover:bg-green-100",
                  reserved:        "bg-amber-50  border-amber-200  text-amber-700  hover:bg-amber-100",
                  serving:         "bg-blue-50   border-blue-200   text-blue-700   hover:bg-blue-100",
                  pending_payment: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
                };

                const labels = {
                  empty: "Trống",
                  reserved: "Đã đặt",
                  serving: "Đang dùng",
                  pending_payment: "Chờ TT",
                };

                // Merge/Split badge
                const isMergedPrimary = tableExt.is_merged_primary;
                const isMergedChild = tableExt.is_merged_child;
                const isSplit = tableExt.is_split;

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTableId(table.id)}
                    className={`relative p-4 border-2 rounded-2xl flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-all duration-200 ${
                      statusStyles[table.status as keyof typeof statusStyles] || statusStyles.empty
                    } ${
                      isSelected
                        ? "ring-4 ring-blue-500/20 border-blue-500 scale-105 shadow-lg"
                        : "shadow-sm border-dashed"
                    }`}
                  >
                    {/* Merge/Split badge — top-left */}
                    {(isMergedPrimary || isMergedChild || isSplit) && (
                      <div className="absolute -top-2 -left-2 flex gap-0.5">
                        {isMergedPrimary && (
                          <span className="bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                            <Link2 size={8} /> GỘP
                          </span>
                        )}
                        {isMergedChild && (
                          <span className="bg-indigo-400 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                            <Merge size={8} /> BỊ GỘP
                          </span>
                        )}
                        {isSplit && (
                          <span className="bg-violet-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
                            <Split size={8} /> TÁCH
                          </span>
                        )}
                      </div>
                    )}

                    {/* Table name */}
                    <span className="text-lg font-black mt-1">{table.name}</span>

                    {/* Capacity + Status */}
                    <span className="text-xs font-bold uppercase tracking-tighter opacity-70">
                      {table.capacity} Chỗ • {labels[table.status as keyof typeof labels]}
                    </span>

                    {/* Guest info — hiển thị khi bàn đang phục vụ, reserved hoặc chờ TT */}
                    {(table.status === "serving" || table.status === "pending_payment" || table.status === "reserved") &&
                      tableExt.guest_name && (
                      <div className="w-full mt-1 space-y-0.5">
                        <div className="flex items-center gap-1 text-xs font-bold opacity-80">
                          <User size={10} />
                          <span className="truncate max-w-[90px]">{tableExt.guest_name}</span>
                        </div>
                        {tableExt.guest_phone && (
                          <div className="flex items-center gap-1 text-xs opacity-70">
                            <Phone size={10} />
                            <span>{tableExt.guest_phone}</span>
                          </div>
                        )}
                        {table.status === "reserved" && tableExt.booking_start_time && (
                          <div className="text-[11px] font-semibold text-amber-700 opacity-80">
                            📅 {new Date(tableExt.booking_start_time).toLocaleString("vi-VN", {
                              day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
                            })}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Merged with info */}
                    {isMergedPrimary && tableExt.merged_tables?.length > 0 && (
                      <div className="text-[8px] font-bold opacity-60 text-center">
                        + {tableExt.merged_tables.map((m: any) => m.name).join(", ")}
                      </div>
                    )}
                    {isMergedChild && tableExt.merged_into && (
                      <div className="text-[8px] font-bold opacity-60 text-center">
                        → {tableExt.merged_into.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Legend: thêm merge/split */}
        <div className="flex flex-wrap gap-3 items-center text-xs text-gray-500">
          <StatusLegend />
          <span className="w-px h-4 bg-gray-200" />
          <span className="flex items-center gap-1 bg-indigo-50 text-indigo-600 px-2 py-1 rounded-lg font-bold">
            <Link2 size={10} /> Gộp bàn
          </span>
          <span className="flex items-center gap-1 bg-violet-50 text-violet-600 px-2 py-1 rounded-lg font-bold">
            <Split size={10} /> Tách bàn
          </span>
        </div>
      </div>

      {/* ── Right: Chi tiết bàn ── */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 sticky top-6">
          {selectedTable ? (
            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
              {/* Header */}
              <div className="flex justify-between items-start pb-4 border-b border-gray-50">
                <div>
                  <h4 className="text-2xl font-black text-gray-800">{selectedTable.name}</h4>
                  <p className="text-sm text-gray-400 font-medium">Sức chứa: {selectedTable.capacity} khách</p>
                  {(selectedTable as any).area_name && (
                    <p className="text-xs text-blue-400 font-medium">{(selectedTable as any).area_name}</p>
                  )}
                  {/* Merge/Split status */}
                  {(selectedTable as any).is_merged_primary && (
                    <p className="text-xs font-bold text-indigo-600 mt-1">
                      🔗 Đang gộp với: {((selectedTable as any).merged_tables || []).map((m: any) => m.name).join(", ")}
                    </p>
                  )}
                  {(selectedTable as any).is_merged_child && (selectedTable as any).merged_into && (
                    <p className="text-[10px] font-bold text-indigo-400 mt-1">
                      → Gộp vào: {(selectedTable as any).merged_into.name}
                    </p>
                  )}
                  {(selectedTable as any).is_split && (
                    <p className="text-[10px] font-bold text-violet-600 mt-1">
                      ✂ Đã tách bàn: {((selectedTable as any).split_labels || []).join(", ")}
                    </p>
                  )}
                </div>
                <Badge status={selectedTable.status} type="table" />
              </div>

              {/* Guest info (nếu có) */}
              {((selectedTable as any).guest_name) && (
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 space-y-1.5">
                  <p className="text-[10px] font-black text-blue-500 uppercase tracking-wider">Thông tin khách</p>
                  <div className="flex items-center gap-2 text-sm">
                    <User size={14} className="text-blue-400 shrink-0" />
                    <span className="font-bold text-gray-800">{(selectedTable as any).guest_name}</span>
                  </div>
                  {(selectedTable as any).guest_phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone size={14} className="text-blue-400 shrink-0" />
                      <span className="font-medium text-gray-600">{(selectedTable as any).guest_phone}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── EMPTY ── */}
              {selectedTable.status === "empty" && (
                <div className="py-6 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                    <Utensils size={32} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-800">Sẵn sàng phục vụ</h5>
                    <p className="text-xs text-gray-500 px-4 mt-1">Mở bàn mới để bắt đầu gọi món cho khách</p>
                  </div>
                  <div className="w-full space-y-3 mt-2">
                    <button
                      onClick={() => setIsOpenTableModalOpen(true)}
                      className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 uppercase tracking-wider"
                    >
                      BẮT ĐẦU PHỤC VỤ (MỞ BÀN)
                    </button>
                    <button
                      onClick={() => navigate("/waiter/bookings")}
                      className="w-full py-3 border-2 border-gray-100 text-gray-400 rounded-2xl font-bold text-xs hover:bg-gray-50 uppercase"
                    >
                      ĐẶT TRƯỚC BÀN
                    </button>
                  </div>
                </div>
              )}

              {/* ── SERVING ── */}
              {selectedTable.status === "serving" && (
                <div className="flex flex-col gap-4">
                  <h5 className="text-xs font-black text-blue-600 uppercase tracking-widest">Hóa đơn hiện tại</h5>
                  {loadingOrder ? (
                    <div className="flex justify-center py-6">
                      <Loader2 size={20} className="animate-spin text-blue-400" />
                    </div>
                  ) : activeOrder && activeOrder.items.length > 0 ? (
                    <>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {activeOrder.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl border border-gray-100"
                          >
                            <span className="text-sm font-bold text-gray-700">
                              {item.name}
                              <span className="text-gray-400 ml-1 font-normal">×{item.quantity}</span>
                            </span>
                            <span className="text-sm font-black text-gray-800 shrink-0">
                              {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-dashed flex justify-between items-end">
                        <span className="text-sm font-bold text-gray-400">Tổng cộng</span>
                        <span className="text-2xl font-black text-gray-800">
                          {activeOrder.totalAmount.toLocaleString("vi-VN")}₫
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Chưa có món nào</p>
                  )}

                  {/* Actions */}
                  <div className="grid grid-cols-3 gap-2 mt-1">
                    <button
                      onClick={() => setActiveAction("transfer")}
                      className="py-3 border-2 border-gray-100 rounded-xl font-bold text-xs hover:bg-blue-50 hover:border-blue-200 hover:text-blue-600 transition-all flex flex-col items-center gap-1"
                    >
                      <ArrowRightLeft size={14} />
                      Chuyển
                    </button>
                    <button
                      onClick={() => setActiveAction("merge")}
                      className="py-3 border-2 border-gray-100 rounded-xl font-bold text-xs hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex flex-col items-center gap-1"
                    >
                      <Merge size={14} />
                      Gộp bàn
                    </button>
                    <button
                      onClick={() => setActiveAction("split")}
                      className="py-3 border-2 border-gray-100 rounded-xl font-bold text-xs hover:bg-violet-50 hover:border-violet-200 hover:text-violet-600 transition-all flex flex-col items-center gap-1"
                    >
                      <Split size={14} />
                      Tách
                    </button>
                  </div>
                  <button
                    onClick={goToOrder}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 flex items-center justify-center gap-2"
                  >
                    <ShoppingBag size={16} />
                    GỌI THÊM MÓN
                  </button>
                  <button
                    onClick={handleRequestPayment}
                    className="w-full py-3 border-2 border-purple-200 text-purple-700 rounded-2xl font-bold text-sm hover:bg-purple-50 transition-all"
                  >
                    YÊU CẦU THANH TOÁN (Thu ngân xử lý)
                  </button>
                </div>
              )}

              {/* ── RESERVED ── */}
              {selectedTable.status === "reserved" && (
                <div className="py-4 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                    <Clock size={32} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-800">Bàn đã đặt trước</h5>
                    {(selectedTable as any).guest_name && (
                      <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-left space-y-1.5 w-full">
                        <p className="text-xs font-bold text-amber-700 uppercase">Khách đặt</p>
                        <p className="text-sm font-black text-gray-800">{(selectedTable as any).guest_name}</p>
                        {(selectedTable as any).guest_phone && (
                          <p className="text-sm text-gray-600">📞 {(selectedTable as any).guest_phone}</p>
                        )}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        const userId = getCurrentUserId();
                        await createOrder({
                          table_id: Number(selectedTableId),
                          created_by: userId,
                          order_type: "dine_in",
                          guest_name: (selectedTable as any).guest_name || "",
                          guest_phone: (selectedTable as any).guest_phone || "",
                        });
                        await fetchData();
                        toast.success(`✅ Check-in thành công bàn ${selectedTable.name}`);
                      } catch {
                        toast.error("Không thể check-in");
                      }
                    }}
                    className="w-full mt-2 py-4 bg-amber-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={16} />
                    XÁC NHẬN CHECK-IN
                  </button>
                </div>
              )}

              {/* ── PENDING PAYMENT ── */}
              {selectedTable.status === "pending_payment" && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <h5 className="text-xs font-black text-purple-600 uppercase tracking-widest">Chờ thanh toán</h5>
                    <span className="animate-pulse w-2 h-2 bg-purple-400 rounded-full" />
                  </div>
                  {loadingOrder ? (
                    <div className="flex justify-center py-6">
                      <Loader2 size={20} className="animate-spin text-purple-400" />
                    </div>
                  ) : activeOrder && activeOrder.items.length > 0 ? (
                    <>
                      {/* Itemized list — giống phần serving */}
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {activeOrder.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center p-2.5 bg-gray-50 rounded-xl border border-gray-100"
                          >
                            <span className="text-sm font-bold text-gray-700">
                              {item.name}
                              <span className="text-gray-400 ml-1 font-normal">×{item.quantity}</span>
                            </span>
                            <span className="text-sm font-black text-gray-800 shrink-0">
                              {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-3 border-t border-dashed flex justify-between items-end">
                        <span className="text-sm font-bold text-gray-400">Tổng cộng</span>
                        <span className="text-2xl font-black text-purple-700">
                          {activeOrder.totalAmount.toLocaleString("vi-VN")}₫
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Chưa có món nào</p>
                  )}

                  <button
                    onClick={goToOrder}
                    className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-sm hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                  >
                    <ShoppingBag size={16} />
                    XEM ORDER
                  </button>
                  <p className="text-xs text-center text-gray-400 px-2">
                    Thanh toán do thu ngân thực hiện tại quầy POS
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="py-20 flex flex-col items-center text-center gap-4 text-gray-300">
              <Grid size={64} strokeWidth={1} />
              <p className="text-sm font-bold px-10">Vui lòng chọn bàn trên sơ đồ để xem thông tin</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Modals ── */}
      <OpenTableModal
        isOpen={isOpenTableModalOpen}
        onClose={() => setIsOpenTableModalOpen(false)}
        onConfirm={handleOpenTable}
        table={selectedTable}
      />

      <TransferTableModal
        isOpen={activeAction === "transfer"}
        onClose={() => setActiveAction(null)}
        sourceTable={selectedTable}
        availableTables={tables}
        onConfirm={handleTransfer}
        onSuccess={() => { fetchData(); setActiveAction(null); }}
      />

      <MergeTableModal
        isOpen={activeAction === "merge"}
        onClose={() => setActiveAction(null)}
        sourceTable={selectedTable as any}
        availableTables={tables}
        onConfirm={handleMerge}
        onSuccess={() => { fetchData(); setActiveAction(null); }}
      />

      <SplitTableModal
        isOpen={activeAction === "split"}
        onClose={() => setActiveAction(null)}
        tableName={selectedTable?.name || ""}
        sourceTableId={selectedTable ? Number(selectedTable.id) : undefined}
        orderItems={activeOrder?.items.map((item) => ({ ...item, id: item.id.toString() })) || []}
        availableEmptyTables={tables.filter((t) => t.status === "empty")}
        onConfirm={handleSplit}
        onSuccess={() => { fetchData(); setActiveAction(null); }}
      />
    </div>
  );
};
