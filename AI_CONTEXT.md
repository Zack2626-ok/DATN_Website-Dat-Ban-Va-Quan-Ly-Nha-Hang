# AI Context cho Dự Án Quản Lý Nhà Hàng

File này cung cấp context, rules và convention để các công cụ AI (TRAE, Cursor, Copilot...) hiểu rõ về dự án **Quản Lý Nhà Hàng** nhằm sinh ra code chuẩn xác, đồng nhất với kiến trúc của team.

---

## 1. Bản Chất Và Kiến Trúc Nghiệp Vụ (Cực Kỳ Quan Trọng)

Dự án này **KHÔNG phải là một CRUD app đơn giản**. Đây là hệ thống quản lý nhà hàng tích hợp, xử lý các luồng nghiệp vụ thời gian thực giữa nhiều bộ phận (bếp, phục vụ, thu ngân, quản lý).

**Hệ thống được chia làm các domain chính:**

1. **Menu Management:** Quản lý thực đơn, danh mục món ăn, giá, trạng thái còn/hết hàng. Hỗ trợ cập nhật trạng thái nguyên liệu theo thời gian thực.
2. **Order Management:** Luồng đặt món từ bàn → bếp → phục vụ → thanh toán. Mỗi order có state machine phức tạp: `Draft → Confirmed → InKitchen → Served → Paid → Cancelled`.
3. **Table Management:** Quản lý sơ đồ bàn, trạng thái bàn (`Available → Reserved → Occupied → Cleaning`), merge/split bàn.
4. **Kitchen Management:** Màn hình bếp nhận order theo thời gian thực, cập nhật trạng thái từng món, quản lý hàng đợi nấu.
5. **Staff Management:** Quản lý nhân viên, ca làm việc, phân quyền theo vai trò (Manager, Cashier, Waiter, Chef).
6. **Inventory Management:** Quản lý nguyên liệu, cảnh báo hàng sắp hết, liên kết với menu để tự động ẩn món khi hết nguyên liệu.
7. **Payment & Revenue:** Thanh toán (tiền mặt, chuyển khoản, QR), xuất hóa đơn, báo cáo doanh thu theo ngày/tuần/tháng.
8. **Reporting & Analytics:** Dashboard tổng hợp, top món ăn, giờ cao điểm, doanh thu theo nhân viên/ca.

**Core Concepts Frontend Cần Nắm:**

- **Real-time driven:** Màn hình bếp và bàn cần cập nhật tức thì khi có order mới hoặc thay đổi trạng thái (dùng polling hoặc WebSocket).
- **State Machine:** Order, bàn, nguyên liệu đều có flow chuyển trạng thái rõ ràng — không tự ý nhảy trạng thái tùy tiện.
- **Role-based UI:** Giao diện render khác nhau tùy role. Chef không thấy màn hình thanh toán. Cashier không thấy màn hình bếp.
- **Offline-aware:** Một số tính năng cần hoạt động khi mất mạng tạm thời (đặc biệt order tại bàn), cần xử lý graceful degradation.

---

## 2. Tech Stack

- **Framework:** React 19, Vite
- **Language:** TypeScript
- **State Management:** Redux Toolkit (`@reduxjs/toolkit`, `react-redux`)
- **Routing:** React Router v7 (`react-router-dom`)
- **Networking:** Axios (một instance duy nhất cho Main API)
- **UI:** Tailwind CSS v3 (thuần, không dùng component library)
- **Real-time:** Polling hoặc WebSocket (tùy module)
- **Package Manager:** npm
- **Lint/Format:** ESLint, Prettier

---

## 3. Cấu Trúc Thư Mục (Folder Structure)

```
src/
├── assets/             # File tĩnh (images, icons, fonts)
├── components/         # UI Component dùng chung (Button, Input, Modal, Table, Badge...)
├── views/              # Các trang chính theo từng domain
│   ├── menu/
│   ├── orders/
│   ├── tables/
│   ├── kitchen/
│   ├── staff/
│   ├── inventory/
│   ├── payment/
│   └── reports/
├── constants/          # Hằng số, enum trạng thái, config
├── interfaces/         # TypeScript Interface/Type toàn cục
├── routes/             # Cấu hình React Router, route guard theo role
├── services/           # API calls, Axios instance
├── store/              # Redux store, slices theo domain
└── utils/              # Helper functions (formatDate, formatCurrency, v.v.)
```

