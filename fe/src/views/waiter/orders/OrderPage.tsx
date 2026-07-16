import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Search, Utensils, Pause, Send, ArrowLeft, Minus, Plus, XCircle, Loader2, CheckCircle } from "lucide-react";
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
  type WaiterMenuItem,
  type WaiterCategory,
} from "../../../services/waiterService";
import { getTablesV1, updateTableStatus } from "../../../services/tableService";

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
  pending: "bg-gray-100 text-gray-700",
  cooking: "bg-orange-100 text-orange-700",
  done: "bg-green-100 text-green-700",
  served: "bg-blue-100 text-blue-700",
  voided: "bg-red-100 text-red-700 line-through",
};

const STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending: "⏳ Chờ gửi",
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

  // Menu data
  const [menuItems, setMenuItems] = useState<WaiterMenuItem[]>([]);
  const [categories, setCategories] = useState<WaiterCategory[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">("all");
  const [search, setSearch] = useState("");

  // Order data
  const [orderId, setOrderId] = useState<number | null>(null);
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

  // Tải order hiện tại của bàn
  useEffect(() => {
    if (!tableId) return;
    setOrderLoading(true);
    getOrdersByTable(Number(tableId))
      .then(async (orders) => {
        if (orders.length === 0) {
          setOrderId(null);
          setOrderItems([]);
          return;
        }
        const latest = orders[0];
        setOrderId(latest.id);
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
      })
      .catch(() => {
        setOrderItems([]);
      })
      .finally(() => setOrderLoading(false));
  }, [tableId]);

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

  const handleAddItemToOrder = async (targetItem: WaiterMenuItem, qty: number, note?: string) => {
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
    } catch {
      toast.error("Không thể thêm món. Vui lòng thử lại.");
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
          i.status === "pending" && i.held ? { ...i, status: "cooking" as OrderItemStatus, held: false } : i,
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
          i.status === "pending" && !i.held ? { ...i, status: "cooking" as OrderItemStatus } : i,
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
    const unfinishedItems = orderItems.filter((i) => (i.status === "pending" || i.status === "cooking") && i.status !== "voided");
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

  const handleVoidUnfinishedAndRequestPayment = async () => {
    if (!tableId || !orderId || !unfinishedPaymentModal) return;
    try {
      setProcessingPaymentRequest(true);
      for (const item of unfinishedPaymentModal) {
        await voidOrderItem(orderId, item.id, unfinishedVoidReason.trim() || "Khách yêu cầu thanh toán sớm");
      }
      const remainingActive = orderItems.filter(
        (i) => i.status !== "voided" && !unfinishedPaymentModal.some((u) => u.id === i.id)
      ).length;

      if (remainingActive === 0) {
        await updateTableStatus(Number(tableId), "empty");
        toast.success("Đã hủy toàn bộ món chưa ra và trả bàn trống thành công!");
      } else {
        await updateTableStatus(Number(tableId), "pending_payment");
        toast.success("Đã hủy các món chưa ra & gửi yêu cầu thanh toán thành công!");
      }
      setUnfinishedPaymentModal(null);
      navigate("/waiter/tables");
    } catch {
      toast.error("Có lỗi xảy ra khi hủy món và yêu cầu thanh toán");
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
        <p className="text-gray-500">Không tìm thấy bàn</p>
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

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/waiter/tables", { state: { selectedTableId: tableId } })}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-display flex items-center gap-2">
              <span>Gọi món — Bàn {table.name}</span>
              {table.guest_name && (
                <span className="text-base font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  👤 {table.guest_name} {table.guest_phone ? `(${table.guest_phone})` : ""}
                </span>
              )}
            </h1>
            <p className="text-sm text-gray-500">
              {orderId ? `Order #${orderId}` : "Chưa có order"} • {table.capacity} chỗ
              {table.area_name && ` • ${table.area_name}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
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
        <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
          {/* Categories */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategoryId("all")}
              className={`px-3 py-1.5 rounded-lg text-sm font-bold transition-all ${
                selectedCategoryId === "all" ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
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
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên món..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
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
              {filteredMenu.map((item) => (
                <div
                  key={item.id}
                  onClick={() => item.is_active && setAddItemTarget(item)}
                  className={`flex flex-col rounded-xl border text-left transition-all hover:shadow-md relative ${
                    item.is_active
                      ? "border-gray-100 hover:border-blue-200 cursor-pointer group"
                      : "border-gray-100 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <div className="w-full h-24 overflow-hidden rounded-t-xl shrink-0 relative">
                    <img
                      src={getImageUrl(item)}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200";
                      }}
                    />
                  </div>
                  <div className="p-2.5 bg-white rounded-b-xl flex items-end justify-between gap-1.5 flex-1">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-800 leading-tight line-clamp-2">{item.name}</p>
                      <p className="text-xs font-semibold text-blue-600 mt-1">
                        {Number(item.price).toLocaleString("vi-VN")}₫
                      </p>
                      {!item.is_active && (
                        <span className="text-[9px] text-red-500 font-bold block mt-0.5">Hết hàng</span>
                      )}
                    </div>
                    {item.is_active && (
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
              ))}
              {filteredMenu.length === 0 && !menuLoading && (
                <div className="col-span-3 py-10 text-center text-gray-400 text-sm">
                  Không tìm thấy món phù hợp
                </div>
              )}
            </div>
          )}
        </div>

        {/* Order panel */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Utensils size={18} className="text-blue-600" />
            <h2 className="font-bold text-gray-900">Order hiện tại</h2>
          </div>

          <div className="flex-1 space-y-2 max-h-[calc(100vh-360px)] overflow-y-auto">
            {orderLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 size={20} className="animate-spin text-blue-400" />
              </div>
            ) : orderItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-10 italic">Chưa có món trong order</p>
            ) : (
              orderItems.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border border-gray-100 ${item.status === "voided" ? "opacity-60" : ""}`}
                >
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-base text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-500 mt-0.5">×{item.quantity}</p>
                      {item.kitchenNote && (
                        <p className="text-xs text-amber-600 mt-1">📝 {item.kitchenNote}</p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="text-base font-black text-gray-800">
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
                            disabled={servingItemId === item.id}
                            onClick={async () => {
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
                            className="text-xs text-blue-600 font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 hover:text-blue-800 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            {servingItemId === item.id
                              ? <Loader2 size={13} className="animate-spin" />
                              : "🛎"} Đã mang ra
                          </button>
                        )}
                        {/* Nút Hủy — không hiện khi đã served hoặc voided */}
                        {item.status !== "voided" && item.status !== "served" && (
                          <button
                            onClick={() => setVoidTarget(item)}
                            className="text-xs text-red-500 font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 hover:text-red-700 transition-colors cursor-pointer"
                          >
                            <XCircle size={13} /> Hủy
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-base text-gray-500">Tổng cộng</span>
              <span className="text-3xl font-black text-gray-900">{total.toLocaleString("vi-VN")}₫</span>
            </div>
            <button
              onClick={() => navigate("/waiter/tables", { state: { selectedTableId: tableId } })}
              className="w-full py-3.5 bg-gray-800 text-white rounded-xl font-bold text-base hover:bg-gray-900"
            >
              Quay lại sơ đồ bàn
            </button>
            {table.status === "serving" && activeItems.length > 0 && (
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
                <p className="font-bold text-gray-900">{addItemTarget.name}</p>
                <p className="text-sm text-blue-600 font-bold">
                  {Number(addItemTarget.price).toLocaleString("vi-VN")}₫
                </p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setAddQty((q) => Math.max(1, q - 1))}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                <Minus size={16} />
              </button>
              <span className="text-2xl font-black text-gray-900 w-8 text-center">{addQty}</span>
              <button
                onClick={() => setAddQty((q) => q + 1)}
                className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200"
              >
                <Plus size={16} />
              </button>
            </div>

            <textarea
              value={addNote}
              onChange={(e) => setAddNote(e.target.value)}
              placeholder="Ghi chú bếp (tùy chọn)..."
              rows={2}
              className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none"
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

      {/* Modal xử lý nghiệp vụ khi bàn còn món chưa mang ra và bấm Yêu cầu thanh toán */}
      <Modal
        isOpen={!!unfinishedPaymentModal}
        onClose={() => !processingPaymentRequest && setUnfinishedPaymentModal(null)}
        title="⚠️ Cảnh báo: Bàn vẫn còn món chưa mang ra"
        size="md"
        theme="light"
      >
        {unfinishedPaymentModal && (
          <div className="space-y-4 text-sm">
            <p className="text-gray-600">
              Bàn <strong className="text-gray-900">{table?.name}</strong> hiện đang có{" "}
              <strong className="text-amber-600">{unfinishedPaymentModal.length} món</strong> đang chờ gửi bếp hoặc đang chế biến:
            </p>

            <div className="max-h-48 overflow-y-auto border border-amber-100 rounded-xl bg-amber-50/40 p-3 space-y-2">
              {unfinishedPaymentModal.map((item) => (
                <div key={item.id} className="flex justify-between items-center bg-white p-2.5 rounded-lg border border-amber-200/60 shadow-2xs text-xs">
                  <div>
                    <p className="font-bold text-gray-800">{item.name}</p>
                    <p className="text-gray-500">Số lượng: <span className="font-bold text-gray-700">{item.quantity}</span></p>
                  </div>
                  <span className={`px-2 py-1 rounded-md font-bold text-[10px] ${
                    item.status === "cooking" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {item.status === "cooking" ? "⏳ Đang nấu" : "📋 Chờ gửi bếp"}
                  </span>
                </div>
              ))}
            </div>

            {(() => {
              const servedOrDoneCount = orderItems.filter((i) => (i.status === "served" || i.status === "done") && i.status !== "voided").length;
              if (servedOrDoneCount === 0) {
                return (
                  <div className="space-y-3">
                    <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium space-y-1">
                      <p className="font-bold text-rose-900 flex items-center gap-1.5 text-sm">
                        ⛔ Bàn chưa có món nào được mang ra (`Đã mang ra = 0`)
                      </p>
                      <p>Khách chưa ăn hoặc bếp chưa làm xong thì không thể yêu cầu thu ngân thanh toán trước! Nếu khách đổi ý rời đi không ăn nữa, vui lòng chọn Hủy toàn bộ món bên dưới.</p>
                    </div>

                    <div className="space-y-1.5 pt-1">
                      <label className="block text-xs font-bold text-gray-700">
                        Lý do hủy toàn bộ món chưa ra:
                      </label>
                      <input
                        type="text"
                        value={unfinishedVoidReason}
                        onChange={(e) => setUnfinishedVoidReason(e.target.value)}
                        placeholder="Khách rời đi không dùng bữa..."
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-rose-500/20"
                      />
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <button
                        onClick={handleVoidUnfinishedAndRequestPayment}
                        disabled={processingPaymentRequest}
                        className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                      >
                        {processingPaymentRequest ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                        Hủy toàn bộ món chưa ra & Trả bàn trống (0đ)
                      </button>

                      <button
                        onClick={() => setUnfinishedPaymentModal(null)}
                        disabled={processingPaymentRequest}
                        className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-xs hover:bg-gray-200 transition-colors cursor-pointer mt-1"
                      >
                        Đóng / Tiếp tục chờ bếp phục vụ
                      </button>
                    </div>
                  </div>
                );
              }

              return (
                <div className="space-y-3">
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Lý do hủy món (nếu chọn hủy & tính tiền luôn):
                    </label>
                    <input
                      type="text"
                      value={unfinishedVoidReason}
                      onChange={(e) => setUnfinishedVoidReason(e.target.value)}
                      placeholder="Khách yêu cầu thanh toán sớm..."
                      className="w-full p-2.5 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-amber-500/20"
                    />
                  </div>

                  <div className="text-xs text-gray-600 bg-gray-50 p-3 rounded-xl space-y-1 border border-gray-100">
                    <p className="font-bold text-gray-800">💡 Nghiệp vụ xử lý:</p>
                    <p>• <strong>Hủy món & Thanh toán:</strong> Khách không muốn chờ món đang làm nữa (hủy để không tính tiền vào hóa đơn và gửi thu ngân thanh toán tiền các món đã dùng).</p>
                  </div>

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      onClick={handleVoidUnfinishedAndRequestPayment}
                      disabled={processingPaymentRequest}
                      className="w-full py-3 bg-rose-600 text-white rounded-xl font-bold text-xs hover:bg-rose-700 transition-colors cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                    >
                      {processingPaymentRequest ? <Loader2 size={15} className="animate-spin" /> : <XCircle size={15} />}
                      Hủy các món chưa ra & Yêu cầu thanh toán luôn (Chỉ tính món đã ra)
                    </button>

                    <button
                      onClick={() => setUnfinishedPaymentModal(null)}
                      disabled={processingPaymentRequest}
                      className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-xs hover:bg-gray-200 transition-colors cursor-pointer mt-1"
                    >
                      Đóng / Tiếp tục chờ bếp phục vụ xong
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}
      </Modal>
    </div>
  );
};
