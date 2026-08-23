# ResManager — Project Canvas v5

> **Hệ thống quản lý nhà hàng đa mô hình**
> Nhà hàng ngồi tại bàn + Sự kiện / Tiệc
> Đồ án tốt nghiệp · Ngành Lập trình Web · 7 thành viên · 3 tháng

---

## 1. Tổng quan dự án

| Hạng mục | Nội dung |
|---|---|
| Tên đề tài | Xây dựng ứng dụng web quản lý nhà hàng và đặt bàn trực tuyến |
| Mô hình áp dụng | Nhà hàng ngồi tại bàn + Nhà hàng tổ chức sự kiện/tiệc |
| Frontend | React.js |
| Backend | Node.js (Express) |
| Database | MySQL 8.x |
| Real-time | Socket.io |
| Số thành viên | 7 người — mỗi người phụ trách 1 module full-stack |
| Thời gian | ~3 tháng (~12 tuần) |

---

## 2. Các tác nhân (Actors)

| Actor | Vai trò |
|---|---|
| Khách hàng | Đặt bàn online qua web, xem thực đơn & ưu đãi, đặt tiệc, quản lý tài khoản thành viên |
| Nhân viên phục vụ | Mở bàn, tạo/sửa order, chuyển/gộp/tách bàn, in hoá đơn |
| Thu ngân | Xử lý thanh toán, áp dụng khuyến mãi, chia bill |
| Nhân viên bếp | Nhận phiếu in / xem KDS, nấu theo thứ tự |
| Bếp trưởng | Quản lý nguyên liệu, xác nhận hoàn thành món |
| Sales / Tư vấn tiệc | Tiếp nhận yêu cầu đặt tiệc, báo giá, soạn hợp đồng |
| Quản lý | Quản lý thực đơn, xếp ca, xem báo cáo, cấu hình hệ thống |
| Admin / Chủ nhà hàng | Xem analytics tổng thể, phân quyền, cấu hình |

---

## 3. Luồng hoạt động cốt lõi

### 3.1 Nhà hàng ngồi tại bàn

```
Khách đến
  → Phục vụ kiểm tra bàn trống trên sơ đồ
  → Mở bàn → gán Order ID, bắt đầu tính giờ
  → Gọi món → order_items ghi vào DB
  → Order tự động xuất hiện trên KDS / in phiếu bếp
  → Bếp nấu → cập nhật trạng thái 'Xong'
  → Phục vụ mang ra bàn
  → Khách ăn xong → yêu cầu thanh toán
  → Thu ngân tạo hoá đơn → áp khuyến mãi/voucher
  → Thanh toán xong → kho tự động trừ nguyên liệu → báo cáo cập nhật
  → Bàn reset về trạng thái 'Trống'
```

### 3.2 Đặt bàn trước (Booking)

```
Khách đặt bàn online / gọi điện
  → Nhân viên nhập thông tin
  → Hệ thống kiểm tra trùng lịch (query overlap thời gian)
  → Nếu trùng → cảnh báo, chọn bàn/giờ khác
  → Xác nhận → gửi email/SMS nhắc nhở
  → Ngày đến: check in → trạng thái bàn 'Đã đặt' → tiếp tục luồng thường
```

### 3.3 Sự kiện / Tiệc

```
Khách liên hệ / điền form online → Sales tiếp nhận
  → Tư vấn gói set menu → kiểm tra lịch sảnh trống
  → Báo giá → Ký hợp đồng → Thu đặt cọc
  → Xác nhận số bàn & số khách chính thức
  → Bếp lên kế hoạch nguyên liệu theo số suất
  → Ngày tiệc: chạy theo kịch bản Event Timeline
  → Thanh toán phần còn nợ → Lưu báo cáo doanh thu tiệc
```

---

## 4. Sơ đồ phụ thuộc giữa các module

> ⚠️ **M6 (Auth/RBAC) phải làm đầu tiên — mọi module cần token để gọi API.**

