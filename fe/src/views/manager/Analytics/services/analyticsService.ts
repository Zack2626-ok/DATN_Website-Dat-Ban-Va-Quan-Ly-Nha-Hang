/**
 * analyticsService.ts
 * Tầng dịch vụ báo cáo & phân tích (Module 7).
 * Cung cấp dữ liệu chỉ số KPI, biểu đồ doanh thu theo thời gian, lưu lượng giờ cao điểm, 
 * top món ăn bán chạy, báo cáo cổng thanh toán và dòng tiền lời lỗ (Income vs Expenses).
 */

export interface DateFilter {
  type: "today" | "week" | "month" | "custom";
  startDate?: string;
  endDate?: string;
}

export interface SummaryKpis {
  totalRevenue: number; // Doanh thu nhà hàng (Hóa đơn paid)
  dineInRevenue: number;
  takeawayRevenue: number;
  deliveryRevenue: number;
  eventRevenue: number; // Doanh thu sự kiện (Hợp đồng confirmed/completed)
  totalOrders: number; // Tổng số đơn hàng trong kỳ
  averageOrderValue: number; // Giá trị đơn hàng trung bình
}

export interface RevenueTimePoint {
  label: string; // Ngày (DD/MM), Thứ (Thứ 2...) hoặc Giờ tùy thuộc filter
  revenue: number;
  orderCount: number;
}

export interface PeakHourData {
  hour: number; // Giờ trong ngày (8 - 22)
  count: number; // Số đơn phát sinh
  percentage: number; // Tỉ lệ % lưu lượng
}

export interface TopItem {
  id: number;
  name: string;
  quantity: number;
  revenue: number;
  percentage: number; // % đóng góp số lượng trong top 5
}

export interface PaymentMethodStat {
  method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay";
  name: string;
  count: number;
  total: number;
  percentage: number; // % đóng góp doanh thu
}

export interface CashFlowSummary {
  income: number; // Doanh thu (Restaurant paid + Event deposits/remaining paid)
  expenses: number; // Chi phí nhập nguyên liệu kho
  netProfit: number; // Lợi nhuận ròng
  expenseItems: Array<{
    category: string;
    amount: number;
  }>;
}

// Helper: Lấy chuỗi ngày lùi về quá khứ tương đối so với hôm nay
const getPastDate = (daysAgo: number, hour: number = 12, minute: number = 0): Date => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
};

// ============================================================================
// 1. MOCK DATABASE (Sát 100% với Schema ResManager)
// ============================================================================

const mockMenuItems = [
  { id: 1, name: "Gỏi hải sản", price: 120000, category: "Khai vị" },
  { id: 2, name: "Chả giò tôm thịt", price: 80000, category: "Khai vị" },
  { id: 3, name: "Bò lúc lắc khoai tây", price: 180000, category: "Món chính" },
  { id: 4, name: "Gà nướng mật ong", price: 160000, category: "Món chính" },
  { id: 5, name: "Cá hồi sốt chanh bơ", price: 220000, category: "Món chính" },
  { id: 6, name: "Lẩu Thái chua cay", price: 350000, category: "Lẩu" },
  { id: 7, name: "Lẩu hải sản tươi sống", price: 400000, category: "Lẩu" },
  { id: 8, name: "Coca Cola lon", price: 20000, category: "Đồ uống" },
  { id: 10, name: "Trà đào cam sả", price: 35000, category: "Đồ uống" },
  { id: 12, name: "Chè thái sầu riêng", price: 40000, category: "Tráng miệng" },
];

// Khởi tạo 150 đơn hàng giả lập rải rác trong 30 ngày qua
interface MockOrder {
  id: number;
  table_id: number | null;
  created_by: number;
  order_type: "dine_in" | "takeaway" | "delivery";
  status: "open" | "serving" | "pending_payment" | "completed" | "cancelled";
  created_at: Date;
}

const mockOrders: MockOrder[] = [];
const mockOrderItems: Array<{
  id: number;
  order_id: number;
  menu_item_id: number;
  quantity: number;
  unit_price: number;
  status: "pending" | "cooking" | "done" | "cancelled" | "voided";
  created_at: Date;
}> = [];

const mockInvoices: Array<{
  id: number;
  order_id: number;
  subtotal: number;
  discount: number;
  tax: number;
  service_fee: number;
  total: number;
  status: "draft" | "paid" | "refunded";
  paid_at: Date | null;
  created_at: Date;
}> = [];

