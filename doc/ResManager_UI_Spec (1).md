# ResManager — UI Specification & AI Coding Guide
> Đọc file này trước khi code bất kỳ màn hình nào.
> Khi cần AI generate giao diện: paste file này + yêu cầu cụ thể vào Cursor/Claude/ChatGPT.

---

## PHẦN 1 — QUY ĐỊNH CHUNG (BẮT BUỘC ĐỌC)

### 1.1 Tech Stack Frontend
```
Framework : React 18 + Vite
Styling   : Tailwind CSS (chỉ dùng utility class, không viết CSS file riêng)
State     : useState / useReducer / Context API (không dùng Redux)
HTTP      : Axios (đã config interceptor JWT tự động)
Real-time : Socket.io-client
Router    : React Router v6
Icon      : lucide-react
Notify    : react-hot-toast
```

### 1.2 Màu sắc & Design Token
```
Primary     : #1D4ED8  (blue-700)  — nút chính, header nội bộ
Success     : #15803D  (green-700) — trạng thái trống, xác nhận
Warning     : #B45309  (amber-700) — trạng thái đặt trước, cảnh báo
Danger      : #B91C1C  (red-700)   — trạng thái lỗi, hủy, void
Purple      : #6D28D9  (violet-700)— trạng thái chờ thanh toán
Gray        : #374151  (gray-700)  — text chính
Light Gray  : #F9FAFB  (gray-50)   — background trang
Border      : #E5E7EB  (gray-200)  — border card, table

-- Màu trạng thái bàn (QUAN TRỌNG — dùng nhất quán toàn hệ thống)
empty           : bg-green-100  text-green-800  border-green-300
reserved        : bg-amber-100  text-amber-800  border-amber-300
serving         : bg-blue-100   text-blue-800   border-blue-300
pending_payment : bg-purple-100 text-purple-800 border-purple-300

-- Màu trạng thái order_item
pending  : bg-gray-100   text-gray-700
cooking  : bg-orange-100 text-orange-700
done     : bg-green-100  text-green-700
voided   : bg-red-100    text-red-700   line-through
```

### 1.3 Layout chung hệ thống nội bộ
```
┌─────────────────────────────────────────────┐
│  Sidebar (w-64, bg-gray-900, text-white)     │
│  ┌─────────────────────────────────────────┐│
│  │ Logo ResManager                         ││
│  │ ─────────────────                       ││
│  │ • Dashboard                             ││
│  │ • Sơ đồ bàn        (TV1)               ││
│  │ • Thực đơn         (TV2)               ││
│  │ • KDS Bếp          (TV3)               ││
│  │ • Kho              (TV4)               ││
│  │ • Thanh toán       (TV5)               ││
│  │ • Nhân sự          (TV6)               ││
│  │ • Báo cáo          (TV7)               ││
│  │ • Sự kiện          (TV7)               ││
│  │ ─────────────────                       ││
│  │ Avatar + Tên nhân viên                  ││
│  │ Đăng xuất                               ││
│  └─────────────────────────────────────────┘│
│                                              │
│  Main content (flex-1, bg-gray-50, p-6)     │
│  ┌─────────────────────────────────────────┐│
│  │ Page Header: Tiêu đề + Action buttons   ││
│  │ ─────────────────────────────────────── ││
│  │ Content area                            ││
│  └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

### 1.4 Component tái sử dụng bắt buộc
```jsx
// Dùng thống nhất toàn team — không tự tạo component trùng lặp

<Button variant="primary|secondary|danger|ghost" size="sm|md|lg">
<Badge color="green|amber|blue|purple|red|gray">
<Modal isOpen={} onClose={} title="">
<Table columns={[]} data={[]} loading={} />
<Pagination page={} total={} onChange={} />
<SearchInput placeholder="" onChange={} />
<StatusBadge status="empty|reserved|serving|pending_payment" />
<ConfirmDialog message="" onConfirm={} onCancel={} />
<LoadingSpinner />
<EmptyState icon="" title="" description="" action={} />
```

### 1.5 Cấu trúc folder
```
src/
├── components/
│   ├── common/          ← shared components (Button, Modal, Badge...)
│   ├── layout/          ← Sidebar, Header, PageLayout
│   └── [module]/        ← component riêng của module (TableCard, OrderItem...)
├── pages/
│   ├── auth/            ← Login
│   ├── tables/          ← Module 1
│   ├── menu/            ← Module 2
│   ├── kds/             ← Module 3
│   ├── inventory/       ← Module 4
│   ├── payment/         ← Module 5
│   ├── staff/           ← Module 6
│   ├── reports/         ← Module 7
│   ├── events/          ← Module 8
│   └── public/          ← Module 0 (web khách)
├── services/            ← Axios API calls
├── hooks/               ← Custom hooks
├── contexts/            ← Auth context, Socket context
└── utils/               ← formatCurrency, formatDate...
```

### 1.6 Convention code
```jsx
// Format tiền: luôn dùng hàm này
formatCurrency(85000) // → "85.000 ₫"

