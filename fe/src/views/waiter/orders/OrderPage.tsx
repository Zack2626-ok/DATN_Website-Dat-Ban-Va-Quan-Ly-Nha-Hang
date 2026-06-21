import React, { useState, useMemo } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Search, Utensils, Pause, Send, ArrowLeft, Minus, Plus, XCircle } from "lucide-react";
import { Modal } from "../../../components/Modal";
import { MOCK_TABLES } from "../../../data/mockTables";
import { MOCK_MENU_ITEMS, MENU_CATEGORIES, type MenuCategory, type WaiterMenuItem } from "./mockMenu";
import { VoidItemModal, type OrderItemStatus } from "./VoidItemModal";
import { toast } from "react-hot-toast";

interface OrderLineItem {
  id: string;
  menuItemId: string;
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

const INITIAL_ITEMS: OrderLineItem[] = [
  { id: "oi1", menuItemId: "m3", name: "Bò lúc lắc", price: 265000, quantity: 1, status: "cooking", held: false },
  { id: "oi2", menuItemId: "m4", name: "Gà nướng mật ong", price: 195000, quantity: 2, status: "pending", held: true },
];

/**
 * Gọi món / Thêm vào order — Hold / Gửi bếp ngay
 */
export const OrderPage: React.FC = () => {
  const { tableId } = useParams<{ tableId: string }>();
  const navigate = useNavigate();

  const table = MOCK_TABLES.find((t) => t.id.toString() === tableId);

  const [category, setCategory] = useState<MenuCategory>("all");
  const [search, setSearch] = useState("");
  const [orderItems, setOrderItems] = useState<OrderLineItem[]>(INITIAL_ITEMS);
  const [addItemTarget, setAddItemTarget] = useState<WaiterMenuItem | null>(null);
  const [addQty, setAddQty] = useState(1);
  const [addNote, setAddNote] = useState("");
  const [voidTarget, setVoidTarget] = useState<OrderLineItem | null>(null);

  const filteredMenu = useMemo(() => {
    return MOCK_MENU_ITEMS.filter((item) => {
      const matchCat = category === "all" || item.category === category;
      const matchSearch = item.name.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [category, search]);

  const activeItems = orderItems.filter((i) => i.status !== "voided");
  const total = activeItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const pendingCount = orderItems.filter((i) => i.status === "pending" && !i.held).length;
  const heldCount = orderItems.filter((i) => i.status === "pending" && i.held).length;

  const handleAddToOrder = () => {
    if (!addItemTarget) return;
    const newItem: OrderLineItem = {
      id: `oi_${Date.now()}`,
      menuItemId: addItemTarget.id,
      name: addItemTarget.name,
      price: addItemTarget.price,
      quantity: addQty,
      status: "pending",
      held: false,
      kitchenNote: addNote.trim() || undefined,
    };
    setOrderItems((prev) => [...prev, newItem]);
    toast.success(`Đã thêm ${addItemTarget.name} vào order`);
    setAddItemTarget(null);
    setAddQty(1);
    setAddNote("");
  };

  const handleHold = () => {
    setOrderItems((prev) =>
      prev.map((i) =>
        i.status === "pending" && !i.held ? { ...i, held: true } : i,
      ),
    );
    toast.success("Đã hold các món chờ gửi bếp");
  };

  const handleSendToKitchen = () => {
    const toSend = orderItems.filter((i) => i.status === "pending" && !i.held);
    if (toSend.length === 0) {
      toast.error("Không có món nào cần gửi bếp");
      return;
    }
    setOrderItems((prev) =>
      prev.map((i) =>
        i.status === "pending" && !i.held ? { ...i, status: "cooking" as OrderItemStatus } : i,
      ),
    );
    toast.success(`Đã gửi ${toSend.length} món xuống bếp`);
  };

  const handleVoidConfirm = (itemId: string, _reason: string, notifyKds: boolean) => {
    setOrderItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, status: "voided" as OrderItemStatus } : i)),
    );
    if (notifyKds) {
      // UI mock — thực tế sẽ emit socket order:item_voided
    }
  };

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
            <p className="text-sm text-gray-500">Order #ord_{table.id} • {table.capacity} chỗ</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleHold}
            disabled={pendingCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl font-bold text-sm hover:bg-amber-100 disabled:opacity-50"
          >
            <Pause size={16} />
            Hold ({pendingCount})
          </button>
          <button
            onClick={handleSendToKitchen}
            disabled={pendingCount === 0}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl font-bold text-sm hover:bg-orange-700 disabled:opacity-50"
          >
            <Send size={16} />
            Gửi bếp ({pendingCount})
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Thực đơn */}
        <div className="lg:col-span-3 bg-white rounded-2xl border border-gray-200 p-5 flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            {MENU_CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setCategory(cat.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  category === cat.key
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm tên món..."
              className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[calc(100vh-280px)] overflow-y-auto">
            {filteredMenu.map((item) => (
              <button
                key={item.id}
                onClick={() => item.inStock && setAddItemTarget(item)}
                disabled={!item.inStock}
                className={`flex flex-col rounded-xl border overflow-hidden text-left transition-all hover:shadow-md ${
                  item.inStock
                    ? "border-gray-100 hover:border-blue-200 cursor-pointer"
                    : "border-gray-100 opacity-50 cursor-not-allowed"
                }`}
              >
                <img src={item.image} alt={item.name} className="w-full h-24 object-cover" />
                <div className="p-2.5">
                  <p className="text-xs font-bold text-gray-800 truncate">{item.name}</p>
                  <p className="text-[10px] font-semibold text-blue-600 mt-0.5">
                    {item.price.toLocaleString("vi-VN")}₫
                  </p>
                  {!item.inStock && (
                    <span className="text-[9px] text-red-500 font-bold">Hết hàng</span>
                  )}
                </div>
              </button>
            ))}
          </div>
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
            {orderItems.length === 0 ? (
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
                        <span className="text-[10px] font-bold text-amber-600">HOLD</span>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-black text-gray-800">
                        {(item.price * item.quantity).toLocaleString("vi-VN")}₫
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLES[item.status]}`}>
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
          </div>
        </div>
      </div>

      {/* Modal thêm món */}
      <Modal
        isOpen={!!addItemTarget}
        onClose={() => { setAddItemTarget(null); setAddQty(1); setAddNote(""); }}
        title={addItemTarget ? `Thêm: ${addItemTarget.name}` : ""}
        size="sm"
        theme="light"
      >
        {addItemTarget && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img src={addItemTarget.image} alt="" className="w-16 h-16 rounded-xl object-cover" />
              <div>
                <p className="font-bold text-gray-900">{addItemTarget.name}</p>
                <p className="text-sm text-blue-600 font-bold">
                  {addItemTarget.price.toLocaleString("vi-VN")}₫
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
              className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700"
            >
              Thêm vào order
            </button>
          </div>
        )}
      </Modal>

      <VoidItemModal
        isOpen={!!voidTarget}
        onClose={() => setVoidTarget(null)}
        item={voidTarget}
        tableName={table.name}
        onConfirm={handleVoidConfirm}
      />
    </div>
  );
};
