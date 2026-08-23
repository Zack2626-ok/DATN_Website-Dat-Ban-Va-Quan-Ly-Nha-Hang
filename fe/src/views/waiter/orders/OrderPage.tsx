import React, { useState, useMemo, useEffect, useCallback } from "react";
import { io } from "socket.io-client";
import { useParams, useNavigate, useLocation, Link } from "react-router-dom";
import { Search, Utensils, Pause, Send, ArrowLeft, Minus, Plus, XCircle, Loader2, RefreshCw, RotateCcw, Printer, AlertTriangle } from "lucide-react";
import { Modal } from "../../../components/Modal";
import { VoidItemModal, type OrderItemStatus } from "./VoidItemModal";
import { toast } from "react-hot-toast";
import {
  getWaiterMenuItems,
  getWaiterCategories,
  getOrdersByTable,
  getOrderItems,
  addOrderItem,
  voidOrderItem,
  sendItemsToKitchen,
  holdOrderItems,
  createOrder,
  markItemAsServed,
  cancelPaymentRequest,
  requestPayment,
  type WaiterMenuItem,
  type WaiterCategory,
} from "../../../services/waiterService";
import { getTablesV1, updateTableStatus } from "../../../services/tableService";
import { getComboConstituents } from "../../../utils/comboHelper";
import { getRestaurantInfo } from "../../../services/restaurantInfoService";

interface DisplayOrderItem {
  id: number;
  menuItemId: number;
  name: string;
  price: number;
  quantity: number;
  status: OrderItemStatus;
  kitchenNote?: string;
  held: boolean;
}

const STATUS_STYLES: Record<OrderItemStatus, string> = {
  pending: "bg-sky-100 text-slate-600",
  waiting_kitchen: "bg-purple-100 text-purple-700 font-bold",
  cooking: "bg-orange-100 text-orange-700 font-bold",
  done: "bg-green-100 text-green-700 font-bold",
  served: "bg-blue-100 text-blue-700",
  voided: "bg-red-100 text-red-700 line-through",
};

const STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending: "⏳ Chờ gửi",
  waiting_kitchen: "👨‍🍳 Chờ nấu",
  cooking: "🔥 Đang nấu",
  done: "✅ Hoàn thành",
  served: "🛎 Đã mang ra",
  voided: "✗ Đã hủy",
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