// Format ngày: 
formatDate('2024-01-15') // → "15/01/2024"
formatDateTime('2024-01-15 14:30') // → "15/01/2024 14:30"

// Tên API: luôn prefix /api/v1/
axios.get('/api/v1/tables')
axios.post('/api/v1/orders')

// Xử lý lỗi API:
try {
  const { data } = await axios.get('/api/v1/tables')
  // data.success, data.data, data.message
} catch (err) {
  toast.error(err.response?.data?.message || 'Có lỗi xảy ra')
}
```

---

## PHẦN 2 — MODULE 0: TRANG WEB KHÁCH (TV7 + TV1 + TV6)

> Layout riêng: KHÔNG dùng Sidebar nội bộ. Dùng Navbar + Footer công khai.

### Màn hình W1 — Landing Page (TV7)
```
URL: /
Actor: Khách hàng (chưa đăng nhập cũng xem được)

Layout:
┌─────────────────────────────────────────────┐
│ Navbar: Logo | Menu | Đặt bàn | Đăng nhập  │
├─────────────────────────────────────────────┤
│ Hero Banner                                  │
│ - Ảnh nền nhà hàng (full width, h-[500px]) │
│ - Tiêu đề lớn + mô tả ngắn                 │
│ - 2 nút CTA: "Đặt bàn ngay" + "Xem menu"  │
├─────────────────────────────────────────────┤
│ Section: Món nổi bật (is_featured = 1)      │
│ - Grid 4 cột, mỗi card: ảnh + tên + giá   │
├─────────────────────────────────────────────┤
│ Section: Ưu đãi đang active                 │
│ - Horizontal scroll, badge % giảm           │
├─────────────────────────────────────────────┤
│ Section: Thông tin + Google Maps            │
├─────────────────────────────────────────────┤
│ Footer                                       │
└─────────────────────────────────────────────┘

API cần:
GET /api/v1/menu/public?featured=true     → món nổi bật
GET /api/v1/promotions/active             → ưu đãi đang active
```

### Màn hình W2 — Thực đơn online (TV2)
```
URL: /menu
Actor: Khách hàng

Layout:
┌─────────────────────────────────────────────┐
│ Navbar                                       │
├─────────────────────────────────────────────┤
│ Filter bar: [Tất cả] [Khai vị] [Món chính] │
│             [Lẩu] [Đồ uống] [Tráng miệng]  │
│ Search: 🔍 Tìm tên món...                   │
├─────────────────────────────────────────────┤
│ Grid 3 cột (responsive 1→2→3):              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ [ảnh]   │ │ [ảnh]   │ │ [ảnh]   │    │
│ │ Tên món │ │ Tên món │ │ Tên món │    │
│ │ 85.000₫ │ │ 85.000₫ │ │ 85.000₫ │    │
│ │[Xem chi]│ │[Xem chi]│ │[Xem chi]│    │
│ └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────┘

API cần:
GET /api/v1/menu/public              → tất cả món
GET /api/v1/menu/public?category=1   → lọc theo danh mục
GET /api/v1/categories/public        → danh sách danh mục
```

### Màn hình W3 — Ưu đãi & Combo (TV7)
```
URL: /promotions
Actor: Khách hàng

Layout: Grid 2 cột, mỗi card có:
- Ảnh banner ưu đãi
- Tên gói + mô tả
- Badge: giảm X% hoặc giảm X₫
- Thời hạn: đến dd/mm/yyyy
- Nút "Đặt bàn với ưu đãi này" → redirect /booking?promo=id