| Conflict / Phụ thuộc | Module liên quan | Cách xử lý |
|---|---|---|
| Bảng `orders` dùng chung | TV1 tạo, TV2 thêm món vào | Cả 2 thiết kế schema chung trước khi code |
| Bảng `customers` | TV6 quản lý, M8 dùng để gán HĐ tiệc | TV6 expose API, M8 gọi vào |
| Event `invoice:paid` | TV5 phát, TV4 lắng nghe trừ kho | Thống nhất tên event và payload |
| Socket room bếp | TV2 push order, TV3 nhận | Tên room: `kitchen:hot`, `kitchen:bar` |

> 💡 **Module phụ thuộc chưa xong → dùng MOCK DATA, không ngồi chờ nhau.**

---

## 5. Phân chia module, tính năng & database

---

### Module 0 — Trang Web Khách (TV1 + TV6 + TV7)

**Mục tiêu:** Giao diện công khai cho khách hàng — xem thực đơn, ưu đãi, đặt bàn online, quản lý tài khoản thành viên. Đây là điểm tiếp xúc đầu tiên của khách với hệ thống ResManager.

**Trọng tâm:** React.js (landing page), REST API đặt bàn, JWT auth riêng cho khách hàng, Nodemailer gửi email xác nhận booking.

> ⚠️ **Phụ thuộc:**
> - TV6 cần tạo bảng `customers` và expose API `/auth/customer` trước tuần 3
> - TV2 cần expose `GET /api/menu/public` (không cần auth)
> - TV1 cần expose `GET /api/tables/available?date&time&guests` sau khi làm xong Module 1

**Bảng MySQL bổ sung:**

```sql
-- customers
id, name VARCHAR(100) NOT NULL, email VARCHAR(150) UNIQUE NOT NULL,
phone VARCHAR(20), password_hash VARCHAR(255) NOT NULL,
loyalty_points INT DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP

-- promotions
id, title VARCHAR(200) NOT NULL, description TEXT,
discount_type ENUM('percent','fixed') NOT NULL,
discount_value DECIMAL(10,2) NOT NULL,
start_date DATETIME NOT NULL, end_date DATETIME NOT NULL,
is_active TINYINT(1) DEFAULT 1, image_url VARCHAR(255) DEFAULT NULL

-- bookings (bổ sung thêm)
customer_id INT DEFAULT NULL (FK → customers),
promotion_id INT DEFAULT NULL (FK → promotions),
guest_note TEXT DEFAULT NULL,
confirmation_code VARCHAR(20) NOT NULL
```

> 💡 **Lưu ý kỹ thuật:**
> Không dùng chung JWT secret của staff với JWT của khách hàng.
> Bảng `customers` tách biệt hoàn toàn với bảng `users`.
> Middleware `authCustomer()` riêng, không dùng `authStaff()`.

**Danh sách tính năng:**

| # | Tính năng | Mô tả | Độ khó | Phụ trách | Tuần |
|---|---|---|---|---|---|
| W1 | Landing Page — Trang chủ | Banner nhà hàng, giới thiệu, món nổi bật (`isFeatured:true`), ưu đãi đang active, Google Maps embed, footer liên hệ | 🟢 Dễ | TV7 | 9–10 |
| W2 | Trang thực đơn online | Hiển thị món theo danh mục, filter, search tên. Tag: Mới / Bán chạy / Combo. Click xem chi tiết món. Gọi API public không cần auth | 🟢 Dễ | TV2 | 5–6 |
| W3 | Trang ưu đãi & Combo | Danh sách Promotion đang active: tên gói, giá gốc, giá ưu đãi, thời hạn, điều kiện. Nút "Đặt ngay với combo này" | 🟢 Dễ | TV7 | 9–10 |
| W4 | Đặt bàn online (3 bước) | Bước 1: chọn ngày/giờ/số người → API kiểm tra bàn trống. Bước 2: nhập thông tin + ghi chú + chọn combo. Bước 3: xác nhận → nhận mã booking + email tự động | 🟡 Trung bình | TV1 | 3–4 |
| W5 | Đăng ký / Đăng nhập khách | Auth riêng dùng model `Customer` (khác với `User` nội bộ). JWT token riêng. Có forgot password qua email. Bcrypt hash password | 🟡 Trung bình | TV6 | 3–4 |
| W6 | Trang tài khoản khách | Tab Lịch sử đặt bàn (pending/confirmed/completed/cancelled). Tab Điểm thành viên + lịch sử tích điểm. Tab Sửa thông tin cá nhân | 🟡 Trung bình | TV6 | 5–6 |
| W7 | Hủy booking online | Khách hủy booking khi còn pending/confirmed và trước giờ đặt tối thiểu 2 tiếng. Hệ thống tự cập nhật `Table.status` về `empty` | 🟢 Dễ | TV1 | 3–4 |
| W8 | Xem & đổi điểm thành viên | Hiển thị tổng điểm, lịch sử tích điểm từ các lần đặt. Quy đổi điểm thành voucher giảm giá. Tích hợp với CRM Module 6 | 🟡 Trung bình | TV6 | 7–8 |

