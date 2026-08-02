import Redis from "ioredis";
import dotenv from "dotenv";

dotenv.config();

// Khởi tạo Redis client
export const redisClient = new Redis({
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: Number(process.env.REDIS_PORT) || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: Number(process.env.REDIS_DB) || 0,
  retryStrategy: (times) => {
    // Thử lại kết nối sau mỗi khoảng thời gian, max 3 giây
    return Math.min(times * 50, 3000);
  },
});

redisClient.on("connect", () => {
  console.log("🟢 Connected to Redis");
});

redisClient.on("error", (err) => {
  console.error("🔴 Redis connection error:", err);
});

// Tiện ích để làm việc với Giỏ hàng (Shared Cart)
export const cartUtils = {
  getCartKey: (sessionId: string) => `cart:${sessionId}`,
  
  // Lấy giỏ hàng hiện tại
  getCart: async (sessionId: string) => {
    const data = await redisClient.get(cartUtils.getCartKey(sessionId));
    return data ? JSON.parse(data) : { items: [] };
  },

  // Cập nhật giỏ hàng
  updateCart: async (sessionId: string, cartData: any, ttlSeconds: number = 14400) => {
    const key = cartUtils.getCartKey(sessionId);
    await redisClient.set(key, JSON.stringify(cartData), "EX", ttlSeconds);
  },

  // Thêm một món vào giỏ hàng
  addItem: async (sessionId: string, item: any) => {
    const lockKey = `lock:cart:${sessionId}`;
    const acquired = await redisUtils.acquireLock(lockKey, 5000); // 5s timeout
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
      await redisUtils.releaseLock(lockKey);
    }
  },

  // Xóa giỏ hàng khi đóng phiên
  clearCart: async (sessionId: string) => {
    await redisClient.del(cartUtils.getCartKey(sessionId));
  }
};

// Tiện ích chung
export const redisUtils = {
  // Lấy lock đơn giản bằng NX (chống click nhấp đúp/Race Condition)
  acquireLock: async (key: string, ttlMs: number): Promise<boolean> => {
    const result = await redisClient.set(key, "locked", "PX", ttlMs, "NX");
    return result === "OK";
  },
  
  releaseLock: async (key: string): Promise<void> => {
    await redisClient.del(key);
  }
};