API cần:
GET /api/v1/promotions/active
```

### Màn hình W4 — Đặt bàn online 3 bước (TV1)
```
URL: /booking
Actor: Khách hàng (cần đăng nhập)
<<include>> Đăng ký / Đăng nhập (khách)
<<extend>> Gửi email xác nhận

Stepper UI:
[Bước 1: Chọn thời gian] → [Bước 2: Thông tin] → [Bước 3: Xác nhận]

Bước 1:
- DatePicker: Chọn ngày
- TimePicker: Chọn giờ (dropdown 30 phút)
- NumberInput: Số người (1-20)
- Nút "Kiểm tra bàn trống" → gọi API
- Hiện danh sách bàn còn trống (dạng list, không cần sơ đồ)

Bước 2:
- Input: Họ tên (*), SĐT (*), Email
- Textarea: Ghi chú (dị ứng, yêu cầu đặc biệt)
- Select: Chọn ưu đãi/combo (optional)

Bước 3:
- Summary: bàn, ngày, giờ, số người, ưu đãi
- Nút "Xác nhận đặt bàn"
- Sau xác nhận: hiện modal thành công + mã booking

API cần:
GET  /api/v1/tables/available?date=&time=&guests=
POST /api/v1/bookings/customer
```

### Màn hình W5 — Đăng ký / Đăng nhập khách (TV6)
```
URL: /login  /register
Actor: Khách hàng

2 tab: [Đăng nhập] [Đăng ký]

Đăng nhập: email + password + nút Login
Đăng ký: name + email + phone + password + confirm password

Lưu ý: JWT customer lưu vào localStorage key: 'customer_token'
KHÔNG dùng chung key với staff token ('token')

API cần:
POST /api/v1/auth/customer/login
POST /api/v1/auth/customer/register
```

### Màn hình W6 — Tài khoản khách (TV6)
```
URL: /account
Actor: Khách hàng (cần đăng nhập)
<<include>> Xem điểm thành viên

3 tab layout:
Tab 1 "Đặt bàn của tôi":
  - Bảng: Mã booking | Ngày | Giờ | Bàn | Trạng thái | Action
  - Badge trạng thái: pending/confirmed/completed/cancelled
  - Nút "Hủy" nếu status = pending/confirmed

Tab 2 "Điểm thành viên":
  - Số điểm hiện tại (to, nổi bật)
  - Badge cấp: bronze/silver/gold/vip
  - Bảng lịch sử: Ngày | Loại | Điểm | Hóa đơn

Tab 3 "Thông tin cá nhân":
  - Form sửa: name, phone, email
  - Nút đổi mật khẩu

API cần:
GET    /api/v1/bookings/my
DELETE /api/v1/bookings/:id/cancel
GET    /api/v1/loyalty/my
GET    /api/v1/customers/me
PATCH  /api/v1/customers/me
```

---

## PHẦN 3 — MODULE 1: TIỀN SẢNH & SƠ ĐỒ BÀN (TV1)

### Màn hình 1.1 — Sơ đồ bàn (màn hình chính)
```
URL: /tables
Actor: Nhân viên phục vụ, Quản lý
Real-time: Socket.io event 'table:status_changed'

Layout:
┌─────────────────────────────────────────────┐
│ Header: "Sơ đồ bàn" | [+ Mở bàn mới]       │
│ Filter: [Tất cả] [Tầng 1] [Tầng 2] [Sân]  │
├─────────────────────────────────────────────┤
│ Legend: 🟢Trống 🔵Phục vụ 🟡Đặt trước 🟣TT│
├─────────────────────────────────────────────┤
│ Grid sơ đồ (theo row_pos + col_pos):        │
│                                              │
│   A  [B01]  [B02]  [B03]  [ ]    [ ]       │
│   B  [B04]  [B05]  [ ]    [ ]    [ ]       │
│   C  [B06]  [ ]    [ ]    [ ]    [ ]       │
│                                              │
│ Mỗi TableCard:                              │
│ ┌───────────┐                               │
│ │    B01    │  ← tên bàn                   │
│ │  4 người  │  ← sức chứa                  │
│ │  Trống    │  ← trạng thái có màu         │
│ └───────────┘                               │
│ Click vào bàn → mở TableDetailModal        │
└─────────────────────────────────────────────┘

