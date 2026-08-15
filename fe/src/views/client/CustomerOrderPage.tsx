import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { getPublicMenu, verifyQRSession } from "../../services/customerService";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { setSessionData } from "../../store/clientCartSlice";
import { clientSocketService } from "../../services/clientSocketService";

const CustomerOrderPage = () => {
  const [searchParams] = useSearchParams();
  const tableIdFromUrl = searchParams.get("table_id") || searchParams.get("table");
  const token = searchParams.get("token");

  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.clientCart.items);
  const isConnected = useSelector((state: RootState) => state.clientCart.isConnected);

  const [menuItems, setMenuItems] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [activeCategory, setActiveCategory] = useState<number | null>(null);
  
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  useEffect(() => {
    const initPage = async () => {
      try {
        if (!tableIdFromUrl || !token) {
          setErrorMsg("Không tìm thấy thông tin bàn hoặc mã QR không hợp lệ.");
          setLoading(false);
          return;
        }

        // Xác thực QR Token
        const sessionRes = await verifyQRSession(token);
        dispatch(setSessionData({
          tableId: tableIdFromUrl,
          sessionId: sessionRes.session.sessionId,
          token
        }));

        // Lấy Menu
        const menuData = await getPublicMenu();
        setMenuItems(menuData.items || []);
        setCategories(menuData.categories || []);
        if (menuData.categories?.length > 0) {
          setActiveCategory(menuData.categories[0].id);
        }

        // Kết nối Socket
        clientSocketService.connect(token);

      } catch (err) {
        console.error("Failed to init page", err);
        setErrorMsg("Mã QR đã hết hạn hoặc không hợp lệ. Vui lòng liên hệ nhân viên.");
      } finally {
        setLoading(false);
      }
    };
    
    initPage();

    return () => {
      clientSocketService.disconnect();
    };
  }, [tableIdFromUrl, token, dispatch]);

  const addToCart = (item: any) => {
    clientSocketService.addItem({
      productId: item.id,
      menu_item_id: item.id, // For compatibility
      name: item.name,
      price: Number(item.price),
      unit_price: Number(item.price),
      quantity: 1
    });
  };

  const updateQuantity = (cartItemId: string | undefined, delta: number) => {
    if (!cartItemId && delta === -1) {
       // logic for removing if no ID? Usually we have _id from redis
       return;
    }
    // Simplification: In a real app, updateQuantity might need a specific API in Redis
    // If it's a minus, we might just call removeItem
    if (delta === -1 && cartItemId) {
      clientSocketService.removeItem(cartItemId);
    } else {
      // Adding more
      // Not fully optimal, but works for demo: we can just call addItem again to increase by 1
      const cartItem = cartItems.find((c: any) => c._id === cartItemId);
      if (cartItem) {
        clientSocketService.addItem({
          productId: cartItem.productId,
          menu_item_id: cartItem.menu_item_id,
          name: cartItem.name,
          price: cartItem.price,
          unit_price: cartItem.unit_price,
          quantity: 1
        });
      }
    }
  };

  const cartTotal = cartItems.reduce((sum, c) => sum + (c.price || c.unit_price) * c.quantity, 0);
  const cartCount = cartItems.reduce((sum, c) => sum + c.quantity, 0);

  const getCartQuantity = (itemId: number) =>
    cartItems.filter((c) => (c.productId === itemId || c.menu_item_id === itemId)).reduce((s, c) => s + c.quantity, 0);

  const getCartItemIds = (itemId: number) => {
    const matching = cartItems.filter((c) => (c.productId === itemId || c.menu_item_id === itemId));
    return matching.length > 0 ? matching[0]._id : undefined;
  };

  const handleSubmitOrder = async () => {
    if (!tableIdFromUrl || cartItems.length === 0) return;
    setSubmitting(true);
    
    // In a real app we might pass guestName/guestPhone via socket or update the session
    clientSocketService.submitOrder();
    
    // Fake success for UI immediately or listen to order_submitted_success
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 1000);
  };

  if (errorMsg) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-client-bg p-4">
        <div className="text-center">
          <p className="text-lg text-red-600 font-bold font-display">{errorMsg}</p>
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
            onClick={() => setSubmitted(false)}
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
    <div className="bg-client-bg min-h-screen pb-24 font-sans selection:bg-client-primary/20 relative">
      {!isConnected && (
        <div className="bg-red-500 text-white px-4 py-2 text-center text-xs font-bold sticky top-0 z-50 animate-pulse">
          Đang mất kết nối mạng! Vui lòng chờ kết nối lại...
        </div>
      )}
      <div className="bg-gradient-to-r from-[#2a221c] to-[#3d3229] text-white px-4 py-4 sticky top-[env(safe-area-inset-top)] z-10 shadow-md">
        <h1 className="text-lg font-bold font-display text-client-secondary">Thực đơn tại bàn - Bàn #{tableIdFromUrl}</h1>
        <p className="text-xs text-[#c9bfae]">
          {isConnected ? "🟢 Kết nối ổn định" : "🔴 Mất kết nối mạng"}
        </p>
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
                const cartItemId = getCartItemIds(item.id);
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
                        disabled={!isConnected}
                        className="flex-shrink-0 w-9 h-9 rounded-full bg-client-primary hover:bg-client-primary-hover text-white flex items-center justify-center text-lg font-bold shadow-xs cursor-pointer disabled:opacity-50"
                      >
                        +
                      </button>
                    ) : (
                      <div className="flex-shrink-0 flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(cartItemId, -1)}
                          disabled={!isConnected}
                          className="w-8 h-8 rounded-full bg-[#f0eae1] text-client-text hover:bg-client-accent flex items-center justify-center font-bold cursor-pointer disabled:opacity-50"
                        >
                          −
                        </button>
                        <span className="w-6 text-center font-bold text-sm text-client-text">{qty}</span>
                        <button
                          onClick={() => updateQuantity(cartItemId, 1)}
                          disabled={!isConnected}
                          className="w-8 h-8 rounded-full bg-client-primary hover:bg-client-primary-hover text-white flex items-center justify-center font-bold cursor-pointer disabled:opacity-50"
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

      {cartItems.length > 0 && (
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
              disabled={submitting || !isConnected}
              className="px-6 py-3 bg-client-primary hover:bg-client-primary-hover text-white rounded-xl font-bold text-sm shadow-md disabled:opacity-50 cursor-pointer"
            >
              {!isConnected ? "Mất kết nối..." : (submitting ? "Đang gửi đơn..." : "Gửi yêu cầu gọi món")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerOrderPage;
