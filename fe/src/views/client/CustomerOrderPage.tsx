import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getPublicMenu, createQROrder } from "../../services/customerService";

interface CartItem {
  menu_item_id: number;
  name: string;
  unit_price: number;
  quantity: number;
}

const CustomerOrderPage = () => {
  const [searchParams] = useSearchParams();
  const tableId = searchParams.get("table");

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  useEffect(() => {
    const fetchMenu = async () => {
      try {
        const data = await getPublicMenu();
        setMenuItems(data.items || []);
        setCategories(data.categories || []);
        if (data.categories?.length > 0) {
          setActiveCategory(data.categories[0].id);
        }
      } catch (err) {
        console.error("Failed to load menu", err);
      } finally {
        setLoading(false);
      }
    };
    fetchMenu();
  }, []);

  const addToCart = (item: any) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menu_item_id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menu_item_id === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
      }
      return [
        ...prev,
        { menu_item_id: item.id, name: item.name, unit_price: Number(item.price), quantity: 1 },
      ];
    });
  };

  const updateQuantity = (menuItemId: number, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) =>
          c.menu_item_id === menuItemId ? { ...c, quantity: c.quantity + delta } : c
        )
        .filter((c) => c.quantity > 0)
    );
  };

  const cartTotal = cart.reduce((sum, c) => sum + c.unit_price * c.quantity, 0);
  const cartCount = cart.reduce((sum, c) => sum + c.quantity, 0);

  const getCartQuantity = (itemId: number) =>
    cart.find((c) => c.menu_item_id === itemId)?.quantity || 0;

  const handleSubmitOrder = async () => {
    if (!tableId || cart.length === 0) return;
    setSubmitting(true);
    try {
      await createQROrder({
        table_id: Number(tableId),
        items: cart.map((c) => ({
          menu_item_id: c.menu_item_id,
          quantity: c.quantity,
          unit_price: c.unit_price,
        })),
        guest_name: guestName || undefined,
        guest_phone: guestPhone || undefined,
      });
      setSubmitted(true);
      setCart([]);
    } catch (err) {
      console.error("Failed to submit order", err);
      alert("Đặt món thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!tableId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-client-bg p-4">
        <div className="text-center">
          <p className="text-lg text-client-text font-bold font-display">Không tìm thấy thông tin bàn.</p>
          <p className="text-sm text-client-muted mt-2">Vui lòng quét lại mã QR được đặt trên bàn ăn.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-client-bg p-4">
        <div className="text-center p-8 bg-white border border-client-accent rounded-3xl shadow-lg max-w-sm w-full">
          <div className="text-5xl mb-4">✨</div>
          <h2 className="text-xl font-bold text-client-text mb-2 font-display">Đặt món thành công!</h2>
          <p className="text-sm text-client-muted leading-relaxed">
            Món ăn đã được gửi trực tiếp đến nhà bếp và sẽ được chuẩn bị trong giây lát.
          </p>
          <button
            onClick={() => {
              setSubmitted(false);
              setCart([]);
            }}
            className="mt-6 w-full py-3 bg-client-primary hover:bg-client-primary-hover text-white rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer"
          >
            Tiếp tục gọi món
          </button>
        </div>
      </div>
    );
  }

  const filteredItems = activeCategory
    ? menuItems.filter((item) => item.category_id === activeCategory)
    : menuItems;

  return (
    <div className="min-h-screen bg-client-bg pb-32">
      <div className="bg-gradient-to-r from-[#2a221c] to-[#3d3229] text-white px-4 py-4 sticky top-0 z-10 shadow-md">
        <h1 className="text-lg font-bold font-display text-client-secondary">Thực đơn tại bàn — Bàn #{tableId}</h1>
        <p className="text-xs text-[#c9bfae]">Gọi món nhanh chóng không cần chờ phục vụ</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-client-primary" />
        </div>
      ) : (
        <>
          <div className="flex overflow-x-auto gap-2 px-4 py-3 bg-white sticky top-[68px] z-10 shadow-xs scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                  activeCategory === cat.id
                    ? "bg-client-primary text-white"
                    : "bg-[#f0eae1] text-client-muted hover:bg-[#e7decb]"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="px-4 py-3 space-y-3">
            {filteredItems.length === 0 ? (
              <p className="text-center text-client-muted py-8 text-sm">Không có món trong danh mục này</p>
            ) : (
              filteredItems.map((item) => {
                const qty = getCartQuantity(item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-4 shadow-xs flex items-center gap-3 border border-client-accent"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-client-text font-display text-base truncate">{item.name}</p>
                      <p className="text-xs text-client-muted mt-0.5 line-clamp-1">
                        {item.description || "Hương vị ẩm thực độc bản từ ResManager"}
                      </p>
                      <p className="text-client-primary font-black mt-1">
                        {Number(item.price).toLocaleString("vi-VN")}đ
                      </p>
                    </div>
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="flex-shrink-0 w-9 h-9 rounded-full bg-client-primary hover:bg-client-primary-hover text-white flex items-center justify-center text-lg font-bold shadow-xs cursor-pointer"
                      >
                        +
                      </button>
                    ) : (
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-8 h-8 rounded-full bg-[#f0eae1] text-client-text hover:bg-client-accent flex items-center justify-center font-bold cursor-pointer"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-bold text-sm text-client-text">{qty}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-8 h-8 rounded-full bg-client-primary hover:bg-client-primary-hover text-white flex items-center justify-center font-bold cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-client-accent shadow-lg z-20 px-4 py-4 animate-fade-in">
          <div className="flex items-center gap-2 mb-3">
            <input
              type="text"
              placeholder="Tên của bạn (tuỳ chọn)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-client-secondary focus:outline-none"
            />
            <input
              type="tel"
              placeholder="Số điện thoại (tuỳ chọn)"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-client-secondary focus:outline-none"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-client-muted font-semibold">{cartCount} món ăn đã chọn</p>
              <p className="text-lg font-black text-client-primary">
                {cartTotal.toLocaleString("vi-VN")}đ
              </p>
            </div>
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="px-6 py-3 bg-client-primary hover:bg-client-primary-hover text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50 cursor-pointer"
            >
              {submitting ? "Đang gửi đơn..." : "Gửi yêu cầu gọi món"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrderPage;