---

### Module 1 — Tiền sảnh & Sơ đồ bàn (TV1)

> **Trọng tâm:** Sơ đồ bàn Grid, Socket.io real-time
> **Thứ tự làm:** Schema DB → (3,2) → (8,9) → (7) → (5,6) → (1,10)

| # | Tính năng | Độ khó |
|---|---|---|
| 1 | Thiết kế sơ đồ bàn dạng lưới (Grid + Dropdown) | 🟢 Dễ |
| 2 | Theo dõi trạng thái bàn real-time (4 màu) | 🟡 Trung bình |
| 3 | Mở bàn — gán Order ID, bắt đầu tính giờ | 🟢 Dễ |
| 4 | Mở Tab — Takeaway / Bar không cần bàn | 🟢 Dễ |
| 5 | Gộp bàn — merge 2 order đang chạy | 🟡 Trung bình |
| 6 | Tách bàn — tạo bàn phụ 6:1, 6:2 | 🟡 Trung bình |
| 7 | Chuyển bàn — giữ nguyên order, đổi bàn | 🟡 Trung bình |
| 8 | Đặt bàn trước (Booking) | 🟡 Trung bình |
| 9 | Chống đặt trùng lịch (Overbooking Prevention) | 🟡 Trung bình |
| 10 | Danh sách chờ (Waitlist) | 🟡 Trung bình |

**Database cần:**

| Bảng | Cột quan trọng |
|---|---|
| `tables` | `id`, `name VARCHAR(100) NOT NULL`, `capacity INT DEFAULT 4`, `row_pos CHAR(1) NOT NULL`, `col_pos TINYINT NOT NULL`, `status ENUM('empty','reserved','serving','pending_payment') DEFAULT 'empty'`, `is_deleted TINYINT(1) DEFAULT 0`, `deleted_at DATETIME DEFAULT NULL` |
| `bookings` | `id`, `table_id INT NOT NULL`, `customer_id INT DEFAULT NULL`, `guest_name VARCHAR(100) NOT NULL`, `guest_phone VARCHAR(20) NOT NULL`, `party_size INT DEFAULT 1`, `start_time DATETIME NOT NULL`, `end_time DATETIME NOT NULL`, `status ENUM('pending','confirmed','cancelled','completed') DEFAULT 'pending'`, `note TEXT DEFAULT NULL` |
| `waitlist` | `id`, `guest_name VARCHAR(100) NOT NULL`, `party_size INT DEFAULT 1`, `phone VARCHAR(20) DEFAULT NULL`, `joined_at DATETIME DEFAULT CURRENT_TIMESTAMP`, `notified_at DATETIME DEFAULT NULL` |
| `table_merges` | `id`, `primary_table_id INT NOT NULL`, `merged_table_id INT NOT NULL`, `merged_at DATETIME DEFAULT CURRENT_TIMESTAMP` |
| `table_splits` | `id`, `parent_table_id INT NOT NULL`, `child_label VARCHAR(20) NOT NULL`, `created_at DATETIME DEFAULT CURRENT_TIMESTAMP` |

---

### Module 2 — Thực đơn & Gọi món (TV2)

> **Trọng tâm:** Cấu trúc dữ liệu lồng nhau, API linh hoạt
> **Thứ tự làm:** (11,12) → (14,19) → (13,16) → (20) → (15) → (17,18)

> ⚠️ **Bảng `orders` dùng chung với TV1 — schema phải được cả 2 duyệt trước khi code.**

