import dotenv from "dotenv";
// Tải biến môi trường từ file .env trước khi import các module khác
dotenv.config();

import express from "express";
import cors from "cors";
import path from "path";

import uploadRoutes from "./routes/upload.routes";
import authRoutes from "./routes/auth.routes";
import userRoutes from "./routes/user.routes";
import orderRoutes from "./routes/order.routes";
import kdsRoutes from "./routes/kds.routes";
import tableRoutes from "./routes/table.routes";
import menuRoutes from "./routes/menu.routes";
import inventoryRoutes from "./routes/inventory.routes";
import paymentRoutes from "./routes/payment.routes";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler.middleware";

// Tải biến môi trường từ file v
import bookingRoutes from "./routes/booking.routes";
import waitlistRoutes from "./routes/waitlist.routes";
import resmanagerTableRoutes from "./routes/resmanager-table.routes";
import waiterRoutes from "./routes/waiter.routes";
import invoiceRoutes from "./routes/invoice.routes";
import eventConfigRoutes from "./routes/eventConfig.routes";
import notificationRoutes from "./routes/notification.routes";
import { initDb } from "./utils/db";

dotenv.config();

const app = express();
const DEFAULT_PORT = 5000;
const startPort = Number(process.env.PORT) || DEFAULT_PORT;

console.log("Server configuration:", {
  port: startPort,
  nodeEnv: process.env.NODE_ENV || "development",
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:5173",
  dbHost: process.env.DB_HOST || "localhost",
  dbName: process.env.DB_NAME || "todo_app",
});

const startServer = (port: number): void => {
  const server = app.listen(port, () => {
    console.log(`🚀 Server chạy tại http://localhost:${port}`);
  });

  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.code === "EADDRINUSE") {
      console.warn(`⚠️ Cổng ${port} đang được sử dụng. Thử cổng ${port + 1}...`);
      startServer(port + 1);
      return;
    }
    console.error("Lỗi khởi động server:", error);
    process.exit(1);
  });
};

initDb()
  .then(() => {
    console.log("✅ Database mode: MySQL");
    startServer(startPort);
  })
  .catch((err) => {
    console.warn(
      "⚠️ MySQL không khả dụng. Server sẽ chạy ở chế độ API-only (không có lưu trữ dữ liệu).",
      err.message
    );
    // Bỏ qua lỗi database, tiếp tục chạy server
    startServer(startPort);
  });

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));
app.use("/api/upload", uploadRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/orders", orderRoutes);
// API KDS: nhà bếp
app.use("/api/kds", kdsRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/inventory", inventoryRoutes);
app.use("/api/payments", paymentRoutes)
// Specific routes before wildcard /api fallback
app.use("/api/invoices", invoiceRoutes);
app.use("/api/events", eventConfigRoutes);
app.use("/api/notifications", notificationRoutes);

app.use("/api", tableRoutes); // support /api/v1/tables and /api/v1/table-areas
// Resmanager schema routes (waiter module)
app.use("/api/v1/tables", resmanagerTableRoutes);
app.use("/api/v1/bookings", bookingRoutes);
app.use("/api/v1/waitlist", waitlistRoutes);
app.use("/api/v1/waiter", waiterRoutes);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