TableDetailModal (khi click vào bàn):
- Trạng thái hiện tại
- Nút tùy theo trạng thái:
  empty           → [Mở bàn] [Đặt trước]
  reserved        → [Check-in] [Hủy đặt]
  serving         → [Xem order] [Chuyển bàn] [Gộp bàn] [Tách bàn]
  pending_payment → [Xem hóa đơn]

API cần:
GET  /api/v1/tables?area=
POST /api/v1/orders              (mở bàn)
Socket: on('table:status_changed', cb)
```

### Màn hình 1.2 — Quản lý đặt bàn (Booking)
```
URL: /bookings
Actor: Nhân viên phục vụ, Quản lý

Layout:
┌─────────────────────────────────────────────┐
│ Header: "Đặt bàn" | [+ Tạo booking mới]    │
│ Filter: [Hôm nay] [Ngày mai] [Tất cả]      │
│         Status: [Tất cả][Chờ][Xác nhận]    │
├─────────────────────────────────────────────┤
│ Table:                                       │
│ Mã | Khách | SĐT | Ngày giờ | Bàn | Người │
│ Trạng thái | Action                         │
│                                              │
│ Action buttons theo status:                 │
│ pending   → [✓ Xác nhận] [✗ Hủy]          │
│ confirmed → [Check-in] [Hủy]               │
└─────────────────────────────────────────────┘

Modal tạo booking mới:
- Chọn bàn (dropdown)
- Ngày giờ (datetime picker)
- Họ tên khách + SĐT (bắt buộc)
- Số người
- Ghi chú

API cần:
GET   /api/v1/bookings
POST  /api/v1/bookings
PATCH /api/v1/bookings/:id/confirm
PATCH /api/v1/bookings/:id/cancel
PATCH /api/v1/bookings/:id/checkin
```

### Màn hình 1.3 — Danh sách chờ (Waitlist)
```
URL: /waiter/waitlist
Actor: Nhân viên phục vụ

Layout đơn giản:
- Bảng: STT | Tên | SĐT | Số người | Giờ vào | Đã thông báo | Action
- Nút [+ Thêm vào danh sách chờ]
- Nút [📞 Đã gọi] → cập nhật notified_at

API cần:
GET  /api/v1/waitlist
POST /api/v1/waitlist
PATCH /api/v1/waitlist/:id/notify
DELETE /api/v1/waitlist/:id
```

---

## PHẦN 4 — MODULE 2: THỰC ĐƠN & GỌI MÓN (TV2)

### Màn hình 2.1 — Quản lý thực đơn
```
URL: /menu/manage
Actor: Quản lý

Layout 2 cột:
Cột trái (w-1/4): Danh sách danh mục
  - List item có thể kéo thả để sắp xếp
  - Nút [+ Thêm danh mục]
  - Click để filter cột phải

Cột phải (w-3/4): Danh sách món
  - Search + Filter active/inactive
  - Grid hoặc List view (toggle)
  - Mỗi món: ảnh | tên | giá | trạm bếp | active toggle
  - Nút [+ Thêm món]

Modal thêm/sửa món:
- Upload ảnh (preview)
- Tên món, Mô tả, Giá
- Danh mục (select)
- Trạm bếp: hot_kitchen / bar / cold_kitchen
- Hiển thị trang chủ (is_featured toggle)
- Tab "Modifier Groups": thêm nhóm tùy chỉnh
- Tab "Combo": gán vào combo

API cần:
GET    /api/v1/categories
POST   /api/v1/categories
GET    /api/v1/menu-items
POST   /api/v1/menu-items
PUT    /api/v1/menu-items/:id
DELETE /api/v1/menu-items/:id (soft delete)
PATCH  /api/v1/menu-items/:id/toggle-active
```

### Màn hình 2.2 — Gọi món (POS)
```
URL: /orders/:orderId
Actor: Nhân viên phục vụ