| # | Tính năng | Độ khó |
|---|---|---|
| 11 | Quản lý danh mục món ăn (CRUD) | 🟢 Dễ |
| 12 | Quản lý thông tin món — tên, giá, ảnh, trạm bếp | 🟢 Dễ |
| 13 | Thực đơn theo khung giờ (sáng/trưa/tối/happy hour) | 🟡 Trung bình |
| 14 | Nhóm tùy chỉnh món (Modifier Groups) | 🟢 Dễ |
| 15 | Tùy chỉnh lồng nhau 2 cấp (Modifier Groups) | 🟡 Trung bình |
| 16 | Tạo Combo sản phẩm | 🟡 Trung bình |
| ~~17~~ | ~~Gọi món theo ghế (Seat-level ordering)~~ | Đã cắt |
| 18 | Gọi món Hold / Gửi ngay (Course Firing đơn giản) | 🟡 Trung bình |
| 19 | Ghi chú bếp cho từng món | 🟢 Dễ |
| 20 | Hủy / Hoàn trả món (Void/Refund) | 🟡 Trung bình |

**Database cần:**

| Bảng | Cột quan trọng |
|---|---|
| `categories` | `id`, `name VARCHAR(100) NOT NULL`, `sort_order INT DEFAULT 0`, `is_active TINYINT(1) DEFAULT 1` |
| `menu_items` | `id`, `category_id INT NOT NULL`, `name VARCHAR(150) NOT NULL`, `price DECIMAL(10,2) DEFAULT 0.00`, `image_url VARCHAR(255) DEFAULT NULL`, `kitchen_station ENUM('hot_kitchen','bar','cold_kitchen') DEFAULT 'hot_kitchen'`, `is_active TINYINT(1) DEFAULT 1`, `is_deleted TINYINT(1) DEFAULT 0`, `deleted_at DATETIME DEFAULT NULL` |
| `modifier_groups` | `id`, `menu_item_id INT NOT NULL`, `name VARCHAR(100) NOT NULL`, `is_required TINYINT(1) DEFAULT 0`, `min_select INT DEFAULT 0`, `max_select INT DEFAULT 1` |
| `modifiers` | `id`, `group_id INT NOT NULL`, `parent_modifier_id INT DEFAULT NULL`, `name VARCHAR(100) NOT NULL`, `extra_price DECIMAL(10,2) DEFAULT 0.00` |
| `orders` | `id`, `table_id INT DEFAULT NULL`, `split_label VARCHAR(10) DEFAULT NULL`, `status ENUM('open','serving','pending_payment','closed','cancelled') DEFAULT 'open'`, `note TEXT DEFAULT NULL`, `created_by INT NOT NULL`, `created_at DATETIME DEFAULT CURRENT_TIMESTAMP`, `closed_at DATETIME DEFAULT NULL` |
| `order_items` | `id`, `order_id INT NOT NULL`, `menu_item_id INT NOT NULL`, `quantity INT DEFAULT 1`, `unit_price DECIMAL(10,2) NOT NULL`, `seat_number TINYINT DEFAULT NULL`, `course_number INT DEFAULT 1`, `kitchen_note TEXT DEFAULT NULL`, `status ENUM('pending','cooking','done','cancelled','voided') DEFAULT 'pending'`, `voided_at DATETIME DEFAULT NULL`, `void_reason TEXT DEFAULT NULL` |
| `combos` | `id`, `name VARCHAR(150) NOT NULL`, `price DECIMAL(10,2) DEFAULT 0.00`, `is_active TINYINT(1) DEFAULT 1` |
| `combo_items` | `id`, `combo_id INT NOT NULL`, `menu_item_id INT NOT NULL`, `quantity INT DEFAULT 1` |

---

### Module 3 — Màn hình Bếp KDS (TV3)

> **Trọng tâm:** WebSocket real-time, Socket.io
> **Thứ tự làm:** Setup Socket → (22,27) → (24) → (21,23) → (25,26,28)

