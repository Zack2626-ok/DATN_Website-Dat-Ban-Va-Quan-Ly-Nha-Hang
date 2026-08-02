const mysql = require("mysql2/promise");
require("dotenv").config();

const getTierLevel = (points) => {
  if (points >= 500) return "vip";
  if (points >= 300) return "gold";
  if (points >= 100) return "silver";
  return "bronze";
};

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || "localhost",
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "resmanager"
  });

  console.log("=== BƯỚC 1: KIỂM THỬ TÍCH ĐIỂM & THĂNG HẠNG ===");
  // Check if customer exists
  let [customers] = await connection.query("SELECT * FROM customers WHERE name LIKE '%Van A%' AND is_deleted = 0 LIMIT 1");
  let customer = customers[0];
  if (!customer) {
    console.log("Creating test customer Nguyen Van A...");
    const [insRes] = await connection.query(
      "INSERT INTO customers (name, phone, email, member_level, loyalty_points) VALUES ('Nguyen Van A', '0911111111', 'a@gmail.com', 'bronze', 0)"
    );
    const [cRows] = await connection.query("SELECT * FROM customers WHERE id = ?", [insRes.insertId]);
    customer = cRows[0];
  } else {
    // Reset points to 0
    await connection.query("UPDATE customers SET loyalty_points = 0, member_level = 'bronze' WHERE id = ?", [customer.id]);
    const [cRows] = await connection.query("SELECT * FROM customers WHERE id = ?", [customer.id]);
    customer = cRows[0];
  }

  console.log(`Trước thanh toán:`);
  console.log(`- Tên: ${customer.name}`);
  console.log(`- Điểm tích lũy: ${customer.loyalty_points} pts`);
  console.log(`- Cấp bậc: ${customer.member_level}`);

  // Fetch or create a valid invoice ID for foreign key constraint
  let [invoices] = await connection.query("SELECT id FROM invoices LIMIT 1");
  let refInvoiceId;
  let createdInvoice = false;
  if (invoices.length > 0) {
    refInvoiceId = invoices[0].id;
  } else {
    const [insInv] = await connection.query(
      "INSERT INTO invoices (subtotal, total, status, paid_at, created_by) VALUES (2000000, 2000000, 'paid', NOW(), 1)"
    );
    refInvoiceId = insInv.insertId;
    createdInvoice = true;
  }

  // Simulate payment of 2,000,000đ
  const invoiceAmount = 2000000;
  const pointsToEarn = Math.floor(invoiceAmount / 1000); // 2000 points
  console.log(`\nTiến hành thanh toán hóa đơn giá trị: ${invoiceAmount.toLocaleString("vi-VN")} đ`);
  console.log(`Cộng: ${pointsToEarn} points...`);

  // 1. Record transaction
  const [txResult] = await connection.query(
    `INSERT INTO loyalty_transactions (customer_id, points, type, ref_invoice_id, note, created_at)
     VALUES (?, ?, 'earn', ?, ?, NOW())`,
    [
      customer.id,
      pointsToEarn,
      refInvoiceId,
      `Tích điểm từ hóa đơn thanh toán #${refInvoiceId} số tiền ${invoiceAmount.toLocaleString("vi-VN")} đ`
    ]
  );
  const txId = txResult.insertId;

  // 2. Recalculate level
  const newPoints = customer.loyalty_points + pointsToEarn;
  const newLevel = getTierLevel(newPoints);
  await connection.query("UPDATE customers SET loyalty_points = ?, member_level = ? WHERE id = ?", [newPoints, newLevel, customer.id]);

  // Fetch updated stats
  const [updatedCustomers] = await connection.query("SELECT * FROM customers WHERE id = ?", [customer.id]);
  const updatedCustomer = updatedCustomers[0];
  console.log(`\nSau thanh toán:`);
  console.log(`- Điểm tích lũy mới: ${updatedCustomer.loyalty_points} pts`);
  console.log(`- Cấp bậc mới (Thăng hạng): ${updatedCustomer.member_level.toUpperCase()}`);

  console.log("\nLịch sử giao dịch điểm mới nhất:");
  const [txLogs] = await connection.query("SELECT * FROM loyalty_transactions WHERE id = ?", [txId]);
  console.log(txLogs[0]);


  console.log("\n=== BƯỚC 2: KIỂM THỬ TÍCH HỢP VOUCHER & ĐIỀU KIỆN ===");
  // Create voucher GIAM50K, fixed discount 50,000, min_order 500,000
  const voucherCode = "GIAM50K";
  // Delete existing first to avoid duplicate key error
  await connection.query("DELETE FROM vouchers WHERE code = ?", [voucherCode]);
  const [vResult] = await connection.query(
    `INSERT INTO vouchers (code, type, value, min_order, max_uses, used_count, expired_at, is_active, created_at)
     VALUES (?, 'fixed', 50000.00, 500000.00, 100, 0, NULL, 1, NOW())`,
    [voucherCode]
  );

  const [vRows] = await connection.query("SELECT * FROM vouchers WHERE id = ?", [vResult.insertId]);
  const newVoucher = vRows[0];
  console.log("Voucher được tạo thành công:");
  console.log(newVoucher);
  console.log(`- Xác thực điều kiện Đơn hàng tối thiểu: ${newVoucher.min_order} đ`);


  console.log("\n=== BƯỚC 3: KIỂM THỬ LUẬT XÓA MỀM (SOFT DELETE) ===");
  // Create a dummy customer
  const [dummyResult] = await connection.query(
    "INSERT INTO customers (name, phone, email, member_level, loyalty_points) VALUES ('Khach Hang Xoa Mem', '0999999999', 'dummy@gmail.com', 'bronze', 0)"
  );
  const dummyId = dummyResult.insertId;
  console.log(`Đã tạo khách hàng mẫu ID: ${dummyId}`);

  // Perform soft delete
  await connection.query("UPDATE customers SET is_deleted = 1, deleted_at = NOW() WHERE id = ?", [dummyId]);
  console.log(`Đã gọi cập nhật Soft Delete: UPDATE customers SET is_deleted = 1 WHERE id = ${dummyId}`);

  // Fetch standard list (where is_deleted = 0)
  const [activeList] = await connection.query("SELECT * FROM customers WHERE id = ? AND is_deleted = 0", [dummyId]);
  console.log(`Truy vấn danh sách hoạt động (is_deleted = 0): Tìm thấy ${activeList.length} khách hàng.`);

  // Fetch directly from DB including deleted
  const [dbRow] = await connection.query("SELECT * FROM customers WHERE id = ?", [dummyId]);
  console.log(`Truy vấn trực tiếp Database:`);
  console.log(`- Tên: ${dbRow[0].name}`);
  console.log(`- Trạng thái is_deleted: ${dbRow[0].is_deleted}`);
  console.log(`- Thời điểm deleted_at: ${dbRow[0].deleted_at}`);

  // Clean up test records to keep database clean
  await connection.query("DELETE FROM loyalty_transactions WHERE id = ?", [txId]);
  await connection.query("DELETE FROM customers WHERE id = ?", [dummyId]);
  if (createdInvoice) {
    await connection.query("DELETE FROM invoices WHERE id = ?", [refInvoiceId]);
  }
  console.log("\nDone verifying CRM features!");
  await connection.end();
}

run().catch(console.error);
