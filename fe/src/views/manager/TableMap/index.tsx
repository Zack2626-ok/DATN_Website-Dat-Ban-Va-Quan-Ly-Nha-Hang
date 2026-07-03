import React, { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-hot-toast";
import { RefreshCw, LayoutGrid, Info } from "lucide-react";
import { io } from "socket.io-client";

import {
  getTableAreas,
  getTables,
  updateTableStatus,
  transferTable,
  mergeTables,
  unmergeTables,
  splitTable,
  type ResmanagerTable
} from "../../../services/tableService";
import type { TableArea } from "../../../interfaces/table.interface";

import { TableGrid } from "./components/TableGrid";
import {
  OpenTableModal,
  TransferTableModal,
  MergeTableModal,
  SplitTableModal
} from "./components/TableActionModals";

export const TableMapIndex: React.FC = () => {
  // Trạng thái dữ liệu
  const [areas, setAreas] = useState<TableArea[]>([]);
  const [tables, setTables] = useState<ResmanagerTable[]>([]);
  const [selectedAreaId, setSelectedAreaId] = useState<number | null>(null);

  // Trạng thái tải dữ liệu
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingTables, setLoadingTables] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Trạng thái thao tác hộp thoại (Modals)
  const [activeTable, setActiveTable] = useState<ResmanagerTable | null>(null);
  const [isOpenTableOpen, setIsOpenTableOpen] = useState(false);
  const [isTransferOpen, setIsTransferOpen] = useState(false);
  const [isMergeOpen, setIsMergeOpen] = useState(false);
  const [isSplitOpen, setIsSplitOpen] = useState(false);

  // Lọc các danh sách bàn trống trong toàn bộ nhà hàng phục vụ cho Chuyển/Gộp/Tách bàn
  const emptyTables = useMemo(() => {
    return tables.filter((t) => t.status === "empty");
  }, [tables]);

  // 1. Tải danh sách khu vực (Areas)
  const fetchAreas = async () => {
    try {
      setLoadingAreas(true);
      const data = await getTableAreas();
      setAreas(data);
      if (data.length > 0 && selectedAreaId === null) {
        setSelectedAreaId(data[0].id);
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải danh sách khu vực sơ đồ bàn");
    } finally {
      setLoadingAreas(false);
    }
  };

  // 2. Tải danh sách bàn theo khu vực được chọn (Tables)
  const fetchTables = useCallback(async () => {
    if (selectedAreaId === null) return;
    try {
      setLoadingTables(true);
      const data = await getTables(selectedAreaId);
      setTables(data);
    } catch (err) {
      console.error(err);
      toast.error("Lỗi tải thông tin chi tiết các bàn ăn");
    } finally {
      setLoadingTables(false);
    }
  }, [selectedAreaId]);

  useEffect(() => {
    fetchAreas();
  }, []);

  useEffect(() => {
    fetchTables();
  }, [selectedAreaId, fetchTables]);

  // 3. Thiết lập kết nối Socket.io Real-time lắng nghe thay đổi sơ đồ bàn từ Backend
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on("connect", () => {
      console.log("⚡ Connected to Socket.io Server for Table Map");
    });

    // Lắng nghe thay đổi trạng thái bàn
    socket.on("table:status_changed", (data: { tableId: number; status: ResmanagerTable["status"]; guest_name?: string }) => {
      setTables((prevTables) =>
        prevTables.map((t) =>
          t.id === Number(data.tableId)
            ? { ...t, status: data.status, guest_name: data.guest_name || null }
            : t
        )
      );
      toast.success(`Cập nhật: Trạng thái bàn đã thay đổi!`);
    });

    // Lắng nghe sự kiện chuyển bàn
    socket.on("table:transferred", () => {
      fetchTables();
      toast.success("Thông báo: Một bàn ăn đã chuyển vị trí!");
    });

    // Lắng nghe sự kiện gộp bàn
    socket.on("table:merged", () => {
      fetchTables();
      toast.success("Thông báo: Đã gộp nhóm bàn ăn thành công!");
    });

    // Cleanup: Ngắt kết nối socket chống rò rỉ bộ nhớ (leak memory)
    return () => {
      socket.off("connect");
      socket.off("table:status_changed");
      socket.off("table:transferred");
      socket.off("table:merged");
      socket.disconnect();
      console.log("🔌 Disconnected Socket.io Client for Table Map");
    };
  }, [fetchTables]);

  // 4. Định tuyến hành động dựa trên click chuột từ TableCard dropdown
  const handleAction = async (action: string, table: ResmanagerTable) => {
    setActiveTable(table);

    switch (action) {
      case "open":
        setIsOpenTableOpen(true);
        break;
      case "reserve":
        try {
          setActionLoading(true);
          await updateTableStatus(table.id, "reserved");
          toast.success(`Đã đặt trước bàn ${table.name} thành công!`);
          fetchTables();
        } catch (err) {
          toast.error("Lỗi thiết lập đặt trước bàn ăn");
        } finally {
          setActionLoading(false);
        }
        break;
      case "checkin":
        try {
          setActionLoading(true);
          await updateTableStatus(table.id, "serving");
          toast.success(`Check-in bàn ${table.name} thành công!`);
          fetchTables();
        } catch (err) {
          toast.error("Lỗi check-in bàn");
        } finally {
          setActionLoading(false);
        }
        break;
      case "cancel_reserve":
        try {
          setActionLoading(true);
          await updateTableStatus(table.id, "empty");
          toast.success(`Đã hủy đặt trước bàn ${table.name}`);
          fetchTables();
        } catch (err) {
          toast.error("Lỗi hủy đặt bàn");
        } finally {
          setActionLoading(false);
        }
        break;
      case "transfer":
        setIsTransferOpen(true);
        break;
      case "merge":
        setIsMergeOpen(true);
        break;
      case "split":
        setIsSplitOpen(true);
        break;
      case "unmerge":
        try {
          setActionLoading(true);
          await unmergeTables(table.id);
          toast.success(`Đã hủy gộp bàn cho ${table.name}`);
          fetchTables();
        } catch (err) {
          toast.error("Lỗi hủy gộp bàn");
        } finally {
          setActionLoading(false);
        }
        break;
      case "view_order":
        toast.success(`Xem chi tiết đơn hàng bàn ${table.name} (Đang chuyển tiếp...)`);
        break;
      case "view_invoice":
        toast.success(`Đang tải hóa đơn thanh toán cho bàn ${table.name}...`);
        break;
      default:
        toast.error("Thao tác nghiệp vụ không xác định");
    }
  };

  // 5. Xử lý logic nghiệp vụ sau khi xác nhận trong Modals
  const handleConfirmOpenTable = async (data: { guestCount: number; customerName: string; customerPhone: string }) => {
    if (!activeTable) return;
    try {
      setActionLoading(true);
      await updateTableStatus(activeTable.id, "serving");
      toast.success(`Đã mở bàn ${activeTable.name} thành công cho ${data.guestCount} khách!`);
      setIsOpenTableOpen(false);
      fetchTables();
    } catch (err) {
      toast.error("Không thể mở bàn mới");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmTransfer = async (targetTableId: number) => {
    if (!activeTable) return;
    try {
      setActionLoading(true);
      await transferTable(activeTable.id, targetTableId);
      toast.success("Chuyển hóa đơn bàn thành công!");
      setIsTransferOpen(false);
      fetchTables();
    } catch (err) {
      toast.error("Chuyển bàn thất bại, vui lòng kiểm tra lại");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmMerge = async (mergedTableIds: number[]) => {
    if (!activeTable) return;
    try {
      setActionLoading(true);
      await mergeTables(activeTable.id, mergedTableIds);
      toast.success("Gộp nhóm bàn ăn thành công!");
      setIsMergeOpen(false);
      fetchTables();
    } catch (err) {
      toast.error("Gộp bàn ăn thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmSplit = async (data: { targetTableId: number; childLabel: string }) => {
    if (!activeTable) return;
    try {
      setActionLoading(true);
      // Tách bàn mô phỏng với mảng rỗng (tách toàn bộ hoặc tách mặc định)
      await splitTable(activeTable.id, data.targetTableId, data.childLabel, []);
      toast.success(`Tách bàn thành công sang bàn mới!`);
      setIsSplitOpen(false);
      fetchTables();
    } catch (err) {
      toast.error("Tách bàn ăn thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Tiêu đề trang */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-gray-800 font-display flex items-center gap-2">
            <LayoutGrid className="text-[#FF5A5F]" />
            Sơ đồ bàn & Tiền sảnh
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Theo dõi, phân phối chỗ ngồi và điều khiển dòng phục vụ của bàn ăn theo thời gian thực (Real-time).
          </p>
        </div>

        {/* Nút làm mới dữ liệu */}
        <button
          onClick={() => {
            fetchAreas();
            fetchTables();
            toast.success("Đã cập nhật dữ liệu sơ đồ mới nhất!");
          }}
          disabled={loadingTables || loadingAreas}
          className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-xs font-bold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors shadow-xs cursor-pointer self-start sm:self-auto"
        >
          <RefreshCw size={14} className={loadingTables || loadingAreas ? "animate-spin" : ""} />
          Làm mới sơ đồ
        </button>
      </div>

      {/* Thanh hiển thị Legend trạng thái bàn */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-200 text-xs shadow-xs">
        <span className="font-bold text-gray-400 uppercase tracking-wider text-[10px] mr-2">Trạng thái:</span>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-green-100 border border-green-300 block" />
          <span className="font-semibold text-gray-600">Bàn trống (Empty)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-blue-100 border border-blue-300 block" />
          <span className="font-semibold text-gray-600">Đang phục vụ (Serving)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-amber-100 border border-amber-300 block" />
          <span className="font-semibold text-gray-600">Đặt trước (Reserved)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-3.5 w-3.5 rounded bg-purple-100 border border-purple-300 block" />
          <span className="font-semibold text-gray-600">Chờ thanh toán (Pending Payment)</span>
        </div>
      </div>

      {/* Tabs chuyển đổi giữa các Khu vực (Tầng 1, Tầng 2, Sân vườn) */}
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

          {loadingAreas && (
            <div className="flex items-center px-4">
              <RefreshCw size={12} className="animate-spin text-gray-400" />
            </div>
          )}
        </div>
      </div>

      {/* Lưới Sơ Đồ Bàn Ăn */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 min-h-[400px] flex flex-col justify-center">
        {loadingTables ? (
          <div className="flex flex-col items-center justify-center gap-3">
            <div className="w-10 h-10 border-4 border-[#FF5A5F] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-gray-400 font-semibold">Đang đồng bộ hóa sơ đồ vị trí...</p>
          </div>
        ) : (
          <TableGrid tables={tables} onAction={handleAction} />
        )}
      </div>

      {/* Phần hướng dẫn quản lý sơ đồ */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 flex items-start gap-3">
        <Info size={16} className="text-gray-400 mt-0.5" />
        <div className="text-xs text-gray-500 space-y-1">
          <p className="font-bold text-gray-700">Hướng dẫn nhanh cho Quản lý:</p>
          <p>• Click vào biểu tượng menu <strong className="text-gray-700">⋮</strong> ở góc mỗi bàn để thay đổi trạng thái hoặc chuyển/gộp/tách bàn nhanh.</p>
          <p>• Trạng thái bàn sẽ được đồng bộ ngay lập tức sang màn hình của Thu ngân tại quầy và Nhân viên phục vụ qua kênh truyền tin Real-time.</p>
        </div>
      </div>

      {/* ============================================================================
          MỌI HỘP THOẠI (MODALS) THAO TÁC NGHIỆP VỤ BÀN ĂN
          ============================================================================ */}
      <OpenTableModal
        isOpen={isOpenTableOpen}
        onClose={() => setIsOpenTableOpen(false)}
        table={activeTable}
        onConfirm={handleConfirmOpenTable}
        loading={actionLoading}
      />

      <TransferTableModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        table={activeTable}
        emptyTables={emptyTables}
        onConfirm={handleConfirmTransfer}
        loading={actionLoading}
      />

      <MergeTableModal
        isOpen={isMergeOpen}
        onClose={() => setIsMergeOpen(false)}
        table={activeTable}
        emptyTables={emptyTables}
        onConfirm={handleConfirmMerge}
        loading={actionLoading}
      />

      <SplitTableModal
        isOpen={isSplitOpen}
        onClose={() => setIsSplitOpen(false)}
        table={activeTable}
        emptyTables={emptyTables}
        onConfirm={handleConfirmSplit}
        loading={actionLoading}
      />
    </div>
  );
};

export default TableMapIndex;