| # | Tính năng | Độ khó |
|---|---|---|
| 21 | Định tuyến order — bếp nóng / quầy bar tự động | 🟡 Trung bình |
| 22 | Hiển thị phiếu bếp theo thứ tự thời gian | 🟡 Trung bình |
| 23 | Đồng hồ cảnh báo — Xanh → Cam → Đỏ | 🟢 Dễ |
| 24 | Cập nhật trạng thái món: Chờ → Đang nấu → Xong | 🟡 Trung bình |
| 25 | Cảnh báo khi thu ngân hủy/đổi món (nhấp nháy đỏ) | 🟡 Trung bình |
| 26 | Gộp món cùng loại từ nhiều bàn (Batch Cooking) | 🟡 Trung bình |
| 27 | Gạch bỏ món đã hoàn thành (Strike-through) | 🟢 Dễ |
| 28 | Xem lại lịch sử món vừa xong (Recall Ticket) | 🟢 Dễ |
| ~~29~~ | ~~Offline Queueing~~ | Đã cắt |
| ~~30~~ | ~~State Reconciliation~~ | Đã cắt |

**Socket events cần thống nhất:**

```js
// TV2 emit khi có order mới
socket.emit('order:new', { orderId, items, tableId })

// TV3 lắng nghe
socket.on('order:new', handler)
socket.on('order:item:cancelled', handler) // TV5 emit khi hủy món

// TV3 emit khi bếp cập nhật
socket.emit('kitchen:item:status', { itemId, status })
```

---

### Module 4 — Kho & Định mức (TV4)

> **Trọng tâm:** Logic DB, tính toán tồn kho
> **Thứ tự làm:** (31,35,36) → (32) → (34) → (37) → (33,38) → (40)

> ⚠️ **Tính năng 33 lắng nghe event `invoice:paid` từ TV5. Thống nhất payload: `{ invoiceId, orderItems }`.**

| # | Tính năng | Độ khó |
|---|---|---|
| 31 | Quản lý danh mục nguyên vật liệu | 🟢 Dễ |
| 32 | Định mức cấu thành — Recipe BOM | 🟡 Trung bình |
| 33 | Khấu trừ kho tự động khi thanh toán xong | 🟡 Trung bình |
| 34 | Cảnh báo tồn kho tối thiểu | 🟡 Trung bình |
| 35 | Tạo phiếu nhập kho | 🟢 Dễ |
| 36 | Tạo phiếu xuất kho | 🟢 Dễ |
| 37 | Kiểm kê kho vật lý cuối ngày | 🟡 Trung bình |
| 38 | Báo cáo chênh lệch hao hụt (Variance) | 🟡 Trung bình |
| ~~39~~ | ~~Pessimistic Locking~~ — Dùng MySQL Transaction + SELECT FOR UPDATE | Đơn giản hóa |
| 40 | Quản lý công nợ nhà cung cấp | 🟡 Trung bình |

---

### Module 5 — Thanh toán & Chia Hoá đơn (TV5)

> **Trọng tâm:** Thuật toán tính toán, số thập phân DECIMAL, MySQL Transaction
> **Thứ tự làm:** (41,48,50) → (42) → (43) → (49) → (46)

| # | Tính năng | Độ khó |
|---|---|---|
| 41 | Thanh toán toàn bộ (VAT + phí dịch vụ) | 🟡 Trung bình |
| 42 | Tách bill chia đều — làm tròn phần lẻ cho người cuối | 🟢 Dễ |
| 43 | Tách bill theo món (checkbox chọn) | 🟡 Trung bình |
| ~~44~~ | ~~Tách bill theo ghế~~ — Phụ thuộc TN#17 đã cắt | Đã cắt |
| ~~45~~ | ~~Chia tỷ lệ phân số 1/4 món~~ | Đã cắt |
| 46 | Gộp hoá đơn phụ lại thành tổng | 🟡 Trung bình |
| ~~47~~ | ~~Phân bổ thuế sau chia bill~~ — Chia đều theo tỷ lệ | Đơn giản hóa |
| 48 | Quản lý tiền boa (Tips — % hoặc số tiền) | 🟢 Dễ |
| 49 | Thanh toán đơn lẻ 1 khách rời sớm | 🟡 Trung bình |
| 50 | Đa phương thức thanh toán (tiền mặt + chuyển khoản) | 🟡 Trung bình |

---

### Module 6 — CRM & Nhân sự (TV6) — **Làm đầu tiên**

> **Trọng tâm:** Auth, RBAC, bảo mật — bắt buộc xong trước tuần 5
> **Thứ tự làm:** (56,57) → (58,59) → (51,52) → (53,54,55) → (60)
>
> **Vai trò hệ thống:** `admin` | `manager` | `waiter` | `cashier` | `chef` | `sales_event`

