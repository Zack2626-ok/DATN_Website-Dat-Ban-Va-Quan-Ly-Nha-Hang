import { io, Socket } from "socket.io-client";
import { store } from "../store";
import { setCartData, setConnected } from "../store/clientCartSlice";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

class ClientSocketService {
  private socket: Socket | null = null;

  connect(token: string) {
    if (this.socket?.connected) return;

    this.socket = io(`${SOCKET_URL}/client`, {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    this.socket.on("connect", () => {
      console.log("Client Socket connected!");
      store.dispatch(setConnected(true));
    });

    this.socket.on("disconnect", () => {
      console.log("Client Socket disconnected!");
      store.dispatch(setConnected(false));
    });

    // Nhận thông báo lỗi
    this.socket.on("cart_error", (data: { message: string }) => {
      alert(data.message);
    });

    // Lắng nghe cập nhật giỏ hàng từ những người cùng bàn
    this.socket.on("cart_updated", (cart: any) => {
      store.dispatch(setCartData(cart.items || []));
    });

    this.socket.on("cart_synced", (cart: any) => {
      store.dispatch(setCartData(cart.items || []));
    });

    this.socket.on("order_submitted_success", (data: { message: string }) => {
      alert(data.message);
      // Giỏ hàng sẽ được clear thông qua cart_updated({items: []})
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  addItem(item: any) {
    if (!this.socket?.connected) return;
    this.socket.emit("client_add_item", item);
  }

  removeItem(itemId: string) {
    if (!this.socket?.connected) return;
    this.socket.emit("client_remove_item", { itemId });
  }

  submitOrder() {
    if (!this.socket?.connected) return;
    this.socket.emit("client_submit_order");
  }
}

export const clientSocketService = new ClientSocketService();
