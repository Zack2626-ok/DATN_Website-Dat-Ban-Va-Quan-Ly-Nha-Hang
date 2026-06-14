import React, { useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../store";
import { createOrder } from "../../../store/orderSlice";
import { occupyTable } from "../../../store/tableSlice";
import { ORDER_STATUS } from "../../../constants/orderStatus";
import { Search, Flame, Plus, ShoppingBag, CheckCircle } from "lucide-react";
import type { MenuItem } from "../../../interfaces";

export const ClientMenuDemo: React.FC = () => {
  const dispatch = useAppDispatch();
  const menuItems = useAppSelector((state) => state.menu.items);

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<{ item: MenuItem; quantity: number }[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Filter menu items
  const filteredItems = useMemo(() => {
    return menuItems.filter((item) => {
      const matchesCategory =
        activeCategory === "all" || item.category === activeCategory;

      const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [menuItems, activeCategory, searchQuery]);

  const handleAddToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.item.id === item.id);
      if (existing) {
        return prev.map((c) => (c.item.id === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [...prev, { item, quantity: 1 }];
    });
  };

  const handleRemoveFromCart = (itemId: string) => {
    setCart((prev) =>
      prev
        .map((c) => (c.item.id === itemId ? { ...c, quantity: c.quantity - 1 } : c))
        .filter((c) => c.quantity > 0)
    );
  };

  const handleSendOrder = () => {
    if (cart.length === 0) return;

    const newOrderId = "ord_client_" + Math.random().toString(36).substr(2, 9);
    const orderItems = cart.map((c) => ({
      menuItemId: c.item.id,
      name: c.item.name,
      price: c.item.price,
      quantity: c.quantity,
    }));
    const total = cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0);

    // Dispatch Order to Redux (assigning to Table 2 / B02)
    dispatch(
      createOrder({
        id: newOrderId,
        tableId: "t2",
        tableName: "B02",
        guestCount: 2,
        items: orderItems,
        status: ORDER_STATUS.CONFIRMED,
        totalAmount: total,
      })
    );

    // Mark Table 2 as Occupied
    dispatch(occupyTable({ id: "t2", orderId: newOrderId }));

    setCart([]);
    setSuccessMessage("Đã gửi đơn hàng đến nhà bếp thành công! Bàn B02 đã bắt đầu phục vụ.");
    setTimeout(() => setSuccessMessage(null), 5000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in text-slate-800">

      {/* Menu Catalog Panel */}
      <div className="lg:col-span-2 bg-white rounded-3xl border border-slate-200 p-6 flex flex-col gap-5 shadow-2xs">

        {/* Header client info */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-black font-display text-slate-900 tracking-tight">RestaurantOS</h3>
            <span className="text-xs text-slate-400 font-semibold">Bàn B02 - Menu điện tử tại bàn</span>
          </div>
          <span className="px-3 py-1 bg-blue-600 text-white text-[10px] font-black uppercase rounded-full tracking-wider animate-pulse">
            QR Order
          </span>
        </div>

        {successMessage && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2.5 text-xs font-bold animate-fade-in">
            <CheckCircle size={16} className="text-emerald-600" />
            {successMessage}
          </div>
        )}

        {/* Search input tool */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
          <input
            type="text"
            placeholder="Tìm món ăn..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-350 text-xs font-semibold text-slate-850"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "Tất cả" },
            { key: "Khai vị", label: "Món khai vị" },
            { key: "Món chính", label: "Món chính" },
            { key: "Lẩu", label: "Lẩu" },
            { key: "Đồ uống", label: "Nước uống" },
            { key: "Tráng miệng", label: "Món tráng miệng" },
          ].map((cat) => (
            <button
              key={cat.key}
              onClick={() => setActiveCategory(cat.key)}
              className={`px-4 py-2 rounded-xl text-xs font-bold font-display tracking-wide transition-all cursor-pointer ${activeCategory === cat.key
                  ? "bg-slate-900 text-white shadow-2xs"
                  : "bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-200/60 hover:bg-slate-100"
                }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Items Grid Stack */}
        <div className="flex flex-col gap-4 max-h-[500px] overflow-y-auto pr-1 scrollbar">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="border border-slate-150/70 p-4 rounded-2xl flex gap-4 bg-slate-50/50 hover:bg-slate-50 transition-colors shadow-2xs items-start"
            >
              {/* Image box with soft peach background */}
              <div className="w-20 h-20 bg-[#ffd8be]/50 rounded-xl flex-shrink-0 relative overflow-hidden flex items-center justify-center border border-[#ffcdad]/30">
                {item.image ? (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-xl" />
                ) : (
                  <span className="text-xs font-bold text-orange-500 uppercase font-display">{item.name[0]}</span>
                )}
                {item.isBestSeller && (
                  <span className="absolute top-1 left-1 bg-rose-500 text-white text-[8px] font-black uppercase px-1 rounded flex items-center gap-0.5 shadow-xs">
                    <Flame size={8} /> Hot
                  </span>
                )}
              </div>

              {/* Text description details */}
              <div className="flex-1 min-w-0 flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <h4 className="text-sm font-bold text-slate-900 truncate">{item.name}</h4>
                  <span className="text-sm font-black text-slate-900">{(item.price * 1000).toLocaleString("vi-VN")} vnđ</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium leading-relaxed mt-0.5 max-h-[32px] overflow-hidden truncate-2-lines">
                  {item.description || "Món ăn cao cấp chế biến độc quyền bởi các nguyên liệu chọn lọc tươi ngon trong ngày."}
                </p>
              </div>

              {/* Add item button */}
              <button
                onClick={() => handleAddToCart(item)}
                className="w-8 h-8 rounded-lg bg-orange-500 hover:bg-orange-600 text-white flex items-center justify-center font-bold text-sm shadow-xs transition-colors cursor-pointer flex-shrink-0"
              >
                <Plus size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Dynamic Shopping Cart Panel */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 flex flex-col gap-5 shadow-2xs h-fit">
        <div className="border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShoppingBag size={18} className="text-orange-500" />
          <h4 className="text-sm font-black text-slate-900 font-display">Giỏ hàng của bàn</h4>
        </div>

        {cart.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-xs italic flex flex-col gap-2 font-medium">
            <span>Giỏ hàng trống.</span>
            <span>Vui lòng chọn món bên danh mục thực đơn.</span>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
              {cart.map((c) => (
                <div key={c.item.id} className="flex justify-between items-center text-xs p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex flex-col">
                    <span className="font-bold text-slate-800">{c.item.name}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{(c.item.price * 1000).toLocaleString("vi-VN")} vnđ mỗi món</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleRemoveFromCart(c.item.id)}
                      className="w-5 h-5 rounded bg-slate-200 text-slate-600 font-black text-xs cursor-pointer flex items-center justify-center hover:bg-slate-300"
                    >
                      -
                    </button>
                    <span className="font-black text-slate-900 text-xs px-1">{c.quantity}</span>
                    <button
                      onClick={() => handleAddToCart(c.item)}
                      className="w-5 h-5 rounded bg-slate-250 text-slate-700 font-black text-xs cursor-pointer flex items-center justify-center hover:bg-slate-350"
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-100 pt-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                <span>Số lượng món:</span>
                <span className="text-slate-900">{cart.reduce((sum, c) => sum + c.quantity, 0)} món</span>
              </div>
              <div className="flex justify-between items-center text-sm font-bold text-slate-900">
                <span>Tổng tiền tạm tính:</span>
                <span className="text-orange-500 text-base font-black">
                  {(cart.reduce((sum, c) => sum + c.item.price * c.quantity, 0) * 1000).toLocaleString("vi-VN")} vnđ
                </span>
              </div>

              <button
                onClick={handleSendOrder}
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-colors cursor-pointer text-center font-display mt-2"
              >
                GỬI ĐƠN ĐẾN NHÀ BẾP
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};
