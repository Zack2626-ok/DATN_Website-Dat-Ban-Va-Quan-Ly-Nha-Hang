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

// Helper to format Date as MySQL DateTime string
function formatDateTime(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatDate(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export async function seedRecentData() {
  console.log("║           🌱 SEEDING 30-DAY RECENT RESTAURANT DATA           ║");
  const connection = await mysql.createConnection(DB_CONFIG);

  try {
    await connection.query("SET FOREIGN_KEY_CHECKS = 0");

    console.log("🧹 Clearing old transactional data...");
    await connection.query("TRUNCATE TABLE payments");
    await connection.query("TRUNCATE TABLE invoice_items");
    await connection.query("TRUNCATE TABLE invoices");
    await connection.query("TRUNCATE TABLE order_items");
    await connection.query("TRUNCATE TABLE orders");
    await connection.query("TRUNCATE TABLE bookings");
    await connection.query("TRUNCATE TABLE stock_out");
    await connection.query("TRUNCATE TABLE stock_in");
    await connection.query("TRUNCATE TABLE debt_payments");
    await connection.query("TRUNCATE TABLE supplier_debt_due_history");
    await connection.query("TRUNCATE TABLE stock_inventory");
    await connection.query("TRUNCATE TABLE operational_expenses");
    await connection.query("TRUNCATE TABLE payrolls");
    await connection.query("UPDATE tables SET status = 'empty'");

    await connection.query("SET FOREIGN_KEY_CHECKS = 1");

    // Fetch existing menu items & ingredients
    const [menuItems]: any = await connection.query("SELECT id, name, price FROM menu_items");
    const [ingredients]: any = await connection.query("SELECT id, name, unit FROM ingredients");
    const [suppliers]: any = await connection.query("SELECT id, name FROM suppliers");

    if (menuItems.length === 0 || ingredients.length === 0 || suppliers.length === 0) {
      console.error("❌ Menu items, ingredients or suppliers missing. Please run base seed first.");
      return;
    }

    const now = new Date(); // Current local reference date (e.g. Aug 20, 2026)

    // =========================================================================
    // 1. SEED 30 DAYS OF ORDERS, INVOICES & PAYMENTS
    // =========================================================================
    console.log("📊 Generating 30 days of sales transactions (Orders, Invoices, Payments)...");

    const customersList = [
      { id: 1, name: "Nguyễn Văn An", phone: "0911111111" },
      { id: 2, name: "Trần Thị Bình", phone: "0922222222" },
      { id: 3, name: "Lê Văn Cường", phone: "0933333333" },
      { id: 4, name: "Phạm Thị Dung", phone: "0944444444" },
      { id: 5, name: "Hoàng Văn Em", phone: "0955555555" },
      { id: null, name: "Lê Minh Trí", phone: "0981122334" },
      { id: null, name: "Phạm Văn Nam", phone: "0905556677" },
      { id: null, name: "Đỗ Thị Quỳnh", phone: "0977889900" },
      { id: null, name: "Vũ Thanh Trúc", phone: "0901234455" },
      { id: null, name: "Hoàng Minh Tuấn", phone: "0934567890" },
      { id: null, name: "Nguyễn Thùy Linh", phone: "0982223344" },
      { id: null, name: "Trương Công Vinh", phone: "0908889977" },
      { id: null, name: "Lâm Nhã Đan", phone: "0902233445" },
    ];

    const paymentMethods = ["cash", "bank_transfer", "momo", "vnpay", "card"];
    const orderTypes = ["dine_in", "dine_in", "dine_in", "takeaway", "delivery"];

    let totalInvoicesCreated = 0;
    let totalRevenueSum = 0;

    // Loop through past 29 days up to today (30 days total)
    for (let dayOffset = 29; dayOffset >= 0; dayOffset--) {
      const orderDate = new Date(now);
      orderDate.setDate(orderDate.getDate() - dayOffset);

      // Orders per day: between 4 and 8 orders
      const ordersCount = 4 + Math.floor(Math.random() * 4);

      for (let o = 0; o < ordersCount; o++) {
        // Distribute hours: lunch 11h-13h, dinner 17h-21h
        const hour = Math.random() > 0.4 ? 17 + Math.floor(Math.random() * 4) : 11 + Math.floor(Math.random() * 3);
        const minute = Math.floor(Math.random() * 55);
        const second = Math.floor(Math.random() * 55);

        const createTime = new Date(orderDate);
        createTime.setHours(hour, minute, second, 0);

        const durationMinutes = 45 + Math.floor(Math.random() * 75);
        const closeTime = new Date(createTime.getTime() + durationMinutes * 60000);

        const cust = customersList[Math.floor(Math.random() * customersList.length)];
        const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
        const tableId = orderType === "dine_in" ? 1 + Math.floor(Math.random() * 30) : null;
        const guestCount = 2 + Math.floor(Math.random() * 5);

        // Today (dayOffset === 0): make some orders active/serving
        let orderStatus = "completed";
        if (dayOffset === 0) {
          if (o === ordersCount - 1) orderStatus = "serving";
          else if (o === ordersCount - 2) orderStatus = "pending_payment";
        }

        const [orderRes]: any = await connection.query(
          `INSERT INTO orders (table_id, customer_id, created_by, order_type, status, guest_name, guest_phone, guest_count, created_at, closed_at)
           VALUES (?, ?, 4, ?, ?, ?, ?, ?, ?, ?)`,
          [
            tableId,
            cust.id,
            orderType,
            orderStatus,
            cust.name,
            cust.phone,
            guestCount,
            formatDateTime(createTime),
            orderStatus === "completed" ? formatDateTime(closeTime) : null,
          ]
        );
        const orderId = orderRes.insertId;

        // Select 2 to 4 random menu items
        const numItems = 2 + Math.floor(Math.random() * 3);
        const selectedItems = [...menuItems].sort(() => 0.5 - Math.random()).slice(0, numItems);

        let subtotal = 0;
        for (const item of selectedItems) {
          const qty = 1 + Math.floor(Math.random() * 2);
          const itemPrice = Number(item.price);
          subtotal += itemPrice * qty;

          const itemStatus = orderStatus === "completed" ? "done" : "cooking";
          await connection.query(
            `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, status, created_at)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [orderId, item.id, qty, itemPrice, itemStatus, formatDateTime(createTime)]
          );
        }

        if (orderStatus === "completed" || orderStatus === "pending_payment") {
          const tax = Math.round(subtotal * 0.10);
          const discount = Math.random() > 0.7 ? 30000 : 0;
          const tips = Math.random() > 0.8 ? 20000 : 0;
          const total = subtotal - discount + tax + tips;

          const invStatus = orderStatus === "completed" ? "paid" : "draft";
          const paidAt = orderStatus === "completed" ? formatDateTime(closeTime) : null;

          const [invRes]: any = await connection.query(
            `INSERT INTO invoices (order_id, subtotal, discount, tax, service_fee, tips, total, status, paid_at, created_by, created_at)
             VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, 3, ?)`,
            [orderId, subtotal, discount, tax, tips, total, invStatus, paidAt, formatDateTime(createTime)]
          );
          const invoiceId = invRes.insertId;

          // Invoice items
          const [oItems]: any = await connection.query("SELECT id, unit_price, quantity FROM order_items WHERE order_id = ?", [orderId]);
          for (const oi of oItems) {
            await connection.query(
              `INSERT INTO invoice_items (invoice_id, order_item_id, amount) VALUES (?, ?, ?)`,
              [invoiceId, oi.id, oi.unit_price * oi.quantity]
            );
          }

          if (orderStatus === "completed") {
            const method = paymentMethods[Math.floor(Math.random() * paymentMethods.length)];
            await connection.query(
              `INSERT INTO payments (invoice_id, method, amount, status, paid_at, note)
               VALUES (?, ?, ?, 'completed', ?, ?)`,
              [invoiceId, method, total, paidAt, `Thanh toán hóa đơn #${invoiceId} qua ${method}`]
            );
            totalInvoicesCreated++;
            totalRevenueSum += total;
          }
        }
      }
    }

    console.log(`   ✅ Seeded ${totalInvoicesCreated} paid invoices (Total Revenue: ${totalRevenueSum.toLocaleString()} VND)`);

    // =========================================================================
    // 2. SEED STOCK IN (NHẬP KHO & CÔNG NỢ NHÀ CUNG CẤP)
    // =========================================================================
    console.log("📦 Generating Stock In (Direct Purchases & Credit Slips)...");

    // A) Direct paid purchases (is_credit = 0) across 30 days
    const directPurchases = [
      { day: 28, ingredientId: 5, qty: 30, cost: 30000, supplierId: 3, note: "Nhập rau xanh tươi đầu tuần" },
      { day: 25, ingredientId: 8, qty: 20, cost: 45000, supplierId: 3, note: "Nhập dầu ăn cái lân" },
      { day: 22, ingredientId: 7, qty: 15, cost: 60000, supplierId: 3, note: "Nhập nước mắm truyền thống" },
      { day: 19, ingredientId: 9, qty: 25, cost: 70000, supplierId: 3, note: "Nhập trái cây tráng miệng" },
      { day: 16, ingredientId: 6, qty: 80, cost: 22000, supplierId: 3, note: "Nhập gạo ST25 loại 1" },
      { day: 13, ingredientId: 10, qty: 30, cost: 28000, supplierId: 3, note: "Nhập bột mì làm bánh" },
      { day: 9, ingredientId: 5, qty: 25, cost: 32000, supplierId: 3, note: "Nhập bổ sung rau sống ăn kèm" },
      { day: 6, ingredientId: 9, qty: 20, cost: 75000, supplierId: 3, note: "Nhập bưởi năm roi và dưa hấu" },
      { day: 3, ingredientId: 5, qty: 35, cost: 30000, supplierId: 3, note: "Nhập rau thơm, xà lách tươi" },
      { day: 1, ingredientId: 8, qty: 15, cost: 45000, supplierId: 3, note: "Nhập thêm dầu ăn chiên rán" },
    ];

    for (const dp of directPurchases) {
      const pDate = new Date(now);
      pDate.setDate(pDate.getDate() - dp.day);
      pDate.setHours(8, 30, 0, 0);

      const batchCode = `LOT-DIR-${formatDate(pDate).replace(/-/g, "")}-${dp.ingredientId}`;
      await connection.query(
        `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, is_credit, paid_amount, note, created_by, created_at)
         VALUES (?, ?, ?, ?, ?, ?, '2026-12-31', 0, NULL, ?, 2, ?)`,
        [dp.ingredientId, batchCode, dp.qty, dp.qty, dp.cost, dp.supplierId, dp.note, formatDateTime(pDate)]
      );
      await connection.query(
        `UPDATE ingredients SET current_stock = current_stock + ? WHERE id = ?`,
        [dp.qty, dp.ingredientId]
      );
    }

    // B) CREDIT SLIPS (Phiếu nhập nợ - is_credit = 1)
    // Slip 1: NCC 1 - CÔNG TY TNHH THỰC PHẨM ABC (Thịt bò + Thịt gà)
    // Ngày nhập: Day -10. Hạn: Day +5 ("Sắp đến hạn"). Đã trả: 0đ. Dư nợ: 15.000.000đ.
    const slip1Date = new Date(now);
    slip1Date.setDate(slip1Date.getDate() - 10);
    slip1Date.setHours(8, 0, 0, 0);

    const slip1DueDate = new Date(now);
    slip1DueDate.setDate(slip1DueDate.getDate() + 5);

    const ticket1 = "PN-20260810-01";
    // Item 1: Thịt bò 30kg x 270.000 = 8.100.000đ
    await connection.query(
      `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, is_credit, due_date, paid_amount, note, created_by, created_at)
       VALUES (1, 'LOT-TB-0810', 30.000, 25.000, 270000.00, 1, '2026-12-31', 1, ?, 0, ?, 2, ?)`,
      [formatDate(slip1DueDate), `[SLIP:${ticket1}] Nhập thịt bò phi lê nướng`, formatDateTime(slip1Date)]
    );
    // Item 2: Thịt gà 50kg x 138.000 = 6.900.000đ
    await connection.query(
      `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, is_credit, due_date, paid_amount, note, created_by, created_at)
       VALUES (2, 'LOT-TG-0810', 50.000, 42.000, 138000.00, 1, '2026-12-31', 1, ?, 0, ?, 2, ?)`,
      [formatDate(slip1DueDate), `[SLIP:${ticket1}] Nhập thịt gà tươi thả vườn`, formatDateTime(slip1Date)]
    );

    // Slip 2: NCC 2 - NHÀ PHÂN PHỐI HẢI SẢN XYZ (Cá hồi + Tôm)
    // Ngày nhập: Day -18. Hạn: Day -3 ("Quá hạn"). Tổng 12.000.000đ. Đã trả trước: 4.000.000đ. Dư nợ còn: 8.000.000đ.
    const slip2Date = new Date(now);
    slip2Date.setDate(slip2Date.getDate() - 18);
    slip2Date.setHours(9, 15, 0, 0);

    const slip2DueDate = new Date(now);
    slip2DueDate.setDate(slip2DueDate.getDate() - 3);

    const ticket2 = "PN-20260802-02";
    // Item 1: Cá hồi 20kg x 400.000 = 8.000.000đ (đã trả 4.000.000đ)
    await connection.query(
      `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, is_credit, due_date, paid_amount, note, created_by, created_at)
       VALUES (3, 'LOT-CH-0802', 20.000, 18.000, 400000.00, 2, '2026-11-30', 1, ?, 4000000.00, ?, 2, ?)`,
      [formatDate(slip2DueDate), `[SLIP:${ticket2}] Nhập cá hồi Nauy tươi sống`, formatDateTime(slip2Date)]
    );
    // Item 2: Tôm 20kg x 200.000 = 4.000.000đ (đã trả 0đ)
    await connection.query(
      `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, is_credit, due_date, paid_amount, note, created_by, created_at)
       VALUES (4, 'LOT-TM-0802', 20.000, 15.000, 200000.00, 2, '2026-11-30', 1, ?, 0.00, ?, 2, ?)`,
      [formatDate(slip2DueDate), `[SLIP:${ticket2}] Nhập tôm sú biển tươi`, formatDateTime(slip2Date)]
    );

    // Slip 3: NCC 3 - CÔNG TY NÔNG SẢN VIỆT (Rau sống + Gạo + Nấm)
    // Ngày nhập: Day -2. Hạn: Day +12 ("Chưa thanh toán"). Tổng 6.500.000đ. Đã trả: 2.000.000đ. Dư nợ: 4.500.000đ.
    const slip3Date = new Date(now);
    slip3Date.setDate(slip3Date.getDate() - 2);
    slip3Date.setHours(7, 45, 0, 0);

    const slip3DueDate = new Date(now);
    slip3DueDate.setDate(slip3DueDate.getDate() + 12);

    const ticket3 = "PN-20260818-03";
    // Item 1: Rau sống 50kg x 30.000 = 1.500.000đ (đã trả 1.500.000)
    await connection.query(
      `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, is_credit, due_date, paid_amount, note, created_by, created_at)
       VALUES (5, 'LOT-RA-0818', 50.000, 48.000, 30000.00, 3, '2026-09-30', 1, ?, 1500000.00, ?, 2, ?)`,
      [formatDate(slip3DueDate), `[SLIP:${ticket3}] Nhập rau hữu cơ Đà Lạt`, formatDateTime(slip3Date)]
    );
    // Item 2: Gạo 100kg x 20.000 = 2.000.000đ (đã trả 500.000)
    await connection.query(
      `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, is_credit, due_date, paid_amount, note, created_by, created_at)
       VALUES (6, 'LOT-GA-0818', 100.000, 95.000, 20000.00, 3, NULL, 1, ?, 500000.00, ?, 2, ?)`,
      [formatDate(slip3DueDate), `[SLIP:${ticket3}] Nhập gạo Nàng Hương thơm dẻo`, formatDateTime(slip3Date)]
    );
    // Item 3: Trái cây 30kg x 100.000 = 3.000.000đ (đã trả 0)
    await connection.query(
      `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, is_credit, due_date, paid_amount, note, created_by, created_at)
       VALUES (9, 'LOT-TC-0818', 30.000, 28.000, 100000.00, 3, '2026-09-15', 1, ?, 0.00, ?, 2, ?)`,
      [formatDate(slip3DueDate), `[SLIP:${ticket3}] Nhập dưa lưới & nho không hạt`, formatDateTime(slip3Date)]
    );

    // Slip 4: NCC 1 - CÔNG TY TNHH THỰC PHẨM ABC (Đã tất toán - còn 0đ)
    // Ngày nhập: Day -26. Tổng 7.800.000đ. Đã trả: 7.800.000đ.
    const slip4Date = new Date(now);
    slip4Date.setDate(slip4Date.getDate() - 26);
    slip4Date.setHours(8, 0, 0, 0);

    const ticket4 = "PN-20260725-04";
    await connection.query(
      `INSERT INTO stock_in (ingredient_id, batch_code, quantity, remaining_quantity, unit_cost, supplier_id, expiry_date, is_credit, due_date, paid_amount, note, created_by, created_at)
       VALUES (1, 'LOT-TB-0725', 30.000, 10.000, 260000.00, 1, '2026-12-31', 1, '2026-08-10', 7800000.00, ?, 2, ?)`,
      [`[SLIP:${ticket4}] Nhập thịt bò đợt cuối tháng 7 [HOÀN TẤT]`, formatDateTime(slip4Date)]
    );

    // Update ingredients stock for credit items
    await connection.query("UPDATE ingredients SET current_stock = current_stock + 65 WHERE id = 1");
    await connection.query("UPDATE ingredients SET current_stock = current_stock + 42 WHERE id = 2");
    await connection.query("UPDATE ingredients SET current_stock = current_stock + 18 WHERE id = 3");
    await connection.query("UPDATE ingredients SET current_stock = current_stock + 15 WHERE id = 4");
    await connection.query("UPDATE ingredients SET current_stock = current_stock + 48 WHERE id = 5");
    await connection.query("UPDATE ingredients SET current_stock = current_stock + 95 WHERE id = 6");
    await connection.query("UPDATE ingredients SET current_stock = current_stock + 28 WHERE id = 9");

    console.log("   ✅ Seeded stock_in credit slips with full slip codes and due dates.");

    // =========================================================================
    // 3. SEED DEBT PAYMENTS (LỊCH SỬ TRẢ NỢ NCC)
    // =========================================================================
    console.log("💳 Generating Debt Payment Records...");

    const pay1Date = new Date(now);
    pay1Date.setDate(pay1Date.getDate() - 14);
    pay1Date.setHours(10, 30, 0, 0);
    await connection.query(
      `INSERT INTO debt_payments (supplier_id, amount, remaining_debt, method, note, paid_by, paid_at)
       VALUES (1, 7800000.00, 0, 'bank_transfer', 'Thanh toán tất toán công nợ phiếu [PN-20260725-04]', 2, ?)`,
      [formatDateTime(pay1Date)]
    );

    const pay2Date = new Date(now);
    pay2Date.setDate(pay2Date.getDate() - 8);
    pay2Date.setHours(15, 0, 0, 0);
    await connection.query(
      `INSERT INTO debt_payments (supplier_id, amount, remaining_debt, method, note, paid_by, paid_at)
       VALUES (2, 4000000.00, 8000000.00, 'bank_transfer', 'Thanh toán đợt 1 phiếu nhập [PN-20260802-02]', 2, ?)`,
      [formatDateTime(pay2Date)]
    );

    const pay3Date = new Date(now);
    pay3Date.setDate(pay3Date.getDate() - 1);
    pay3Date.setHours(11, 0, 0, 0);
    await connection.query(
      `INSERT INTO debt_payments (supplier_id, amount, remaining_debt, method, note, paid_by, paid_at)
       VALUES (3, 2000000.00, 4500000.00, 'cash', 'Thanh toán đợt 1 phiếu nhập [PN-20260818-03]', 2, ?)`,
      [formatDateTime(pay3Date)]
    );

    // =========================================================================
    // 4. SEED STOCK OUT (XUẤT KHO: TRẢ HÀNG NCC, HAO HỤT, NỘI BỘ)
    // =========================================================================
    console.log("📤 Generating Stock Out (Return to Supplier & Waste)...");

    // Find stock_in IDs for return
    const [siBeef]: any = await connection.query("SELECT id FROM stock_in WHERE batch_code = 'LOT-TB-0810' LIMIT 1");
    const [siShrimp]: any = await connection.query("SELECT id FROM stock_in WHERE batch_code = 'LOT-TM-0802' LIMIT 1");

    // Return 1: Trả lại NCC Thực phẩm ABC 2kg thịt bò hỏng lúc giao (2kg x 270.000 = 540.000đ)
    const ret1Date = new Date(now);
    ret1Date.setDate(ret1Date.getDate() - 9);
    ret1Date.setHours(14, 0, 0, 0);
    await connection.query(
      `INSERT INTO stock_out (ingredient_id, stock_in_id, quantity, reason, note, created_by, created_at)
       VALUES (1, ?, 2.000, 'return_to_supplier', 'Thịt bò bị lỗi đóng gói lúc giao hàng, xuất trả lại NCC ABC', 2, ?)`,
      [siBeef[0]?.id || null, formatDateTime(ret1Date)]
    );

    // Return 2: Xuất trả lại NCC Hải sản XYZ 3kg tôm không đạt size (3kg x 200.000 = 600.000đ)
    const ret2Date = new Date(now);
    ret2Date.setDate(ret2Date.getDate() - 5);
    ret2Date.setHours(16, 30, 0, 0);
    await connection.query(
      `INSERT INTO stock_out (ingredient_id, stock_in_id, quantity, reason, note, created_by, created_at)
       VALUES (4, ?, 3.000, 'return_to_supplier', 'Tôm không đồng đều quy cách size, trả lại NCC XYZ hoàn tiền', 2, ?)`,
      [siShrimp[0]?.id || null, formatDateTime(ret2Date)]
    );

    // Waste / internal use
    const waste1Date = new Date(now);
    waste1Date.setDate(waste1Date.getDate() - 12);
    await connection.query(
      `INSERT INTO stock_out (ingredient_id, stock_in_id, quantity, reason, note, created_by, created_at)
       VALUES (5, NULL, 1.500, 'waste', 'Rau sống bị héo do thời tiết nắng nóng', 2, ?)`,
      [formatDateTime(waste1Date)]
    );

    const waste2Date = new Date(now);
    waste2Date.setDate(waste2Date.getDate() - 4);
    await connection.query(
      `INSERT INTO stock_out (ingredient_id, stock_in_id, quantity, reason, note, created_by, created_at)
       VALUES (9, NULL, 2.000, 'waste', 'Trái cây bị dập trong quá trình bảo quản', 2, ?)`,
      [formatDateTime(waste2Date)]
    );

    // =========================================================================
    // 5. SEED OPERATIONAL EXPENSES (CHI PHÍ VẬN HÀNH 30 NGÀY)
    // =========================================================================
    console.log("💡 Generating Operational Expenses...");

    const opsExpenses = [
      { day: 25, title: "Tiền điện tháng kinh doanh", category: "Tiện ích", amount: 4850000 },
      { day: 25, title: "Tiền nước sinh hoạt nhà hàng", category: "Tiện ích", amount: 920000 },
      { day: 20, title: "Chi phí Marketing chạy Ads Facebook & TikTok", category: "Marketing", amount: 3000000 },
      { day: 15, title: "Bảo trì và nạp gas tủ đông bảo quản bếp", category: "Bảo trì", amount: 1200000 },
      { day: 10, title: "Mua sắm bát đĩa và ly thủy tinh bổ sung", category: "Vật tư", amount: 1500000 },
      { day: 5, title: "Cước Internet cáp quang doanh nghiệp", category: "Tiện ích", amount: 450000 },
      { day: 2, title: "Dịch vụ giặt ủi khăn trải bàn & đồng phục", category: "Dịch vụ", amount: 750000 },
    ];

    for (const exp of opsExpenses) {
      const expDate = new Date(now);
      expDate.setDate(expDate.getDate() - exp.day);
      await connection.query(
        `INSERT INTO operational_expenses (title, category, amount, is_recurring, expense_date, created_by, created_at)
         VALUES (?, ?, ?, 0, ?, 2, ?)`,
        [exp.title, exp.category, exp.amount, formatDate(expDate), formatDateTime(expDate)]
      );
    }

    // =========================================================================
    // 6. SEED PAYROLLS (CHI TRẢ LƯƠNG NHÂN VIÊN)
    // =========================================================================
    console.log("👥 Generating Staff Payrolls...");

    const payrollDate = new Date(now);
    payrollDate.setDate(payrollDate.getDate() - 10);
    payrollDate.setHours(10, 0, 0, 0);

    const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
    const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();

    const staffPayrolls = [
      { userId: 3, hours: 195, rate: 30000, salary: 5850000 }, // Cashier
      { userId: 4, hours: 180, rate: 25000, salary: 4500000 }, // Waiter 1
      { userId: 5, hours: 185, rate: 25000, salary: 4625000 }, // Waiter 2
      { userId: 6, hours: 200, rate: 45000, salary: 9000000 }, // Chef
    ];

    for (const sp of staffPayrolls) {
      await connection.query(
        `INSERT INTO payrolls (user_id, month, year, total_hours, hourly_rate, total_salary, status, paid_at, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'paid', ?, ?)
         ON DUPLICATE KEY UPDATE total_salary = VALUES(total_salary), status = 'paid', paid_at = VALUES(paid_at)`,
        [sp.userId, prevMonth, prevYear, sp.hours, sp.rate, sp.salary, formatDateTime(payrollDate), formatDateTime(payrollDate)]
      );
    }

    // =========================================================================
    // 7. SEED STOCK INVENTORY (KIỂM KÊ HAO HỤT)
    // =========================================================================
    console.log("📋 Generating Stock Inventory History...");

    const checkDate1 = new Date(now);
    checkDate1.setDate(checkDate1.getDate() - 15);
    await connection.query(
      `INSERT INTO stock_inventory (ingredient_id, actual_stock, system_stock, noted_at, created_by)
       VALUES 
       (1, 48.000, 50.000, ?, 2),
       (2, 41.500, 42.000, ?, 2),
       (5, 23.500, 25.000, ?, 2)`,
      [formatDate(checkDate1), formatDate(checkDate1), formatDate(checkDate1)]
    );

    const checkDate2 = new Date(now);
    checkDate2.setDate(checkDate2.getDate() - 1);
    await connection.query(
      `INSERT INTO stock_inventory (ingredient_id, actual_stock, system_stock, noted_at, created_by)
       VALUES 
       (1, 64.000, 65.000, ?, 2),
       (3, 17.500, 18.000, ?, 2),
       (5, 46.800, 48.000, ?, 2)`,
      [formatDate(checkDate2), formatDate(checkDate2), formatDate(checkDate2)]
    );

    // =========================================================================
    // 8. SYNCHRONIZE SUPPLIERS' TOTAL_DEBT
    // =========================================================================
    console.log("🔗 Synchronizing Suppliers Total Debt with active Stock In Credit Slips...");

    for (const sup of suppliers) {
      const [debtRow]: any = await connection.query(
        `SELECT SUM(GREATEST(0, (quantity * unit_cost) - COALESCE(paid_amount, 0))) as realDebt
         FROM stock_in
         WHERE supplier_id = ? AND is_credit = 1`,
        [sup.id]
      );
      const activeDebt = Number(debtRow[0]?.realDebt || 0);
      await connection.query(`UPDATE suppliers SET total_debt = ? WHERE id = ?`, [activeDebt, sup.id]);
      console.log(`   🏢 ${sup.name}: Công nợ hiện tại = ${activeDebt.toLocaleString()} VND`);
    }

    // =========================================================================
    // 8.5. SYNCHRONIZE INGREDIENTS' CURRENT_STOCK WITH BATCH REMAINING QUANTITY
    // =========================================================================
    console.log("📦 Synchronizing Ingredients Current Stock with Stock In Batches...");
    await connection.query(
      `UPDATE ingredients i
       SET current_stock = COALESCE(
         (SELECT SUM(remaining_quantity) FROM stock_in si WHERE si.ingredient_id = i.id),
         0
       )`
    );

    // =========================================================================
    // 9. SEED UPCOMING BOOKINGS (HÔM NAY & NGÀY MAI)
    // =========================================================================
    console.log("📅 Generating Upcoming Bookings...");
    await connection.query("ALTER TABLE bookings MODIFY COLUMN table_id INT NULL");

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const bookingsData = [
      {
        tableId: null,
        custId: 1,
        name: "Nguyễn Văn An",
        phone: "0911111111",
        size: 4,
        date: formatDate(now),
        start: "18:30:00",
        end: "20:30:00",
        code: "BK" + formatDate(now).replace(/-/g, "").slice(2) + "001",
        status: "confirmed",
        note: "Tiệc sinh nhật gia đình",
      },
      {
        tableId: null,
        custId: 2,
        name: "Trần Thị Bình",
        phone: "0922222222",
        size: 2,
        date: formatDate(now),
        start: "19:00:00",
        end: "21:00:00",
        code: "BK" + formatDate(now).replace(/-/g, "").slice(2) + "002",
        status: "confirmed",
        note: "Bàn gần cửa sổ lãng mạn",
      },
      {
        tableId: null,
        custId: 3,
        name: "Lê Văn Cường",
        phone: "0933333333",
        size: 6,
        date: formatDate(tomorrow),
        start: "11:30:00",
        end: "13:30:00",
        code: "BK" + formatDate(tomorrow).replace(/-/g, "").slice(2) + "003",
        status: "confirmed",
        note: "Tiệc tiếp khách công ty",
      },
      {
        tableId: null,
        custId: 4,
        name: "Phạm Thị Dung",
        phone: "0944444444",
        size: 8,
        date: formatDate(tomorrow),
        start: "18:00:00",
        end: "21:00:00",
        code: "BK" + formatDate(tomorrow).replace(/-/g, "").slice(2) + "004",
        status: "confirmed",
        note: "Khách VIP gọi món trước",
      },
      {
        tableId: null,
        custId: null,
        name: "Hoàng Minh Tuấn",
        phone: "0934567890",
        size: 3,
        date: formatDate(tomorrow),
        start: "19:30:00",
        end: "21:30:00",
        code: "BK" + formatDate(tomorrow).replace(/-/g, "").slice(2) + "005",
        status: "pending",
        note: "Chờ xác nhận",
      },
    ];

    for (const bk of bookingsData) {
      await connection.query(
        `INSERT INTO bookings (table_id, customer_id, guest_name, guest_phone, party_size, start_time, end_time, confirmation_code, status, guest_note, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          bk.tableId,
          bk.custId,
          bk.name,
          bk.phone,
          bk.size,
          `${bk.date} ${bk.start}`,
          `${bk.date} ${bk.end}`,
          bk.code,
          bk.status,
          bk.note,
          formatDateTime(now),
        ]
      );
    }

    console.log("   ✅ Seeded upcoming bookings.");

    console.log("\n🎉 HOÀN TẤT SEED DỮ LIỆU 30 NGÀY GẦN NHẤT THÀNH CÔNG!");
  } catch (err: any) {
    console.error("❌ ERROR SEEDING RECENT DATA:", err.message);
    throw err;
  } finally {
    await connection.end();
  }
}

if (require.main === module) {
  seedRecentData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