const mockPayments: Array<{
  id: number;
  invoice_id: number;
  method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay";
  amount: number;
  paid_at: Date;
}> = [];

// Seed dữ liệu ngẫu nhiên nhưng có quy luật thực tế (Giờ cao điểm trưa 11-13h, tối 18-21h)
let orderIdCounter = 1;
let orderItemIdCounter = 1;
let invoiceIdCounter = 1;
let paymentIdCounter = 1;

const orderTypes: Array<"dine_in" | "takeaway" | "delivery"> = ["dine_in", "takeaway", "delivery"];

for (let daysAgo = 30; daysAgo >= 0; daysAgo--) {
  // Số đơn hàng mỗi ngày từ 3 đến 8 đơn
  const ordersCount = daysAgo === 0 ? 4 : Math.floor(Math.random() * 6) + 4; // Hôm nay ít hơn do chưa hết ngày
  
  for (let i = 0; i < ordersCount; i++) {
    // Phân phối giờ ngẫu nhiên (Tập trung vào trưa và tối)
    const rand = Math.random();
    let hour = 19; // mặc định tối
    if (rand < 0.15) hour = 8 + Math.floor(Math.random() * 3); // sáng 8h - 11h
    else if (rand < 0.45) hour = 11 + Math.floor(Math.random() * 3); // trưa 11h - 14h
    else if (rand < 0.60) hour = 14 + Math.floor(Math.random() * 4); // chiều 14h - 18h
    else hour = 18 + Math.floor(Math.random() * 4); // tối 18h - 22h

    const minute = Math.floor(Math.random() * 60);
    const orderDate = getPastDate(daysAgo, hour, minute);
    
    // Loại đơn hàng
    const orderType = orderTypes[Math.floor(Math.random() * orderTypes.length)];
    const isCompleted = daysAgo > 0 || (daysAgo === 0 && rand < 0.7); // hôm nay có vài đơn chưa xong
    const status = isCompleted ? "completed" : "serving";

    const order: MockOrder = {
      id: orderIdCounter++,
      table_id: orderType === "dine_in" ? Math.floor(Math.random() * 10) + 1 : null,
      created_by: 4 + Math.floor(Math.random() * 2), // Waiter 1 hoặc 2
      order_type: orderType,
      status: status,
      created_at: orderDate
    };
    mockOrders.push(order);

    // Tạo các món ăn cho đơn hàng này
    const itemsCount = Math.floor(Math.random() * 3) + 2; // 2 - 4 món
    let subtotal = 0;
    const addedMenuItemIds = new Set<number>();

    for (let j = 0; j < itemsCount; j++) {
      let menuItem = mockMenuItems[Math.floor(Math.random() * mockMenuItems.length)];
      // Tránh trùng món trong 1 đơn
      while (addedMenuItemIds.has(menuItem.id)) {
        menuItem = mockMenuItems[Math.floor(Math.random() * mockMenuItems.length)];
      }
      addedMenuItemIds.add(menuItem.id);

      const quantity = Math.floor(Math.random() * 2) + 1; // 1 - 2 phần
      const itemPrice = menuItem.price;
      subtotal += itemPrice * quantity;

      mockOrderItems.push({
        id: orderItemIdCounter++,
        order_id: order.id,
        menu_item_id: menuItem.id,
        quantity: quantity,
        unit_price: itemPrice,
        status: status === "completed" ? "done" : "cooking",
        created_at: orderDate
      });
    }

    // Tạo Hóa đơn cho đơn đã hoàn thành
    if (status === "completed") {
      const discount = Math.random() < 0.2 ? Math.round((subtotal * 0.1) / 1000) * 1000 : 0; // 20% cơ hội giảm 10%
      const subtotalAfterDiscount = subtotal - discount;
      const tax = Math.round((subtotalAfterDiscount * 0.1)); // 10% VAT
      const service_fee = orderType === "dine_in" ? Math.round((subtotalAfterDiscount * 0.05)) : 0; // 5% dịch vụ ăn tại chỗ
      const total = subtotalAfterDiscount + tax + service_fee;

      const invoice = {
        id: invoiceIdCounter++,
        order_id: order.id,
        subtotal: subtotal,
        discount: discount,
        tax: tax,
        service_fee: service_fee,
        total: total,
        status: "paid" as const,
        paid_at: orderDate,
        created_at: orderDate
      };
      mockInvoices.push(invoice);

      // Tạo Giao dịch thanh toán
      // Chọn phương thức thanh toán ngẫu nhiên (MoMo, Chuyển khoản, Tiền mặt là chủ yếu)
      let methodRand = Math.random();
      let method: "cash" | "bank_transfer" | "card" | "momo" | "vnpay" = "cash";
      if (methodRand < 0.25) method = "momo";
      else if (methodRand < 0.50) method = "bank_transfer";
      else if (methodRand < 0.70) method = "vnpay";
      else if (methodRand < 0.85) method = "card";

      mockPayments.push({
        id: paymentIdCounter++,
        invoice_id: invoice.id,
        method: method,
        amount: total,
        paid_at: orderDate
      });
    }
  }
}

