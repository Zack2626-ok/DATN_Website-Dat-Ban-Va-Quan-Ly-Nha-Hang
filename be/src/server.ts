import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import uploadRoutes from "./routes/upload.routes";
import authRoutes from "./routes/auth.routes";
import orderRoutes from "./routes/order.routes";
import { initDb } from "./utils/db";
import { Server } from "socket.io";
import http from "http";

// Tải biến môi trường từ file v
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  },
});
const PORT = process.env.PORT || 5000;

// Khởi động kết nối database
initDb().then((isMySqlConnected) => {
  if (isMySqlConnected) {
    console.log("Database initialized with MySQL.");
  } else {
    console.log("Database initialized with fallback local JSON file.");
  }
});

// === SOCKET.IO ===
io.on("connection", (socket) => {
  console.log("🔌 A user connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("🔌 User disconnected:", socket.id);
  });
});

// Gắn io vào app để dùng trong các controller nếu cần
app.set("io", io);

// === MIDDLEWARES ===
// Cho phép frontend truy cập API (xử lý CORS)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
// Xử lý JSON từ client gửi lên
app.use(express.json());
// Xử lý form data từ client gửi lên
app.use(express.urlencoded({ extended: true }));

// === PHỤC VỤ FILE TĨNH ===
// Cho phép truy cập các ảnh đã upload qua URL /uploads/...
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// === ĐỊNH TUYẾN (ROUTES) ===
// API upload ảnh: POST /api/upload
app.use("/api/upload", uploadRoutes);
// API auth: đăng nhập, đăng ký, lấy thông tin user hiện tại
app.use("/api/auth", authRoutes);

// API đơn hàng: POST/GET/PATCH /api/orders
app.use("/api/orders", orderRoutes);


// === KIỂM TRA SERVER HOẠT ĐỘNG ===
// Endpoint để check server có hoạt động không
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// === KHỞI ĐỘNG SERVER ===
server.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});

export default app;
