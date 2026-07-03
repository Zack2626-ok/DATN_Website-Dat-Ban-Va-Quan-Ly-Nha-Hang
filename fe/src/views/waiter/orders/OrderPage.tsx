import React, { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Search, Utensils, Pause, Send, ArrowLeft, Minus, Plus, XCircle, Loader2 } from "lucide-react";
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
  voided: "bg-red-100 text-red-700 line-through",
};

const STATUS_LABELS: Record<OrderItemStatus, string> = {
  pending: "⏳ Chờ gửi",
  cooking: "🔥 Đang nấu",
  done: "✅ Hoàn thành",
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
  const [addNote, setAddNote] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [voidTarget, setVoidTarget] = useState<DisplayOrderItem | null>(null);
  const [sending, setSending] = useState(false);
  const [holding, setHolding] = useState(false);

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
            status: i.status as OrderItemStatus,
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

  const handleAddToOrder = async () => {
    if (!addItemTarget) return;
    setAddingItem(true);
    try {
      let currentOrderId = orderId;
      // Nếu chưa có order, tạo mới
      if (!currentOrderId) {
        const newOrder = await createOrder({
          table_id: Number(tableId),
          created_by: getCurrentUserId(),
          order_type: "dine_in",
        });
        currentOrderId = newOrder.id;
        setOrderId(currentOrderId);
      }

      const newItem = await addOrderItem(currentOrderId, {
        menu_item_id: addItemTarget.id,
        quantity: addQty,
        unit_price: addItemTarget.price,
        kitchen_note: addNote.trim() || undefined,
      });

      setOrderItems((prev) => [
        ...prev,
        {
          id: newItem.id,
          menuItemId: addItemTarget.id,
          name: addItemTarget.name,
          price: addItemTarget.price,
          quantity: addQty,
          status: "pending" as OrderItemStatus,
          kitchenNote: addNote.trim() || undefined,
          held: false,
        },
      ]);

      toast.success(`Đã thêm ${addItemTarget.name} vào order`);
      setAddItemTarget(null);
      setAddQty(1);
      setAddNote("");
    } catch {
      toast.error("Không thể thêm món. Vui lòng thử lại.");
    } finally {
      setAddingItem(false);
    }
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
    if (!tableId) return;
    try {
      await updateTableStatus(Number(tableId), "pending_payment");
      toast.success("Đã gửi yêu cầu thanh toán — thu ngân sẽ xử lý tại quầy");
      navigate("/waiter/tables");
    } catch {
      toast.error("Không thể gửi yêu cầu thanh toán");
    }
  };

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
            onClick={() => navigate("/waiter/tables")}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 font-display">
              Gọi món — Bàn {table.name}
            </h1>
            <p className="text-sm text-gray-500">
              {orderId ? `Order #${orderId}` : "Chưa có order"} • {table.capacity} chỗ
              {table.area_name && ` • ${table.area_name}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleHold}
            disabled={pendingCount === 0 || holding}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-sm hover:bg-amber-100 disabled:opacity-50"
          >
            {holding ? <Loader2 size={16} className="animate-spin" /> : <Pause size={16} />}
            Hold ({pendingCount})
          </button>
          <button
            onClick={handleSendHeldToKitchen}
            disabled={heldCount === 0 || sending}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-xl font-bold text-sm hover:bg-amber-700 disabled:opacity-50"
          >
            Gửi hold ({heldCount})
          </button>
          <button
            onClick={handleSendToKitchen}
            disabled={pendingCount === 0 || sending}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 disabled:opacity-50"
          >
            {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Gửi bếp ({pendingCount})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Thực đơn */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
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
                <button
                  key={item.id}
                  onClick={() => item.is_active && setAddItemTarget(item)}
                  disabled={!item.is_active}
                  className={`flex flex-col rounded-xl border overflow-hidden text-left transition-all hover:shadow-md ${
                    item.is_active
                      ? "border-gray-100 hover:border-blue-200 cursor-pointer"
                      : "border-gray-100 opacity-50 cursor-not-allowed"
                  }`}
                >
                  <img
                    src={getImageUrl(item)}
                    alt={item.name}
                    className="w-full h-24 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200";
                    }}
                  />
                  <div className="p-2.5">
                    <p className="text-sm font-bold text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs font-semibold text-blue-600 mt-0.5">
                      {Number(item.price).toLocaleString("vi-VN")}₫
                    </p>
                    {!item.is_active && (
                      <span className="text-[9px] text-red-500 font-bold">Hết hàng</span>
                    )}
                  </div>
                </button>
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
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Utensils size={18} className="text-blue-600" />
            <h2 className="font-bold text-gray-900">Order hiện tại</h2>
            {heldCount > 0 && (
              <span className="text-[10px] font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                {heldCount} hold
              </span>
            )}
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
                  className={`p-3 rounded-xl border border-gray-100 ${item.status === "voided" ? "opacity-60" : ""}`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-gray-800">{item.name}</p>
                      <p className="text-xs text-gray-500">×{item.quantity}</p>
                      {item.kitchenNote && (
                        <p className="text-[10px] text-amber-600 mt-1">📝 {item.kitchenNote}</p>
                      )}
                      {item.held && item.status === "pending" && (
                        <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded">⏸ HOLD</span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-black text-gray-800">
                        {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                      </span>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[item.status]}`}
                      >
                        {STATUS_LABELS[item.status]}
                      </span>
                      {item.status !== "voided" && item.status !== "done" && (
                        <button
                          onClick={() => setVoidTarget(item)}
                          className="text-[10px] text-red-500 font-bold flex items-center gap-0.5 hover:text-red-700"
                        >
                          <XCircle size={12} /> Hủy
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-gray-100 pt-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="font-bold text-gray-500">Tổng cộng</span>
              <span className="text-2xl font-black text-gray-900">{total.toLocaleString("vi-VN")}₫</span>
            </div>
            <button
              onClick={() => navigate("/waiter/tables")}
              className="w-full py-3 bg-gray-800 text-white rounded-xl font-bold text-sm hover:bg-gray-900"
            >
              Quay lại sơ đồ bàn
            </button>
            {table.status === "serving" && (
              <button
                onClick={handleRequestPayment}
                className="w-full py-3 border-2 border-purple-200 text-purple-700 rounded-xl font-bold text-sm hover:bg-purple-50"
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
    </div>
  );
};
