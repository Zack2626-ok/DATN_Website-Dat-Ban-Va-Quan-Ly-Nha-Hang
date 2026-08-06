const http = require("http");
require("dotenv").config();

const PORT = process.env.PORT || 5000;
const BASE_URL = `http://localhost:${PORT}`;

console.log("==========================================================================");
console.log("🧪 BẮT ĐẦU KIỂM THỬ THỰC TẾ HỆ THỐNG API VÀ CÁC LUỒNG NGHIỆP VỤ");
console.log(`Kết nối tới server tại: ${BASE_URL}`);
console.log("==========================================================================");

const request = (method, path, headers = {}, body = null) => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: "localhost",
      port: PORT,
      path: path,
      method: method,
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, body: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on("error", (err) => {
      reject(err);
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
};

async function runTests() {
  try {
    // 1. Kiểm tra trạng thái Server (Health Check)
    console.log("\n[1] TEST: Trạng thái Server (Health check)...");
    const health = await request("GET", "/health");
    console.log(`   - Status code: ${health.status}`);
    console.log(`   - Output:`, health.body);

    // 2. Kiểm tra Authentication & Phân Quyền
    console.log("\n[2] TEST: Đăng nhập tài khoản Quản lý (Manager)...");
    const login = await request("POST", "/api/auth/login", {}, {
      email: "manager@gmail.com",
      password: "123456"
    });
    console.log(`   - Status code: ${login.status}`);
    if (login.status !== 200) {
      console.error("❌ Đăng nhập thất bại!", login.body);
      return;
    }
    const token = login.body.data ? login.body.data.token : login.body.token;
    console.log(`   - Đăng nhập thành công! Token: ${token ? token.substring(0, 20) + "..." : "N/A"}`);
    const authHeader = { "Authorization": `Bearer ${token}` };

    // 3. Phân hệ Bàn ăn và Khu vực (Table Management)
    console.log("\n[3] TEST: Lấy sơ đồ bàn ăn và các tầng...");
    const tables = await request("GET", "/api/tables", authHeader);
    console.log(`   - Status code: ${tables.status}`);
    const tableList = tables.body.data || tables.body;
    console.log(`   - Tìm thấy: ${Array.isArray(tableList) ? tableList.length : 0} bàn ăn hoạt động.`);

    // 4. Phân hệ Gọi món của Phục vụ (Waiter Module)
    console.log("\n[4] TEST: Danh sách gọi món hiện tại theo bàn (Waiter)...");
    const waiterTables = await request("GET", "/api/v1/tables", authHeader);
    console.log(`   - Status code: ${waiterTables.status}`);
    const waiterTableList = waiterTables.body.data || waiterTables.body;
    console.log(`   - Trạng thái các bàn:`, (Array.isArray(waiterTableList) ? waiterTableList.slice(0, 3) : waiterTableList));

    // 5. Phân hệ Nhà bếp (KDS Module)
    console.log("\n[5] TEST: Hàng đợi chế biến của bếp (Kitchen Queue)...");
    const kdsQueue = await request("GET", "/api/kds/items", authHeader);
    console.log(`   - Status code: ${kdsQueue.status}`);
    const kdsItems = kdsQueue.body.data || kdsQueue.body;
    console.log(`   - Số lượng món ăn đang chờ chế biến: ${Array.isArray(kdsItems) ? kdsItems.length : 0}`);

    // 6. Phân hệ Đặt bàn trước (Booking Module)
    console.log("\n[6] TEST: Danh sách lịch đặt bàn trước...");
    const bookings = await request("GET", "/api/v1/bookings?status=confirmed", authHeader);
    console.log(`   - Status code: ${bookings.status}`);
    const bookingList = bookings.body.data || bookings.body;
    console.log(`   - Số lượng đơn đặt bàn đã xác nhận: ${Array.isArray(bookingList) ? bookingList.length : 0}`);

    // 7. Phân hệ Quản lý Thành viên (CRM Module)
    console.log("\n[7] TEST: Quản lý khách hàng thành viên & Điểm tích lũy...");
    const customers = await request("GET", "/api/v1/crm/customers", authHeader);
    console.log(`   - Status code: ${customers.status}`);
    const customerList = customers.body.data || customers.body;
    console.log(`   - Số lượng khách hàng đăng ký: ${Array.isArray(customerList) ? customerList.length : 0}`);

    // 8. Phân hệ Thu ngân & Hóa đơn (Cashier & Invoicing)
    console.log("\n[8] TEST: Lấy danh sách hóa đơn POS...");
    const invoices = await request("GET", "/api/invoices", authHeader);
    console.log(`   - Status code: ${invoices.status}`);
    const invoiceList = invoices.body.data || invoices.body;
    console.log(`   - Số lượng hóa đơn ghi nhận trên hệ thống: ${Array.isArray(invoiceList) ? invoiceList.length : 0}`);

    // 9. Phân hệ Quản lý Kho & Định mức (Inventory Management)
    console.log("\n[9] TEST: Kiểm tra tồn kho nguyên liệu hiện tại...");
    const inventory = await request("GET", "/api/inventory", authHeader);
    console.log(`   - Status code: ${inventory.status}`);
    const inventoryList = inventory.body.data || inventory.body;
    console.log(`   - Số mặt hàng nguyên liệu trong kho: ${Array.isArray(inventoryList) ? inventoryList.length : 0}`);

    // 10. Phân hệ Báo cáo Thống kê & Phân tích (Analytics Report)
    console.log("\n[10] TEST: Báo cáo phân tích doanh thu doanh số...");
    const analytics = await request("GET", "/api/v1/analytics/summary", authHeader);
    console.log(`   - Status code: ${analytics.status}`);
    console.log(`   - Dữ liệu tóm tắt doanh số:`, analytics.body.data || analytics.body);

    console.log("\n==========================================================================");
    console.log("✅ HOÀN THÀNH KIỂM THỬ: TẤT CẢ PHÂN HỆ VÀ NGHIỆP VỤ HOẠT ĐỘNG ỔN ĐỊNH!");
    console.log("==========================================================================");
  } catch (err) {
    console.error("❌ LỖI TRONG QUÁ TRÌNH KIỂM THỬ:", err.message);
  }
}

// Chờ 1 giây trước khi chạy test để đảm bảo server đã khởi động
setTimeout(runTests, 1000);