Layout 2 cột:
┌──────────────────────┬──────────────────────┐
│ THỰC ĐƠN (w-3/5)    │ ORDER (w-2/5)        │
│                      │ Bàn B01 — Order #123 │
│ [Khai vị][Món chính] │ ─────────────────── │
│ [Lẩu][Đồ uống]...   │ Bò lúc lắc x1       │
│                      │ 180.000₫             │
│ Search: 🔍           │ Gà nướng x2          │
│                      │ 320.000₫             │
│ Grid món:            │ ─────────────────── │
│ [Gỏi]  [Chả giò]    │ Tổng: 500.000₫      │
│ [Bò]   [Gà]         │                      │
│                      │ [Hold] [Gửi bếp]    │
│ Click → thêm vào     │ [Thanh toán]        │
│ order bên phải       │                      │
└──────────────────────┴──────────────────────┘

Khi click món → Modal chọn Modifier (nếu có):
  - Nhóm modifier (checkbox/radio)
  - Ghi chú bếp (textarea)
  - Số lượng (stepper)
  - Nút "Thêm vào order"

Trạng thái từng item trong order:
  pending  → ⏳ text-gray-500
  cooking  → 🔥 text-orange-500
  done     → ✅ text-green-500
  voided   → ~~gạch đỏ~~

API cần:
GET    /api/v1/orders/:id
POST   /api/v1/orders/:id/items       (thêm món)
PATCH  /api/v1/orders/:id/items/:itemId/void  (hủy món)
POST   /api/v1/orders/:id/send-to-kitchen
Socket: emit('order:new_item', data)
        emit('order:item_voided', data)
```

---

## PHẦN 5 — MODULE 3: KDS BẾP (TV3)

### Màn hình 3.1 — Màn hình bếp KDS
```
URL: /kds
Actor: Nhân viên bếp, Bếp trưởng
Real-time: Socket.io — nhận order mới, void, status change
KHÔNG có sidebar — fullscreen, dark mode

Layout:
┌─────────────────────────────────────────────┐
│ Header: KDS Bếp Nóng | [Batch View] [Recall]│
│ Đồng hồ hiện tại                           │
├─────────────────────────────────────────────┤
│ Grid phiếu bếp (3-4 cột, auto-fill):       │
│                                              │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐    │
│ │ BÀN B01  │ │ BÀN B03  │ │ BÀN B05  │    │
│ │ #Order123│ │ #Order125│ │ #Order127│    │
│ │ ──────── │ │ ──────── │ │ ──────── │    │
│ │ Bò lúc  │ │ Gà nướng│ │ Lẩu Thái│    │
│ │ lắc x1  │ │ x2      │ │ x1      │    │
│ │ Ghi chú  │ │         │ │         │    │
│ │ ──────── │ │ ──────── │ │ ──────── │    │
│ │ 🟢 5:30  │ │ 🟡 12:00│ │ 🔴 18:45│    │
│ │[Bắt đầu]│ │[Xong]   │ │[Xong]   │    │
│ └──────────┘ └──────────┘ └──────────┘    │
└─────────────────────────────────────────────┘

Đồng hồ cảnh báo (tính từ created_at):
  < 5 phút  → border-green-500  bg-green-50
  5-10 phút → border-amber-500  bg-amber-50
  > 10 phút → border-red-500    bg-red-50  (animate-pulse)

Món bị void → highlight đỏ, gạch ngang, không xóa khỏi phiếu

Batch View (tab riêng):
  Bảng gom: Tên món | Tổng số lượng | Các bàn
  Refresh tự động mỗi 30s

Recall (modal):
  Danh sách phiếu đã hoàn thành trong 1 giờ qua

Socket events lắng nghe:
  'order:new_item'     → thêm phiếu mới
  'order:item_voided'  → highlight đỏ item
  'kitchen:item_done'  → remove khỏi màn hình

API cần:
GET   /api/v1/kds/tickets?station=hot_kitchen
PATCH /api/v1/kds/items/:id/status
GET   /api/v1/kds/recall
GET   /api/v1/kds/batch?station=hot_kitchen
```

---

## PHẦN 6 — MODULE 4: KHO & ĐỊNH MỨC (TV4)

### Màn hình 4.1 — Tổng quan kho
```
URL: /inventory
Actor: Bếp trưởng, Quản lý

