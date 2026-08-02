import { Server, Socket } from "socket.io";
import { qrUtils } from "../utils/qr";
import { cartUtils } from "../utils/redis";
import { query } from "../utils/db";

export const setupClientSocket = (io: Server) => {
  const clientNamespace = io.of("/client");

  // Middleware xác thực token cho Socket
  clientNamespace.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: Token missing"));
    }
    
    const decoded = qrUtils.verifySessionToken(token);
    if (!decoded) {
      return next(new Error("Authentication error: Invalid or expired token"));
    }

    // Gắn thông tin session vào socket để dùng sau
    (socket as any).sessionInfo = decoded;
    next();
  });

  clientNamespace.on("connection", (socket: Socket) => {
    const { tableId, sessionId } = (socket as any).sessionInfo;
    const roomName = `table_${tableId}_session_${sessionId}`;
    
    // Khách tham gia vào phòng (Room) riêng của Bàn này trong phiên này
    socket.join(roomName);
    console.log(`🔌 Client Socket connected: ${socket.id} joined room ${roomName}`);

    // Gửi giỏ hàng hiện tại cho khách vừa kết nối
    cartUtils.getCart(sessionId).then(cart => {
      socket.emit("cart_synced", cart);
    });

    // Lắng nghe sự kiện thêm món
    socket.on("client_add_item", async (itemData) => {
      try {
        const updatedCart = await cartUtils.addItem(sessionId, itemData);
        // Phát sự kiện cập nhật giỏ hàng tới TẤT CẢ client trong cùng room
        clientNamespace.to(roomName).emit("cart_updated", updatedCart);
      } catch (error) {
        console.error("Error adding item to cart:", error);
        socket.emit("cart_error", { message: "Có lỗi khi thêm món" });
      }
    });

    // Lắng nghe sự kiện xóa món
    socket.on("client_remove_item", async ({ itemId }) => {
      try {
        // Thực tế chúng ta cần viết một hàm removeItem trong cartUtils
        // Tạm thời mô phỏng việc lấy và cập nhật giỏ hàng
        const cart = await cartUtils.getCart(sessionId);
        cart.items = cart.items.filter((i: any) => i._id !== itemId);
        await cartUtils.updateCart(sessionId, cart);
        
        clientNamespace.to(roomName).emit("cart_updated", cart);
      } catch (error) {
        console.error("Error removing item:", error);
      }
    });

    // Lắng nghe sự kiện Chốt Đơn (Checkout)
    socket.on("client_submit_order", async () => {
      try {
        const cart = await cartUtils.getCart(sessionId);
        if (cart.items.length === 0) {
          return socket.emit("cart_error", { message: "Giỏ hàng trống" });
        }

        // Tạo order (hoặc cập nhật order hiện tại của bàn)
        // 1. Kiểm tra xem bàn đã có order chưa (trạng thái 'serving')
        const orders = await query<any[]>(`SELECT id FROM orders WHERE tableId = ? AND status = 'serving' LIMIT 1`, [tableId]);
        let orderId = "";
        
        if (orders.length > 0) {
          orderId = orders[0].id;
        } else {
          // Tạo đơn hàng mới nếu bàn chưa có
          orderId = `ORD-${Date.now()}`;
          await query(
            `INSERT INTO orders (id, tableId, status, totalAmount, createdAt) VALUES (?, ?, 'serving', 0, CURRENT_TIMESTAMP)`,
            [orderId, tableId]
          );
        }

        // 2. Lưu các món vào order_items
        for (const item of cart.items) {
          await query(
            `INSERT INTO order_items (id, orderId, menuItemId, quantity, price, notes, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [`ITM-${Date.now()}-${Math.random().toString(36).substring(7)}`, orderId, item.productId, item.quantity, item.price, item.notes || '']
          );
        }

        // 3. Xóa giỏ hàng sau khi chốt đơn
        await cartUtils.clearCart(sessionId);

        // Phát sự kiện chốt đơn thành công cho cả bàn
        clientNamespace.to(roomName).emit("order_submitted_success", { message: "Đã gửi đơn thành công!" });
        clientNamespace.to(roomName).emit("cart_updated", { items: [] });

        // 4. Phát sự kiện tới KDS (Nhà bếp)
        io.emit("kds_new_order", { tableId, orderId, items: cart.items }); // Thông báo cho KDS

      } catch (error) {
        console.error("Error submitting order:", error);
        socket.emit("cart_error", { message: "Không thể gửi đơn hàng" });
      }
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client Socket disconnected: ${socket.id}`);
    });
  });
};
