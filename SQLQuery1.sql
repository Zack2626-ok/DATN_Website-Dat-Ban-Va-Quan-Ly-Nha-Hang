-- ============================================================================
--  ResManager — FULL MYSQL SCHEMA + SEED DATA (v2 CLEAN)
--  Đồ án tốt nghiệp: Quản lý nhà hàng
--  Engine: MySQL 8.x | utf8mb4 | InnoDB
--
--  DATA DEMO ĐẦY ĐỦ TRẠNG THÁI:
--    tables:      empty | reserved | serving | pending_payment | cleaning | maintenance
--    bookings:    pending | confirmed | cancelled | completed
--    orders:      open | serving | pending_payment | completed | cancelled
--    order_items: pending | cooking | done | cancelled | voided
--    invoices:    draft | paid | refunded
--    payments:    cash | bank_transfer | card | momo | vnpay
-- ============================================================================

CREATE DATABASE IF NOT EXISTS resmanager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE resmanager;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
--  MODULE 6 — AUTH / RBAC / CRM & NHÂN SỰ
-- ============================================================================

CREATE TABLE roles (
    id          INT          NOT NULL AUTO_INCREMENT,
    name        ENUM('admin','manager','waiter','cashier','chef') NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (name, description) VALUES
 ('admin',   'Toàn quyền hệ thống'),
 ('manager', 'Quản lý thực đơn, báo cáo, nhân sự'),
 ('waiter',  'Mở bàn, gọi món, chuyển bàn'),
 ('cashier', 'Thanh toán, áp voucher'),
 ('chef',    'Xem KDS, cập nhật trạng thái món');

CREATE TABLE users (
    id            INT          NOT NULL AUTO_INCREMENT,
    role_id       INT          NOT NULL,
    employee_code VARCHAR(20)  DEFAULT NULL,
    full_name     VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    phone         VARCHAR(20)  DEFAULT NULL,
    avatar_url    VARCHAR(255) DEFAULT NULL,
    status        ENUM('active','inactive') NOT NULL DEFAULT 'active',
    is_deleted    TINYINT(1)   NOT NULL DEFAULT 0,
    deleted_at    DATETIME     DEFAULT NULL,
    last_login    DATETIME     DEFAULT NULL,
    created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_users_email (email),
    UNIQUE KEY uq_users_code (employee_code),
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- password thật: "123456", hash bcrypt cost 10
INSERT INTO users (role_id, employee_code, full_name, email, password_hash, phone) VALUES
 (1, 'NV001', 'System Admin',       'admin@gmail.com',   '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000001'),
 (2, 'NV002', 'Restaurant Manager', 'manager@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000002'),
 (4, 'NV003', 'Cashier 1',          'cashier@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000003'),
 (3, 'NV004', 'Waiter 1',           'waiter1@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000004'),
 (3, 'NV005', 'Waiter 2',           'waiter2@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000005'),
 (5, 'NV006', 'Chef 1',             'chef1@gmail.com',   '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000006');

CREATE TABLE customers (
    id              INT          NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) DEFAULT NULL,
    phone           VARCHAR(20)  DEFAULT NULL,
    password_hash   VARCHAR(255) DEFAULT NULL,
    member_level    ENUM('bronze','silver','gold','vip') NOT NULL DEFAULT 'bronze',
    loyalty_points  INT          NOT NULL DEFAULT 0,
    is_deleted      TINYINT(1)   NOT NULL DEFAULT 0,
    deleted_at      DATETIME     DEFAULT NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_customers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- password_hash cho customer 1 (silver) và customer 4 (vip): "123456"
-- customer 2,3,5: chưa đăng ký tài khoản online (NULL hash)
INSERT INTO customers (name, phone, email, password_hash, member_level, loyalty_points) VALUES
 ('Nguyen Van A', '0911111111', 'a@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', 'silver', 172),
 ('Tran Thi B',   '0922222222', 'b@gmail.com', NULL,                                                              'gold',   400),
 ('Le Van C',     '0933333333', 'c@gmail.com', NULL,                                                              'bronze',  50),
 ('Pham Thi D',   '0944444444', 'd@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', 'vip',    500),
 ('Hoang Van E',  '0955555555', 'e@gmail.com', NULL,                                                              'gold',   300);

CREATE TABLE loyalty_transactions (
    id              INT          NOT NULL AUTO_INCREMENT,
    customer_id     INT          NOT NULL,
    points          INT          NOT NULL,
    type            ENUM('earn','redeem') NOT NULL,
    ref_invoice_id  INT          DEFAULT NULL,
    note            VARCHAR(255) DEFAULT NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_loyalty_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE vouchers (
    id          INT           NOT NULL AUTO_INCREMENT,
    code        VARCHAR(50)   NOT NULL,
    type        ENUM('percent','fixed') NOT NULL,
    value       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    min_order   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    max_uses    INT           DEFAULT NULL,
    used_count  INT           NOT NULL DEFAULT 0,
    expired_at  DATETIME      DEFAULT NULL,
    is_active   TINYINT(1)    NOT NULL DEFAULT 1,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vouchers_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO vouchers (code, type, value, min_order, max_uses, used_count, expired_at, is_active) VALUES
 -- Voucher thông thường (all members)
 ('SAVE10',   'percent', 10.00,    500000.00, 100, 0, '2026-12-31 23:59:59', 1),
 ('FIXED50',  'fixed',   50000.00, 1000000.00, 50, 0, '2026-12-31 23:59:59', 1),
 ('NEW20',    'percent', 20.00,    300000.00, 200, 0, '2026-09-30 23:59:59', 1),
 -- Voucher theo hạng thành viên (member tier)
 ('SILVER15', 'percent', 15.00,    400000.00,  50, 0, '2026-12-31 23:59:59', 1),  -- Hạng Silver trở lên
 ('GOLD25',   'percent', 25.00,    600000.00,  30, 0, '2026-12-31 23:59:59', 1),  -- Hạng Gold trở lên
 ('VIP30',    'percent', 30.00,    800000.00,  20, 0, '2026-12-31 23:59:59', 1);  -- Hạng VIP

CREATE TABLE promotions (
    id              INT           NOT NULL AUTO_INCREMENT,
    title           VARCHAR(200)  NOT NULL,
    description     TEXT          DEFAULT NULL,
    discount_type   ENUM('percent','fixed') NOT NULL,
    discount_value  DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    image_url       VARCHAR(255)  DEFAULT NULL,
    start_date      DATETIME      NOT NULL,
    end_date        DATETIME      NOT NULL,
    is_active       TINYINT(1)    NOT NULL DEFAULT 1,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO promotions (title, description, discount_type, discount_value, image_url, start_date, end_date, is_active) VALUES
 ('Giảm giá khai vị',    'Giảm 15% cho tất cả món khai vị', 'percent', 15.00, 'promo_khai_vi.jpg',   '2026-07-01 00:00:00', '2026-08-31 23:59:59', 1),
 ('Tiệc trưa tiết kiệm', 'Tiệc trưa 11h–14h giảm 10%',      'percent', 10.00, 'promo_tiec_trua.jpg', '2026-07-01 00:00:00', '2026-08-31 23:59:59', 1);

CREATE TABLE shifts (
    id          INT           NOT NULL AUTO_INCREMENT,
    employee_id INT           NOT NULL,
    start_time  DATETIME      NOT NULL,
    end_time    DATETIME      DEFAULT NULL,
    cash_open   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cash_close  DECIMAL(10,2) DEFAULT NULL,
    note        TEXT          DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_shifts_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO shifts (employee_id, start_time, end_time, cash_open, cash_close, note) VALUES
 (2, '2026-07-30 08:00:00', '2026-07-30 18:00:00', 2000000.00, 2800000.00, 'Ca sáng quản lý'),
 (3, '2026-07-30 10:00:00', NULL,                  1000000.00, NULL,       'Ca chiều thu ngân (đang mở)'),
 (4, '2026-07-30 07:00:00', '2026-07-30 15:00:00', 0.00,       0.00,       'Ca sáng phục vụ'),
 (5, '2026-07-30 15:00:00', NULL,                  0.00,       NULL,       'Ca tối phục vụ (đang mở)');

CREATE TABLE attendance (
    id          INT       NOT NULL AUTO_INCREMENT,
    employee_id INT       NOT NULL,
    clock_in    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clock_out   DATETIME  DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO attendance (employee_id, clock_in, clock_out) VALUES
 (2, '2026-07-30 07:55:00', '2026-07-30 18:05:00'),
 (3, '2026-07-30 09:58:00', NULL),
 (4, '2026-07-30 06:58:00', '2026-07-30 15:02:00'),
 (5, '2026-07-30 14:57:00', NULL),
 (6, '2026-07-30 08:02:00', NULL);


-- ============================================================================
--  MODULE 1 — TIỀN SẢNH & SƠ ĐỒ BÀN
-- ============================================================================

CREATE TABLE table_areas (
    id        INT          NOT NULL AUTO_INCREMENT,
    name      VARCHAR(100) NOT NULL,
    is_active TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO table_areas (name) VALUES
 ('Tầng 1'), ('Tầng 2'), ('Sân vườn');

CREATE TABLE tables (
    id               INT          NOT NULL AUTO_INCREMENT,
    area_id          INT          NOT NULL,
    name             VARCHAR(20)  NOT NULL,
    capacity         INT          NOT NULL DEFAULT 4,
    row_pos          CHAR(1)      NOT NULL DEFAULT 'A',
    col_pos          TINYINT      NOT NULL DEFAULT 1,
    status           ENUM('empty','reserved','serving','pending_payment','cleaning','maintenance') NOT NULL DEFAULT 'empty',
    is_deleted       TINYINT(1)   NOT NULL DEFAULT 0,
    deleted_at       DATETIME     DEFAULT NULL,
    maintenance_note TEXT         DEFAULT NULL COMMENT 'Lý do bảo trì (nhân viên nhập khi chuyển trạng thái maintenance)',
    PRIMARY KEY (id),
    CONSTRAINT fk_tables_area FOREIGN KEY (area_id) REFERENCES table_areas(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tầng 1 (12 bàn) — Thể hiện đầy đủ 6 trạng thái bàn
INSERT INTO tables (id, area_id, name, capacity, row_pos, col_pos, status, maintenance_note) VALUES
 (1,  1, 'B01', 4,  'A', 1, 'pending_payment', NULL),          -- Chờ thanh toán (Order #4)
 (2,  1, 'B02', 4,  'A', 2, 'cleaning',         NULL),          -- Đang dọn dẹp (Order #6 vừa xong)
 (3,  1, 'B03', 6,  'A', 3, 'reserved',          NULL),          -- Đặt trước tối nay (BK004 confirmed)
 (4,  1, 'B04', 8,  'A', 4, 'serving',           NULL),          -- Đang phục vụ (Order #1)
 (5,  1, 'B05', 4,  'B', 1, 'pending_payment', NULL),          -- Chờ thanh toán (Order #3)
 (6,  1, 'B06', 4,  'B', 2, 'reserved',          NULL),          -- Đặt trước tối nay (BK005 confirmed)
 (7,  1, 'B07', 6,  'B', 3, 'serving',           NULL),          -- Vừa mở bàn (Order #5 open)
 (8,  1, 'B08', 8,  'B', 4, 'serving',           NULL),          -- Đang phục vụ (Order #2)
 (9,  1, 'B09', 10, 'C', 1, 'maintenance',       'Bàn bị hỏng chân, đang chờ thợ sửa chữa'),
 (10, 1, 'B10', 4,  'C', 2, 'empty',             NULL),
 (11, 1, 'B11', 4,  'C', 3, 'empty',             NULL),
 (12, 1, 'B12', 4,  'C', 4, 'empty',             NULL),
 -- Tầng 2 (12 bàn)
 (13, 2, 'B13', 4, 'A', 1, 'empty', NULL),
 (14, 2, 'B14', 4, 'A', 2, 'empty', NULL),
 (15, 2, 'B15', 4, 'A', 3, 'empty', NULL),
 (16, 2, 'B16', 4, 'A', 4, 'empty', NULL),
 (17, 2, 'B17', 4, 'B', 1, 'empty', NULL),
 (18, 2, 'B18', 4, 'B', 2, 'empty', NULL),
 (19, 2, 'B19', 4, 'B', 3, 'empty', NULL),
 (20, 2, 'B20', 4, 'B', 4, 'empty', NULL),
 (21, 2, 'B21', 4, 'C', 1, 'empty', NULL),
 (22, 2, 'B22', 4, 'C', 2, 'empty', NULL),
 (23, 2, 'B23', 4, 'C', 3, 'empty', NULL),
 (24, 2, 'B24', 4, 'C', 4, 'empty', NULL),
 -- Sân vườn (16 bàn)
 (25, 3, 'B25', 4, 'A', 1, 'empty', NULL),
 (26, 3, 'B26', 4, 'A', 2, 'empty', NULL),
 (27, 3, 'B27', 4, 'A', 3, 'empty', NULL),
 (28, 3, 'B28', 4, 'A', 4, 'empty', NULL),
 (29, 3, 'B29', 4, 'B', 1, 'empty', NULL),
 (30, 3, 'B30', 4, 'B', 2, 'empty', NULL),
 (31, 3, 'B31', 4, 'B', 3, 'empty', NULL),
 (32, 3, 'B32', 4, 'B', 4, 'empty', NULL),
 (33, 3, 'B33', 4, 'C', 1, 'empty', NULL),
 (34, 3, 'B34', 4, 'C', 2, 'empty', NULL),
 (35, 3, 'B35', 4, 'C', 3, 'empty', NULL),
 (36, 3, 'B36', 4, 'C', 4, 'empty', NULL),
 (37, 3, 'B37', 4, 'D', 1, 'empty', NULL),
 (38, 3, 'B38', 4, 'D', 2, 'empty', NULL),
 (39, 3, 'B39', 4, 'D', 3, 'empty', NULL),
 (40, 3, 'B40', 4, 'D', 4, 'empty', NULL);

-- ============================================================================
--  BOOKINGS: Đủ 4 trạng thái — pending | confirmed | cancelled | completed
-- ============================================================================
CREATE TABLE bookings (
    id                INT          NOT NULL AUTO_INCREMENT,
    table_id          INT          NOT NULL,
    customer_id       INT          DEFAULT NULL,
    promotion_id      INT          DEFAULT NULL,
    guest_name        VARCHAR(100) NOT NULL,
    guest_phone       VARCHAR(20)  NOT NULL,
    party_size        INT          NOT NULL DEFAULT 1,
    start_time        DATETIME     NOT NULL,
    end_time          DATETIME     NOT NULL,
    confirmation_code VARCHAR(20)  NOT NULL,
    status            ENUM('pending','confirmed','cancelled','completed') NOT NULL DEFAULT 'pending',
    guest_note        TEXT         DEFAULT NULL,
    cancel_reason     TEXT         DEFAULT NULL COMMENT 'Lý do hủy booking',
    note              TEXT         DEFAULT NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_bookings_code (confirmation_code),
    CONSTRAINT fk_bookings_table     FOREIGN KEY (table_id)     REFERENCES tables(id)     ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_customer  FOREIGN KEY (customer_id)  REFERENCES customers(id)  ON DELETE SET NULL,
    CONSTRAINT fk_bookings_promotion FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE SET NULL,
    INDEX idx_bookings_table_time (table_id, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO bookings (id, table_id, customer_id, promotion_id, guest_name, guest_phone, party_size, start_time, end_time, confirmation_code, status, guest_note, cancel_reason, note, created_at) VALUES

 -- ─── PENDING (3): Chờ nhân viên xác nhận ───────────────────────────────
 (1,  13, 1,    NULL, 'Nguyen Van A',    '0911111111', 4,
   '2026-07-31 18:00:00', '2026-07-31 20:00:00', 'BK20260731001',
   'pending', 'Bàn gần cửa sổ, cần 1 ghế cao cho trẻ em',
   NULL, NULL, '2026-07-30 09:00:00'),

 (2,  14, NULL, NULL, 'Nguyen Minh Hoa', '0978123456', 6,
   '2026-07-31 19:00:00', '2026-07-31 21:00:00', 'BK20260731002',
   'pending', 'Tiệc sinh nhật, cần hỗ trợ mang bánh vào',
   NULL, NULL, '2026-07-30 10:30:00'),

 (3,  25, 3,    2,    'Le Van C',        '0933333333', 4,
   '2026-08-01 12:00:00', '2026-08-01 14:00:00', 'BK20260801001',
   'pending', NULL,
   NULL, 'Khách đặt gói tiệc trưa, áp dụng khuyến mãi', '2026-07-30 11:00:00'),

 -- ─── CONFIRMED (3): Đã xác nhận — B03 & B06 đang reserved ─────────────
 (4,  3,  2,    1,    'Tran Thi B',      '0922222222', 4,
   '2026-07-30 20:00:00', '2026-07-30 22:00:00', 'BK20260730001',
   'confirmed', 'Dị ứng hải sản, nhờ báo bếp không dùng hải sản',
   NULL, 'Đã gọi xác nhận lúc 10h sáng', '2026-07-30 08:00:00'),

 (5,  6,  4,    NULL, 'Pham Thi D',      '0944444444', 8,
   '2026-07-30 19:00:00', '2026-07-30 21:00:00', 'BK20260730002',
   'confirmed', 'Tiệc gia đình, cần thêm 2 ghế phụ cho trẻ em',
   NULL, 'Khách VIP — ưu tiên phục vụ', '2026-07-30 07:30:00'),

 (6,  15, 5,    NULL, 'Hoang Van E',     '0955555555', 4,
   '2026-07-31 18:00:00', '2026-07-31 20:00:00', 'BK20260731003',
   'confirmed', NULL,
   NULL, NULL, '2026-07-30 09:15:00'),

 -- ─── CANCELLED (3): Đã hủy với lý do cụ thể ───────────────────────────
 (7,  16, 1,    NULL, 'Nguyen Van A',    '0911111111', 2,
   '2026-07-29 18:00:00', '2026-07-29 20:00:00', 'BK20260729001',
   'cancelled', NULL,
   'Khách báo bận việc đột xuất, xin hủy đặt bàn',
   NULL, '2026-07-28 14:00:00'),

 (8,  17, NULL, NULL, 'Tran Van Binh',   '0988887777', 4,
   '2026-07-28 19:00:00', '2026-07-28 21:00:00', 'BK20260728001',
   'cancelled', 'Bàn gần cửa sổ sân vườn',
   'Khách không đến sau 30 phút, hệ thống tự hủy',
   NULL, '2026-07-27 20:00:00'),

 (9,  18, 3,    NULL, 'Le Van C',        '0933333333', 6,
   '2026-07-27 18:00:00', '2026-07-27 20:00:00', 'BK20260727001',
   'cancelled', NULL,
   'Nhà hàng chủ động hủy: hết bàn khu vực khách yêu cầu, đã liên hệ báo khách',
   NULL, '2026-07-26 15:00:00'),

 -- ─── COMPLETED (3): Đã hoàn thành ─────────────────────────────────────
 (10, 10, 4,    NULL, 'Pham Thi D',      '0944444444', 4,
   '2026-07-29 19:00:00', '2026-07-29 21:00:00', 'BK20260729002',
   'completed', NULL,
   NULL, 'Khách hài lòng, đánh giá 5 sao, sẽ quay lại', '2026-07-28 16:00:00'),

 (11, 11, 2,    NULL, 'Tran Thi B',      '0922222222', 2,
   '2026-07-28 18:00:00', '2026-07-28 20:00:00', 'BK20260728002',
   'completed', 'Góc yên tĩnh, ít người qua lại',
   NULL, NULL, '2026-07-27 10:00:00'),

 (12, 12, 5,    NULL, 'Hoang Van E',     '0955555555', 6,
   '2026-07-26 19:00:00', '2026-07-26 21:00:00', 'BK20260726001',
   'completed', NULL,
   NULL, NULL, '2026-07-25 11:00:00');

-- ─── GIỮ LẠI: table_merges & table_splits (không có data demo) ──────────

CREATE TABLE table_merges (
    id               INT      NOT NULL AUTO_INCREMENT,
    primary_table_id INT      NOT NULL,
    merged_table_id  INT      NOT NULL,
    merged_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_merge_primary FOREIGN KEY (primary_table_id) REFERENCES tables(id) ON DELETE CASCADE,
    CONSTRAINT fk_merge_merged  FOREIGN KEY (merged_table_id)  REFERENCES tables(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE table_splits (
    id              INT          NOT NULL AUTO_INCREMENT,
    parent_table_id INT          NOT NULL,
    child_label     VARCHAR(10)  NOT NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_split_parent FOREIGN KEY (parent_table_id) REFERENCES tables(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
--  MODULE 2 — THỰC ĐƠN & GỌI MÓN
-- ============================================================================

CREATE TABLE categories (
    id         INT          NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    is_active  TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO categories (name, sort_order) VALUES
 ('Khai vị',    1),
 ('Món chính',  2),
 ('Lẩu',        3),
 ('Đồ uống',    4),
 ('Tráng miệng',5);

CREATE TABLE menu_items (
    id              INT           NOT NULL AUTO_INCREMENT,
    category_id     INT           NOT NULL,
    name            VARCHAR(150)  NOT NULL,
    description     TEXT          DEFAULT NULL,
    price           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    image_url       VARCHAR(255)  DEFAULT NULL,
    kitchen_station ENUM('hot_kitchen','bar','cold_kitchen') NOT NULL DEFAULT 'hot_kitchen',
    is_featured     TINYINT(1)    NOT NULL DEFAULT 0,
    is_active       TINYINT(1)    NOT NULL DEFAULT 1,
    is_deleted      TINYINT(1)    NOT NULL DEFAULT 0,
    deleted_at      DATETIME      DEFAULT NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_menuitems_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO menu_items (category_id, name, description, price, image_url, kitchen_station, is_featured) VALUES
 (1, 'Gỏi hải sản',      'Gỏi tôm mực rau thơm sốt chanh',      120000, 'goi.jpg',      'cold_kitchen', 1),
 (1, 'Chả giò',          'Chả giò nhân thịt heo, chiên giòn',     80000, 'chagio.jpg',   'hot_kitchen',  0),
 (2, 'Bò lúc lắc',       'Thăn bò xào dầu hào, khoai tây chiên', 180000, 'bo.jpg',       'hot_kitchen',  1),
 (2, 'Gà nướng',         'Gà nướng mật ong sả tắc',              160000, 'ga.jpg',       'hot_kitchen',  0),
 (2, 'Cá hồi sốt chanh', 'Phi lê cá hồi áp chảo, sốt bơ chanh', 220000, 'cahoi.jpg',    'hot_kitchen',  1),
 (3, 'Lẩu Thái',         'Lẩu chua cay kiểu Thái',               350000, 'lauthai.jpg',  'hot_kitchen',  0),
 (3, 'Lẩu hải sản',      'Lẩu hải sản tươi: tôm, mực, nghêu',   400000, 'lauhs.jpg',    'hot_kitchen',  0),
 (4, 'Coca Cola',        'Lon 330ml',                              20000, 'coca.jpg',     'bar',          0),
 (4, 'Pepsi',            'Lon 330ml',                              20000, 'pepsi.jpg',    'bar',          0),
 (4, 'Trà đào',          'Trà đào cam sả, đá viên',               35000, 'tradao.jpg',   'bar',          0),
 (5, 'Kem Vani',         'Kem vani 2 viên, sốt caramel',          45000, 'kem.jpg',      'cold_kitchen', 0),
 (5, 'Chè thái',         'Chè thái nhiều màu, nước cốt dừa',      40000, 'che_thai.jpg', 'cold_kitchen', 0);

CREATE TABLE modifier_groups (
    id           INT          NOT NULL AUTO_INCREMENT,
    menu_item_id INT          NOT NULL,
    name         VARCHAR(100) NOT NULL,
    is_required  TINYINT(1)   NOT NULL DEFAULT 0,
    min_select   INT          NOT NULL DEFAULT 0,
    max_select   INT          NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    CONSTRAINT fk_modgroup_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO modifier_groups (menu_item_id, name, is_required, min_select, max_select) VALUES
 (3, 'Độ chín',    1, 1, 1),
 (3, 'Đồ kèm',    0, 0, 2),
 (5, 'Kích cỡ',   1, 1, 1),
 (6, 'Mức độ cay',0, 0, 1),
 (7, 'Mức độ cay',0, 0, 1);

CREATE TABLE modifiers (
    id                 INT           NOT NULL AUTO_INCREMENT,
    group_id           INT           NOT NULL,
    parent_modifier_id INT           DEFAULT NULL,
    name               VARCHAR(100)  NOT NULL,
    extra_price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (id),
    CONSTRAINT fk_modifier_group  FOREIGN KEY (group_id)           REFERENCES modifier_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_modifier_parent FOREIGN KEY (parent_modifier_id) REFERENCES modifiers(id)       ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO modifiers (group_id, parent_modifier_id, name, extra_price) VALUES
 (1, NULL, 'Rare',           0.00),
 (1, NULL, 'Medium',         0.00),
 (1, NULL, 'Well done',      0.00),
 (2, NULL, 'Khoai tây chiên',20000.00),
 (2, NULL, 'Salad',          15000.00),
 (3, NULL, 'Nhỏ (150g)',     0.00),
 (3, NULL, 'Vừa (200g)',     50000.00),
 (3, NULL, 'Lớn (250g)',     100000.00),
 (4, NULL, 'Không cay',      0.00),
 (4, NULL, 'Cay vừa',        0.00),
 (4, NULL, 'Cay nhiều',      0.00),
 (5, NULL, 'Không cay',      0.00),
 (5, NULL, 'Cay vừa',        0.00);

CREATE TABLE combos (
    id        INT           NOT NULL AUTO_INCREMENT,
    name      VARCHAR(150)  NOT NULL,
    price     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active TINYINT(1)    NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO combos (name, price, is_active) VALUES
 ('Combo gia đình', 800000.00, 1),
 ('Combo cặp đôi',  500000.00, 1),
 ('Combo nhậu vui', 650000.00, 1);

CREATE TABLE combo_items (
    id           INT NOT NULL AUTO_INCREMENT,
    combo_id     INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity     INT NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    CONSTRAINT fk_comboitem_combo FOREIGN KEY (combo_id)     REFERENCES combos(id)     ON DELETE CASCADE,
    CONSTRAINT fk_comboitem_menu  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO combo_items (combo_id, menu_item_id, quantity) VALUES
 (1, 2, 1), (1, 3, 1), (1, 6, 1), (1, 9, 2), (1, 12, 2),
 (2, 1, 1), (2, 5, 1), (2, 10, 2), (2, 11, 2),
 (3, 2, 1), (3, 4, 1), (3, 7, 1), (3, 8, 3);

-- ============================================================================
--  ORDERS: Đủ 5 trạng thái — open | serving | pending_payment | completed | cancelled
--
--  Ánh xạ tables.status ↔ orders.status:
--    B01 (pending_payment) ← Order #4 pending_payment
--    B02 (cleaning)        ← Order #6 completed (vừa thanh toán xong)
--    B03 (reserved)        ← Booking #4 confirmed (chưa đến giờ)
--    B04 (serving)         ← Order #1 serving
--    B05 (pending_payment) ← Order #3 pending_payment
--    B06 (reserved)        ← Booking #5 confirmed (chưa đến giờ)
--    B07 (serving)         ← Order #5 open (vừa mở bàn)
--    B08 (serving)         ← Order #2 serving
--    B09 (maintenance)     ← Không có order
--    B10+ (empty)          ← Các order cũ đã completed & dọn xong
-- ============================================================================

CREATE TABLE orders (
    id          INT          NOT NULL AUTO_INCREMENT,
    table_id    INT          DEFAULT NULL,
    customer_id INT          DEFAULT NULL,
    created_by  INT          NOT NULL,
    order_type  ENUM('dine_in','takeaway','delivery') NOT NULL DEFAULT 'dine_in',
    split_label VARCHAR(10)  DEFAULT NULL,
    status      ENUM('open','serving','pending_payment','completed','cancelled') NOT NULL DEFAULT 'open',
    note        TEXT         DEFAULT NULL,
    guest_name  VARCHAR(100) DEFAULT NULL,
    guest_phone VARCHAR(20)  DEFAULT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at   DATETIME     DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_orders_table    FOREIGN KEY (table_id)    REFERENCES tables(id)    ON DELETE SET NULL,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT fk_orders_user     FOREIGN KEY (created_by)  REFERENCES users(id)     ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO orders (id, table_id, customer_id, created_by, order_type, split_label, status, note, guest_name, guest_phone, created_at, closed_at) VALUES
 -- ─── SERVING (2) ───────────────────────────────────────────────────────
 (1,  4,  1,    4, 'dine_in', NULL, 'serving',         'Khách yêu cầu ít muối',              NULL,           NULL,         '2026-07-30 18:00:00', NULL),
 (2,  8,  NULL, 5, 'dine_in', NULL, 'serving',         NULL,                                 'Tran Van Binh','0988887777', '2026-07-30 19:00:00', NULL),
 -- ─── PENDING_PAYMENT (2) ────────────────────────────────────────────────
 (3,  5,  2,    4, 'dine_in', NULL, 'pending_payment', 'Khách muốn in hóa đơn',              NULL,           NULL,         '2026-07-30 17:30:00', NULL),
 (4,  1,  NULL, 5, 'dine_in', NULL, 'pending_payment', NULL,                                 'Le Thi Hoa',   '0966778899', '2026-07-30 17:00:00', NULL),
 -- ─── OPEN (1): Vừa mở bàn, chưa gọi hết món ────────────────────────────
 (5,  7,  NULL, 4, 'dine_in', NULL, 'open',            NULL,                                 'Nguyen Hoang', '0912344321', '2026-07-30 19:30:00', NULL),
 -- ─── COMPLETED (5) ──────────────────────────────────────────────────────
 (6,  2,  3,    5, 'dine_in', NULL, 'completed',       NULL,                                 NULL,           NULL,         '2026-07-30 17:00:00', '2026-07-30 19:00:00'),
 (7,  10, 4,    4, 'dine_in', NULL, 'completed',       NULL,                                 NULL,           NULL,         '2026-07-29 19:00:00', '2026-07-29 21:00:00'),
 (8,  11, 5,    5, 'dine_in', NULL, 'completed',       'Khách phản hồi: món hơi chậm',       NULL,           NULL,         '2026-07-28 12:00:00', '2026-07-28 13:30:00'),
 (9,  12, 1,    4, 'dine_in', NULL, 'completed',       NULL,                                 NULL,           NULL,         '2026-07-28 18:00:00', '2026-07-28 20:00:00'),
 (10, 13, 2,    5, 'dine_in', NULL, 'completed',       NULL,                                 NULL,           NULL,         '2026-07-27 19:00:00', '2026-07-27 21:00:00'),
 -- ─── CANCELLED (1) ──────────────────────────────────────────────────────
 (11, NULL, NULL, 4, 'dine_in', NULL, 'cancelled', 'Khách đổi ý sau khi gọi món, yêu cầu hủy', 'Vu Thi Lan', '0977112233', '2026-07-29 20:00:00', NULL);

-- ============================================================================
--  ORDER ITEMS: Đủ 5 trạng thái — pending | cooking | done | cancelled | voided
--
--  Ánh xạ:
--    Order 1  (serving)         → items 1–3:  done + cooking + pending
--    Order 2  (serving)         → items 4–6:  cooking + done + done
--    Order 3  (pending_payment) → items 7–9:  all done
--    Order 4  (pending_payment) → items 10–12: all done
--    Order 5  (open)            → items 13–14: all pending (vừa gọi)
--    Order 6  (completed)       → items 15–17: all done
--    Order 7  (completed)       → items 18–20: all done
--    Order 8  (completed/refund)→ items 21–22: all done
--    Order 9  (completed)       → items 23–25: all done
--    Order 10 (completed)       → items 26–28: all done
--    Order 11 (cancelled)       → item 29: cancelled
--    Order 1  (voided demo)     → item 30: voided (khách đổi ý)
-- ============================================================================

CREATE TABLE order_items (
    id            INT           NOT NULL AUTO_INCREMENT,
    order_id      INT           NOT NULL,
    menu_item_id  INT           NOT NULL,
    quantity      INT           NOT NULL DEFAULT 1,
    unit_price    DECIMAL(10,2) NOT NULL,
    seat_number   TINYINT       DEFAULT NULL,
    course_number INT           NOT NULL DEFAULT 1,
    kitchen_note  TEXT          DEFAULT NULL,
    status        ENUM('pending','cooking','done','cancelled','voided') NOT NULL DEFAULT 'pending',
    is_held       TINYINT(1)    NOT NULL DEFAULT 0,
    voided_at     DATETIME      DEFAULT NULL,
    void_reason   VARCHAR(255)  DEFAULT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_orderitems_order FOREIGN KEY (order_id)     REFERENCES orders(id)     ON DELETE CASCADE,
    CONSTRAINT fk_orderitems_menu  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT,
    INDEX idx_orderitems_station (order_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO order_items (id, order_id, menu_item_id, quantity, unit_price, seat_number, course_number, kitchen_note, status, voided_at, void_reason) VALUES
 -- Order 1 (serving, B04, customer 1) — DEMO: done + cooking + pending
 (1,  1,  1, 1, 120000.00, NULL, 1, NULL,              'done',    NULL, NULL),  -- Gỏi hải sản: đã xong
 (2,  1,  3, 2, 180000.00, 1,    2, 'Medium, ít muối', 'cooking', NULL, NULL),  -- Bò lúc lắc: đang nấu
 (3,  1,  7, 1, 400000.00, NULL, 2, 'Cay vừa',         'pending', NULL, NULL),  -- Lẩu hải sản: chờ
 -- Order 2 (serving, B08, khách vãng lai) — cooking + done
 (4,  2,  4, 1, 160000.00, NULL, 1, NULL,              'cooking', NULL, NULL),  -- Gà nướng: đang nấu
 (5,  2,  2, 2,  80000.00, NULL, 1, NULL,              'done',    NULL, NULL),  -- Chả giò: xong
 (6,  2, 10, 3,  35000.00, NULL, 1, 'Ít đá',           'done',    NULL, NULL),  -- Trà đào: xong
 -- Order 3 (pending_payment, B05, customer 2) — all done
 (7,  3,  5, 1, 220000.00, 1,    1, 'Vừa (200g)',      'done',    NULL, NULL),
 (8,  3,  6, 1, 350000.00, NULL, 1, 'Cay vừa',         'done',    NULL, NULL),
 (9,  3,  8, 2,  20000.00, NULL, 1, NULL,              'done',    NULL, NULL),
 -- Order 4 (pending_payment, B01, khách vãng lai) — all done
 (10, 4,  3, 2, 180000.00, 1,    1, 'Well done',       'done',    NULL, NULL),
 (11, 4,  4, 1, 160000.00, 2,    1, NULL,              'done',    NULL, NULL),
 (12, 4,  9, 2,  20000.00, NULL, 1, NULL,              'done',    NULL, NULL),
 -- Order 5 (open, B07) — all pending (vừa gọi)
 (13, 5,  1, 2, 120000.00, NULL, 1, NULL,              'pending', NULL, NULL),
 (14, 5, 10, 2,  35000.00, NULL, 1, NULL,              'pending', NULL, NULL),
 -- Order 6 (completed, B02, customer 3) — all done
 (15, 6,  3, 1, 180000.00, NULL, 1, 'Well done',       'done',    NULL, NULL),
 (16, 6,  4, 1, 160000.00, NULL, 1, NULL,              'done',    NULL, NULL),
 (17, 6, 10, 2,  35000.00, NULL, 1, 'Ít đá',           'done',    NULL, NULL),
 -- Order 7 (completed, B10, customer 4) — all done
 (18, 7,  5, 1, 220000.00, NULL, 1, 'Lớn (250g)',      'done',    NULL, NULL),
 (19, 7,  7, 1, 400000.00, NULL, 1, 'Không cay',       'done',    NULL, NULL),
 (20, 7,  8, 2,  20000.00, NULL, 1, NULL,              'done',    NULL, NULL),
 -- Order 8 (completed, B11, customer 5) — all done — hóa đơn bị REFUND
 (21, 8,  1, 2, 120000.00, NULL, 1, NULL,              'done',    NULL, NULL),
 (22, 8,  2, 1,  80000.00, NULL, 1, NULL,              'done',    NULL, NULL),
 -- Order 9 (completed, B12, customer 1) — all done — dùng voucher SAVE10
 (23, 9,  6, 1, 350000.00, NULL, 1, 'Cay nhiều',       'done',    NULL, NULL),
 (24, 9,  9, 3,  20000.00, NULL, 1, NULL,              'done',    NULL, NULL),
 (25, 9, 11, 2,  45000.00, NULL, 2, NULL,              'done',    NULL, NULL),
 -- Order 10 (completed, B13, customer 2) — all done — tips
 (26, 10, 3, 2, 180000.00, NULL, 1, NULL,              'done',    NULL, NULL),
 (27, 10,10, 3,  35000.00, NULL, 1, NULL,              'done',    NULL, NULL),
 (28, 10,12, 2,  40000.00, NULL, 2, NULL,              'done',    NULL, NULL),
 -- Order 11 (cancelled) — DEMO cancelled
 (29, 11, 3, 1, 180000.00, NULL, 1, NULL,              'cancelled', NULL, NULL),
 -- Order 1 — DEMO voided (khách đổi ý sau khi gọi)
 (30, 1, 11, 1,  45000.00, NULL, 3, NULL,              'voided', '2026-07-30 18:30:00', 'Khách đổi ý, không muốn dùng tráng miệng');

CREATE TABLE order_item_status_log (
    id            INT         NOT NULL AUTO_INCREMENT,
    order_item_id INT         NOT NULL,
    from_status   VARCHAR(50) DEFAULT NULL,
    to_status     VARCHAR(50) NOT NULL,
    changed_by    INT         DEFAULT NULL,
    changed_at    DATETIME    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_itemlog_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_itemlog_user FOREIGN KEY (changed_by)    REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO order_item_status_log (order_item_id, from_status, to_status, changed_by, changed_at) VALUES
 -- Order 1 items
 (1,  'pending', 'done',      6, '2026-07-30 18:05:00'),  -- Gỏi hải sản: done
 (2,  'pending', 'cooking',   6, '2026-07-30 18:10:00'),  -- Bò: đang cooking
 (30, 'pending', 'voided',    4, '2026-07-30 18:30:00'),  -- Kem Vani: voided

 -- Order 2 items
 (4,  'pending', 'cooking',   6, '2026-07-30 19:10:00'),  -- Gà: cooking
 (5,  'pending', 'cooking',   6, '2026-07-30 19:05:00'),  -- Chả giò: cooking→done
 (5,  'cooking', 'done',      6, '2026-07-30 19:20:00'),
 (6,  'pending', 'done',      6, '2026-07-30 19:03:00'),  -- Trà đào: done

 -- Order 3 items (pending_payment)
 (7,  'pending', 'cooking',   6, '2026-07-30 17:40:00'),
 (7,  'cooking', 'done',      6, '2026-07-30 17:58:00'),
 (8,  'pending', 'cooking',   6, '2026-07-30 17:40:00'),
 (8,  'cooking', 'done',      6, '2026-07-30 18:10:00'),
 (9,  'pending', 'done',      6, '2026-07-30 17:35:00'),

 -- Order 4 items (pending_payment)
 (10, 'pending', 'cooking',   6, '2026-07-30 17:10:00'),
 (10, 'cooking', 'done',      6, '2026-07-30 17:30:00'),
 (11, 'pending', 'cooking',   6, '2026-07-30 17:10:00'),
 (11, 'cooking', 'done',      6, '2026-07-30 17:25:00'),
 (12, 'pending', 'done',      6, '2026-07-30 17:05:00'),

 -- Order 6 items (completed, B02)
 (15, 'pending', 'cooking',   6, '2026-07-30 17:10:00'),
 (15, 'cooking', 'done',      6, '2026-07-30 17:35:00'),
 (16, 'pending', 'cooking',   6, '2026-07-30 17:10:00'),
 (16, 'cooking', 'done',      6, '2026-07-30 17:30:00'),
 (17, 'pending', 'done',      6, '2026-07-30 17:05:00'),

 -- Order 7 items (completed, B10)
 (18, 'pending', 'cooking',   6, '2026-07-29 19:10:00'),
 (18, 'cooking', 'done',      6, '2026-07-29 19:35:00'),
 (19, 'pending', 'cooking',   6, '2026-07-29 19:10:00'),
 (19, 'cooking', 'done',      6, '2026-07-29 19:45:00'),
 (20, 'pending', 'done',      6, '2026-07-29 19:05:00'),

 -- Order 8 items (completed, B11 — refunded)
 (21, 'pending', 'cooking',   6, '2026-07-28 12:05:00'),
 (21, 'cooking', 'done',      6, '2026-07-28 12:18:00'),
 (22, 'pending', 'cooking',   6, '2026-07-28 12:05:00'),
 (22, 'cooking', 'done',      6, '2026-07-28 12:20:00'),

 -- Order 9 items (completed, B12 — voucher SAVE10)
 (23, 'pending', 'cooking',   6, '2026-07-28 18:10:00'),
 (23, 'cooking', 'done',      6, '2026-07-28 18:40:00'),
 (24, 'pending', 'done',      6, '2026-07-28 18:05:00'),
 (25, 'pending', 'done',      6, '2026-07-28 18:05:00'),

 -- Order 10 items (completed, B13 — tips)
 (26, 'pending', 'cooking',   6, '2026-07-27 19:10:00'),
 (26, 'cooking', 'done',      6, '2026-07-27 19:35:00'),
 (27, 'pending', 'done',      6, '2026-07-27 19:05:00'),
 (28, 'pending', 'done',      6, '2026-07-27 19:05:00'),

 -- Order 11 item (cancelled)
 (29, 'pending', 'cancelled', 4, '2026-07-29 20:10:00');


-- ============================================================================
--  MODULE 4 — KHO & ĐỊNH MỨC
-- ============================================================================

CREATE TABLE suppliers (
    id         INT           NOT NULL AUTO_INCREMENT,
    name       VARCHAR(150)  NOT NULL,
    phone      VARCHAR(20)   DEFAULT NULL,
    address    VARCHAR(255)  DEFAULT NULL,
    total_debt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO suppliers (name, phone, address, total_debt) VALUES
 ('Công ty TNHH Thực phẩm ABC', '0987654321', '123 Đường ABC, Quận 1, TP.HCM', 0.00),
 ('Nhà phân phối Hải sản XYZ',  '0912345678', '456 Đường XYZ, Quận 3, TP.HCM', 0.00),
 ('Công ty Nông sản Việt',      '0901234567', '789 Đường DEF, Quận 5, TP.HCM', 0.00);

CREATE TABLE ingredients (
    id            INT           NOT NULL AUTO_INCREMENT,
    name          VARCHAR(150)  NOT NULL,
    unit          VARCHAR(20)   NOT NULL,
    current_stock DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    min_stock     DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    is_deleted    TINYINT(1)    NOT NULL DEFAULT 0,
    deleted_at    DATETIME      DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO ingredients (name, unit, current_stock, min_stock) VALUES
 ('Thịt bò',  'kg',  47.500, 10.000),
 ('Thịt gà',  'kg',  39.700,  8.000),
 ('Cá hồi',   'kg',  20.000,  5.000),
 ('Tôm',      'kg',  29.600, 10.000),
 ('Rau sống', 'kg',  24.750,  8.000),
 ('Gạo',      'kg', 100.000, 30.000),
 ('Nước mắm', 'lit', 20.000,  5.000),
 ('Dầu ăn',   'lit', 15.000,  3.000),
 ('Trái cây', 'kg',  15.000,  5.000),
 ('Bột mì',   'kg',  30.000, 10.000);

CREATE TABLE recipes (
    id           INT NOT NULL AUTO_INCREMENT,
    menu_item_id INT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_recipes_menuitem (menu_item_id),
    CONSTRAINT fk_recipe_menuitem FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO recipes (menu_item_id) VALUES
 (1),(2),(3),(4),(5),(6),(7),(8),(9),(10),(11),(12);

CREATE TABLE recipe_items (
    id            INT           NOT NULL AUTO_INCREMENT,
    recipe_id     INT           NOT NULL,
    ingredient_id INT           NOT NULL,
    quantity      DECIMAL(10,4) NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uk_recipe_ingredient (recipe_id, ingredient_id),
    CONSTRAINT fk_recipeitem_recipe     FOREIGN KEY (recipe_id)     REFERENCES recipes(id)     ON DELETE CASCADE,
    CONSTRAINT fk_recipeitem_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO recipe_items (recipe_id, ingredient_id, quantity) VALUES
 (1,  4, 0.2000), (1,  5, 0.1000),
 (2, 10, 0.1500), (2,  8, 0.0500),
 (3,  1, 0.2500), (3,  5, 0.0500),
 (4,  2, 0.3000),
 (5,  3, 0.2000), (5,  5, 0.0500),
 (6,  1, 0.3000), (6,  2, 0.2000), (6,  4, 0.2000),
 (7,  4, 0.5000), (7,  5, 0.3000),
 (10, 9, 0.1500),
 (11, 9, 0.1000),
 (12, 9, 0.2000), (12,10, 0.0500);

CREATE TABLE stock_in (
    id            INT           NOT NULL AUTO_INCREMENT,
    ingredient_id INT           NOT NULL,
    quantity      DECIMAL(10,3) NOT NULL,
    unit_cost     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    supplier_id   INT           DEFAULT NULL,
    note          TEXT          DEFAULT NULL,
    created_by    INT           NOT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_stockin_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT,
    CONSTRAINT fk_stockin_supplier   FOREIGN KEY (supplier_id)   REFERENCES suppliers(id)   ON DELETE SET NULL,
    CONSTRAINT fk_stockin_user       FOREIGN KEY (created_by)    REFERENCES users(id)       ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO stock_in (ingredient_id, quantity, unit_cost, supplier_id, note, created_by, created_at) VALUES
 (1, 50.000, 250000.00, 1, 'Nhập hàng tháng 7', 2, '2026-07-01 08:00:00'),
 (2, 40.000, 120000.00, 1, 'Nhập hàng tháng 7', 2, '2026-07-01 08:00:00'),
 (3, 20.000, 400000.00, 2, 'Nhập hàng tháng 7', 2, '2026-07-01 08:30:00'),
 (4, 30.000, 180000.00, 2, 'Nhập hàng tháng 7', 2, '2026-07-01 08:30:00'),
 (5, 25.000,  30000.00, 3, 'Nhập hàng tháng 7', 2, '2026-07-01 09:00:00'),
 (6,100.000,  20000.00, 3, 'Nhập gạo tháng 7',  2, '2026-07-01 09:00:00'),
 (9, 15.000,  80000.00, 3, 'Nhập trái cây',      2, '2026-07-10 09:00:00'),
 (10,30.000,  25000.00, 3, 'Nhập bột mì',        2, '2026-07-10 09:00:00');

CREATE TABLE stock_out (
    id             INT           NOT NULL AUTO_INCREMENT,
    ingredient_id  INT           NOT NULL,
    quantity       DECIMAL(10,3) NOT NULL,
    reason         ENUM('waste','internal_use','expired','sale_deduction','other') NOT NULL DEFAULT 'other',
    ref_invoice_id INT           DEFAULT NULL,
    note           TEXT          DEFAULT NULL,
    created_by     INT           DEFAULT NULL,
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_stockout_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT,
    CONSTRAINT fk_stockout_user       FOREIGN KEY (created_by)    REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO stock_out (ingredient_id, quantity, reason, ref_invoice_id, note, created_by, created_at) VALUES
 (1, 2.500, 'sale_deduction', NULL, 'Trừ kho bán hàng các order hoàn thành',  NULL, '2026-07-30 19:00:00'),
 (2, 0.300, 'sale_deduction', NULL, 'Trừ kho gà nướng',                        NULL, '2026-07-30 19:00:00'),
 (3, 0.200, 'sale_deduction', NULL, 'Trừ kho cá hồi',                          NULL, '2026-07-30 19:00:00'),
 (4, 0.900, 'sale_deduction', NULL, 'Trừ kho tôm',                             NULL, '2026-07-30 19:00:00'),
 (5, 0.250, 'waste',          NULL, 'Rau sống hư không dùng được',              2,    '2026-07-30 07:30:00'),
 (8, 0.050, 'internal_use',   NULL, 'Dùng nội bộ vệ sinh bếp',                 2,    '2026-07-30 08:00:00');

CREATE TABLE stock_inventory (
    id            INT           NOT NULL AUTO_INCREMENT,
    ingredient_id INT           NOT NULL,
    actual_stock  DECIMAL(10,3) NOT NULL,
    system_stock  DECIMAL(10,3) NOT NULL,
    variance      DECIMAL(10,3) GENERATED ALWAYS AS (actual_stock - system_stock) STORED,
    noted_at      DATE          NOT NULL,
    created_by    INT           DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_inventory_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE CASCADE,
    CONSTRAINT fk_inventory_user       FOREIGN KEY (created_by)    REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO stock_inventory (ingredient_id, actual_stock, system_stock, noted_at, created_by) VALUES
 (1,  47.500, 47.500, '2026-07-30', 2),
 (2,  39.700, 39.700, '2026-07-30', 2),
 (3,  20.000, 20.000, '2026-07-30', 2),
 (4,  29.600, 29.600, '2026-07-30', 2),
 (5,  24.750, 24.850, '2026-07-30', 2),  -- hao hụt 0.1kg
 (6, 100.000,100.000, '2026-07-30', 2),
 (9,  15.000, 15.000, '2026-07-30', 2),
 (10, 30.000, 30.000, '2026-07-30', 2);


-- ============================================================================
--  MODULE 5 — THANH TOÁN
--
--  INVOICES: 2 draft | 3 paid | 1 refunded (tổng 6)
--  PAYMENTS: cash | bank_transfer | card | momo | vnpay
--
--  Tính toán:
--    Invoice 1 (Order 6):  sub=410k, tax=41k, svc=20.5k             → total=471,500  (cash)
--    Invoice 2 (Order 7):  sub=660k, tax=66k, svc=33k               → total=759,000  (bank_transfer)
--    Invoice 3 (Order 8):  sub=320k, tax=32k, svc=16k               → total=368,000  (card, REFUNDED)
--    Invoice 4 (Order 9):  sub=500k, dis=50k, tax=45k, svc=22.5k    → total=517,500  (momo, SAVE10 10%)
--    Invoice 5 (Order 10): sub=545k, tax=54.5k, svc=27.25k, tips=30k→ total=656,750  (vnpay)
--    Invoice 6 (Order 3):  sub=610k, tax=61k, svc=30.5k             → total=701,500  (draft)
--    Invoice 7 (Order 4):  sub=560k, tax=56k, svc=28k               → total=644,000  (draft)
-- ============================================================================

CREATE TABLE invoices (
    id                INT           NOT NULL AUTO_INCREMENT,
    order_id          INT           NOT NULL,
    parent_invoice_id INT           DEFAULT NULL,
    subtotal          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount          DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax               DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    service_fee       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tips              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    voucher_id        INT           DEFAULT NULL,
    status            ENUM('draft','paid','refunded') NOT NULL DEFAULT 'draft',
    paid_at           DATETIME      DEFAULT NULL,
    created_by        INT           NOT NULL,
    created_at        DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_invoices_order   FOREIGN KEY (order_id)          REFERENCES orders(id)   ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_parent  FOREIGN KEY (parent_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoices_voucher FOREIGN KEY (voucher_id)        REFERENCES vouchers(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoices_user    FOREIGN KEY (created_by)        REFERENCES users(id)    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO invoices (id, order_id, parent_invoice_id, subtotal, discount, tax, service_fee, tips, total, voucher_id, status, paid_at, created_by) VALUES
 -- Invoice 1: Order 6 — PAID (cash) | Bò+Gà+Trà đào
 (1, 6,  NULL, 410000.00,     0.00, 41000.00, 20500.00,     0.00, 471500.00, NULL, 'paid',     '2026-07-30 19:00:00', 3),
 -- Invoice 2: Order 7 — PAID (bank_transfer) | Cá hồi+Lẩu hải sản+Coca
 (2, 7,  NULL, 660000.00,     0.00, 66000.00, 33000.00,     0.00, 759000.00, NULL, 'paid',     '2026-07-29 21:00:00', 3),
 -- Invoice 3: Order 8 — REFUNDED (card) | Gỏi+Chả giò — khách khiếu nại
 (3, 8,  NULL, 320000.00,     0.00, 32000.00, 16000.00,     0.00, 368000.00, NULL, 'refunded', '2026-07-28 13:30:00', 3),
 -- Invoice 4: Order 9 — PAID (momo) | Lẩu Thái+Pepsi+Kem Vani | voucher SAVE10 (10%)
 (4, 9,  NULL, 500000.00, 50000.00, 45000.00, 22500.00,     0.00, 517500.00,    1, 'paid',     '2026-07-28 20:00:00', 3),
 -- Invoice 5: Order 10 — PAID (vnpay) | Bò+Trà đào+Chè thái | có tips 30k
 (5, 10, NULL, 545000.00,     0.00, 54500.00, 27250.00, 30000.00, 656750.00, NULL, 'paid',     '2026-07-27 21:00:00', 3),
 -- Invoice 6: Order 3 — DRAFT (chờ thanh toán) | Cá hồi+Lẩu Thái+Coca
 (6, 3,  NULL, 610000.00,     0.00, 61000.00, 30500.00,     0.00, 701500.00, NULL, 'draft',    NULL,                  3),
 -- Invoice 7: Order 4 — DRAFT (chờ thanh toán) | Bò+Gà+Pepsi
 (7, 4,  NULL, 560000.00,     0.00, 56000.00, 28000.00,     0.00, 644000.00, NULL, 'draft',    NULL,                  3);

CREATE TABLE invoice_items (
    id            INT           NOT NULL AUTO_INCREMENT,
    invoice_id    INT           NOT NULL,
    order_item_id INT           NOT NULL,
    amount        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (id),
    CONSTRAINT fk_invoiceitems_invoice FOREIGN KEY (invoice_id)    REFERENCES invoices(id)    ON DELETE CASCADE,
    CONSTRAINT fk_invoiceitems_item    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO invoice_items (invoice_id, order_item_id, amount) VALUES
 -- Invoice 1 ← order_items 15,16,17 (Order 6)
 (1, 15, 180000.00),  -- Bò 1×180k
 (1, 16, 160000.00),  -- Gà 1×160k
 (1, 17,  70000.00),  -- Trà đào 2×35k
 -- Invoice 2 ← order_items 18,19,20 (Order 7)
 (2, 18, 220000.00),  -- Cá hồi 1×220k
 (2, 19, 400000.00),  -- Lẩu hải sản 1×400k
 (2, 20,  40000.00),  -- Coca 2×20k
 -- Invoice 3 ← order_items 21,22 (Order 8 — refunded)
 (3, 21, 240000.00),  -- Gỏi 2×120k
 (3, 22,  80000.00),  -- Chả giò 1×80k
 -- Invoice 4 ← order_items 23,24,25 (Order 9 — SAVE10)
 (4, 23, 350000.00),  -- Lẩu Thái 1×350k
 (4, 24,  60000.00),  -- Pepsi 3×20k
 (4, 25,  90000.00),  -- Kem Vani 2×45k
 -- Invoice 5 ← order_items 26,27,28 (Order 10 — tips)
 (5, 26, 360000.00),  -- Bò 2×180k
 (5, 27, 105000.00),  -- Trà đào 3×35k
 (5, 28,  80000.00),  -- Chè thái 2×40k
 -- Invoice 6 ← order_items 7,8,9 (Order 3 — draft)
 (6, 7,  220000.00),  -- Cá hồi 1×220k
 (6, 8,  350000.00),  -- Lẩu Thái 1×350k
 (6, 9,   40000.00),  -- Coca 2×20k
 -- Invoice 7 ← order_items 10,11,12 (Order 4 — draft)
 (7, 10, 360000.00),  -- Bò 2×180k
 (7, 11, 160000.00),  -- Gà 1×160k
 (7, 12,  40000.00);  -- Pepsi 2×20k

-- ============================================================================
--  PAYMENTS: Đủ 5 phương thức — cash | bank_transfer | card | momo | vnpay
-- ============================================================================

CREATE TABLE payments (
    id         INT           NOT NULL AUTO_INCREMENT,
    invoice_id INT           NOT NULL,
    method     ENUM('cash','bank_transfer','card','momo','vnpay') NOT NULL,
    amount     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    note       VARCHAR(255)  DEFAULT NULL,
    paid_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO payments (invoice_id, method, amount, note, paid_at) VALUES
 (1, 'cash',          471500.00, 'Thanh toán tiền mặt — khách đưa 500k trả lại 28.5k',        '2026-07-30 19:00:00'),
 (2, 'bank_transfer', 759000.00, 'Chuyển khoản Vietcombank — đã xác nhận nhận tiền',           '2026-07-29 21:00:00'),
 (3, 'card',          368000.00, 'Thanh toán thẻ Visa — đã hoàn tiền do khách khiếu nại',      '2026-07-28 13:30:00'),
 (4, 'momo',          517500.00, 'Thanh toán MoMo — áp voucher SAVE10 giảm 50,000đ',           '2026-07-28 20:00:00'),
 (5, 'vnpay',         656750.00, 'Thanh toán VNPay — khách tip thêm 30,000đ',                  '2026-07-27 21:00:00');


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
--  BỔ SUNG FK CHO CÁC CỘT THAM CHIẾU invoices (TẠO SAU invoices)
-- ============================================================================
ALTER TABLE loyalty_transactions
  ADD CONSTRAINT fk_loyalty_invoice FOREIGN KEY (ref_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE stock_out
  ADD CONSTRAINT fk_stockout_invoice FOREIGN KEY (ref_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

-- ============================================================================
--  LOYALTY TRANSACTIONS — thêm sau invoices để ref_invoice_id hợp lệ
--
--  Tính điểm: total / 10,000 (làm tròn xuống)
--    Invoice 1 (471,500): ~47 điểm cho customer 3
--    Invoice 2 (759,000): ~75 điểm cho customer 4
--    Invoice 4 (517,500): ~51 điểm cho customer 1
--    Invoice 5 (656,750): ~65 điểm cho customer 2
--    Invoice 3 REFUNDED: không tích điểm cho customer 5
-- ============================================================================
INSERT INTO loyalty_transactions (customer_id, points, type, ref_invoice_id, note, created_at) VALUES
 -- Customer 1 (silver, 172 điểm): 51 từ invoice 4 + 121 lịch sử
 (1,  51, 'earn',   4,    'Tích điểm hóa đơn #4 ngày 28/07 (MoMo)',        '2026-07-28 20:00:00'),
 (1, 121, 'earn',   NULL, 'Tích điểm tích lũy trước đây',                   '2026-06-01 12:00:00'),
 -- Customer 2 (gold, 400 điểm): 65 từ invoice 5 + 335 lịch sử
 (2,  65, 'earn',   5,    'Tích điểm hóa đơn #5 ngày 27/07 (VNPay)',       '2026-07-27 21:00:00'),
 (2, 335, 'earn',   NULL, 'Tích điểm tích lũy trước đây',                   '2026-05-01 10:00:00'),
 -- Customer 3 (bronze, 50 điểm): 47 từ invoice 1 + 3 lịch sử
 (3,  47, 'earn',   1,    'Tích điểm hóa đơn #1 ngày 30/07 (Tiền mặt)',    '2026-07-30 19:00:00'),
 (3,   3, 'earn',   NULL, 'Tích điểm lần đầu ghé nhà hàng',                 '2026-04-15 19:00:00'),
 -- Customer 4 (vip, 500 điểm): 75 từ invoice 2 + 425 lịch sử
 (4,  75, 'earn',   2,    'Tích điểm hóa đơn #2 ngày 29/07 (Chuyển khoản)','2026-07-29 21:00:00'),
 (4, 425, 'earn',   NULL, 'Tích điểm VIP tích lũy trước đây',               '2026-03-01 18:00:00'),
 -- Customer 5 (gold, 300 điểm): Invoice 3 bị refund, không tích điểm
 (5, 300, 'earn',   NULL, 'Tích điểm tích lũy',                             '2026-04-01 18:00:00');

-- ============================================================================
--  CẬP NHẬT used_count voucher sau khi đã dùng (SAVE10 dùng 2 lần)
-- ============================================================================
UPDATE vouchers SET used_count = 2 WHERE code = 'SAVE10';

-- ============================================================================
--  DATA BỔ SUNG — LỊCH SỬ THANH TOÁN ĐA NGÀY (1–25 THÁNG 7/2026)
--  Mục đích: Demo báo cáo thống kê bên Quản lý — doanh thu theo ngày/tuần,
--             theo phương thức thanh toán, món bán chạy, giờ cao điểm
--
--  Thêm 20 orders hoàn thành trải từ 01/07 → 12/7
--  Xoay vòng đủ 5 phương thức: cash → momo → bank_transfer → card → vnpay
-- ============================================================================

INSERT INTO orders (id, table_id, customer_id, created_by, order_type, split_label, status, note, guest_name, guest_phone, created_at, closed_at) VALUES
 (12, NULL, 1, 4, 'dine_in', NULL, 'completed', NULL,                  NULL, NULL, '2026-07-01 12:00:00', '2026-07-01 13:30:00'),
 (13, NULL, 2, 5, 'dine_in', NULL, 'completed', NULL,                  NULL, NULL, '2026-07-01 19:00:00', '2026-07-01 20:30:00'),
 (14, NULL, 3, 4, 'dine_in', NULL, 'completed', NULL,                  NULL, NULL, '2026-07-05 12:30:00', '2026-07-05 14:00:00'),
 (15, NULL, 4, 5, 'dine_in', NULL, 'completed', NULL,                  NULL, NULL, '2026-07-05 19:30:00', '2026-07-05 21:00:00'),
 (16, NULL, 5, 4, 'dine_in', NULL, 'completed', NULL,                  NULL, NULL, '2026-07-08 19:00:00', '2026-07-08 20:30:00'),
 (17, NULL, 1, 5, 'dine_in', NULL, 'completed', NULL,                  NULL, NULL, '2026-07-08 20:00:00', '2026-07-08 21:30:00'),
 (18, NULL, 2, 4, 'dine_in', NULL, 'completed', NULL,                  NULL, NULL, '2026-07-10 12:00:00', '2026-07-10 13:30:00'),
 (19, NULL, 3, 5, 'dine_in', NULL, 'completed', NULL,                  NULL, NULL, '2026-07-10 19:30:00', '2026-07-10 21:00:00'),
 (20, NULL, 4, 4, 'dine_in', NULL, 'completed', NULL,                  NULL, NULL, '2026-07-12 12:00:00', '2026-07-12 13:30:00');

INSERT INTO order_items (id, order_id, menu_item_id, quantity, unit_price, seat_number, course_number, kitchen_note, status, voided_at, void_reason) VALUES
 -- Order 12 (01/07 trưa): Gỏi + Bò + Trà đào×2 = 370k
 (31, 12,  1, 1, 120000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (32, 12,  3, 1, 180000.00, NULL, 2, NULL,     'done', NULL, NULL),
 (33, 12, 10, 2,  35000.00, NULL, 1, NULL,     'done', NULL, NULL),
 -- Order 13 (01/07 tối): Gà + Lẩu Thái + Coca×2 = 550k
 (34, 13,  4, 1, 160000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (35, 13,  6, 1, 350000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (36, 13,  8, 2,  20000.00, NULL, 1, NULL,     'done', NULL, NULL),
 -- Order 14 (05/07 trưa): Cá hồi + Chả giò + Pepsi×2 = 340k
 (37, 14,  5, 1, 220000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (38, 14,  2, 1,  80000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (39, 14,  9, 2,  20000.00, NULL, 1, NULL,     'done', NULL, NULL),
 -- Order 15 (05/07 tối): Bò×2 + Kem Vani×2 = 450k
 (40, 15,  3, 2, 180000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (41, 15, 11, 2,  45000.00, NULL, 2, NULL,     'done', NULL, NULL),
 -- Order 16 (08/07 tối): Lẩu hải sản + Gỏi + Trà đào×3 = 625k
 (42, 16,  7, 1, 400000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (43, 16,  1, 1, 120000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (44, 16, 10, 3,  35000.00, NULL, 1, NULL,     'done', NULL, NULL),
 -- Order 17 (08/07 tối): Gà + Chả giò×2 + Coca×3 = 380k
 (45, 17,  4, 1, 160000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (46, 17,  2, 2,  80000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (47, 17,  8, 3,  20000.00, NULL, 1, NULL,     'done', NULL, NULL),
 -- Order 18 (10/07 trưa): Bò + Cá hồi + Chè thái×2 = 480k
 (48, 18,  3, 1, 180000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (49, 18,  5, 1, 220000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (50, 18, 12, 2,  40000.00, NULL, 2, NULL,     'done', NULL, NULL),
 -- Order 19 (10/07 tối): Lẩu Thái + Pepsi×3 + Kem Vani = 455k
 (51, 19,  6, 1, 350000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (52, 19,  9, 3,  20000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (53, 19, 11, 1,  45000.00, NULL, 2, NULL,     'done', NULL, NULL),
 -- Order 20 (12/07 trưa): Gỏi×2 + Gà + Trà đào×2 = 470k
 (54, 20,  1, 2, 120000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (55, 20,  4, 1, 160000.00, NULL, 1, NULL,     'done', NULL, NULL),
 (56, 20, 10, 2,  35000.00, NULL, 1, NULL,     'done', NULL, NULL);


-- INVOICES bổ sung (IDs 8–27)
-- Công thức: tax=10%, service=5%, total = subtotal - discount + tax + service + tips
INSERT INTO invoices (id, order_id, parent_invoice_id, subtotal, discount, tax, service_fee, tips, total, voucher_id, status, paid_at, created_by) VALUES
 ( 8, 12, NULL, 370000.00,     0.00, 37000.00, 18500.00,    0.00, 425500.00, NULL, 'paid', '2026-07-01 13:30:00', 3),
 ( 9, 13, NULL, 550000.00,     0.00, 55000.00, 27500.00,    0.00, 632500.00, NULL, 'paid', '2026-07-01 20:30:00', 3),
 (10, 14, NULL, 340000.00,     0.00, 34000.00, 17000.00,    0.00, 391000.00, NULL, 'paid', '2026-07-05 14:00:00', 3),
 (11, 15, NULL, 450000.00,     0.00, 45000.00, 22500.00,    0.00, 517500.00, NULL, 'paid', '2026-07-05 21:00:00', 3),
 (12, 16, NULL, 625000.00,     0.00, 62500.00, 31250.00,    0.00, 718750.00, NULL, 'paid', '2026-07-08 20:30:00', 3),
 (13, 17, NULL, 380000.00,     0.00, 38000.00, 19000.00,    0.00, 437000.00, NULL, 'paid', '2026-07-08 21:30:00', 3),
 (14, 18, NULL, 480000.00,     0.00, 48000.00, 24000.00,    0.00, 552000.00, NULL, 'paid', '2026-07-10 13:30:00', 3),
 (15, 19, NULL, 455000.00,     0.00, 45500.00, 22750.00,    0.00, 523250.00, NULL, 'paid', '2026-07-10 21:00:00', 3),
 (16, 20, NULL, 470000.00,     0.00, 47000.00, 23500.00,    0.00, 540500.00, NULL, 'paid', '2026-07-12 13:30:00', 3);

INSERT INTO invoice_items (invoice_id, order_item_id, amount) VALUES
 -- Invoice 8 ← Order 12
 ( 8, 31, 120000.00), ( 8, 32, 180000.00), ( 8, 33,  70000.00),
 -- Invoice 9 ← Order 13
 ( 9, 34, 160000.00), ( 9, 35, 350000.00), ( 9, 36,  40000.00),
 -- Invoice 10 ← Order 14
 (10, 37, 220000.00), (10, 38,  80000.00), (10, 39,  40000.00),
 -- Invoice 11 ← Order 15
 (11, 40, 360000.00), (11, 41,  90000.00),
 -- Invoice 12 ← Order 16
 (12, 42, 400000.00), (12, 43, 120000.00), (12, 44, 105000.00),
 -- Invoice 13 ← Order 17
 (13, 45, 160000.00), (13, 46, 160000.00), (13, 47,  60000.00),
 -- Invoice 14 ← Order 18
 (14, 48, 180000.00), (14, 49, 220000.00), (14, 50,  80000.00),
 -- Invoice 15 ← Order 19
 (15, 51, 350000.00), (15, 52,  60000.00), (15, 53,  45000.00),
 -- Invoice 16 ← Order 20
 (16, 54, 240000.00), (16, 55, 160000.00), (16, 56,  70000.00);

-- PAYMENTS bổ sung (IDs 6–25)
-- Xoay vòng đủ 5 phương thức: cash → momo → bank_transfer → card → vnpay
INSERT INTO payments (invoice_id, method, amount, note, paid_at) VALUES
 ( 8, 'cash',          425500.00, 'Tiền mặt — khách đưa 500k',              '2026-07-01 13:30:00'),
 ( 9, 'momo',          632500.00, 'MoMo QR',                                 '2026-07-01 20:30:00'),
 (10, 'bank_transfer', 391000.00, 'Chuyển khoản Vietcombank',                '2026-07-05 14:00:00'),
 (11, 'card',          517500.00, 'Thẻ Visa',                                '2026-07-05 21:00:00'),
 (12, 'vnpay',         718750.00, 'VNPay QR',                                '2026-07-08 20:30:00'),
 (13, 'cash',          437000.00, 'Tiền mặt',                                '2026-07-08 21:30:00'),
 (14, 'momo',          552000.00, 'MoMo',                                    '2026-07-10 13:30:00'),
 (15, 'bank_transfer', 523250.00, 'Chuyển khoản MB Bank',                    '2026-07-10 21:00:00'),
 (16, 'card',          540500.00, 'Thẻ Mastercard',                          '2026-07-12 13:30:00');

-- ============================================================================
--  DEMO VOUCHER THEO HẠNG THÀNH VIÊN
--  voucher_id: 1=SAVE10, 2=FIXED50, 3=NEW20, 4=SILVER15, 5=GOLD25, 6=VIP30
--
--  Order 32 (customer 1 — silver) : dùng SILVER15 (giảm 15%)
--  Order 33 (customer 2 — gold)   : dùng GOLD25   (giảm 25%)
--  Order 34 (customer 4 — vip)    : dùng VIP30    (giảm 30%)
-- ============================================================================

INSERT INTO orders (id, table_id, customer_id, created_by, order_type, split_label, status, note, guest_name, guest_phone, created_at, closed_at) VALUES
 (32, NULL, 1, 4, 'dine_in', NULL, 'completed', 'Khách Silver áp voucher SILVER15',  NULL, NULL, '2026-07-26 12:00:00', '2026-07-26 13:30:00'),
 (33, NULL, 2, 5, 'dine_in', NULL, 'completed', 'Khách Gold áp voucher GOLD25',      NULL, NULL, '2026-07-26 19:00:00', '2026-07-26 20:30:00'),
 (34, NULL, 4, 4, 'dine_in', NULL, 'completed', 'Khách VIP áp voucher VIP30',        NULL, NULL, '2026-07-27 19:00:00', '2026-07-27 20:30:00');

INSERT INTO order_items (id, order_id, menu_item_id, quantity, unit_price, seat_number, course_number, kitchen_note, status, voided_at, void_reason) VALUES
 -- Order 32 (silver, SILVER15): Bò + Cá hồi + Trà đào×2 = sub 580k
 (90, 32,  3, 1, 180000.00, NULL, 1, 'Medium',   'done', NULL, NULL),
 (91, 32,  5, 1, 220000.00, NULL, 1, 'Vừa 200g', 'done', NULL, NULL),
 (92, 32, 10, 2,  35000.00, NULL, 1, NULL,        'done', NULL, NULL),
 -- Order 33 (gold, GOLD25): Lẩu hải sản + Gỏi + Pepsi×2 = sub 640k
 (93, 33,  7, 1, 400000.00, NULL, 1, 'Không cay','done', NULL, NULL),
 (94, 33,  1, 1, 120000.00, NULL, 1, NULL,        'done', NULL, NULL),
 (95, 33,  9, 2,  20000.00, NULL, 1, NULL,        'done', NULL, NULL),
 -- Order 34 (vip, VIP30): Lẩu hải sản + Bò + Trà đào×3 = sub 885k
 (96, 34,  7, 1, 400000.00, NULL, 1, 'Cay vừa',  'done', NULL, NULL),
 (97, 34,  3, 2, 180000.00, NULL, 1, 'Well done', 'done', NULL, NULL),
 (98, 34, 10, 3,  35000.00, NULL, 1, NULL,         'done', NULL, NULL);

-- INVOICES — voucher member tier
-- SILVER15 (15%): sub=580k → dis=87k → net=493k → tax=49.3k → svc=24.65k → total=566,950
-- GOLD25   (25%): sub=640k → dis=160k → net=480k → tax=48k  → svc=24k    → total=552,000
-- VIP30    (30%): sub=885k → dis=265.5k → net=619.5k → tax=61.95k → svc=30.975k → total=712,425
INSERT INTO invoices (id, order_id, parent_invoice_id, subtotal, discount, tax, service_fee, tips, total, voucher_id, status, paid_at, created_by) VALUES
 (28, 32, NULL, 580000.00,  87000.00, 49300.00, 24650.00, 0.00, 566950.00, 4, 'paid', '2026-07-26 13:30:00', 3),
 (29, 33, NULL, 640000.00, 160000.00, 48000.00, 24000.00, 0.00, 552000.00, 5, 'paid', '2026-07-26 20:30:00', 3),
 (30, 34, NULL, 885000.00, 265500.00, 61950.00, 30975.00, 0.00, 712425.00, 6, 'paid', '2026-07-27 20:30:00', 3);

INSERT INTO invoice_items (invoice_id, order_item_id, amount) VALUES
 -- Invoice 28 ← Order 32 (SILVER15)
 (28, 90, 180000.00), (28, 91, 220000.00), (28, 92,  70000.00),
 -- Invoice 29 ← Order 33 (GOLD25)
 (29, 93, 400000.00), (29, 94, 120000.00), (29, 95,  40000.00),
 -- Invoice 30 ← Order 34 (VIP30)
 (30, 96, 400000.00), (30, 97, 360000.00), (30, 98, 105000.00);

INSERT INTO payments (invoice_id, method, amount, note, paid_at) VALUES
 (28, 'momo',  566950.00, 'MoMo — Silver member, SILVER15 giảm 87,000đ (15%)', '2026-07-26 13:30:00'),
 (29, 'card',  552000.00, 'Thẻ Visa — Gold member, GOLD25 giảm 160,000đ (25%)','2026-07-26 20:30:00'),
 (30, 'vnpay', 712425.00, 'VNPay — VIP member, VIP30 giảm 265,500đ (30%)',     '2026-07-27 20:30:00');

-- ============================================================================
--  CẬP NHẬT used_count voucher (SAVE10 × 2, SILVER15 × 1, GOLD25 × 1, VIP30 × 1)
-- ============================================================================
UPDATE vouchers SET used_count = 2 WHERE code = 'SAVE10';
UPDATE vouchers SET used_count = 1 WHERE code = 'SILVER15';
UPDATE vouchers SET used_count = 1 WHERE code = 'GOLD25';
UPDATE vouchers SET used_count = 1 WHERE code = 'VIP30';