Layout:
┌─────────────────────────────────────────────┐
│ Header: "Quản lý kho"                       │
│ Tabs: [Nguyên liệu] [Nhập kho] [Xuất kho]  │
│       [Kiểm kê] [Định mức BOM] [Nhà cung]  │
├─────────────────────────────────────────────┤
│ Tab Nguyên liệu:                            │
│ - Alert đỏ nếu có nguyên liệu dưới min_stock│
│ - Bảng: Tên | Đơn vị | Tồn kho | Tối thiểu │
│         | Trạng thái | Action               │
│ - Badge: 🔴 Dưới mức tối thiểu             │
│ - Nút [+ Thêm nguyên liệu]                 │
│                                              │
│ Tab Nhập kho:                               │
│ - Form: Nguyên liệu | Số lượng | Đơn giá   │
│         | Nhà cung cấp | Ghi chú            │
│ - Lịch sử nhập kho (table + filter ngày)    │
│                                              │
│ Tab Định mức BOM:                           │
│ - Chọn món ăn (dropdown search)             │
│ - Bảng nguyên liệu: tên | số lượng/phần    │
│ - Nút [+ Thêm nguyên liệu]                 │
└─────────────────────────────────────────────┘

API cần:
GET    /api/v1/ingredients
POST   /api/v1/ingredients
GET    /api/v1/stock-in
POST   /api/v1/stock-in
GET    /api/v1/recipes/:menuItemId
POST   /api/v1/recipes/:menuItemId/items
GET    /api/v1/inventory/low-stock  (cảnh báo)
```

---

## PHẦN 7 — MODULE 5: THANH TOÁN (TV5)

### Màn hình 5.1 — Tạo hóa đơn & Thanh toán
```
URL: /payment/:orderId
Actor: Thu ngân

Layout 2 cột:
┌──────────────────────┬──────────────────────┐
│ CHI TIẾT ORDER       │ HOÁ ĐƠN              │
│ Bàn B01 — #123       │                      │
│ ─────────────────── │ Subtotal: 500.000₫   │
│ Bò lúc lắc x1       │ VAT (10%): 50.000₫  │
│ 180.000₫             │ Phí DV (5%):25.000₫ │
│ Gà nướng x2          │ Tips:       0₫       │
│ 320.000₫             │ ─────────────────── │
│                       │ TỔNG: 575.000₫      │
│ [Chọn để tách bill]  │                      │
│                       │ Voucher: [____] [Áp]│
│                       │                      │
│                       │ Thanh toán:          │
│                       │ [💵 Tiền mặt]        │
│                       │ [🏦 Chuyển khoản]    │
│                       │ [💳 Thẻ]             │
│                       │ [📱 MoMo/VNPay]      │
│                       │                      │
│                       │ [Tách bill] [Thanh]  │
└──────────────────────┴──────────────────────┘

Modal Tách bill:
  - Checkbox chọn từng món
  - Gán cho "Người 1", "Người 2"...
  - Tự tính tổng từng người

API cần:
GET   /api/v1/orders/:id
POST  /api/v1/invoices           (tạo hóa đơn)
POST  /api/v1/invoices/:id/pay   (thanh toán)
POST  /api/v1/invoices/:id/split (tách bill)
GET   /api/v1/vouchers/:code/validate
```

---

## PHẦN 8 — MODULE 6: AUTH & NHÂN SỰ (TV6)

### Màn hình 6.1 — Đăng nhập nội bộ
```
URL: /login (staff)
Layout: centered card, không có sidebar

Form:
- Email
- Password (show/hide toggle)
- Nút Đăng nhập
- Loading state khi submit

Sau login: lưu token vào localStorage key 'token'
Redirect theo role:
  admin/manager → /dashboard
  waiter        → /tables
  cashier       → /payment
  chef          → /kds
  sales_event   → /events

API: POST /api/v1/auth/login
```

### Màn hình 6.2 — Quản lý nhân viên
```
URL: /staff
Actor: Quản lý, Admin

Tabs: [Nhân viên] [Ca làm việc] [Chấm công] [Hiệu suất]

Tab Nhân viên:
  Bảng: Avatar | Tên | Email | Vai trò | Trạng thái | Action
  [+ Thêm nhân viên] → Modal form
  Action: [Sửa] [Vô hiệu hóa]

Tab Chấm công:
  Filter: ngày/tuần/tháng + nhân viên
  Bảng: Tên | Clock-in | Clock-out | Tổng giờ