// 1.2 Dữ liệu hợp đồng tiệc sự kiện (Bảng event_contracts)
interface MockEventContract {
  id: number;
  contact_name: string;
  event_date: Date;
  guest_count: number;
  total_amount: number;
  deposit_amount: number;
  status: "draft" | "confirmed" | "completed" | "cancelled";
  created_at: Date;
}

const mockEventContracts: MockEventContract[] = [
  { id: 1, contact_name: "Nguyễn Văn A", event_date: getPastDate(15), guest_count: 150, total_amount: 225000000, deposit_amount: 67500000, status: "completed", created_at: getPastDate(20) },
  { id: 2, contact_name: "Lê Văn C", event_date: getPastDate(5), guest_count: 80, total_amount: 64000000, deposit_amount: 19200000, status: "completed", created_at: getPastDate(12) },
  { id: 3, contact_name: "Hoàng Văn E", event_date: getPastDate(2), guest_count: 50, total_amount: 60000000, deposit_amount: 18000000, status: "confirmed", created_at: getPastDate(8) },
  { id: 4, contact_name: "Trần Thị Minh B", event_date: getPastDate(0), guest_count: 100, total_amount: 120000000, deposit_amount: 36000000, status: "confirmed", created_at: getPastDate(6) },
  // Các tiệc tương lai không nằm trong doanh thu báo cáo quá khứ (nhưng có thể cọc)
  { id: 5, contact_name: "Phạm Tấn Tài", event_date: getPastDate(-10), guest_count: 120, total_amount: 144000000, deposit_amount: 43200000, status: "confirmed", created_at: getPastDate(3) },
  { id: 6, contact_name: "Vũ Hoàng My", event_date: getPastDate(-20), guest_count: 70, total_amount: 84000000, deposit_amount: 25200000, status: "draft", created_at: getPastDate(1) },
];

// 1.3 Dữ liệu chi phí restock kho (Bảng stock_in)
const mockStockIn = [
  // Tuần 4 trước (21-28 ngày trước)
  { id: 1, category: "Thịt", amount: 15000000, created_at: getPastDate(25) },
  { id: 2, category: "Hải sản", amount: 22000000, created_at: getPastDate(25) },
  { id: 3, category: "Rau củ & Nấm", amount: 4500000, created_at: getPastDate(24) },
  { id: 4, category: "Đồ khô & Gia vị", amount: 3000000, created_at: getPastDate(23) },
  { id: 5, category: "Đồ uống & Bia", amount: 8000000, created_at: getPastDate(22) },
  
  // Tuần 3 trước (14-21 ngày trước)
  { id: 6, category: "Thịt", amount: 12000000, created_at: getPastDate(18) },
  { id: 7, category: "Hải sản", amount: 19000000, created_at: getPastDate(18) },
  { id: 8, category: "Rau củ & Nấm", amount: 5000000, created_at: getPastDate(17) },
  { id: 9, category: "Đồ uống & Bia", amount: 7500000, created_at: getPastDate(15) },
  
  // Tuần 2 trước (7-14 ngày trước)
  { id: 10, category: "Thịt", amount: 14500000, created_at: getPastDate(11) },
  { id: 11, category: "Hải sản", amount: 25000000, created_at: getPastDate(10) },
  { id: 12, category: "Rau củ & Nấm", amount: 4800000, created_at: getPastDate(9) },
  { id: 13, category: "Đồ khô & Gia vị", amount: 3500000, created_at: getPastDate(8) },
  
  // Tuần qua (0-7 ngày trước)
  { id: 14, category: "Thịt", amount: 16000000, created_at: getPastDate(4) },
  { id: 15, category: "Hải sản", amount: 20000000, created_at: getPastDate(4) },
  { id: 16, category: "Rau củ & Nấm", amount: 6000000, created_at: getPastDate(3) },
  { id: 17, category: "Đồ uống & Bia", amount: 9000000, created_at: getPastDate(2) },
  { id: 18, category: "Rau củ & Nấm", amount: 1500000, created_at: getPastDate(1) },
  { id: 19, category: "Thịt", amount: 4800000, created_at: getPastDate(0) },
  { id: 20, category: "Rau củ & Nấm", amount: 1200000, created_at: getPastDate(0) },
];