| # | Tính năng | Độ khó |
|---|---|---|
| 51 | Quản lý hồ sơ khách hàng | 🟢 Dễ |
| 52 | Lịch sử mua hàng & thói quen gọi món | 🟡 Trung bình |
| 53 | Tích điểm thành viên (Loyalty Points) | 🟡 Trung bình |
| 54 | Đổi điểm thưởng trừ tiền thanh toán | 🟡 Trung bình |
| 55 | Quản lý khuyến mãi / Voucher | 🟡 Trung bình |
| 56 | Quản lý hồ sơ nhân viên + phân quyền | 🟢 Dễ |
| 57 | RBAC — giới hạn quyền theo vai trò | 🟡 Trung bình |
| 58 | Chấm công Clock-in / Clock-out | 🟢 Dễ |
| 59 | Quản lý ca làm việc (Shift Management) | 🟡 Trung bình |
| 60 | Thống kê hiệu suất nhân viên | 🟡 Trung bình |

---

### Module 7 — Báo cáo & Analytics (TV7)

> **Trọng tâm:** Chart.js, query tổng hợp, xuất Excel
> **Thứ tự làm:** (61,62) → (63,64) → (65,71) → (66,67,68)

> 💡 **TV7 làm cuối — cần data thật từ tất cả module. Giai đoạn đầu dùng seed data để test biểu đồ.**

| # | Tính năng | Độ khó |
|---|---|---|
| 61 | Dashboard tổng quan real-time | 🟡 Trung bình |
| 62 | Báo cáo doanh thu theo ngày/tuần/tháng/ca | 🟡 Trung bình |
| 63 | Báo cáo món bán chạy / chậm | 🟡 Trung bình |
| 64 | Phân tích khung giờ cao điểm | 🟡 Trung bình |
| 65 | Báo cáo tài chính thu/chi | 🟡 Trung bình |
| 66 | Tạo đơn giao hàng (Delivery) | 🟢 Dễ |
| 67 | QR xem thực đơn tại bàn (không tự order) | 🟢 Dễ |
| ~~68~~ | ~~Đồng bộ đơn hàng online (API tích hợp)~~ — cần API bên thứ 3, vượt scope | Đã cắt |
| ~~69~~ | ~~Data Obfuscation~~ — Vượt phạm vi đồ án | Đã cắt |
| ~~70~~ | ~~General Ledger~~ — Kế toán kép, cả ngành riêng | Đã cắt |
| 71 | Báo cáo doanh thu tiệc sự kiện (mới) | 🟡 Trung bình |

---

### Module 8 — Quản lý Sự kiện & Tiệc (Module mới)

> **Trọng tâm:** Quản lý lịch sảnh, hợp đồng, gói tiệc
> **Thứ tự làm:** (71,72) → (73) → (74,75) → (76,77) → (78) → (79,80)

> ⚠️ **Phụ thuộc bảng `customers` từ TV6. TV6 cần expose API tìm/tạo khách trước.**

| # | Tính năng | Độ khó |
|---|---|---|
| 71 | Quản lý sảnh — tên, sức chứa, mô tả | 🟢 Dễ |
| 72 | Lịch sảnh — xem theo tháng, kiểm tra trống | 🟡 Trung bình |
| 73 | Tránh double-book sảnh cùng ngày giờ | 🟡 Trung bình |
| 74 | Portal đặt tiệc online cho khách | 🟡 Trung bình |
| 75 | Hợp đồng tiệc — tạo, trạng thái, lưu trữ | 🟡 Trung bình |
| 76 | Quản lý đặt cọc & công nợ tiệc | 🟡 Trung bình |
| 77 | Gói set menu tiệc (giá/người, danh sách món) | 🟡 Trung bình |
| 78 | Xác nhận số bàn & số khách trước ngày tiệc | 🟢 Dễ |
| 79 | Kịch bản sự kiện (Event Timeline) | 🟡 Trung bình |
| 80 | Thông báo nhắc nhở tự động (7 ngày, 1 ngày trước) | 🟡 Trung bình |

---

