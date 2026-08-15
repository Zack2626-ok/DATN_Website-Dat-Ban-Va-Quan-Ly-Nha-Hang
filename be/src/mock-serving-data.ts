import mysql from "mysql2/promise";
import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(__dirname, "../.env") });

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "resmanager",
};

async function main() {
  console.log("🌱 STARTING TO MOCK SERVING DATA...");
  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    // 0. Disable foreign key checks temporarily for cleaning
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    // Clear existing mock data for the selected days (2026-08-13, 2026-08-14, 2026-08-15)
    console.log("🗑️  Cleaning old mock data for 2026-08-13, 2026-08-14, 2026-08-15...");
    
    // Find booking IDs
    const [bookingsToDel]: any = await connection.query(
      "SELECT id FROM bookings WHERE DATE(start_time) IN ('2026-08-13', '2026-08-14', '2026-08-15')"
    );
    const bookingIds = bookingsToDel.map((b: any) => b.id);
    if (bookingIds.length > 0) {
      await connection.query("DELETE FROM bookings WHERE id IN (?)", [bookingIds]);
    }

    // Find order IDs
    const [ordersToDel]: any = await connection.query(
      "SELECT id FROM orders WHERE DATE(created_at) IN ('2026-08-13', '2026-08-14', '2026-08-15')"
    );
    const orderIds = ordersToDel.map((o: any) => o.id);
    if (orderIds.length > 0) {
      // Find invoice IDs
      const [invoicesToDel]: any = await connection.query(
        "SELECT id FROM invoices WHERE order_id IN (?)", [orderIds]
      );
      const invoiceIds = invoicesToDel.map((i: any) => i.id);
      if (invoiceIds.length > 0) {
        await connection.query("DELETE FROM payments WHERE invoice_id IN (?)", [invoiceIds]);
        await connection.query("DELETE FROM invoice_items WHERE invoice_id IN (?)", [invoiceIds]);
        await connection.query("DELETE FROM invoices WHERE id IN (?)", [invoiceIds]);
      }
      await connection.query("DELETE FROM order_items WHERE order_id IN (?)", [orderIds]);
      await connection.query("DELETE FROM orders WHERE id IN (?)", [orderIds]);
    }

    // Re-enable foreign key checks
    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    console.log("🧹 Clean complete. Inserting new mock data...");

    // Helper menu items
    const menuItems = [
      { id: 1, name: "Nem rán giòn phố cổ Hà Nội", price: 95000 },
      { id: 2, name: "Chả giò cua bể Hải Phòng cuốn chặt", price: 125000 },
      { id: 3, name: "Bánh bột lọc tôm sông đất cố đô", price: 75000 },
      { id: 4, name: "Nem lụi nướng sả tươi Hội An", price: 110000 },
      { id: 5, name: "Bánh xèo miền Tây sông nước vàng giòn", price: 115000 },
      { id: 6, name: "Gỏi ngó sen tôm thịt", price: 145000 },
      { id: 7, name: "Gỏi hoa chuối bắp bò Tây Bắc", price: 135000 },
      { id: 8, name: "Cuốn diếp cải xanh tôm sông", price: 85000 },
      { id: 9, name: "Phở cuốn thịt bò tơ nướng Hà Nội", price: 120000 },
      { id: 10, name: "Gỏi xoài xanh tôm khô đất chua ngọt", price: 95000 }
    ];

    // Reset table status to normal defaults before booking conflicts
    await connection.query("UPDATE tables SET status = 'empty' WHERE id >= 1 AND id <= 40");

    // ==========================================
    // 1. DATA FOR YESTERDAY: 2026-08-13
    // ==========================================
    console.log("📅 Inserting yesterday's data (2026-08-13)...");
    const yesterdayOrders = [
      { tableId: 1, custId: 1, guestName: "Nguyễn Văn An", phone: "0911111111", count: 4, time: "11:30:00", duration: 1.5, items: [1, 3, 5], status: "completed", method: "cash" },
      { tableId: 2, custId: null, guestName: "Lê Minh Trí", phone: "0981122334", count: 2, time: "12:15:00", duration: 1.2, items: [2, 8, 9], status: "completed", method: "bank_transfer" },
      { tableId: 3, custId: 2, guestName: "Trần Thị Binh", phone: "0922222222", count: 3, time: "13:00:00", duration: 1.1, items: [6, 10], status: "completed", method: "momo" },
      { tableId: 4, custId: null, guestName: "Phạm Văn Nam", phone: "0905556677", count: 6, time: "18:00:00", duration: 2.0, items: [4, 5, 6, 7], status: "completed", method: "vnpay" },
      { tableId: 5, custId: 4, guestName: "Phạm Thi Dung", phone: "0944444444", count: 4, time: "18:30:00", duration: 1.8, items: [1, 9, 10], status: "completed", method: "card" },
      { tableId: 6, custId: null, guestName: "Hoàng Minh Tuấn", phone: "0934567890", count: 5, time: "19:15:00", duration: 1.7, items: [2, 3, 5, 8], status: "completed", method: "cash" },
      { tableId: 7, custId: 5, guestName: "Hoàng Văn Em", phone: "0955555555", count: 2, time: "20:00:00", duration: 1.2, items: [6, 7], status: "completed", method: "momo" },
      { tableId: 8, custId: null, guestName: "Đỗ Thị Quỳnh", phone: "0977889900", count: 3, time: "20:30:00", duration: 1.0, items: [1, 4, 10], status: "completed", method: "bank_transfer" },
      { tableId: 10, custId: null, guestName: "Nguyễn Hải Yến", phone: "0966554433", count: 4, time: "19:00:00", duration: 0.5, items: [1, 2], status: "cancelled", method: null }
    ];

    for (const data of yesterdayOrders) {
      const createdAt = `2026-08-13 ${data.time}`;
      const closedAt = data.status === "completed" ? calculateClosedAt(`2026-08-13 ${data.time}`, data.duration!) : null;
      
      const [orderRes]: any = await connection.query(
        "INSERT INTO orders (table_id, customer_id, created_by, order_type, status, guest_name, guest_phone, guest_count, created_at, closed_at) VALUES (?, ?, ?, 'dine_in', ?, ?, ?, ?, ?, ?)",
        [data.tableId, data.custId, 4, data.status, data.guestName, data.phone, data.count, createdAt, closedAt]
      );
      const orderId = orderRes.insertId;

      let subtotal = 0;
      for (const itemId of data.items) {
        const item = menuItems.find(m => m.id === itemId)!;
        subtotal += item.price;
        await connection.query(
          "INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, status, created_at) VALUES (?, ?, 1, ?, 'done', ?)",
          [orderId, item.id, item.price, createdAt]
        );
      }

      if (data.status === "completed") {
        const tax = Math.round(subtotal * 0.10);
        const total = subtotal + tax;

        const [invRes]: any = await connection.query(
          "INSERT INTO invoices (order_id, subtotal, discount, tax, total, status, paid_at, created_by) VALUES (?, ?, 0, ?, ?, 'paid', ?, 3)",
          [orderId, subtotal, tax, total, closedAt]
        );
        const invoiceId = invRes.insertId;

        await connection.query(
          "INSERT INTO payments (invoice_id, method, amount, paid_at, note) VALUES (?, ?, ?, ?, ?)",
          [invoiceId, data.method, total, closedAt, `Thanh toán cho hóa đơn ngày 13/08 qua ${data.method}`]
        );
      }
    }

    // ==========================================
    // 2. DATA FOR TODAY: 2026-08-14
    // ==========================================
    console.log("📅 Inserting today's data (2026-08-14)...");
    const todayOrders = [
      // Completed orders (Paid)
      { tableId: 11, custId: 1, guestName: "Nguyễn Văn An", phone: "0911111111", count: 4, time: "11:00:00", duration: 1.3, items: [2, 5, 9], status: "completed", method: "cash" },
      { tableId: 12, custId: null, guestName: "Bùi Hoàng Nam", phone: "0987111222", count: 2, time: "11:45:00", duration: 1.1, items: [1, 10], status: "completed", method: "momo" },
      { tableId: 13, custId: 3, guestName: "Lê Văn Cuong", phone: "0933333333", count: 3, time: "12:30:00", duration: 1.4, items: [3, 4, 6], status: "completed", method: "bank_transfer" },
      { tableId: 14, custId: null, guestName: "Vũ Thanh Trúc", phone: "0901234455", count: 4, time: "13:00:00", duration: 1.2, items: [5, 7, 8], status: "completed", method: "vnpay" },
      { tableId: 15, custId: 2, guestName: "Trần Thị Binh", phone: "0922222222", count: 2, time: "17:30:00", duration: 1.5, items: [2, 9], status: "completed", method: "card" },
      { tableId: 16, custId: null, guestName: "Đỗ Anh Tuấn", phone: "0976112233", count: 5, time: "18:30:00", duration: 1.8, items: [1, 3, 4, 7], status: "completed", method: "bank_transfer" },
      
      // Serving orders
      { tableId: 17, custId: null, guestName: "Trương Công Vinh", phone: "0908889977", count: 3, time: "21:30:00", duration: null, items: [2, 8, 9], status: "serving", method: null },
      { tableId: 18, custId: null, guestName: "Nguyễn Thùy Linh", phone: "0982223344", count: 4, time: "22:00:00", duration: null, items: [1, 3, 5], status: "serving", method: null },

      // Pending Payment orders
      { tableId: 19, custId: null, guestName: "Đỗ Gia Bảo", phone: "0915151515", count: 2, time: "20:30:00", duration: null, items: [6, 9], status: "pending_payment", method: null },
      { tableId: 20, custId: 4, guestName: "Phạm Thi Dung", phone: "0944444444", count: 4, time: "21:00:00", duration: null, items: [1, 4, 7, 10], status: "pending_payment", method: null },

      // Open order
      { tableId: 21, custId: null, guestName: "Lâm Nhã Đan", phone: "0902233445", count: 6, time: "22:15:00", duration: null, items: [2, 3], status: "open", method: null },

      // Cancelled order
      { tableId: 22, custId: null, guestName: "Lê Khắc Tiệp", phone: "0988776655", count: 2, time: "19:00:00", duration: null, items: [1], status: "cancelled", method: null }
    ];

    for (const data of todayOrders) {
      const createdAt = `2026-08-14 ${data.time}`;
      const closedAt = data.status === "completed" ? calculateClosedAt(`2026-08-14 ${data.time}`, data.duration!) : null;
      
      const [orderRes]: any = await connection.query(
        "INSERT INTO orders (table_id, customer_id, created_by, order_type, status, guest_name, guest_phone, guest_count, created_at, closed_at) VALUES (?, ?, ?, 'dine_in', ?, ?, ?, ?, ?, ?)",
        [data.tableId, data.custId, 4, data.status, data.guestName, data.phone, data.count, createdAt, closedAt]
      );
      const orderId = orderRes.insertId;

      // Update table status in DB to match order status
      if (data.status === "serving" || data.status === "open") {
        await connection.query("UPDATE tables SET status = 'serving' WHERE id = ?", [data.tableId]);
      } else if (data.status === "pending_payment") {
        await connection.query("UPDATE tables SET status = 'pending_payment' WHERE id = ?", [data.tableId]);
      }

      let subtotal = 0;
      for (const itemId of data.items) {
        const item = menuItems.find(m => m.id === itemId)!;
        subtotal += item.price;
        const itemStatus = data.status === "completed" ? "done" : "cooking";
        await connection.query(
          "INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, status, created_at) VALUES (?, ?, 1, ?, ?, ?)",
          [orderId, item.id, item.price, itemStatus, createdAt]
        );
      }

      if (data.status === "completed" || data.status === "pending_payment") {
        const tax = Math.round(subtotal * 0.10);
        const total = subtotal + tax;

        const invStatus = data.status === "completed" ? "paid" : "draft";
        const paidAtTime = data.status === "completed" ? closedAt : null;
        const [invRes]: any = await connection.query(
          "INSERT INTO invoices (order_id, subtotal, discount, tax, total, status, paid_at, created_by) VALUES (?, ?, 0, ?, ?, ?, ?, 3)",
          [orderId, subtotal, tax, total, invStatus, paidAtTime]
        );
        const invoiceId = invRes.insertId;

        // Insert items into invoice_items
        const [oItems]: any = await connection.query("SELECT id, unit_price, quantity FROM order_items WHERE order_id = ?", [orderId]);
        for (const oItem of oItems) {
          await connection.query(
            "INSERT INTO invoice_items (invoice_id, order_item_id, amount) VALUES (?, ?, ?)",
            [invoiceId, oItem.id, oItem.unit_price * oItem.quantity]
          );
        }

        if (data.status === "completed" && data.method) {
          await connection.query(
            "INSERT INTO payments (invoice_id, method, amount, paid_at, note) VALUES (?, ?, ?, ?, ?)",
            [invoiceId, data.method, total, closedAt, `Thanh toán cho hóa đơn ngày 14/08 qua ${data.method}`]
          );
        }
      }
    }

    // ==========================================
    // 3. BOOKINGS FOR TOMORROW: 2026-08-15
    // ==========================================
    console.log("📅 Inserting tomorrow's bookings (2026-08-15)...");
    const tomorrowBookings = [
      { tableId: 23, custId: 1, guestName: "Nguyễn Văn An", phone: "0911111111", count: 4, start: "11:30:00", end: "13:30:00", code: "BK260815001", status: "confirmed", note: "Tiệc họp mặt gia đình" },
      { tableId: 24, custId: 2, guestName: "Trần Thị Binh", phone: "0922222222", count: 2, start: "12:00:00", end: "14:00:00", code: "BK260815002", status: "confirmed", note: "Bàn gần cửa sổ, ăn nhanh" },
      { tableId: 25, custId: null, guestName: "Nguyễn Mạnh Hùng", phone: "0989123456", count: 6, start: "18:00:00", end: "20:30:00", code: "BK260815003", status: "confirmed", note: "Đặt tiệc sinh nhật bạn bè" },
      { tableId: 26, custId: 4, guestName: "Phạm Thi Dung", phone: "0944444444", count: 8, start: "18:30:00", end: "21:00:00", code: "BK260815004", status: "confirmed", note: "Khách VIP, phục vụ chu đáo" },
      { tableId: 27, custId: null, guestName: "Phan Quốc Việt", phone: "0904433221", count: 4, start: "19:00:00", end: "21:00:00", code: "BK260815005", status: "confirmed", note: null },
      { tableId: 28, custId: 3, guestName: "Lê Văn Cuong", phone: "0933333333", count: 4, start: "17:00:00", end: "19:00:00", code: "BK260815006", status: "pending", note: "Chờ xác nhận" },
      { tableId: 29, custId: null, guestName: "Vũ Minh Hòa", phone: "0981234987", count: 2, start: "20:00:00", end: "22:00:00", code: "BK260815007", status: "pending", note: "Muốn góc lãng mạn" }
    ];

    for (const data of tomorrowBookings) {
      const startTime = `2026-08-15 ${data.start}`;
      const endTime = `2026-08-15 ${data.end}`;
      const createdAt = `2026-08-14 14:00:00`;

      await connection.query(
        "INSERT INTO bookings (table_id, customer_id, guest_name, guest_phone, party_size, start_time, end_time, confirmation_code, status, guest_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [data.tableId, data.custId, data.guestName, data.phone, data.count, startTime, endTime, data.code, data.status, data.note, createdAt]
      );

      // If booking is confirmed for tomorrow, set table status as 'reserved' in tables table
      if (data.status === "confirmed") {
        await connection.query("UPDATE tables SET status = 'reserved' WHERE id = ?", [data.tableId]);
      }
    }

    console.log("✅ SUCCESSFULLY SEEDED SERVING AND BOOKING DATA!");

  } catch (err) {
    console.error("❌ ERROR SEEDING SERVING DATA:", err);
  } finally {
    await connection.end();
    console.log("🔌 Database connection closed.");
  }
}

function calculateClosedAt(startTimeStr: string, durationHours: number): string {
  const date = new Date(startTimeStr.replace(" ", "T"));
  date.setMinutes(date.getMinutes() + Math.round(durationHours * 60));
  return date.toISOString().replace("T", " ").slice(0, 19);
}

main();
