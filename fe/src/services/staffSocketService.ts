import { io, Socket } from "socket.io-client";
import { toast } from "react-hot-toast";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

class StaffSocketService {
  private socket: Socket | null = null;
  private audio: HTMLAudioElement | null = null;

  constructor() {
    // Tải âm thanh thông báo đơn mới (có thể thay đổi URL)
    try {
      this.audio = new Audio('/sounds/bell.mp3');
    } catch (err) {
      console.warn("Could not load notification sound");
    }
  }

  connect() {
    if (this.socket?.connected) return;

    // Nhân viên kết nối vào namespace mặc định (hoặc /staff nếu có)
    this.socket = io(`${SOCKET_URL}`, {
      transports: ["websocket", "polling"]
    });

    this.socket.on("connect", () => {
      console.log("Staff Socket connected!");
    });

    this.socket.on("disconnect", () => {
      console.log("Staff Socket disconnected!");
    });

    // Lắng nghe đơn hàng mới từ Khách hàng QR
    this.socket.on("kds_new_order", (data: { tableId: string; orderId: string; items: any[] }) => {
      // 1. Phát âm thanh
      if (this.audio) {
        this.audio.play().catch(e => console.error("Audio play failed:", e));
      }
      
      // 2. Hiển thị thông báo (toast)
      toast.success(
        `ĐƠN MỚI BÀN ${data.tableId} (${data.items.length} món)`, 
        { duration: 5000, style: { fontSize: '18px', fontWeight: 'bold', padding: '16px' } }
      );

      // 3. Dispatch event tuỳ chỉnh để KDS và Waiter tự động reload data
      window.dispatchEvent(new CustomEvent("refresh_staff_data"));
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const staffSocketService = new StaffSocketService();
