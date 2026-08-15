// memoryStore.ts - In-memory replacement for Redis

// Cấu trúc lưu trữ giỏ hàng với TTL
interface CartEntry {
  data: any;
  expiresAt: number; // timestamp
}

const carts = new Map<string, CartEntry>();
const locks = new Set<string>();

// Dọn dẹp định kỳ các giỏ hàng hết hạn (mỗi 10 phút)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of carts.entries()) {
    if (entry.expiresAt < now) {
      carts.delete(key);
    }
  }
}, 10 * 60 * 1000);

export const cartUtils = {
  getCartKey: (sessionId: string) => `cart:${sessionId}`,
  
  // Lấy giỏ hàng hiện tại
  getCart: async (sessionId: string) => {
    const key = cartUtils.getCartKey(sessionId);
    const entry = carts.get(key);
    if (!entry || entry.expiresAt < Date.now()) {
      if (entry) carts.delete(key); // Cleanup expired on read
      return { items: [] };
    }
    return entry.data;
  },

  // Cập nhật giỏ hàng (mặc định 4 tiếng = 14400s)
  updateCart: async (sessionId: string, cartData: any, ttlSeconds: number = 14400) => {
    const key = cartUtils.getCartKey(sessionId);
    carts.set(key, {
      data: cartData,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  },

  // Thêm một món vào giỏ hàng
  addItem: async (sessionId: string, item: any) => {
    const lockKey = `lock:cart:${sessionId}`;
    const acquired = await lockUtils.acquireLock(lockKey, 5000); // 5s timeout
    if (!acquired) throw new Error("Could not acquire lock for cart");

    try {
      const cart = await cartUtils.getCart(sessionId);
      
      // Xử lý gộp món nếu giống hệt nhau (cùng id, cùng options)
      const existingItemIndex = cart.items.findIndex(
        (i: any) => i.productId === item.productId && JSON.stringify(i.options) === JSON.stringify(item.options)
      );

      if (existingItemIndex >= 0) {
        cart.items[existingItemIndex].quantity += item.quantity;
      } else {
        cart.items.push({ ...item, _id: Math.random().toString(36).substring(7) }); // Tạo id tạm thời
      }

      await cartUtils.updateCart(sessionId, cart);
      return cart;
    } finally {
      await lockUtils.releaseLock(lockKey);
    }
  },

  // Xóa giỏ hàng khi đóng phiên
  clearCart: async (sessionId: string) => {
    const key = cartUtils.getCartKey(sessionId);
    carts.delete(key);
  }
};

export const lockUtils = {
  // Lấy lock đơn giản bằng Set (chống click nhấp đúp/Race Condition)
  acquireLock: async (key: string, ttlMs: number): Promise<boolean> => {
    if (locks.has(key)) return false;
    locks.add(key);
    
    // Tự động xoá lock sau ttlMs để tránh deadlock nếu có lỗi
    setTimeout(() => {
      locks.delete(key);
    }, ttlMs);
    
    return true;
  },
  
  releaseLock: async (key: string): Promise<void> => {
    locks.delete(key);
  }
};
