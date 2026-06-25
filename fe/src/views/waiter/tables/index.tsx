import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import { Badge } from "../../../components/Badge";
import { Utensils, Clock, Grid, RefreshCw, MoreVertical, Loader2 } from "lucide-react";
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
    if (!token) return 4; // fallback waiter id
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

  // Tải areas và tables từ DB
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [areasData, tablesData] = await Promise.all([
        getTableAreas(),
        getTablesV1(),
      ]);
      setAreas(areasData);
      // Chuyển đổi format từ resmanager sang Table interface
      const mapped: Table[] = tablesData.map((t: any) => ({
        id: t.id,
        area_id: t.area_id,
        area_name: t.area_name,
        name: t.name,
        capacity: t.capacity,
        row_pos: t.row_pos,
        col_pos: t.col_pos,
        status: t.status,
      }));
      setTables(mapped);
      // Chọn khu vực đầu tiên mặc định
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
        if (orders.length === 0) {
          setActiveOrder(null);
          return;
        }
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
          status: selectedTable.status === "serving" ? ORDER_STATUS.CONFIRMED : ORDER_STATUS.PENDING_PAYMENT,
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
      });
      await updateTableStatus(Number(selectedTableId), "serving");
      setTables((prev) =>
        prev.map((t) =>
          t.id.toString() === selectedTableId.toString() ? { ...t, status: "serving" } : t,
        ),
      );
      toast.success(`Đã mở bàn ${selectedTable?.name} cho ${data.guestCount} khách`);
      setIsOpenTableModalOpen(false);
    } catch (err) {
      toast.error("Không thể mở bàn. Vui lòng thử lại.");
      console.error(err);
    }
  };

  const handleTransfer = async (sourceId: string | number, targetId: string | number) => {
    try {
      await updateTableStatus(Number(targetId), "serving");
      await updateTableStatus(Number(sourceId), "empty");
      setTables((prev) =>
        prev.map((t) => {
          if (t.id.toString() === sourceId.toString()) return { ...t, status: "empty" as const };
          if (t.id.toString() === targetId.toString()) return { ...t, status: "serving" as const };
          return t;
        }),
      );
      setSelectedTableId(targetId);
      toast.success("Chuyển bàn thành công");
    } catch {
      toast.error("Không thể chuyển bàn");
    }
  };

  const handleMerge = (_primaryId: string | number, mergeIds: (string | number)[]) => {
    setTables((prev) =>
      prev.map((t) =>
        mergeIds.some((id) => id.toString() === t.id.toString()) ? { ...t, status: "empty" as const } : t,
      ),
    );
  };

  const handleSplit = (targetTableId: string | number, _itemIds: string[]) => {
    setTables((prev) =>
      prev.map((t) =>
        t.id.toString() === targetTableId.toString() ? { ...t, status: "serving" as const } : t,
      ),
    );
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
      <div className="lg:col-span-2 flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xl font-bold text-gray-800 font-display">Sơ đồ trạng thái bàn</h3>
            <p className="text-xs text-gray-500 mt-1">
              Quản lý khu vực và trạng thái phục vụ thời gian thực
            </p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            title="Làm mới"
          >
            <RefreshCw size={20} className="text-gray-400" />
          </button>
        </div>

        <AreaSelector
          areas={areas}
          selectedAreaId={selectedAreaId}
          onSelectArea={setSelectedAreaId}
        />

        <div className="bg-gray-50/50 p-8 rounded-3xl border border-gray-100 min-h-[500px] shadow-inner">
          {filteredTables.length === 0 ? (
            <div className="flex items-center justify-center h-64 text-gray-400">
              <p className="text-sm">Không có bàn trong khu vực này</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
              {filteredTables.map((table) => {
                const isSelected = selectedTableId?.toString() === table.id.toString();

                const statusStyles = {
                  empty: "bg-green-50 border-green-200 text-green-700 hover:bg-green-100",
                  reserved: "bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100",
                  serving: "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100",
                  pending_payment: "bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100",
                };

                const labels = {
                  empty: "Trống",
                  reserved: "Đã đặt",
                  serving: "Đang dùng",
                  pending_payment: "Chờ thanh toán",
                };

                return (
                  <div
                    key={table.id}
                    onClick={() => setSelectedTableId(table.id)}
                    className={`relative p-5 border-2 rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all duration-200 ${
                      statusStyles[table.status as keyof typeof statusStyles]
                    } ${
                      isSelected
                        ? "ring-4 ring-blue-500/20 border-blue-500 scale-105 shadow-lg"
                        : "shadow-sm border-dashed"
                    }`}
                  >
                    <div className="absolute top-2 right-2">
                      <MoreVertical size={14} className="opacity-30" />
                    </div>
                    <span className="text-lg font-black">{table.name}</span>
                    <span className="text-[10px] font-bold uppercase tracking-tighter opacity-70">
                      {table.capacity} Chỗ • {labels[table.status as keyof typeof labels]}
                    </span>
                    {table.status === "serving" && activeOrder && isSelected && (
                      <div className="mt-1 px-2 py-0.5 bg-blue-500 text-white text-[9px] font-bold rounded-full">
                        {activeOrder.totalAmount.toLocaleString("vi-VN")}₫
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <StatusLegend />
      </div>

      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 sticky top-6">
          {selectedTable ? (
            <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex justify-between items-start pb-4 border-b border-gray-50">
                <div>
                  <h4 className="text-2xl font-black text-gray-800">{selectedTable.name}</h4>
                  <p className="text-xs text-gray-400 font-medium">Sức chứa: {selectedTable.capacity} khách</p>
                  {(selectedTable as any).area_name && (
                    <p className="text-xs text-blue-400 font-medium">{(selectedTable as any).area_name}</p>
                  )}
                </div>
                <Badge status={selectedTable.status} type="table" />
              </div>

              {selectedTable.status === "empty" && (
                <div className="py-8 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500">
                    <Utensils size={32} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-800">Sẵn sàng phục vụ</h5>
                    <p className="text-xs text-gray-500 px-4 mt-1">
                      Mở bàn mới để bắt đầu gọi món cho khách
                    </p>
                  </div>
                  <div className="w-full space-y-3 mt-4">
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

              {selectedTable.status === "serving" && (
                <div className="flex flex-col gap-5">
                  <h5 className="text-xs font-black text-blue-600 uppercase tracking-widest">Hóa đơn hiện tại</h5>
                  {loadingOrder ? (
                    <div className="flex justify-center py-6">
                      <Loader2 size={20} className="animate-spin text-blue-400" />
                    </div>
                  ) : activeOrder && activeOrder.items.length > 0 ? (
                    <>
                      <div className="space-y-3">
                        {activeOrder.items.map((item) => (
                          <div
                            key={item.id}
                            className="flex justify-between items-center p-3 bg-gray-50 rounded-xl border border-gray-100"
                          >
                            <span className="text-sm font-bold text-gray-700">
                              {item.name}{" "}
                              <span className="text-gray-400 ml-1">x{item.quantity}</span>
                            </span>
                            <span className="text-sm font-black text-gray-800">
                              {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="pt-4 border-t border-dashed flex justify-between items-end">
                        <span className="text-sm font-bold text-gray-400">Tổng cộng</span>
                        <span className="text-2xl font-black text-gray-800">
                          {activeOrder.totalAmount.toLocaleString("vi-VN")}₫
                        </span>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-4">Chưa có món nào</p>
                  )}
                  <div className="grid grid-cols-2 gap-3 mt-2">
                    <button
                      onClick={() => setActiveAction("transfer")}
                      className="py-3 border-2 border-gray-100 rounded-xl font-bold text-xs hover:bg-gray-50"
                    >
                      CHUYỂN BÀN
                    </button>
                    <button
                      onClick={() => setActiveAction("merge")}
                      className="py-3 border-2 border-gray-100 rounded-xl font-bold text-xs hover:bg-gray-50"
                    >
                      GỘP BÀN
                    </button>
                    <button
                      onClick={() => setActiveAction("split")}
                      className="py-3 border-2 border-gray-100 rounded-xl font-bold text-xs hover:bg-gray-50"
                    >
                      TÁCH BÀN
                    </button>
                    <button
                      onClick={goToOrder}
                      className="col-span-2 py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                      GỌI THÊM MÓN
                    </button>
                  </div>
                </div>
              )}

              {selectedTable.status === "reserved" && (
                <div className="py-8 flex flex-col items-center text-center gap-4">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                    <Clock size={32} />
                  </div>
                  <div>
                    <h5 className="font-bold text-gray-800">Bàn đã đặt trước</h5>
                    <div className="mt-3 p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-left space-y-1">
                      <p className="text-[10px] font-bold text-amber-700 uppercase">Trạng thái</p>
                      <p className="text-sm font-black text-gray-800">Đang chờ khách</p>
                    </div>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await updateTableStatus(Number(selectedTableId), "serving");
                        setTables((prev) =>
                          prev.map((t) =>
                            t.id.toString() === selectedTableId?.toString()
                              ? { ...t, status: "serving" }
                              : t,
                          ),
                        );
                        toast.success(`Check-in thành công bàn ${selectedTable.name}`);
                      } catch {
                        toast.error("Không thể check-in");
                      }
                    }}
                    className="w-full mt-4 py-4 bg-amber-500 text-white rounded-2xl font-black text-sm shadow-lg shadow-amber-200 hover:bg-amber-600 transition-all"
                  >
                    XÁC NHẬN CHECK-IN
                  </button>
                </div>
              )}

              {selectedTable.status === "pending_payment" && (
                <div className="flex flex-col gap-5">
                  <h5 className="text-xs font-black text-purple-600 uppercase tracking-widest">Chờ thanh toán</h5>
                  {loadingOrder ? (
                    <div className="flex justify-center py-6">
                      <Loader2 size={20} className="animate-spin text-purple-400" />
                    </div>
                  ) : activeOrder ? (
                    <div className="pt-4 border-t border-dashed flex justify-between items-end">
                      <span className="text-sm font-bold text-gray-400">Tổng cộng</span>
                      <span className="text-2xl font-black text-gray-800">
                        {activeOrder.totalAmount.toLocaleString("vi-VN")}₫
                      </span>
                    </div>
                  ) : null}
                  <button
                    onClick={goToOrder}
                    className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-sm hover:bg-blue-700"
                  >
                    XEM ORDER
                  </button>
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
      />

      <MergeTableModal
        isOpen={activeAction === "merge"}
        onClose={() => setActiveAction(null)}
        sourceTable={selectedTable}
        availableTables={tables}
        onConfirm={handleMerge}
      />

      <SplitTableModal
        isOpen={activeAction === "split"}
        onClose={() => setActiveAction(null)}
        tableName={selectedTable?.name || ""}
        orderItems={activeOrder?.items || []}
        availableEmptyTables={tables.filter((t) => t.status === "empty")}
        onConfirm={handleSplit}
      />
    </div>
  );
};