API cần:
GET    /api/v1/users
POST   /api/v1/users
PUT    /api/v1/users/:id
PATCH  /api/v1/users/:id/status
GET    /api/v1/attendance
POST   /api/v1/attendance/clock-in
PATCH  /api/v1/attendance/:id/clock-out
```

---

## PHẦN 9 — MODULE 7: BÁO CÁO (TV7)

### Màn hình 7.1 — Dashboard
```
URL: /dashboard
Actor: Quản lý, Admin

Layout grid:
┌──────────┬──────────┬──────────┬──────────┐
│ Doanh thu│ Đơn hàng │ Bàn đang │ Khách    │
│ hôm nay  │ hôm nay  │ phục vụ  │ hôm nay  │
│ 5.2tr₫  │ 24 đơn   │ 8/15 bàn │ 96 người │
└──────────┴──────────┴──────────┴──────────┘

Biểu đồ doanh thu 7 ngày (LineChart - recharts)
Biểu đồ món bán chạy top 5 (BarChart - recharts)
Danh sách đơn gần nhất (Table)

API cần:
GET /api/v1/reports/summary?date=today
GET /api/v1/reports/revenue?period=7days
GET /api/v1/reports/top-items?limit=5
GET /api/v1/orders/recent?limit=10
```

---

## PHẦN 10 — MODULE 8: SỰ KIỆN & TIỆC (TV7)

### Màn hình 8.1 — Quản lý hợp đồng tiệc
```
URL: /events
Actor: Sales, Quản lý

Tabs: [Hợp đồng] [Lịch sảnh] [Gói tiệc]

Tab Hợp đồng:
  Filter: tháng + status (draft/confirmed/completed/cancelled)
  Bảng: Mã HĐ | Khách | Sảnh | Ngày tiệc | Khách mời
        | Tổng | Đã cọc | Còn lại | Status | Action
  [+ Tạo hợp đồng mới]

Modal Tạo hợp đồng (nhiều bước):
  Bước 1: Chọn sảnh + ngày + giờ (kiểm tra double-book)
  Bước 2: Thông tin khách hàng
  Bước 3: Chọn gói set menu + số bàn + số khách
  Bước 4: Báo giá tự động = price_per_person × guest_count
  Bước 5: Xác nhận + thu cọc

Tab Lịch sảnh:
  Calendar view theo tháng
  Màu: tentative=vàng, confirmed=xanh, cancelled=đỏ

API cần:
GET    /api/v1/event-contracts
POST   /api/v1/event-contracts
PATCH  /api/v1/event-contracts/:id/confirm
GET    /api/v1/halls/availability?date=
GET    /api/v1/event-packages
POST   /api/v1/event-deposits
```

---

## PHẦN 11 — HƯỚNG DẪN DÙNG FILE NÀY VỚI AI

### Cách prompt AI để generate code đúng

**Template prompt:**
```
Tôi cần code màn hình [TÊN MÀN HÌNH] cho dự án ResManager.

Yêu cầu:
- React 18 + Tailwind CSS
- Đọc spec trong file UI Spec phần [PHẦN X]
- Tạo các file:
  + src/pages/[module]/[PageName].jsx
  + src/components/[module]/[ComponentName].jsx (nếu cần)
  + src/services/[module]Service.js (Axios calls)

Lưu ý:
- Dùng đúng màu sắc theo quy định phần 1.2
- Dùng component chung từ phần 1.4
- Format tiền dùng formatCurrency()
- Xử lý loading, error, empty state đầy đủ
- Responsive: mobile-first
```

**Ví dụ cụ thể:**
```
Tôi cần code màn hình Sơ đồ bàn cho ResManager.
Đọc spec phần 3 — Module 1, màn hình 1.1.
Tạo file:
- src/pages/tables/TableMapPage.jsx
- src/components/tables/TableCard.jsx
- src/components/tables/TableDetailModal.jsx
- src/services/tableService.js

Lưu ý thêm:
- TableCard có 4 màu theo trạng thái (phần 1.2)
- Click vào bàn mở TableDetailModal
- Có Socket.io lắng nghe event table:status_changed
- Grid theo row_pos (A,B,C) và col_pos (1-6)
```

---

*File này được generate từ SRS v5 + Use Case tổng quát ResManager.*
*Cập nhật lần cuối: theo SRS Canvas v5*