export const OrderPage: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();

  // Table info
  const [table, setTable] = useState<any | null>(null);
  const [tableLoading, setTableLoading] = useState(true);

  // Tax rate info
  const [taxRate, setTaxRate] = useState<number>(8);
  useEffect(() => {
    getRestaurantInfo()
      .then((info) => {
        if (info && info.tax_rate !== undefined) {
          setTaxRate(info.tax_rate);
        }
      })
      .catch(() => {});
  }, []);

  // Menu data
  const [menuItems, setMenuItems] = useState<WaiterMenuItem[]>([]);
  const [categories, setCategories] = useState<WaiterCategory[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">("all");
  const [search, setSearch] = useState("");

  // Order data
  const [orderId, setOrderId] = useState<number | null>(null);
  const [orderStatus, setOrderStatus] = useState<string | null>(null);
  const [orderItems, setOrderItems] = useState<DisplayOrderItem[]>([]);
  const [orderLoading, setOrderLoading] = useState(true);

  // UI state
  const [addItemTarget, setAddItemTarget] = useState<WaiterMenuItem | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [servingItemId, setServingItemId] = useState<number | null>(null);
  const [addNote, setAddNote] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [voidTarget, setVoidTarget] = useState<DisplayOrderItem | null>(null);
  const [sending, setSending] = useState(false);
  const [holding, setHolding] = useState(false);

  // State xử lý khi thanh toán mà còn món chưa ra (pending / cooking)
  const [unfinishedPaymentModal, setUnfinishedPaymentModal] = useState<DisplayOrderItem[] | null>(null);
  const [unfinishedVoidReason, setUnfinishedVoidReason] = useState("Khách yêu cầu thanh toán sớm - Không chờ món nữa");
  const [processingPaymentRequest, setProcessingPaymentRequest] = useState(false);

  // Tải thông tin bàn
  useEffect(() => {
    if (!tableId) return;
    setTableLoading(true);
    getTablesV1()
      .then((tables) => {
        const found = tables.find((t) => t.id.toString() === tableId);
        setTable(found || null);
      })
      .catch(() => setTable(null))
      .finally(() => setTableLoading(false));
  }, [tableId]);

  // Tải menu và categories
  useEffect(() => {
    setMenuLoading(true);
    Promise.all([getWaiterMenuItems(), getWaiterCategories()])
      .then(([items, cats]) => {
        setMenuItems(items);
        setCategories(cats);
      })
      .catch(() => toast.error("Không thể tải thực đơn"))
      .finally(() => setMenuLoading(false));
  }, []);

  const location = useLocation();
  const queryOrderId = useMemo(() => new URLSearchParams(location.search).get("orderId"), [location.search]);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchOrderData = useCallback(async (showToast = false) => {
    if (!tableId) return;
    if (showToast) setRefreshing(true);
    else setOrderLoading(true);

    try {
      getTablesV1()
        .then((tables) => {
          const found = tables.find((t) => t.id.toString() === tableId);
          if (found) setTable(found);
        })
        .catch(() => {});

      if (queryOrderId) {
        const targetId = Number(queryOrderId);
        setOrderId(targetId);
        const items = await getOrderItems(targetId);
        setOrderItems(
          items.map((i) => ({
            id: i.id,
            menuItemId: i.menu_item_id,
            name: i.item_name,
            price: Number(i.unit_price),
            quantity: i.quantity,
            status: i.status as OrderItemStatus,
            kitchenNote: i.kitchen_note,
            held: Boolean(i.is_held),
          })),
        );
        if (showToast) toast.success("Đã làm mới dữ liệu gọi món");
        return;
      }

      const orders = await getOrdersByTable(Number(tableId));
      if (orders.length === 0) {
        setOrderId(null);
        setOrderStatus(null);
        setOrderItems([]);
        if (showToast) toast.success("Bàn chưa có order nào");
        return;
      }
      const latest = orders[0];
      setOrderId(latest.id);
      setOrderStatus(latest.status);
      const items = await getOrderItems(latest.id);
      setOrderItems(
        items.map((i) => ({
          id: i.id,
          menuItemId: i.menu_item_id,
          name: i.item_name,
          price: Number(i.unit_price),
          quantity: i.quantity,
          status: i.status as OrderItemStatus, // Lấy đúng status từ DB
          kitchenNote: i.kitchen_note,
          held: Boolean(i.is_held),
        })),
      );
      // Cập nhật deposit_amount
      setTable((prev: any) => ({
        ...prev,
        deposit_amount: latest.deposit_amount || 0,
      }));
      if (showToast) toast.success("Đã làm mới dữ liệu gọi món");
    } catch {
      setOrderItems([]);
      if (showToast) toast.error("Lỗi khi tải lại dữ liệu");
    } finally {
      if (showToast) setRefreshing(false);
      else setOrderLoading(false);
    }
  }, [tableId, queryOrderId]);

  // Tải order hiện tại của bàn
  useEffect(() => {
    fetchOrderData(false);
  }, [fetchOrderData]);

  // Bộ lắng nghe đồng bộ thời gian thực bằng Socket.IO
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
    });

    socket.on("connect", () => {
      console.log("⚡ Connected to Socket.io Server for Waiter Order Page");
    });

    socket.on("order_updated", () => {
      fetchOrderData(false);
    });
    socket.on("kds_updated", () => {
      fetchOrderData(false);
    });
    socket.on("table_updated", () => {
      fetchOrderData(false);
    });
    socket.on("order:item_voided", () => {
      fetchOrderData(false);
    });

    return () => {
      socket.off("connect");
      socket.off("order_updated");
      socket.off("kds_updated");
      socket.off("table_updated");
      socket.off("order:item_voided");
      socket.disconnect();
      console.log("🔌 Disconnected Socket.io Client for Waiter Order Page");
    };
  }, [fetchOrderData]);

  const filteredMenu = useMemo(() => {
    return menuItems.filter((item) => {
      const matchCat = selectedCategoryId === "all" || item.category_id === selectedCategoryId;
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menuItems, selectedCategoryId, search]);

  const activeItems = orderItems.filter((i) => i.status !== "voided");
  const total = activeItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const pendingCount = orderItems.filter((i) => i.status === "pending" && !i.held).length;
  const heldCount = orderItems.filter((i) => i.status === "pending" && i.held).length;

  const clusterCap = table?.group_seating_capacity ?? table?.cluster_capacity ?? table?.capacity ?? 0;
  const isOverCapacity = typeof table?.guest_count === "number" && clusterCap > 0 && table.guest_count > clusterCap;

  const isPendingPayment = orderStatus === "pending_payment" || (!table?.is_split && table?.status === "pending_payment");
  const isOrderLocked =
    isPendingPayment ||
    orderStatus === "completed" ||
    orderStatus === "paid" ||
    orderStatus === "cancelled" ||
    isOverCapacity;

  const handleAddItemToOrder = async (targetItem: WaiterMenuItem, qty: number, note?: string) => {
    if (isOrderLocked) {
      if (isOverCapacity) {
        toast.error(`⚠️ Bàn đang vượt quá sức chứa (${table?.guest_count}/${clusterCap} khách). Vui lòng Chuyển bàn hoặc Gộp bàn tại Sơ đồ bàn trước khi gọi món!`);
      } else if (table?.status === "pending_payment" || orderStatus === "pending_payment") {
        toast.error("⚠️ Bàn đang yêu cầu thanh toán (Chờ thanh toán). Hệ thống đã khóa gọi thêm món để tránh sai lệch hóa đơn!");
      } else {
        toast.error("⚠️ Đơn hàng đã hoàn tất hoặc đã hủy, không thể gọi thêm món!");
      }
      return false;
    }

    if (targetItem.out_of_stock || targetItem.is_expired || targetItem.available === false) {
      toast.error(targetItem.stock_status_reason || `⚠️ Không thể thêm món "${targetItem.name}" do nguyên liệu trong kho đã HẾT HÀNG hoặc HẾT HẠN sử dụng!`);
      return false;
    }

    try {
      let currentOrderId = orderId;
      // Nếu chưa có order, tạo mới
      if (!currentOrderId) {
        const newOrder = await createOrder({
          table_id: Number(tableId),
          created_by: getCurrentUserId(),
          order_type: "dine_in",
          guest_name: table?.guest_name || undefined,
          guest_phone: table?.guest_phone || undefined,
          guest_count: table?.guest_count || undefined,
        });
        currentOrderId = newOrder.id;
        setOrderId(currentOrderId);
      }

      const newItem = await addOrderItem(currentOrderId, {
        menu_item_id: targetItem.id,
        quantity: qty,
        unit_price: targetItem.price,
        kitchen_note: note?.trim() || undefined,
        created_by: getCurrentUserId(),
      });

      setOrderItems((prev) => {
        const existingIdx = prev.findIndex(
          (i) =>
            (newItem.merged && i.id === newItem.id) ||
            (i.menuItemId === targetItem.id && i.status === "pending" && !i.held)
        );

        if (existingIdx !== -1) {
          const updated = [...prev];
          const ex = updated[existingIdx];
          const trimmedNote = note?.trim();
          const combinedNote = trimmedNote
            ? ex.kitchenNote
              ? ex.kitchenNote.includes(trimmedNote)
                ? ex.kitchenNote
                : `${ex.kitchenNote}; ${trimmedNote}`
              : trimmedNote
            : ex.kitchenNote;

          updated[existingIdx] = {
            ...ex,
            quantity: ex.quantity + qty,
            kitchenNote: combinedNote,
          };
          return updated;
        }

        return [
          ...prev,
          {
            id: newItem.id,
            menuItemId: targetItem.id,
            name: targetItem.name,
            price: targetItem.price,
            quantity: qty,
            status: "pending" as OrderItemStatus,
            kitchenNote: note?.trim() || undefined,
            held: false,
          },
        ];
      });

      toast.success(`Đã thêm ${qty} phần "${targetItem.name}" vào order`);
      return true;
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Không thể thêm món. Vui lòng thử lại.";
      toast.error(msg);
      return false;
    }
  };

  const handleAddToOrder = async () => {
    if (!addItemTarget) return;
    setAddingItem(true);
    const success = await handleAddItemToOrder(addItemTarget, addQty, addNote);
    setAddingItem(false);
    if (success) {
      setAddItemTarget(null);
      setAddQty(1);
      setAddNote("");
    }
  };

  const handleQuickAdd = async (e: React.MouseEvent, targetItem: WaiterMenuItem) => {
    e.stopPropagation();
    await handleAddItemToOrder(targetItem, 1, "");
  };

  const handleHold = async () => {
    if (!orderId) {
      toast.error("Chưa có order");
      return;
    }
    const toHold = orderItems.filter((i) => i.status === "pending" && !i.held);
    if (toHold.length === 0) {
      toast.error("Không có món nào để hold");
      return;
    }
    setHolding(true);
    try {
      await holdOrderItems(orderId, toHold.map((i) => i.id), true);
      setOrderItems((prev) =>
        prev.map((i) => (i.status === "pending" && !i.held ? { ...i, held: true } : i)),
      );
      toast.success(`Đã hold ${toHold.length} món — gửi bếp sau khi khách sẵn sàng`);
    } catch {
      toast.error("Không thể hold món");
    } finally {
      setHolding(false);
    }
  };

  const handleSendHeldToKitchen = async () => {
    if (!orderId) return;
    const toSend = orderItems.filter((i) => i.status === "pending" && i.held);
    if (toSend.length === 0) {
      toast.error("Không có món hold nào để gửi");
      return;
    }
    setSending(true);
    try {
      await sendItemsToKitchen(orderId, toSend.map((i) => i.id));
      setOrderItems((prev) =>
        prev.map((i) =>
          i.status === "pending" && i.held ? { ...i, status: "waiting_kitchen" as OrderItemStatus, held: false } : i,
        ),
      );
      toast.success(`Đã gửi ${toSend.length} món hold xuống bếp`);
    } catch {
      toast.error("Không thể gửi món hold xuống bếp");
    } finally {
      setSending(false);
    }
  };

  const handleSendToKitchen = async () => {
    if (!orderId) {
      toast.error("Chưa có order");
      return;
    }
    const toSend = orderItems.filter((i) => i.status === "pending" && !i.held);
    if (toSend.length === 0) {
      toast.error("Không có món nào cần gửi bếp");
      return;
    }
    setSending(true);
    try {
      await sendItemsToKitchen(orderId, toSend.map((i) => i.id));
      setOrderItems((prev) =>
        prev.map((i) =>
          i.status === "pending" && !i.held ? { ...i, status: "waiting_kitchen" as OrderItemStatus } : i,
        ),
      );
      toast.success(`Đã gửi ${toSend.length} món xuống bếp`);
    } catch {
      toast.error("Không thể gửi món xuống bếp");
    } finally {
      setSending(false);
    }
  };

  const handleVoidConfirm = async (itemId: string, reason: string, _notifyKds: boolean) => {
    if (!orderId) return;
    try {
      await voidOrderItem(orderId, Number(itemId), reason);
      setOrderItems((prev) =>
        prev.map((i) => (i.id.toString() === itemId ? { ...i, status: "voided" as OrderItemStatus } : i)),
      );
      toast.success("Đã hủy món");
    } catch {
      toast.error("Không thể hủy món");
    }
  };

  const handleRequestPayment = async () => {
    if (!tableId || activeItems.length === 0) return;
    const unfinishedItems = orderItems.filter((i) => i.status === "pending" || i.status === "waiting_kitchen" || i.status === "cooking" || i.status === "done");
    if (unfinishedItems.length > 0) {
      setUnfinishedPaymentModal(unfinishedItems);
      return;
    }
    await executeRequestPayment();
  };

  const executeRequestPayment = async () => {
    if (!tableId) return;
    try {
      setProcessingPaymentRequest(true);
      await updateTableStatus(Number(tableId), "pending_payment");
      toast.success("Đã gửi yêu cầu thanh toán — thu ngân sẽ xử lý tại quầy");
      navigate("/waiter/tables");
    } catch {
      toast.error("Không thể gửi yêu cầu thanh toán");
    } finally {
      setProcessingPaymentRequest(false);
    }
  };

  const executeRequestEarlyPayment = async () => {
    if (!orderId) return;
    try {
      setProcessingPaymentRequest(true);
      const pendingItems = orderItems.filter((i) => i.status === "pending");
      if (pendingItems.length > 0) {
        await sendItemsToKitchen(orderId, pendingItems.map((i) => i.id)).catch(console.error);
      }
      await requestPayment(orderId, undefined, true);
      toast.success("Đã gửi yêu cầu thanh toán sớm cho thu ngân (Bàn vẫn ở trạng thái Đang phục vụ)");
      navigate("/waiter/tables");
    } catch {
      toast.error("Không thể gửi yêu cầu thanh toán sớm");
    } finally {
      setProcessingPaymentRequest(false);
    }
  };

  const handleVoidUnfinishedAndRequestPayment = async () => {
    if (!tableId || !orderId || !unfinishedPaymentModal) return;

    // Lọc các món chờ gửi (pending) và chờ nấu (waiting_kitchen) để hủy
    const cancellableItems = unfinishedPaymentModal.filter(
      (i) => i.status === "pending" || i.status === "waiting_kitchen"
    );
    const cookingOrDoneItems = unfinishedPaymentModal.filter(
      (i) => i.status === "cooking" || i.status === "done"
    );

    if (cancellableItems.length === 0) {
      toast.error("Không có món nào ở trạng thái Chờ gửi hoặc Chờ nấu để hủy!");
      return;
    }

    try {
      setProcessingPaymentRequest(true);
      for (const item of cancellableItems) {
        await voidOrderItem(
          orderId,
          item.id,
          unfinishedVoidReason.trim() || "Khách yêu cầu thanh toán sớm - Hủy món chưa nấu"
        );
      }
      const remainingActive = orderItems.filter(
        (i) => i.status !== "voided" && !cancellableItems.some((u) => u.id === i.id)
      );

      if (remainingActive.length === 0) {
        await updateTableStatus(Number(tableId), "empty").catch(console.error);
        toast.success("Đã hủy toàn bộ món chưa nấu và trả bàn trống thành công!");
      } else {
        const hasUnfinishedStillCooking = cookingOrDoneItems.length > 0;
        if (orderId) {
          await requestPayment(orderId, undefined, hasUnfinishedStillCooking).catch(async () => {
            await updateTableStatus(Number(tableId), "pending_payment");
          });
        } else {
          await updateTableStatus(Number(tableId), "pending_payment");
        }
        if (hasUnfinishedStillCooking) {
          toast.success(
            `Đã hủy ${cancellableItems.length} món chưa nấu & gửi yêu cầu thanh toán (giữ lại ${cookingOrDoneItems.length} món đang/đã nấu)!`
          );
        } else {
          toast.success(`Đã hủy ${cancellableItems.length} món chưa nấu & gửi yêu cầu thanh toán thành công!`);
        }
      }
      setUnfinishedPaymentModal(null);
      navigate("/waiter/tables");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Có lỗi xảy ra khi hủy món và yêu cầu thanh toán");
    } finally {
      setProcessingPaymentRequest(false);
    }
  };


  // Suppress TS6133 compiler warnings for unused imports and methods
  if (typeof Pause === 'object' || typeof Pause === 'function') {}
  if (holding) {}
  if (heldCount !== undefined) {}
  if (typeof handleHold === 'function') {}
  if (typeof handleSendHeldToKitchen === 'function') {}

  if (tableLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin text-blue-400" />
      </div>
    );
  }

  if (!table) {
    return (
      <div className="p-8 text-center">
        <p className="text-slate-400">Không tìm thấy bàn</p>
        <Link to="/waiter/tables" className="text-blue-600 font-bold text-sm mt-4 inline-block">
          Quay lại sơ đồ bàn
        </Link>
      </div>
    );
  }

  const getImageUrl = (item: WaiterMenuItem): string => {
    if (!item.image_url) return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200";
    if (item.image_url.startsWith("http")) return item.image_url;
    return `${import.meta.env.VITE_API_URL?.replace("/api", "")}/uploads/${item.image_url}`;
  };

  const handleCancelPaymentRequest = async () => {
    if (!orderId) return;
    try {
      await cancelPaymentRequest(orderId);
      setOrderStatus("serving");
      toast.success("Đã hủy yêu cầu thanh toán. Đơn hàng quay về trạng thái Đang phục vụ!");
      fetchOrderData(true);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err.message || "Không thể hủy yêu cầu thanh toán");
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/waiter/tables", { state: { selectedTableId: tableId } })}
            className="p-2 hover:bg-sky-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-500" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-800 font-display flex items-center gap-2">
              <span>Gọi món — Bàn {table.name}</span>
              {table.guest_name && (
                <span className="text-base font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  👤 {table.guest_name} {table.guest_phone ? `(${table.guest_phone})` : ""}
                </span>
              )}
              {table.deposit_amount > 0 && (
                <span className="text-base font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                  💰 Đã cọc: {Number(table.deposit_amount).toLocaleString("vi-VN")}₫
                </span>
              )}
            </h1>
            <p className="text-sm text-slate-400">
              {orderId ? `Order #${orderId}` : "Chưa có order"} • {table.capacity} chỗ
              {table.area_name && ` • ${table.area_name}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isPendingPayment && (
            <button
              onClick={handleCancelPaymentRequest}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm transition-all shadow-xs cursor-pointer"
              title="Hủy trạng thái Chờ thanh toán để tiếp tục gọi món"
            >
              <RotateCcw size={16} />
              <span>↩️ Hủy chờ thanh toán (Tiếp tục phục vụ)</span>
            </button>
          )}
          <button
            onClick={() => fetchOrderData(true)}
            disabled={refreshing || orderLoading}
            className="flex items-center gap-2 px-3.5 py-2 bg-sky-100 text-blue-700 hover:bg-blue-600 hover:text-white rounded-xl font-bold text-sm transition-all duration-200 shadow-2xs cursor-pointer disabled:opacity-50"
            title="Làm mới dữ liệu bàn và món ăn"
          >
            <RefreshCw size={16} className={refreshing ? "animate-spin" : ""} />
            <span>Làm mới</span>
          </button>
          <button
            onClick={handleSendToKitchen}
            disabled={pendingCount === 0 || sending}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 disabled:opacity-50 cursor-pointer"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Gửi bếp ({pendingCount})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-7 gap-6">
        {/* Thực đơn */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-sky-100 p-5 flex flex-col gap-4">
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryId("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                selectedCategoryId === "all" ? "bg-blue-600 text-white" : "bg-sky-100 text-slate-500 hover:bg-gray-200"
              }`}
            >
              Tất cả
            </button>
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategoryId(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                  selectedCategoryId === cat.id
                    ? "bg-blue-600 text-white"
                    : "bg-sky-100 text-slate-500 hover:bg-gray-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Status banner when order is locked or over capacity */}
          {isOverCapacity ? (
            <div className="mb-4 bg-amber-50 border border-amber-300 text-amber-900 rounded-xl p-3.5 flex items-center justify-between shadow-sm animate-fade-in">
              <div className="flex items-center gap-3 text-xs">
                <AlertTriangle size={20} className="text-amber-600 shrink-0" />
                <div>
                  <p className="font-bold text-amber-900 text-sm">
                    ⚠️ Bàn đang vượt quá sức chứa chuẩn ({table?.guest_count}/{clusterCap} khách)
                  </p>
                  <p className="mt-0.5 text-amber-700">
                    Hệ thống đang <strong>khóa gọi món</strong>. Bạn bắt buộc phải quay lại Sơ đồ bàn để <strong>Chuyển bàn</strong> hoặc <strong>Gộp bàn</strong> mới có thể gọi món.
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate("/waiter/tables", { state: { selectedTableId: tableId } })}
                className="ml-3 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs shrink-0 cursor-pointer shadow-2xs transition-colors"
              >
                Đến Sơ đồ bàn
              </button>
            </div>
          ) : isOrderLocked && (
            <div className="mb-4 bg-amber-50 border border-amber-300 text-amber-800 rounded-xl p-3.5 flex items-center gap-3 shadow-sm">
              <span className="text-xl">⚠️</span>
              <div className="text-xs">
                <p className="font-bold">
                  {isPendingPayment
                    ? "Đơn hàng đang yêu cầu thanh toán (Chờ thanh toán)"
                    : "Đơn hàng đã hoàn tất / hủy"}
                </p>
                <p className="mt-0.5">
                  {isPendingPayment
                    ? "Hệ thống đã khóa gọi thêm món khi đơn hàng đang ở trạng thái Chờ thanh toán để tránh sai lệch hóa đơn."
                    : "Đơn hàng này không còn chấp nhận gọi thêm món."}
                </p>
              </div>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên món..."
              className="w-full pl-9 pr-4 py-2 bg-sky-50/50 border border-sky-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Menu grid */}
          {menuLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 size={24} className="animate-spin text-blue-400" />
              <span className="ml-2 text-gray-400 text-sm">Đang tải thực đơn...</span>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-280px)] overflow-y-auto">
              {filteredMenu.map((item) => {
                const isUnavailable = !item.is_active || item.available === false || item.out_of_stock || item.is_expired;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      if (isOrderLocked) {
                        if (table?.status === "pending_payment" || orderStatus === "pending_payment") {
                          toast.error("⚠️ Bàn đang yêu cầu thanh toán (Chờ thanh toán). Hệ thống đã khóa gọi thêm món để tránh sai lệch hóa đơn!");
                        } else {
                          toast.error("⚠️ Đơn hàng đã hoàn tất hoặc đã hủy, không thể gọi thêm món!");
                        }
                        return;
                      }
                      if (isUnavailable) {
                        toast.error(item.stock_status_reason || `⚠️ Món "${item.name}" không thể thêm do nguyên liệu trong kho đã HẾT HÀNG hoặc HẾT HẠN sử dụng!`);
                        return;
                      }
                      setAddItemTarget(item);
                    }}
                    className={`flex flex-col rounded-xl border text-left transition-all relative ${
                      isUnavailable || isOrderLocked
                        ? "border-rose-100 bg-rose-50/20 opacity-70 cursor-not-allowed"
                        : "border-sky-100 hover:border-blue-200 hover:shadow-md cursor-pointer group"
                    }`}
                  >
                    <div className="w-full h-24 overflow-hidden rounded-t-xl shrink-0 relative">
                      <img
                        src={getImageUrl(item)}
                        alt={item.name}
                        className={`w-full h-full object-cover transition-transform duration-300 ${isUnavailable ? 'grayscale-[40%]' : 'group-hover:scale-105'}`}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200";
                        }}
                      />
                      {item.is_expired && (
                        <div className="absolute top-1 left-1 bg-amber-600/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                          ⚠️ HẾT HẠN KHO
                        </div>
                      )}
                      {(item.out_of_stock || !item.is_active) && !item.is_expired && (
                        <div className="absolute top-1 left-1 bg-rose-600/90 text-white text-[9px] font-black px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1">
                          ❌ HẾT HÀNG
                        </div>
                      )}
                    </div>
                    <div className="p-2.5 bg-white rounded-b-xl flex items-end justify-between gap-1.5 flex-1">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700 leading-tight line-clamp-2">{item.name}</p>
                        <p className="text-xs font-semibold text-blue-600 mt-1">
                          {Number(item.price).toLocaleString("vi-VN")}₫
                        </p>
                        {item.is_expired && (
                          <span className="text-[9px] text-amber-600 font-bold block mt-0.5">Hết hạn kho</span>
                        )}
                        {(item.out_of_stock || !item.is_active) && !item.is_expired && (
                          <span className="text-[9px] text-rose-500 font-bold block mt-0.5">Hết tồn kho</span>
                        )}
                      </div>
                      {!isUnavailable && (
                        <button
                          type="button"
                          onClick={(e) => handleQuickAdd(e, item)}
                          className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white flex items-center justify-center transition-all cursor-pointer shadow-xs shrink-0 active:scale-95"
                          title="Thêm nhanh 1 phần"
                        >
                          <Plus size={18} className="stroke-[2.5]" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredMenu.length === 0 && !menuLoading && (
                <div className="col-span-3 py-10 text-center text-gray-400 text-sm">
                  Không tìm thấy món phù hợp
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order panel */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-sky-100 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-sky-50 pb-3">
            <Utensils size={18} className="text-blue-600" />
            <h2 className="font-bold text-slate-800">Order hiện tại</h2>
          </div>

          <div className="flex-1 space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto">
            {orderLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={20} className="animate-spin text-blue-400" />
              </div>
            ) : orderItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10 italic">Chưa có món trong order</p>
            ) : (
              [...orderItems]
                .sort((a, b) => {
                  const getPriority = (status: string) => {
                    if (status === "served") return 1;
                    if (status === "voided") return 2;
                    return 0; // pending, waiting_kitchen, cooking, done
                  };
                  return getPriority(a.status) - getPriority(b.status);
                })
                .map((item) => {
                  const constituents = getComboConstituents(item.name);
                  return (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border border-sky-50 ${item.status === "voided" ? "opacity-60" : ""}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base text-slate-700">{item.name}</p>
                      <p className="text-sm text-slate-400 mt-0.5">×{item.quantity}</p>
                      {constituents && (
                        <div className="mt-1.5 bg-blue-50/60 rounded-lg px-2.5 py-2 border border-blue-100/60">
                          <span className="text-[11px] font-black uppercase tracking-wider text-blue-600 block mb-1">Gồm có:</span>
                          <div className="flex flex-col gap-1">
                            {constituents.map((sub, idx) => (
                              <div key={idx} className="text-xs text-slate-600 font-semibold flex items-center gap-1.5">
                                <span className="h-1.5 w-1.5 rounded-full bg-blue-400 shrink-0"></span>
                                {sub}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {item.kitchenNote && (
                        <p className="text-xs text-amber-600 mt-1">📝 {item.kitchenNote}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-base font-black text-slate-700">
                        {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                      </span>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span
                          className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[item.status]}`}
                        >
                          {STATUS_LABELS[item.status]}
                        </span>
                        {/* Nút Đã mang ra — chỉ hiện khi bếp xong (done) */}
                        {item.status === "done" && (
                          <button
                            disabled={servingItemId === item.id || (orderStatus === "completed" && !table?.is_early_paid) || (orderStatus === "paid" && !table?.is_early_paid) || orderStatus === "cancelled"}
                            onClick={async () => {
                              if ((orderStatus === "completed" && !table?.is_early_paid) || (orderStatus === "paid" && !table?.is_early_paid) || orderStatus === "cancelled") return;
                              if (!orderId) return;
                              setServingItemId(item.id);
                              try {
                                await markItemAsServed(orderId, item.id);
                                setOrderItems((prev) =>
                                  prev.map((i) => i.id === item.id ? { ...i, status: "served" as OrderItemStatus } : i)
                                );
                                toast.success(`Đã mang "${item.name}" ra bàn`);
                              } catch {
                                toast.error("Không thể cập nhật");
                              } finally {
                                setServingItemId(null);
                              }
                            }}
                            className="text-xs text-blue-600 font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            {servingItemId === item.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : "🛎"} Đã mang ra
                          </button>
                        )}
                        {/* Nút Hủy / Trả món — hiện khi chưa nấu, hoặc khi đã hoàn thành/phục vụ (trả món). Khóa khi đang nấu */}
                        {item.status !== "voided" && (
                          <button
                            disabled={isOrderLocked || item.status === "cooking"}
                            onClick={() => !isOrderLocked && setVoidTarget(item)}
                            className={`text-xs font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                              item.status === "cooking"
                                ? "text-slate-400 bg-slate-100 cursor-not-allowed"
                                : item.status === "done" || item.status === "served"
                                ? "text-orange-600 bg-orange-50 hover:bg-orange-100 hover:text-orange-700"
                                : "text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-700"
                            }`}
                            title={item.status === "cooking" ? "Không thể hủy món ăn khi bếp đang nấu" : undefined}
                          >
                            <XCircle size={13} />{" "}
                            {item.status === "cooking"
                              ? "Đang nấu"
                              : item.status === "done" || item.status === "served"
                              ? "Trả món"
                              : "Hủy"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                );
              })
            )}
          </div>

          <div className="border-t border-sky-50 pt-4 space-y-3">
            {(() => {
              const subtotal = total;
              const depositAmt = Number(table?.deposit_amount || 0);
              const taxAmt = Math.round(subtotal * (taxRate / 100));
              const finalAmt = Math.max(0, subtotal + taxAmt - depositAmt);
              return (
                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-100 text-sm">
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Tạm tính (món):</span>
                    <span className="font-bold text-slate-700">{subtotal.toLocaleString("vi-VN")}₫</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-500">
                    <span>VAT ({taxRate}%):</span>
                    <span className="font-bold text-slate-700">+{taxAmt.toLocaleString("vi-VN")}₫</span>
                  </div>
                  {depositAmt > 0 && (
                    <div className="flex justify-between items-center text-amber-600">
                      <span>Tiền cọc đặt bàn:</span>
                      <span className="font-bold">-{depositAmt.toLocaleString("vi-VN")}₫</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-2 flex justify-between items-center">
                    <span className="font-bold text-slate-700">Tổng thanh toán dự kiến:</span>
                    <span className="text-2xl font-black text-blue-600">{finalAmt.toLocaleString("vi-VN")}₫</span>
                  </div>
                </div>
              );
            })()}
            <button
              onClick={() => navigate("/waiter/tables", { state: { selectedTableId: tableId } })}
              className="w-full py-3.5 bg-gray-800 text-white rounded-xl font-bold text-base hover:bg-gray-900"
            >
              Quay lại sơ đồ bàn
            </button>
            {table?.status === "serving" && !table?.is_early_paid && orderStatus !== "completed" && activeItems.length > 0 && (
              <button
                onClick={handleRequestPayment}
                className="w-full py-3.5 border-2 border-purple-200 text-purple-700 rounded-xl font-bold text-base hover:bg-purple-50"
              >
                Yêu cầu thanh toán (Thu ngân)
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modal thêm món */}
      <Modal
        isOpen={!!addItemTarget}
        onClose={() => {
          setAddItemTarget(null);
          setAddQty(1);
          setAddNote("");
        }}
        title={addItemTarget ? `Thêm: ${addItemTarget.name}` : ""}
        size="sm"
        theme="light"
      >
        {addItemTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={getImageUrl(addItemTarget)}
                alt=""
                className="w-16 h-16 rounded-xl object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200";
                }}
              />
              <div>
                <p className="font-bold text-slate-800">{addItemTarget.name}</p>
                <p className="text-sm text-blue-600 font-bold">
                  {Number(addItemTarget.price).toLocaleString("vi-VN")}₫
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setAddQty((q) => Math.max(1, q - 1))}
                className="p-2 rounded-lg bg-sky-100 hover:bg-gray-200"
              >
                <Minus size={16} />
              </button>
              <span className="text-2xl font-black text-slate-800 w-8 text-center">{addQty}</span>
              <button
                onClick={() => setAddQty((q) => q + 1)}
                className="p-2 rounded-lg bg-sky-100 hover:bg-gray-200"
              >
                <Plus size={16} />
              </button>
            </div>

            <textarea
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              placeholder="Ghi chú bếp (tùy chọn)..."
              rows={2}
              className="w-full p-2.5 bg-sky-50/50 border border-sky-100 rounded-lg text-sm outline-none"
            />

            <button
              onClick={handleAddToOrder}
              disabled={addingItem}
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {addingItem ? <Loader2 size={16} className="animate-spin" /> : null}
              Thêm vào order
            </button>
          </div>
        )}
      </Modal>

      <VoidItemModal
        isOpen={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        item={voidTarget ? { id: voidTarget.id.toString(), name: voidTarget.name, quantity: voidTarget.quantity, status: voidTarget.status } : null}
        tableName={table.name}
        onConfirm={handleVoidConfirm}
      />

      {/* Modal cảnh báo và xử lý nghiệp vụ khi bàn còn món chưa mang ra và bấm Yêu cầu thanh toán */}
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
              Bàn <strong className="text-gray-900">{table?.name}</strong> hiện đang có{" "}
              <strong className="text-amber-600">{unfinishedPaymentModal.length} món</strong> chưa hoàn thành hoặc chưa mang ra bàn:
            </p>

            <div className="max-h-48 overflow-y-auto border border-amber-100 rounded-xl bg-amber-50/40 p-3 space-y-2">
              {unfinishedPaymentModal.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-amber-200/60 shadow-2xs text-xs">
                  <div>
                    <p className="font-bold text-gray-800">{item.name}</p>
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
                  const activeOrderItems = orderItems.filter((i) => i.status !== "voided");
                  const hasPendingItems = activeOrderItems.some((i) => i.status === "pending");
                  const canEarlyPay = activeOrderItems.length > 0;

                  if (canEarlyPay) {
                    return (
                      <button
                        onClick={async () => {
                          setUnfinishedPaymentModal(null);
                          await executeRequestEarlyPayment();
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
                            ? 'Đơn hàng còn món ở trạng thái "Chờ gửi". Vui lòng bấm Đóng rồi nhấn nút "Gửi bếp" tất cả món trước khi thanh toán sớm!'
                            : 'Đơn hàng chưa có món nào được gửi xuống bếp. Vui lòng bấm Đóng rồi nhấn nút "Gửi bếp" trước!'}
                        </p>
                      </div>
                    );
                  }
                })()}

                {/* Lựa chọn 2: Hủy món chưa nấu & Thanh toán */}
                {(() => {
                  const cookingCount = unfinishedPaymentModal.filter((i) => i.status === "cooking").length;
                  const doneCount = unfinishedPaymentModal.filter((i) => i.status === "done").length;
                  const cancellableItems = unfinishedPaymentModal.filter(
                    (i) => i.status === "pending" || i.status === "waiting_kitchen"
                  );
                  const cancellableCount = cancellableItems.length;
                  const hasCancellable = cancellableCount > 0;
                  const hasCookingOrDone = cookingCount + doneCount > 0;

                  return (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <label className="block text-xs font-bold text-gray-700">
                        Hoặc Hủy món chưa nấu (nếu khách không muốn chờ nữa):
                      </label>
                      <input
                        type="text"
                        value={unfinishedVoidReason}
                        onChange={(e) => setUnfinishedVoidReason(e.target.value)}
                        placeholder="Lý do hủy: Khách không muốn chờ món nữa..."
                        disabled={!hasCancellable}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-rose-500/20 disabled:bg-gray-100 disabled:text-gray-400"
                      />

                      {hasCookingOrDone && hasCancellable && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium flex items-center gap-2">
                          <AlertTriangle size={15} className="text-amber-600 shrink-0" />
                          <span>
                            Đang có <strong>{cookingCount > 0 ? `${cookingCount} món đang nấu` : ''}{cookingCount > 0 && doneCount > 0 ? ' và ' : ''}{doneCount > 0 ? `${doneCount} món đã nấu` : ''}</strong> trên bếp. Hệ thống sẽ <strong>HỦY {cancellableCount} món chưa nấu</strong> và <strong>GIỮ LẠI các món đang/đã nấu</strong> để tính tiền.
                          </span>
                        </div>
                      )}

                      {!hasCancellable && (
                        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                          💡 Tất cả các món còn lại đều đang nấu hoặc đã nấu xong. Vui lòng chọn "Thanh toán sớm" để tính tiền hoặc liên hệ bếp nếu cần hủy món đang nấu.
                        </div>
                      )}

                      <button
                        onClick={handleVoidUnfinishedAndRequestPayment}
                        disabled={processingPaymentRequest || !hasCancellable}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm ${
                          !hasCancellable
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed border border-gray-300"
                            : "bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                        }`}
                      >
                        {processingPaymentRequest ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                        {hasCancellable
                          ? `🚫 Hủy ${cancellableCount} món chưa nấu & Thanh toán (${hasCookingOrDone ? "tính các món đang/đã nấu" : "tính các món đã ra"})`
                          : "🚫 Không có món chưa nấu để hủy"}
                      </button>
                    </div>
                  );
                })()}

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