## 6. Tính năng đã cắt & lý do

| # | Tính năng | Lý do cắt |
|---|---|---|
| 17 | Gọi món theo ghế (Seat-level) | Phụ thuộc TN#44 đã cắt; gọi món theo bàn là đủ cho 90% nhà hàng VN |
| 29 | Offline Queueing | Quá phức tạp — IndexedDB + xử lý xung đột. Thay bằng toast thông báo mất kết nối |
| 30 | State Reconciliation | Phụ thuộc 29, cắt theo |
| 39 | Pessimistic Locking | Đơn giản hóa bằng MySQL Transaction + SELECT FOR UPDATE |
| 44 | Split bill theo ghế | Phụ thuộc tính năng 17 — rủi ro block tiến độ |
| 45 | Chia tỷ lệ phân số 1/4 món | Quá phức tạp, ít nhà hàng thực tế dùng |
| 47 | Phân bổ thuế sau chia bill | Đơn giản hóa — chia đều theo tỷ lệ giá trị |
| 68 | Đồng bộ đơn hàng online | Cần tài khoản API bên thứ 3 (GrabFood, ShopeeFood) — vượt phạm vi đồ án |
| 69 | Data Obfuscation | Vượt phạm vi đồ án (GDPR level) |
| 70 | General Ledger | Kế toán kép — cả ngành riêng, không phù hợp scope đồ án |

> 💡 **Tổng tiết kiệm: ~4-5 tuần làm việc → 0 tính năng 🔴 Khó còn lại sau đơn giản hóa.**

---

## 7. Quy tắc thiết kế Database chung (MySQL 8.x)

> ⚠️ **Tất cả thành viên bắt buộc tuân theo — không tự ý đặt kiểu dữ liệu khác.**

### 7.1 Kiểu dữ liệu

| Loại | Dùng | Không dùng |
|---|---|---|
| Số tiền | `DECIMAL(10,2)` | `FLOAT`, `DOUBLE` — bị lỗi làm tròn |
| Số lượng nguyên liệu | `DECIMAL(10,3)` | `INT` — không đủ độ chính xác |
| Trạng thái cố định | `ENUM(...)` | `VARCHAR` tự do — dễ sai, khó kiểm soát |
| Ngày giờ | `DATETIME` | `VARCHAR`, `INT timestamp` |
| Cờ boolean | `TINYINT(1) DEFAULT 0` | `BOOLEAN`, `VARCHAR('true')` |
| Mật khẩu | `VARCHAR(255)` bcrypt hash | Plaintext — tuyệt đối không |

### 7.2 Quy tắc NULL / NOT NULL / DEFAULT

```
Cột bắt buộc          → NOT NULL + DEFAULT hợp lý
Cột optional           → DEFAULT NULL  (không dùng "" hay 0 thay cho NULL)
Số tiền                → NOT NULL DEFAULT 0.00  (không bao giờ NULL)
Ngày tạo               → NOT NULL DEFAULT CURRENT_TIMESTAMP
Ngày kết thúc/đóng    → DEFAULT NULL  (NULL = chưa xảy ra)
Foreign key optional   → DEFAULT NULL  (vd: customer_id khi khách vãng lai)
```

### 7.3 Soft Delete — không xóa thật dữ liệu lịch sử

Áp dụng cho: `menu_items`, `tables`, `employees`, `customers`, `vouchers`, `ingredients`

```sql
is_deleted  TINYINT(1) NOT NULL DEFAULT 0,
deleted_at  DATETIME DEFAULT NULL
```

Khi query luôn thêm: `WHERE is_deleted = 0`

### 7.4 Validate ở tầng Node.js trước khi INSERT

```js
function createMenuItem(data) {
  const name  = data.name?.trim() || null
  const price = parseFloat(data.price)

  if (!name)                     throw new AppError('Ten mon khong duoc rong', 400)
  if (isNaN(price) || price < 0) throw new AppError('Gia khong hop le', 400)

  return db.query('INSERT INTO menu_items (name, price) VALUES (?, ?)', [name, price])
}
```

---

## 8. Chuẩn API chung

### 8.1 URL Convention