---

## 4. Naming Conventions (Quy Tắc Đặt Tên)

- **Components & Views:** PascalCase (vd: `OrderCard.tsx`, `TableMap.tsx`)
- **Hooks:** camelCase, bắt đầu bằng `use` (vd: `useOrders.ts`, `useTableStatus.ts`)
- **Utils, Services, Constants:** camelCase (vd: `formatCurrency.ts`, `orderService.ts`)
- **Interfaces/Types:** PascalCase (vd: `Order`, `MenuItem`, `TableStatus`)
- **Redux Slices:** `[name]Slice.ts` (vd: `orderSlice.ts`, `tableSlice.ts`)
- **Constants/Enum:** UPPER_SNAKE_CASE (vd: `ORDER_STATUS.CONFIRMED`, `TABLE_STATUS.OCCUPIED`)
- **CSS Classes (Tailwind):** kebab-case theo mặc định Tailwind

---

## 5. Coding Conventions & Clean Code

- **Functional Components:** Luôn dùng Functional Component + Hooks. Không dùng Class Components.
- **Comments:** Luôn có JSDoc ngắn gọn phía trước mỗi function, component, hook để giải thích mục đích.
- **TypeScript:**
  - **NGHIÊM CẤM** dùng type `any`. Dùng `unknown` nếu chưa rõ kiểu và thực hiện type narrowing an toàn.
  - Luôn định nghĩa đầy đủ Interface/Type cho Props, API response, Redux store.
  - Dùng `import type { ... }` khi import thuần Interface/Type.
  - Dùng `enum` hoặc `as const object` cho các trạng thái — **KHÔNG hardcode string**.

- **Styling (Tailwind):**
  - **KHÔNG viết CSS inline** (`style={{...}}`) trừ trường hợp bất khả kháng (vd: dynamic color từ API).
  - Tận dụng `clsx` hoặc `cn()` utility để ghép class có điều kiện.
  - Responsive phải được xử lý: mobile-first với breakpoint `sm:`, `md:`, `lg:`.
  - Màu sắc thương hiệu nhà hàng phải được định nghĩa trong `tailwind.config.js` (vd: `brand-primary`, `brand-accent`) — **KHÔNG hardcode hex trực tiếp trong className**.

- **API Calls:**
  - **KHÔNG** gọi axios/fetch trực tiếp trong file UI Component.
  - Mọi API call phải đi qua file service tương ứng trong `src/services/`.
  - Luôn có `try/catch` và hiển thị lỗi cho người dùng (toast, alert...).

- **State Management:**
  - Local state ngắn hạn: `useState`, `useReducer`.
- Global/shared state: Redux Toolkit.
  - Form state: `useState` cục bộ hoặc thư viện form nhẹ — không đưa toàn bộ form value vào Redux.

---

## 6. Constants & Enum Trạng Thái (Bắt Buộc Dùng)

```typescript
// src/constants/orderStatus.ts
export const ORDER_STATUS = {
  DRAFT: "draft",
  CONFIRMED: "confirmed",
  IN_KITCHEN: "in_kitchen",
  SERVED: "served",
  PAID: "paid",
  CANCELLED: "cancelled",
} as const;

export type OrderStatus = (typeof ORDER_STATUS)[keyof typeof ORDER_STATUS];

// src/constants/tableStatus.ts
export const TABLE_STATUS = {
  AVAILABLE: "available",
  RESERVED: "reserved",
  OCCUPIED: "occupied",
  CLEANING: "cleaning",
} as const;

export type TableStatus = (typeof TABLE_STATUS)[keyof typeof TABLE_STATUS];
```

---

## 7. Cấu Trúc Mẫu Cho Một Màn Hình Nghiệp Vụ

Khi phát triển bất kỳ màn hình mới nào trong `src/views/`, **bắt buộc** tuân theo cấu trúc sau:

```
src/views/[domain]/[feature-name]/
├── index.tsx                    # Component cha: quản lý state, gọi API, điều phối
└── components/
    ├── [Feature]Filters.tsx     # Thanh lọc, tìm kiếm, toolbar hành động
    ├── [Feature]Table.tsx       # Bảng danh sách (nếu có)
    ├── [Feature]Card.tsx        # Card hiển thị (nếu dạng grid)
    └── [Feature]Modal.tsx       # Modal tạo/sửa/xem chi tiết
```

### Component Điều Phối Chính (`index.tsx`)

```tsx
/**
 * OrdersView - Màn hình quản lý danh sách order
 * Quản lý state tập trung: filter, pagination, data, loading
 */
const OrdersView: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Order[]>([]);
  const [filter, setFilter] = useState<OrderFilter>({
    status: null,
    tableId: null,
  });

  useEffect(() => {
    let isMounted = true;
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await orderService.getOrders(filter);
        if (isMounted) setData(res.data);
      } catch (err) {
        console.error(err);
        toast.error("Không thể tải danh sách order");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchData();
    return () => {
      isMounted = false;
    };
  }, [filter]);
  // ...
};
```

---

## 8. Xử Lý Real-time (Quan Trọng)

- Màn hình **Kitchen** và **Table Map** cần cập nhật tự động — dùng polling mỗi 5-10s hoặc WebSocket nếu backend hỗ trợ.
- Khi dùng polling, phải cleanup interval trong `useEffect` cleanup function.

```typescript
useEffect(() => {
  const interval = setInterval(() => {
    fetchKitchenOrders();
  }, 5000);
  return () => clearInterval(interval); // cleanup bắt buộc
}, []);
```

---

## 9. Environment Variables (.env)

```env
VITE_API_BASE_URL=http://localhost:5000/api    # URL backend Node.js
VITE_APP_NAME=ResManager
VITE_POLLING_INTERVAL=5000                     # Milliseconds cho real-time polling
```

Truy cập trong code: `import.meta.env.VITE_API_BASE_URL`

**NGHIÊM CẤM** hardcode URL API hoặc bất kỳ config nào trực tiếp trong code.

---

## 10. Performance

- Dùng `useMemo` cho danh sách columns của table và computed data phức tạp.
- Dùng `useCallback` cho handler truyền xuống component con.
- Lazy load các View: `const KitchenView = React.lazy(() => import("./views/kitchen"))`.
- Tránh re-render không cần thiết: bọc component con bằng `React.memo` khi cần.

---

## 11. Mindset Production

- **Error Handling:** Luôn có `try/catch`. Hiển thị lỗi rõ ràng cho người dùng, không để màn hình trắng.
- **Null Safety:** Dùng optional chaining (`?.`) và nullish coalescing (`??`) xuyên suốt.
- **Hardcode:** KHÔNG hardcode status string, URL, magic number — phải dùng constant/enum.
- **RBAC:** Mọi route và action nhạy cảm phải kiểm tra role trước khi render hoặc gọi API.

---

## 12. System Prompt Instructions (Dành cho AI)

Mỗi khi generate code mới, AI phải:

1. **Nhớ đây là hệ thống real-time nhà hàng**, không phải CRUD thuần. Luôn nghĩ đến trạng thái (status), role người dùng và luồng nghiệp vụ thực tế.
2. **Dùng đúng constant/enum** cho mọi trạng thái — không hardcode string `"confirmed"`, `"paid"`... trực tiếp trong JSX/logic.
3. **Styling bằng Tailwind thuần** — không import thư viện UI ngoài (Ant Design, MUI...). Tự xây component nếu cần.
4. **Trả về code hoàn chỉnh** (đủ import, interface, component) thay vì snippet sơ sài.
5. **Sinh comment JSDoc** giải thích mục đích của mỗi hàm và component.
6. **NGHIÊM CẤM** dùng type `any`.
7. **KHÔNG hardcode** API URL, màu hex, magic number, status string.
8. **Xử lý cleanup** khi dùng `setInterval`, WebSocket, hay subscription trong `useEffect`.
9. **Kiểm tra role** trước khi render UI nhạy cảm (ví dụ: nút xóa order chỉ Manager mới thấy).
10. Sau khi hoàn thành chỉnh sửa code, **chạy `npm run lint`** để kiểm tra và sửa lỗi nếu có.
