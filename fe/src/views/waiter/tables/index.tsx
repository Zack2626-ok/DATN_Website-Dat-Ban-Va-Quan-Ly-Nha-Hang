import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  RefreshCw,
  LayoutGrid,
  Info,
} from "lucide-react";
import OpenTableModal from "../../../components/tables/OpenTableModal";
import { Table, TableArea } from "../../../interfaces/table.interface";
import { toast } from "react-hot-toast";
import { TransferTableModal } from "./TransferTableModal";
import { MergeTableModal } from "./MergeTableModal";
import { SplitTableModal } from "./SplitTableModal";
import { getTableAreas, getTablesV1, updateTableStatus, unmergeTables } from "../../../services/tableService";
import { getOrdersByTable, getOrderItems, createOrder } from "../../../services/waiterService";
import { TableGrid } from "../../manager/TableMap/components/TableGrid";

type TableAction = "transfer" | "merge" | "split" | null;

interface ActiveOrderInfo {
  id: number;
  items: { id: number; name: string; quantity: number; price: number; status: string }[];
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
  const [, setLoadingOrder] = useState(false);

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
            status: selectedTable.status === "pending_payment" ? "served" : i.status,
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

  const handleAction = async (action: string, table: any) => {
    setSelectedTableId(table.id);

    switch (action) {
      case "open":
        setIsOpenTableModalOpen(true);
        break;
      case "reserve":
        try {
          await updateTableStatus(table.id, "reserved");
          toast.success(`Đã đặt trước bàn ${table.name}`);
          fetchData();
        } catch {
          toast.error("Lỗi đặt bàn");
        }
        break;
      case "checkin":
        try {
          await updateTableStatus(table.id, "serving");
          toast.success(`Check-in bàn ${table.name} thành công!`);
          fetchData();
        } catch {
          toast.error("Lỗi check-in");
        }
        break;
      case "cancel_reserve":
        try {
          await updateTableStatus(table.id, "empty");
          toast.success(`Đã hủy đặt trước bàn ${table.name}`);
          fetchData();
        } catch {
          toast.error("Lỗi hủy đặt bàn");
        }
        break;
      case "view_order":
      case "view_invoice":
        navigate(`/waiter/orders/${table.id}`);
        break;
      case "transfer":
        setActiveAction("transfer");
        break;
      case "merge":
        setActiveAction("merge");
        break;
      case "split":
        setActiveAction("split");
        break;
      case "unmerge":
        try {
          await unmergeTables(table.id);
          toast.success(`Đã hủy gộp bàn cho ${table.name}`);
          fetchData();
        } catch {
          toast.error("Lỗi hủy gộp bàn");
        }
        break;
      case "request_payment":
        try {
          await updateTableStatus(table.id, "pending_payment");
          toast.success("Đã gửi yêu cầu thanh toán — thu ngân sẽ xử lý");
          fetchData();
        } catch {
          toast.error("Không thể gửi yêu cầu thanh toán");
        }
        break;
      default:
        break;
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Tiêu đề trang */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 font-display flex items-center gap-2">
            <LayoutGrid className="text-[#FF5A5F]" />
            Sơ đồ trạng thái bàn
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Theo dõi, phân phối chỗ ngồi và điều khiển trạng thái phục vụ thời gian thực (Real-time).
          </p>
        </div>

        {/* Nút thao tác nhanh trên Header - Phục vụ không có Thêm bàn / Mở Tab */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => {
              fetchData();
              toast.success("Đã cập nhật dữ liệu sơ đồ mới nhất!");
            }}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Thanh hiển thị Legend trạng thái bàn */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 text-xs shadow-xs">
        <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mr-2">Trạng thái:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-slate-100 border border-slate-300 block" />
          <span className="font-semibold text-gray-600">Trống (Empty)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-emerald-100 border border-emerald-300 block" />
          <span className="font-semibold text-gray-600">Đang phục vụ (Serving)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-amber-100 border border-amber-300 block" />
          <span className="font-semibold text-gray-600">Đặt trước (Reserved)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-rose-100 border border-rose-300 block" />
          <span className="font-semibold text-gray-600">Chờ thanh toán (Pending Payment)</span>
        </div>
      </div>

      {/* Tabs chuyển đổi giữa các Khu vực */}
      <div className="border-b border-gray-200 pb-px">
        <div className="flex gap-2">
          {areas.map((area) => {
            const isActive = selectedAreaId === area.id;
            return (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                className={`px-4 py-2 text-xs font-bold rounded-t-lg transition-all border-t border-x cursor-pointer ${
                  isActive
                    ? "bg-white border-gray-200 text-[#FF5A5F] border-b-white z-10"
                    : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100/50"
                }`}
              >
                {area.name}
              </button>
            );
          })}

          {loading && (
            <div className="flex items-center px-4">
              <RefreshCw size={12} className="animate-spin text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Lưới Sơ Đồ Bàn Ăn */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 min-h-[400px] flex flex-col justify-center">
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-[#FF5A5F] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400 font-semibold">Đang tải dữ liệu sơ đồ bàn...</p>
          </div>
        ) : (
          <TableGrid tables={filteredTables as any} onAction={handleAction} showCrud={false} />
        )}
      </div>

      {/* Hướng dẫn */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={16} className="text-gray-400 mt-0.5" />
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-bold text-gray-700">Hướng dẫn nhanh cho Phục vụ:</p>
          <p>• Nhấn vào nút menu thả xuống (dropdown) tại góc mỗi bàn ăn để thực hiện các thao tác: Mở bàn, Check-in, Chuyển bàn, Gộp/Tách bàn, Xem order hoặc Yêu cầu thanh toán.</p>
          <p>• Bàn ở trạng thái <strong>Chờ thanh toán</strong> sẽ chờ thu ngân xử lý tại quầy.</p>
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