```
GET    /api/v1/{resource}        -- Lấy danh sách
GET    /api/v1/{resource}/:id    -- Lấy 1 bản ghi
POST   /api/v1/{resource}        -- Tạo mới
PUT    /api/v1/{resource}/:id    -- Cập nhật toàn bộ
PATCH  /api/v1/{resource}/:id    -- Cập nhật 1 phần
DELETE /api/v1/{resource}/:id    -- Xóa (soft delete)
```

### 8.2 Response Format thống nhất

```json
// Thành công — 1 object
{ "success": true, "data": {}, "message": "Tạo thành công" }

// Thành công — danh sách
{ "success": true, "data": [], "pagination": { "page": 1, "limit": 20, "total": 150 } }

// Lỗi
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Tên không được rỗng" } }
```

### 8.3 HTTP Status Code

| Code | Khi nào dùng |
|---|---|
| 200 | GET, PUT, PATCH thành công |
| 201 | POST tạo mới thành công |
| 400 | Validate lỗi, dữ liệu sai |
| 401 | Chưa đăng nhập |
| 403 | Không có quyền (RBAC) |
| 404 | Không tìm thấy |
| 500 | Lỗi server |

---

## 9. Thứ tự phát triển (12 tuần)

| Tuần | Việc cần làm | Ai làm |
|---|---|---|
| 1 | Thiết kế toàn bộ DB schema — cả nhóm duyệt, commit file `schema.sql` | Tất cả |
| 2 | Setup project: cấu trúc thư mục, config, middleware, `responseHelper`, `errorHandler` | Tech lead |
| 3–4 | M6: Auth + RBAC + Login — bắt buộc xong trước mọi module | TV6 |
| 3–10 | M0: Landing page (TV7, tuần 9–10) + Đặt bàn online (TV1, tuần 3–4) + Auth khách & Tài khoản (TV6, tuần 3–6) + Thực đơn public API (TV2, tuần 5–6) | TV1 + TV6 + TV7 |
| 3–4 | M1: Mở bàn, trạng thái bàn, đặt bàn (song song M6) | TV1 |
| 5–6 | M2: Menu, gọi món, order_items | TV2 |
| 5–6 | M3: KDS cơ bản (dùng mock data M2 trước) | TV3 |
| 7–8 | M5: Thanh toán, chia bill | TV5 |
| 7–8 | M4: Kho, định mức, trừ kho tự động | TV4 |
| 9–10 | M8: Sự kiện & Tiệc | TV phân công lại |
| 9–10 | M7: Dashboard, báo cáo, Chart.js | TV7 |
| 11 | Tích hợp — swap mock data → API thật, fix conflict, test liên module | Tất cả |
| 12 | Fix bug · Hoàn thiện UI/UX · Chuẩn bị báo cáo & demo | Tất cả |

> ⚠️ **Nguyên tắc:** M6 (Auth) phải xong trước tuần 5. Module phụ thuộc chưa xong → dùng mock data, không ngồi chờ.

---

## 10. Checklist trước khi bắt đầu code

- [ ] File `schema.sql` đầy đủ, được cả nhóm duyệt và commit vào repo
- [ ] API convention được viết thành doc, ai cũng đọc và đồng ý
- [ ] Cấu trúc thư mục project backend & frontend thống nhất
- [ ] File `responseHelper.js` và `errorHandler.js` dùng chung
- [ ] Socket event names được liệt kê rõ (ai emit, ai lắng nghe)
- [ ] Git workflow được cả nhóm hiểu — nhánh `main` / `develop` / `feature/...`
- [ ] Phân công tech lead — người quyết định khi có conflict thiết kế
- [ ] Seed data cơ bản để test (món ăn mẫu, nhân viên, bàn mẫu)

---

## 11. Tổng kết

| Trạng thái | Số lượng |
|---|---|
| Giữ nguyên từ SRS gốc | 62 tính năng |
| Cắt bỏ | 8 tính năng |
| Bổ sung mới (Module 8 — Sự kiện) | 10 tính năng |
| **Tổng thực hiện** | **80 tính năng** |

| Độ khó | Số lượng |
|---|---|
| 🟢 Dễ | 27 tính năng |
| 🟡 Trung bình | 51 tính năng |
| 🔴 Khó | 0 tính năng |
| 🔥 Cực khó | 0 (đã cắt hết) |
