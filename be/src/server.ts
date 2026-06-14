import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";

import uploadRoutes from "./routes/upload.routes";
import authRoutes from "./routes/auth.routes";
// Tải biến môi trường từ file .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

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

// === KIỂM TRA SERVER HOẠT ĐỘNG ===
// Endpoint để check server có hoạt động không
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// === KHỞI ĐỘNG SERVER ===
app.listen(PORT, () => {
  console.log(`🚀 Server chạy tại http://localhost:${PORT}`);
});

export default app;