// ============================================================================
// 2. HELPER FUNCTIONS (Xử lý Ngày và Lọc Dữ liệu)
// ============================================================================

/**
 * Kiểm tra xem một đối tượng Date có nằm trong khoảng lọc hay không
 */
const isDateInFilter = (date: Date, filter: DateFilter): boolean => {
  const targetTime = date.getTime();
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  switch (filter.type) {
    case "today": {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      return targetTime >= start.getTime() && targetTime <= today.getTime();
    }
    case "week": {
      // 7 ngày qua
      const start = new Date();
      start.setDate(start.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      return targetTime >= start.getTime() && targetTime <= today.getTime();
    }
    case "month": {
      // 30 ngày qua
      const start = new Date();
      start.setDate(start.getDate() - 29);
      start.setHours(0, 0, 0, 0);
      return targetTime >= start.getTime() && targetTime <= today.getTime();
    }
    case "custom": {
      if (!filter.startDate) return true;
      const start = new Date(filter.startDate);
      start.setHours(0, 0, 0, 0);
      
      const end = filter.endDate ? new Date(filter.endDate) : new Date();
      end.setHours(23, 59, 59, 999);
      
      return targetTime >= start.getTime() && targetTime <= end.getTime();
    }
    default:
      return true;
  }
};

/**
 * Định dạng ngày để so sánh/hiển thị
 */
const formatShortDate = (date: Date): string => {
  return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`;
};

// ============================================================================
// 3. ANALYTICS SERVICE IMPLEMENTATION (SQL Aggregations Simulation)
// ============================================================================

export const analyticsService = {
  /**
   * Tính toán các chỉ số KPI tóm tắt
   * Mô phỏng: SELECT SUM(total) FROM invoices / SELECT SUM(total_amount) FROM event_contracts ...
   */
  getSummaryKpis: async (filter: DateFilter): Promise<SummaryKpis> => {
    // Độ trễ giả lập mạng
    await new Promise((resolve) => setTimeout(resolve, 600));

    // Lấy hóa đơn paid hợp lệ
    const validInvoices = mockInvoices.filter(
      (inv) => inv.status === "paid" && inv.paid_at && isDateInFilter(inv.paid_at, filter)
    );

    let totalRevenue = 0;
    let dineInRevenue = 0;
    let takeawayRevenue = 0;
    let deliveryRevenue = 0;
    
    validInvoices.forEach((inv) => {
      totalRevenue += inv.total;
      
      // JOIN với orders để tìm order_type
      const order = mockOrders.find((o) => o.id === inv.order_id);
      if (order) {
        if (order.order_type === "dine_in") dineInRevenue += inv.total;
        else if (order.order_type === "takeaway") takeawayRevenue += inv.total;
        else if (order.order_type === "delivery") deliveryRevenue += inv.total;
      }
    });

    // Lấy hợp đồng tiệc sự kiện
    // SUM(total_amount) WHERE status IN ('completed', 'confirmed')
    const validContracts = mockEventContracts.filter(
      (c) => (c.status === "completed" || c.status === "confirmed") && isDateInFilter(c.event_date, filter)
    );
    const eventRevenue = validContracts.reduce((sum, c) => sum + c.total_amount, 0);

    // Tổng số đơn trong kỳ
    const totalOrders = mockOrders.filter(
      (o) => o.status === "completed" && isDateInFilter(o.created_at, filter)
    ).length;

    // AOV = Doanh thu / Số đơn hàng
    const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

    return {
      totalRevenue,
      dineInRevenue,
      takeawayRevenue,
      deliveryRevenue,
      eventRevenue,
      totalOrders,
      averageOrderValue,
    };
  },

  /**
   * Tổng hợp Doanh thu và Số đơn hàng theo mốc thời gian
   * Mô phỏng: GROUP BY DATE(paid_at)
   */
  getRevenueTimeline: async (filter: DateFilter): Promise<RevenueTimePoint[]> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const validInvoices = mockInvoices.filter(
      (inv) => inv.status === "paid" && inv.paid_at && isDateInFilter(inv.paid_at, filter)
    );

    // Gom nhóm
    const groups: { [key: string]: { revenue: number; orderCount: number; rawDate: Date } } = {};

    if (filter.type === "today") {
      // Nhóm theo khung giờ nếu chọn Hôm nay (Ví dụ: 8h, 10h, 12h...)
      for (let hour = 8; hour <= 22; hour += 2) {
        const label = `${hour}h`;
        groups[label] = { revenue: 0, orderCount: 0, rawDate: new Date() };
      }
      
      validInvoices.forEach((inv) => {
        if (!inv.paid_at) return;
        const hour = inv.paid_at.getHours();
        // Nhóm vào khung giờ gần nhất
        const groupHour = hour - (hour % 2);
        const label = `${groupHour}h`;
        if (groups[label]) {
          groups[label].revenue += inv.total;
          groups[label].orderCount += 1;
        }
      });
    } else {
      // Nhóm theo ngày (DD/MM) cho các bộ lọc Tuần, Tháng hoặc Custom
      validInvoices.forEach((inv) => {
        if (!inv.paid_at) return;
        const label = formatShortDate(inv.paid_at);
        if (!groups[label]) {
          groups[label] = { revenue: 0, orderCount: 0, rawDate: inv.paid_at };
        }
        groups[label].revenue += inv.total;
        groups[label].orderCount += 1;
      });
    }

    // Sắp xếp theo ngày tăng dần
    const result = Object.keys(groups).map((label) => ({
      label,
      revenue: groups[label].revenue,
      orderCount: groups[label].orderCount,
      rawDate: groups[label].rawDate,
    }));

    if (filter.type !== "today") {
      result.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());
    }

    return result.map(({ label, revenue, orderCount }) => ({ label, revenue, orderCount }));
  },

  /**
   * Thống kê lượng lưu lượng theo giờ cao điểm
   * Mô phỏng: SELECT HOUR(created_at), COUNT(*) GROUP BY HOUR(created_at)
   */
  getPeakHours: async (filter: DateFilter): Promise<PeakHourData[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const validOrders = mockOrders.filter(
      (o) => isDateInFilter(o.created_at, filter)
    );

    const hourCounts: { [hour: number]: number } = {};
    // Khởi tạo các khung giờ nhà hàng mở cửa (8h - 22h)
    for (let h = 8; h <= 22; h++) {
      hourCounts[h] = 0;
    }

    validOrders.forEach((o) => {
      const hour = o.created_at.getHours();
      if (hourCounts[hour] !== undefined) {
        hourCounts[hour]++;
      }
    });

    const totalCount = validOrders.length || 1;

    return Object.keys(hourCounts).map((hKey) => {
      const hour = parseInt(hKey, 10);
      const count = hourCounts[hour];
      return {
        hour,
        count,
        percentage: Math.round((count / totalCount) * 100),
      };
    });
  },

  /**
   * Top 5 món ăn bán chạy nhất trong kỳ lọc
   * Mô phỏng: JOIN order_items với menu_items WHERE status='done' GROUP BY menu_item_id ORDER BY SUM(quantity) DESC LIMIT 5
   */
  getTopSellingItems: async (filter: DateFilter): Promise<TopItem[]> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Lọc order_items bán thành công
    const validItems = mockOrderItems.filter(
      (item) => item.status === "done" && isDateInFilter(item.created_at, filter)
    );

    // Group by menu_item_id
    const itemGroups: { [id: number]: { quantity: number; revenue: number } } = {};
    validItems.forEach((item) => {
      if (!itemGroups[item.menu_item_id]) {
        itemGroups[item.menu_item_id] = { quantity: 0, revenue: 0 };
      }
      itemGroups[item.menu_item_id].quantity += item.quantity;
      itemGroups[item.menu_item_id].revenue += item.quantity * item.unit_price;
    });

    // Map với tên món ăn từ menu_items
    const list = Object.keys(itemGroups).map((idStr) => {
      const id = parseInt(idStr, 10);
      const menuItem = mockMenuItems.find((m) => m.id === id);
      return {
        id,
        name: menuItem ? menuItem.name : `Món ăn #${id}`,
        quantity: itemGroups[id].quantity,
        revenue: itemGroups[id].revenue,
        percentage: 0,
      };
    });

    // Sắp xếp theo số lượng bán được giảm dần
    list.sort((a, b) => b.quantity - a.quantity);

    // Lấy top 5
    const top5 = list.slice(0, 5);
    const totalTopQuantity = top5.reduce((sum, item) => sum + item.quantity, 0) || 1;

    return top5.map((item) => ({
      ...item,
      percentage: Math.round((item.quantity / totalTopQuantity) * 100),
    }));
  },

  /**
   * Thống kê phương thức thanh toán
   * Mô phỏng: JOIN payments p với invoices i ON p.invoice_id = i.id WHERE i.status = 'paid' GROUP BY method
   */
  getPaymentMethodStats: async (filter: DateFilter): Promise<PaymentMethodStat[]> => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const validPayments = mockPayments.filter(
      (p) => isDateInFilter(p.paid_at, filter)
    );

    const methodNames: Record<string, string> = {
      cash: "Tiền mặt",
      bank_transfer: "Chuyển khoản",
      card: "Thẻ ngân hàng",
      momo: "Ví điện tử MoMo",
      vnpay: "Cổng VNPay",
    };

    const stats: Record<string, { count: number; total: number }> = {
      cash: { count: 0, total: 0 },
      bank_transfer: { count: 0, total: 0 },
      card: { count: 0, total: 0 },
      momo: { count: 0, total: 0 },
      vnpay: { count: 0, total: 0 },
    };

    // 1) Tính tổng tiền hóa đơn lẻ
    validPayments.forEach((p) => {
      if (stats[p.method]) {
        stats[p.method].count++;
        stats[p.method].total += p.amount;
      }
    });

    // 2) Tính tổng tiền các hợp đồng đặt tiệc trong kỳ lọc (mặc định chuyển khoản)
    const validContracts = mockEventContracts.filter(
      (c) => (c.status === "completed" || c.status === "confirmed") && isDateInFilter(c.event_date, filter)
    );

    validContracts.forEach((c) => {
      stats.bank_transfer.count++;
      stats.bank_transfer.total += c.total_amount;
    });

    let grandTotal = 0;
    Object.keys(stats).forEach((k) => {
      grandTotal += stats[k].total;
    });

    const safeGrandTotal = grandTotal || 1;

    return Object.keys(stats).map((methodKey) => {
      const method = methodKey as "cash" | "bank_transfer" | "card" | "momo" | "vnpay";
      return {
        method,
        name: methodNames[method],
        count: stats[method].count,
        total: stats[method].total,
        percentage: Math.round((stats[method].total / safeGrandTotal) * 100),
      };
    });
  },

  /**
   * Báo cáo Thu chi & Lợi nhuận ròng (Net Profit)
   * Thu = Doanh thu bán hàng + Doanh thu sự kiện
   * Chi = Chi phí nhập nguyên liệu đầu vào từ stock_in
   */
  getCashFlow: async (filter: DateFilter): Promise<CashFlowSummary> => {
    await new Promise((resolve) => setTimeout(resolve, 650));

    // 1) THU NHẬP
    // Thu từ hóa đơn bán lẻ
    const validInvoices = mockInvoices.filter(
      (inv) => inv.status === "paid" && inv.paid_at && isDateInFilter(inv.paid_at, filter)
    );
    const invoiceIncome = validInvoices.reduce((sum, inv) => sum + inv.total, 0);

    // Thu từ hợp đồng tiệc sự kiện
    const validContracts = mockEventContracts.filter(
      (c) => (c.status === "completed" || c.status === "confirmed") && isDateInFilter(c.event_date, filter)
    );
    const eventIncome = validContracts.reduce((sum, c) => sum + c.total_amount, 0);

    const totalIncome = invoiceIncome + eventIncome;

    // 2) CHI PHÍ
    // Lọc chi phí mua sắm kho từ stock_in
    const validStockIn = mockStockIn.filter(
      (item) => isDateInFilter(item.created_at, filter)
    );

    // Gom nhóm chi phí theo danh mục nguyên liệu
    const categoryExpenses: Record<string, number> = {};
    let totalExpenses = 0;

    validStockIn.forEach((item) => {
      if (!categoryExpenses[item.category]) {
        categoryExpenses[item.category] = 0;
      }
      categoryExpenses[item.category] += item.amount;
      totalExpenses += item.amount;
    });

    const expenseItems = Object.keys(categoryExpenses).map((category) => ({
      category,
      amount: categoryExpenses[category],
    }));

    // Sắp xếp chi phí giảm dần
    expenseItems.sort((a, b) => b.amount - a.amount);

    return {
      income: totalIncome,
      expenses: totalExpenses,
      netProfit: totalIncome - totalExpenses,
      expenseItems,
    };
  },
};
