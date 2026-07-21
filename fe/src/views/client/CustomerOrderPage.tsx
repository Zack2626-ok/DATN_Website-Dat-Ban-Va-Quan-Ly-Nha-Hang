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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <p className="text-lg text-gray-600">Không tìm thấy thông tin bàn.</p>
          <p className="text-sm text-gray-400 mt-2">Vui lòng quét lại mã QR.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="text-center">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Đặt món thành công!</h2>
          <p className="text-gray-500">Món ăn sẽ được chuẩn bị trong giây lát.</p>
          <button
            onClick={() => {
              setSubmitted(false);
              setCart([]);
            }}
            className="mt-6 px-6 py-2 bg-orange-500 text-white rounded-lg font-medium"
          >
            Đặt thêm món
          </button>
        </div>
      </div>
    );
  }

  const filteredItems = activeCategory
    ? menuItems.filter((item) => item.category_id === activeCategory)
    : menuItems;

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      <div className="bg-orange-500 text-white px-4 py-3 sticky top-0 z-10">
        <h1 className="text-lg font-bold">Đặt món - Bàn #{tableId}</h1>
        <p className="text-sm text-orange-100">Chọn món từ menu bên dưới</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500" />
        </div>
      ) : (
        <>
          <div className="flex overflow-x-auto gap-2 px-4 py-3 bg-white sticky top-[60px] z-10 shadow-sm">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  activeCategory === cat.id
                    ? "bg-orange-500 text-white"
                    : "bg-gray-100 text-gray-600"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>

          <div className="px-4 py-3 space-y-3">
            {filteredItems.length === 0 ? (
              <p className="text-center text-gray-400 py-8">Không có món trong danh mục này</p>
            ) : (
              filteredItems.map((item) => {
                const qty = getCartQuantity(item.id);
                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-800 truncate">{item.name}</p>
                      <p className="text-sm text-gray-400 mt-0.5 line-clamp-1">
                        {item.description}
                      </p>
                      <p className="text-orange-500 font-bold mt-1">
                        {Number(item.price).toLocaleString("vi-VN")}đ
                      </p>
                    </div>
                    {qty === 0 ? (
                      <button
                        onClick={() => addToCart(item)}
                        className="flex-shrink-0 w-9 h-9 rounded-full bg-orange-500 text-white flex items-center justify-center text-lg font-bold"
                      >
                        +
                      </button>
                    ) : (
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-8 h-8 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center font-bold"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-bold">{qty}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold"
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
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-20 px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <input
              type="text"
              placeholder="Tên (tuỳ chọn)"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
            />
            <input
              type="tel"
              placeholder="SĐT (tuỳ chọn)"
              value={guestPhone}
              onChange={(e) => setGuestPhone(e.target.value)}
              className="flex-1 border rounded-lg px-3 py-1.5 text-sm"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{cartCount} món</p>
              <p className="text-lg font-bold text-orange-500">
                {cartTotal.toLocaleString("vi-VN")}đ
              </p>
            </div>
            <button
              onClick={handleSubmitOrder}
              disabled={submitting}
              className="px-6 py-3 bg-orange-500 text-white rounded-xl font-bold text-base disabled:opacity-50"
            >
              {submitting ? "Đang gửi..." : "Gọi món"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrderPage;
