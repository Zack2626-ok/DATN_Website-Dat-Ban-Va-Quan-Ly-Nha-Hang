-- ============================================================================
--  ResManager — FULL MYSQL SCHEMA + SEED DATA (v1 COMPLETE)
--  Đồ án tốt nghiệp: Quản lý nhà hàng đa mô hình
--  Engine: MySQL 8.x | utf8mb4 | InnoDB
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
    name        ENUM('admin','manager','waiter','cashier','chef','sales_event') NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (name, description) VALUES
 ('admin',       N'Toàn quyền hệ thống'),
 ('manager',     N'Quản lý thực đơn, báo cáo, nhân sự'),
 ('waiter',      N'Mở bàn, gọi món, chuyển bàn'),
 ('cashier',     N'Thanh toán, áp voucher'),
 ('chef',        N'Xem KDS, cập nhật trạng thái món'),
 ('sales_event', N'Quản lý hợp đồng, đặt tiệc');

CREATE TABLE users (
    id            INT          NOT NULL AUTO_INCREMENT,
    role_id       INT          NOT NULL,
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
    CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- password thật: "123456", hash bcrypt cost 10
INSERT INTO users (role_id, full_name, email, password_hash, phone) VALUES
 (1, N'System Admin',       'admin@gmail.com',   '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000001'),
 (2, N'Restaurant Manager', 'manager@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000002'),
 (4, N'Cashier 1',          'cashier@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000003'),
 (3, N'Waiter 1',           'waiter1@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000004'),
 (3, N'Waiter 2',           'waiter2@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000005'),
 (5, N'Chef 1',             'chef1@gmail.com',   '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000006'),
 (6, N'Sales Event 1',      'sales@gmail.com',   '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000007');

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

INSERT INTO customers (name, phone, email, member_level, loyalty_points) VALUES
 (N'Nguyen Van A', '0911111111', 'a@gmail.com', 'silver', 172),
 (N'Tran Thi B',   '0922222222', 'b@gmail.com', 'gold',   400),
 (N'Le Van C',     '0933333333', 'c@gmail.com', 'silver',  50),
 (N'Pham Thi D',   '0944444444', 'd@gmail.com', 'vip',    500),
 (N'Hoang Van E',  '0955555555', 'e@gmail.com', 'gold',   300);

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
 ('SAVE10',  'percent', 10.00,  500000.00,  100, 1, '2026-12-31 23:59:59', 1),
 ('FIXED50', 'fixed',   50000.00, 1000000.00, 50, 0, '2026-12-31 23:59:59', 1),
 ('NEW20',   'percent', 20.00,  300000.00,  200, 0, '2026-09-30 23:59:59', 1);

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
 (N'Giảm giá khai vị',    N'Giảm 15% cho tất cả món khai vị', 'percent', 15.00, 'promo_khai_vi.jpg',   '2026-06-01 00:00:00', '2026-07-31 23:59:59', 1),
 (N'Tiệc trưa tiết kiệm', N'Tiệc trưa 11h–14h giảm 10%',      'percent', 10.00, 'promo_tiec_trua.jpg', '2026-06-01 00:00:00', '2026-08-31 23:59:59', 1);

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
 (2, '2026-06-23 08:00:00', '2026-06-23 18:00:00', 2000000.00, 2500000.00, N'Ca sáng quản lý'),
 (3, '2026-06-23 10:00:00', '2026-06-23 22:00:00', 1000000.00, 1200000.00, N'Ca chiều thu ngân'),
 (4, '2026-06-23 07:00:00', '2026-06-23 15:00:00', 500000.00,  520000.00,  N'Ca sáng phục vụ'),
 (5, '2026-06-23 15:00:00', NULL,                  500000.00,  NULL,       N'Ca tối phục vụ (chưa đóng)');

CREATE TABLE attendance (
    id          INT       NOT NULL AUTO_INCREMENT,
    employee_id INT       NOT NULL,
    clock_in    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clock_out   DATETIME  DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO attendance (employee_id, clock_in, clock_out) VALUES
 (2, '2026-06-23 07:55:00', '2026-06-23 18:05:00'),
 (3, '2026-06-23 09:58:00', '2026-06-23 22:02:00'),
 (4, '2026-06-23 06:58:00', '2026-06-23 15:02:00'),
 (5, '2026-06-23 14:57:00', NULL),
 (6, '2026-06-23 08:02:00', '2026-06-23 20:00:00'),
 (7, '2026-06-23 08:00:00', '2026-06-23 17:30:00');


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
 (N'Tầng 1'), (N'Tầng 2'), (N'Sân vườn');

CREATE TABLE tables (
    id          INT          NOT NULL AUTO_INCREMENT,
    area_id     INT          NOT NULL,
    name        VARCHAR(20)  NOT NULL,
    capacity    INT          NOT NULL DEFAULT 4,
    row_pos     CHAR(1)      NOT NULL DEFAULT 'A',
    col_pos     TINYINT      NOT NULL DEFAULT 1,
    status      ENUM('empty','reserved','serving','pending_payment') NOT NULL DEFAULT 'empty',
    is_deleted  TINYINT(1)   NOT NULL DEFAULT 0,
    deleted_at  DATETIME     DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_tables_area FOREIGN KEY (area_id) REFERENCES table_areas(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO tables (area_id, name, capacity, row_pos, col_pos, status) VALUES
 (1,'B01',4,'A',1,'empty'),
 (1,'B02',4,'A',2,'empty'),
 (1,'B03',6,'A',3,'reserved'),
 (1,'B04',8,'B',1,'pending_payment'),
 (1,'B05',4,'B',2,'empty'),
 (2,'B06',4,'A',1,'reserved'),
 (2,'B07',6,'A',2,'empty'),
 (2,'B08',8,'A',3,'serving'),
 (2,'B09',10,'B',1,'reserved'),
 (3,'B10',6,'A',1,'empty');

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
    note              TEXT         DEFAULT NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_bookings_code (confirmation_code),
    CONSTRAINT fk_bookings_table     FOREIGN KEY (table_id)    REFERENCES tables(id)     ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_customer  FOREIGN KEY (customer_id) REFERENCES customers(id)  ON DELETE SET NULL,
    CONSTRAINT fk_bookings_promotion FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE SET NULL,
    INDEX idx_bookings_table_time (table_id, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO bookings (table_id, customer_id, promotion_id, guest_name, guest_phone, party_size, start_time, end_time, confirmation_code, status, guest_note, note) VALUES
 (6, 1, 1, N'Nguyen Van A', '0911111111', 4, '2026-06-24 18:00:00', '2026-06-24 21:00:00', 'BK20260624001', 'confirmed', N'Có trẻ em', NULL),
 (3, 2, NULL, N'Tran Thi B', '0922222222', 6, '2026-06-25 19:00:00', '2026-06-25 22:00:00', 'BK20260625001', 'pending', NULL, N'Đặt tiệc sinh nhật'),
 (9, 4, 2, N'Pham Thi D',   '0944444444', 8, '2026-06-26 12:00:00', '2026-06-26 14:00:00', 'BK20260626001', 'confirmed', N'VIP, cần bàn riêng', NULL),
 (7, NULL, NULL, N'Khach Le Tuan', '0966666666', 3, '2026-06-24 20:00:00', '2026-06-24 22:00:00', 'BK20260624002', 'cancelled', NULL, N'Khách huỷ');

CREATE TABLE waitlist (
    id           INT          NOT NULL AUTO_INCREMENT,
    guest_name   VARCHAR(100) NOT NULL,
    party_size   INT          NOT NULL DEFAULT 1,
    phone        VARCHAR(20)  DEFAULT NULL,
    joined_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notified_at  DATETIME     DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO waitlist (guest_name, party_size, phone, joined_at, notified_at) VALUES
 (N'Le Van C',   4, '0933333333', '2026-06-23 18:30:00', NULL),
 (N'Pham Thi D', 2, '0944444444', '2026-06-23 18:45:00', '2026-06-23 19:00:00'),
 (N'Nguyen Minh', 5, '0977777777', '2026-06-23 19:10:00', NULL);

CREATE TABLE table_merges (
    id                INT      NOT NULL AUTO_INCREMENT,
    primary_table_id  INT      NOT NULL,
    merged_table_id   INT      NOT NULL,
    merged_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_merge_primary FOREIGN KEY (primary_table_id) REFERENCES tables(id) ON DELETE CASCADE,
    CONSTRAINT fk_merge_merged  FOREIGN KEY (merged_table_id)  REFERENCES tables(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Không seed dữ liệu mẫu gộp bàn để demo sạch)


CREATE TABLE table_splits (
    id               INT          NOT NULL AUTO_INCREMENT,
    parent_table_id  INT          NOT NULL,
    child_label      VARCHAR(10)  NOT NULL,
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_split_parent FOREIGN KEY (parent_table_id) REFERENCES tables(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- (Không seed dữ liệu mẫu tách bàn để demo sạch)


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
 (N'Khai vị',    1),
 (N'Món chính',  2),
 (N'Lẩu',        3),
 (N'Đồ uống',    4),
 (N'Tráng miệng',5);

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
 (1, N'Gỏi hải sản',      N'Gỏi tôm mực rau thơm sốt chanh',      120000, 'goi.jpg',      'cold_kitchen', 1),
 (1, N'Chả giò',          N'Chả giò nhân thịt heo, chiên giòn',     80000, 'chagio.jpg',   'hot_kitchen',  0),
 (2, N'Bò lúc lắc',       N'Thăn bò xào dầu hào, khoai tây chiên', 180000, 'bo.jpg',       'hot_kitchen',  1),
 (2, N'Gà nướng',         N'Gà nướng mật ong sả tắc',              160000, 'ga.jpg',       'hot_kitchen',  0),
 (2, N'Cá hồi sốt chanh', N'Phi lê cá hồi áp chảo, sốt bơ chanh', 220000, 'cahoi.jpg',    'hot_kitchen',  1),
 (3, N'Lẩu Thái',         N'Lẩu chua cay kiểu Thái',               350000, 'lauthai.jpg',  'hot_kitchen',  0),
 (3, N'Lẩu hải sản',      N'Lẩu hải sản tươi: tôm, mực, nghêu',   400000, 'lauhs.jpg',    'hot_kitchen',  0),
 (4, N'Coca Cola',        N'Lon 330ml',                              20000, 'coca.jpg',     'bar',          0),
 (4, N'Pepsi',            N'Lon 330ml',                              20000, 'pepsi.jpg',    'bar',          0),
 (4, N'Trà đào',          N'Trà đào cam sả, đá viên',               35000, 'tradao.jpg',   'bar',          0),
 (5, N'Kem Vani',         N'Kem vani 2 viên, sốt caramel',          45000, 'kem.jpg',      'cold_kitchen', 0),
 (5, N'Chè thái',         N'Chè thái nhiều màu, nước cốt dừa',      40000, 'che_thai.jpg', 'cold_kitchen', 0);

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
 (3, N'Độ chín',  1, 1, 1),
 (3, N'Đồ kèm',   0, 0, 2),
 (5, N'Kích cỡ',  1, 1, 1),
 (6, N'Mức độ cay', 0, 0, 1),
 (7, N'Mức độ cay', 0, 0, 1);

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
 -- Độ chín (group 1)
 (1, NULL, N'Rare',      0.00),
 (1, NULL, N'Medium',    0.00),
 (1, NULL, N'Well done', 0.00),
 -- Đồ kèm (group 2)
 (2, NULL, N'Khoai tây chiên', 20000.00),
 (2, NULL, N'Salad',           15000.00),
 -- Kích cỡ cá hồi (group 3)
 (3, NULL, N'Nhỏ (150g)',   0.00),
 (3, NULL, N'Vừa (200g)',   50000.00),
 (3, NULL, N'Lớn (250g)',   100000.00),
 -- Mức cay lẩu Thái (group 4) — có 2 cấp
 (4, NULL, N'Không cay',   0.00),
 (4, NULL, N'Cay vừa',     0.00),
 (4, NULL, N'Cay nhiều',   0.00),
 -- Mức cay lẩu hải sản (group 5)
 (5, NULL, N'Không cay',   0.00),
 (5, NULL, N'Cay vừa',     0.00);

CREATE TABLE combos (
    id        INT           NOT NULL AUTO_INCREMENT,
    name      VARCHAR(150)  NOT NULL,
    price     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active TINYINT(1)    NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO combos (name, price, is_active) VALUES
 (N'Combo gia đình', 800000.00, 1),
 (N'Combo cặp đôi',  500000.00, 1),
 (N'Combo nhậu vui', 650000.00, 1);

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
 -- Combo gia đình: chả giò + bò lúc lắc + lẩu Thái + pepsi×2 + chè thái×2
 (1, 2, 1), (1, 3, 1), (1, 6, 1), (1, 9, 2), (1, 12, 2),
 -- Combo cặp đôi: gỏi + cá hồi + trà đào×2 + kem vani×2
 (2, 1, 1), (2, 5, 1), (2, 10, 2), (2, 11, 2),
 -- Combo nhậu vui: chả giò + gà nướng + lẩu hải sản + coca×3
 (3, 2, 1), (3, 4, 1), (3, 7, 1), (3, 8, 3);

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

INSERT INTO orders (table_id, customer_id, created_by, order_type, split_label, status, note, guest_name, guest_phone, created_at, closed_at) VALUES
 (1, 1, 4, 'dine_in',  NULL, 'completed',      N'Khách yêu cầu ít muối', NULL,               NULL,           '2026-06-23 12:00:00', '2026-06-23 13:30:00'),
 (8, NULL, 5, 'dine_in', NULL, 'serving',        NULL,                     N'Nguyễn Văn Bình', '0912345678',   '2026-06-23 18:15:00', NULL),
 (4, 3, 4, 'dine_in',  NULL, 'pending_payment', NULL,                     NULL,               NULL,           '2026-06-23 19:00:00', NULL),
 (4, NULL, 4, 'dine_in', NULL, 'pending_payment', NULL,                   N'Lê Thị C',        '0933333333',   '2026-06-23 19:00:00', NULL),
 (NULL, NULL, 4, 'takeaway', NULL, 'completed',   N'Mang về',               NULL,               NULL,           '2026-06-23 11:00:00', '2026-06-23 11:20:00');


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
    is_held       TINYINT(1)   NOT NULL DEFAULT 0,
    voided_at     DATETIME      DEFAULT NULL,
    void_reason   VARCHAR(255)  DEFAULT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_orderitems_order FOREIGN KEY (order_id)     REFERENCES orders(id)     ON DELETE CASCADE,
    CONSTRAINT fk_orderitems_menu  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT,
    INDEX idx_orderitems_station (order_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, seat_number, course_number, kitchen_note, status) VALUES
 -- Order 1 (completed, bàn B01, khách 1)
 (1, 1, 2, 120000.00, NULL, 1, NULL,              'done'),
 (1, 3, 2, 180000.00, 1,    2, N'Medium, ít muối','done'),
 (1, 9, 2,  20000.00, NULL, 3, NULL,              'done'),
 (1,12, 2,  40000.00, NULL, 4, NULL,              'done'),
 -- Order 2 (serving, bàn B08)
 (2, 2, 1,  80000.00, NULL, 1, NULL,             'cooking'),
 (2, 4, 1, 160000.00, NULL, 2, NULL,             'pending'),
 (2,10, 2,  35000.00, NULL, 1, NULL,             'done'),
 -- Order 3 (pending_payment, bàn B04 nhóm 4:1)
 (3, 3, 1, 180000.00, 1, 1, N'Well done',        'done'),
 (3, 5, 1, 220000.00, 2, 1, N'Vừa (200g)',       'done'),
 (3, 8, 2,  20000.00, NULL,2, NULL,              'done'),
 -- Order 4 (pending_payment, bàn B04 nhóm 4:2)
 (4, 4, 1, 160000.00, 3, 1, NULL,                'done'),
 (4, 6, 1, 350000.00, NULL,1, N'Cay vừa',        'done'),
 (4,12, 2,  40000.00, NULL,2, NULL,              'done'),
 -- Order 5 (takeaway completed)
 (5, 2, 2,  80000.00, NULL, 1, NULL,             'done'),
 (5,11, 1,  45000.00, NULL, 1, NULL,             'done');

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
 -- Order 1 items (id 1–4)
 (1, 'pending', 'cooking', 6, '2026-06-23 12:05:00'),
 (1, 'cooking', 'done',    6, '2026-06-23 12:20:00'),
 (2, 'pending', 'cooking', 6, '2026-06-23 12:10:00'),
 (2, 'cooking', 'done',    6, '2026-06-23 12:35:00'),
 (3, 'pending', 'done',    6, '2026-06-23 12:06:00'),
 (4, 'pending', 'done',    6, '2026-06-23 13:00:00'),
 -- Order 2 items (id 5–7)
 (5, 'pending', 'cooking', 6, '2026-06-23 18:20:00'),
 (7, 'pending', 'done',    6, '2026-06-23 18:18:00'),
 -- Order 3 items (id 8–10)
 (8, 'pending', 'cooking', 6, '2026-06-23 19:10:00'),
 (8, 'cooking', 'done',    6, '2026-06-23 19:30:00'),
 (9, 'pending', 'cooking', 6, '2026-06-23 19:10:00'),
 (9, 'cooking', 'done',    6, '2026-06-23 19:35:00'),
 (10,'pending', 'done',    6, '2026-06-23 19:08:00'),
 -- Order 4 items (id 11–13)
 (11,'pending', 'cooking', 6, '2026-06-23 19:12:00'),
 (11,'cooking', 'done',    6, '2026-06-23 19:40:00'),
 (12,'pending', 'cooking', 6, '2026-06-23 19:12:00'),
 (12,'cooking', 'done',    6, '2026-06-23 19:50:00'),
 (13,'pending', 'done',    6, '2026-06-23 20:10:00'),
 -- Order 5 items (id 14–15)
 (14,'pending', 'cooking', 6, '2026-06-23 11:03:00'),
 (14,'cooking', 'done',    6, '2026-06-23 11:15:00'),
 (15,'pending', 'done',    6, '2026-06-23 11:05:00');


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
 (N'Công ty TNHH Thực phẩm ABC', '0987654321', N'123 Đường ABC, Quận 1, TP.HCM',  0.00),
 (N'Nhà phân phối Hải sản XYZ',  '0912345678', N'456 Đường XYZ, Quận 3, TP.HCM',  0.00),
 (N'Công ty Nông sản Việt',      '0901234567', N'789 Đường DEF, Quận 5, TP.HCM',  0.00);

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
 (N'Thịt bò',   'kg',  47.500, 10.000),
 (N'Thịt gà',   'kg',  39.700,  8.000),
 (N'Cá hồi',    'kg',  20.000,  5.000),
 (N'Tôm',       'kg',  29.600, 10.000),
 (N'Rau sống',  'kg',  24.750,  8.000),
 (N'Gạo',       'kg', 100.000, 30.000),
 (N'Nước mắm',  'lit', 20.000,  5.000),
 (N'Dầu ăn',   'lit',  15.000,  3.000),
 (N'Trái cây',  'kg',  15.000,  5.000),
 (N'Bột mì',    'kg',  30.000, 10.000);

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
 -- 1: Gỏi hải sản → tôm + rau
 (1,  4, 0.2000), (1,  5, 0.1000),
 -- 2: Chả giò → bột mì + dầu ăn
 (2, 10, 0.1500), (2,  8, 0.0500),
 -- 3: Bò lúc lắc → thịt bò + rau
 (3,  1, 0.2500), (3,  5, 0.0500),
 -- 4: Gà nướng → thịt gà
 (4,  2, 0.3000),
 -- 5: Cá hồi sốt chanh → cá hồi + rau
 (5,  3, 0.2000), (5,  5, 0.0500),
 -- 6: Lẩu Thái → thịt bò + thịt gà + tôm
 (6,  1, 0.3000), (6,  2, 0.2000), (6,  4, 0.2000),
 -- 7: Lẩu hải sản → tôm + rau
 (7,  4, 0.5000), (7,  5, 0.3000),
 -- 8: Coca Cola (không có nguyên liệu kho — bỏ qua / để trống)
 -- 9: Pepsi (tương tự)
 -- 10: Trà đào → trái cây
 (10, 9, 0.1500),
 -- 11: Kem Vani → trái cây (ẩn dụ cho nguyên liệu kem)
 (11, 9, 0.1000),
 -- 12: Chè thái → trái cây + bột mì
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
 (1, 50.000, 250000.00, 1, N'Nhập hàng tháng 6', 2, '2026-06-01 08:00:00'),
 (2, 40.000, 120000.00, 1, N'Nhập hàng tháng 6', 2, '2026-06-01 08:00:00'),
 (3, 20.000, 400000.00, 2, N'Nhập hàng tháng 6', 2, '2026-06-01 08:30:00'),
 (4, 30.000, 180000.00, 2, N'Nhập hàng tháng 6', 2, '2026-06-01 08:30:00'),
 (5, 25.000,  30000.00, 3, N'Nhập hàng tháng 6', 2, '2026-06-01 09:00:00'),
 (6,100.000,  20000.00, 3, N'Nhập gạo tháng 6',  2, '2026-06-01 09:00:00'),
 (9, 15.000,  80000.00, 3, N'Nhập trái cây',      2, '2026-06-10 09:00:00'),
 (10,30.000,  25000.00, 3, N'Nhập bột mì',        2, '2026-06-10 09:00:00');

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
 (1, 2.500, 'sale_deduction', NULL, N'Trừ kho bán hàng order #1 & #3', NULL, '2026-06-23 13:30:00'),
 (2, 0.300, 'sale_deduction', NULL, N'Trừ kho bán hàng order #4',       NULL, '2026-06-23 20:00:00'),
 (3, 0.200, 'sale_deduction', NULL, N'Trừ kho bán hàng order #3',       NULL, '2026-06-23 20:00:00'),
 (4, 0.900, 'sale_deduction', NULL, N'Trừ kho bán hàng order #1,3,4',   NULL, '2026-06-23 20:00:00'),
 (5, 0.250, 'waste',          NULL, N'Rau sống hư không dùng được',      2,   '2026-06-23 07:30:00'),
 (8, 0.050, 'internal_use',   NULL, N'Dùng nội bộ vệ sinh bếp',          2,   '2026-06-23 08:00:00');

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
 (1, 47.500, 47.500, '2026-06-23', 2),
 (2, 39.700, 39.700, '2026-06-23', 2),
 (3, 20.000, 20.000, '2026-06-23', 2),
 (4, 29.600, 29.600, '2026-06-23', 2),
 (5, 24.750, 24.850, '2026-06-23', 2),   -- hao hụt 0.1kg
 (6,100.000,100.000, '2026-06-23', 2),
 (9, 15.000, 15.000, '2026-06-23', 2),
 (10,30.000, 30.000, '2026-06-23', 2);


-- ============================================================================
--  MODULE 5 — THANH TOÁN & CHIA HOÁ ĐƠN
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

-- Invoice 1: Order 1 hoàn thành, dùng voucher SAVE10 (10%)
-- subtotal = (120k×2)+(180k×2)+(20k×2)+(40k×2) = 720,000
-- discount = 72,000 (10%), tax = 64,800 (10% của sau giảm), service_fee = 32,400 (5%), total = 645,200
INSERT INTO invoices (order_id, parent_invoice_id, subtotal, discount, tax, service_fee, tips, total, voucher_id, status, paid_at, created_by) VALUES
 (1, NULL, 720000.00, 72000.00, 64800.00, 32400.00, 0.00,   745200.00, 1, 'paid',  '2026-06-23 13:30:00', 3),
-- Invoice 2&3: Order 3 tách bill (nhóm 4:1) — parent = NULL, 2 invoices con
 (3, NULL, 620000.00, 0.00,     62000.00, 31000.00, 0.00,   713000.00, NULL, 'draft', NULL, 3),
-- Invoice 4: Order 4 tách bill (nhóm 4:2)
 (4, NULL, 630000.00, 0.00,     63000.00, 31500.00, 50000.00, 774500.00, NULL, 'draft', NULL, 3),
-- Invoice 5: Order 5 (takeaway)
 (5, NULL, 205000.00, 0.00,     20500.00, 0.00,     0.00,   225500.00, NULL, 'paid',  '2026-06-23 11:20:00', 3);

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
 -- Invoice 1 ← order_items 1–4
 (1, 1, 240000.00),
 (1, 2, 360000.00),
 (1, 3,  40000.00),
 (1, 4,  80000.00),
 -- Invoice 2 ← order_items 8–10 (order 3)
 (2, 8,  180000.00),
 (2, 9,  220000.00),
 (2,10,   40000.00),
 -- Invoice 3 ← order_items 11–13 (order 4)
 (3,11,  160000.00),
 (3,12,  350000.00),
 (3,13,   80000.00),
 -- Invoice 4 ← order_items 14–15 (order 5)
 (4,14,  160000.00),
 (4,15,   45000.00);

CREATE TABLE payments (
    id          INT           NOT NULL AUTO_INCREMENT,
    invoice_id  INT           NOT NULL,
    method      ENUM('cash','bank_transfer','card','momo','vnpay') NOT NULL,
    amount      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    note        VARCHAR(255)  DEFAULT NULL,
    paid_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_payments_invoice FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO payments (invoice_id, method, amount, note, paid_at) VALUES
 (1, 'cash',          745200.00, N'Thanh toán tiền mặt',       '2026-06-23 13:30:00'),
 (4, 'momo',          225500.00, N'Thanh toán MoMo mang về',   '2026-06-23 11:20:00');


-- ============================================================================
--  MODULE 8 — QUẢN LÝ SỰ KIỆN & TIỆC
-- ============================================================================

CREATE TABLE halls (
    id          INT          NOT NULL AUTO_INCREMENT,
    name        VARCHAR(150) NOT NULL,
    capacity    INT          NOT NULL DEFAULT 100,
    description TEXT         DEFAULT NULL,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO halls (name, capacity, description) VALUES
 (N'Sảnh Hoa Hồng', 150, N'Sảnh tiệc cưới chính, có sân khấu và phòng tân lang'),
 (N'Sảnh Hoa Mai',   80, N'Sảnh nhỏ cho tiệc công ty, sinh nhật, hội nghị');

CREATE TABLE event_packages (
    id               INT           NOT NULL AUTO_INCREMENT,
    name             VARCHAR(150)  NOT NULL,
    price_per_person DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    description      TEXT          DEFAULT NULL,
    is_active        TINYINT(1)    NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO event_packages (name, price_per_person, description, is_active) VALUES
 (N'Gói tiệc cưới cơ bản', 1500000.00, N'Tiệc cưới đủ món, tráng miệng, nước uống', 1),
 (N'Gói tiệc công ty',      800000.00, N'Gói tiệc hội nghị, buffet trưa/tối',        1),
 (N'Gói sinh nhật VIP',    1200000.00, N'Sinh nhật sang trọng, bánh kem, trang trí', 1);

CREATE TABLE event_package_items (
    id           INT NOT NULL AUTO_INCREMENT,
    package_id   INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity     INT NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    CONSTRAINT fk_pkgitem_package FOREIGN KEY (package_id)   REFERENCES event_packages(id) ON DELETE CASCADE,
    CONSTRAINT fk_pkgitem_menu    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)     ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO event_package_items (package_id, menu_item_id, quantity) VALUES
 -- Gói cưới: gỏi + bò + cá hồi + chè thái
 (1, 1, 1), (1, 3, 1), (1, 5, 1), (1, 12, 1),
 -- Gói công ty: chả giò + gà nướng + kem vani
 (2, 2, 1), (2, 4, 1), (2, 11, 1),
 -- Gói sinh nhật: gỏi + lẩu Thái + chè thái×2
 (3, 1, 1), (3, 6, 1), (3, 12, 2);

CREATE TABLE event_contracts (
    id             INT           NOT NULL AUTO_INCREMENT,
    hall_id        INT           NOT NULL,
    customer_id    INT           DEFAULT NULL,
    package_id     INT           DEFAULT NULL,
    contact_name   VARCHAR(100)  NOT NULL,
    contact_phone  VARCHAR(20)   NOT NULL,
    event_date     DATE          NOT NULL,
    guest_count    INT           NOT NULL DEFAULT 0,
    table_count    INT           NOT NULL DEFAULT 0,
    total_amount   DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    deposit_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    remaining      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status         ENUM('draft','confirmed','completed','cancelled') NOT NULL DEFAULT 'draft',
    note           TEXT          DEFAULT NULL,
    created_by     INT           NOT NULL,
    created_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_contract_hall     FOREIGN KEY (hall_id)     REFERENCES halls(id)          ON DELETE RESTRICT,
    CONSTRAINT fk_contract_customer FOREIGN KEY (customer_id) REFERENCES customers(id)      ON DELETE SET NULL,
    CONSTRAINT fk_contract_package  FOREIGN KEY (package_id)  REFERENCES event_packages(id) ON DELETE SET NULL,
    CONSTRAINT fk_contract_user     FOREIGN KEY (created_by)  REFERENCES users(id)          ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO event_contracts (hall_id, customer_id, package_id, contact_name, contact_phone, event_date, guest_count, table_count, total_amount, deposit_amount, remaining, status, note, created_by) VALUES
 (1, 1, 1, N'Nguyen Van A', '0911111111', '2026-07-15', 150, 15, 225000000.00, 67500000.00, 157500000.00, 'confirmed', N'Tiệc cưới, yêu cầu hoa hồng trắng', 7),
 (2, 3, 2, N'Le Van C',     '0933333333', '2026-08-20',  80,  8,  64000000.00, 19200000.00,  44800000.00, 'draft',     N'Hội nghị công ty, cần máy chiếu',   7),
 (1, 5, 3, N'Hoang Van E',  '0955555555', '2026-09-10',  50,  5,  60000000.00, 18000000.00,  42000000.00, 'confirmed', N'Sinh nhật VIP tháng 9',             7);

CREATE TABLE hall_bookings (
    id          INT      NOT NULL AUTO_INCREMENT,
    hall_id     INT      NOT NULL,
    contract_id INT      DEFAULT NULL,
    event_date  DATE     NOT NULL,
    start_time  TIME     NOT NULL,
    end_time    TIME     NOT NULL,
    status      ENUM('tentative','confirmed','cancelled') NOT NULL DEFAULT 'tentative',
    PRIMARY KEY (id),
    CONSTRAINT fk_hallbooking_hall     FOREIGN KEY (hall_id)     REFERENCES halls(id)           ON DELETE RESTRICT,
    CONSTRAINT fk_hallbooking_contract FOREIGN KEY (contract_id) REFERENCES event_contracts(id) ON DELETE SET NULL,
    INDEX idx_hallbooking_date (hall_id, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO hall_bookings (hall_id, contract_id, event_date, start_time, end_time, status) VALUES
 (1, 1, '2026-07-15', '16:00:00', '22:00:00', 'confirmed'),
 (2, 2, '2026-08-20', '08:00:00', '17:00:00', 'tentative'),
 (1, 3, '2026-09-10', '17:00:00', '22:00:00', 'confirmed');

CREATE TABLE event_deposits (
    id          INT           NOT NULL AUTO_INCREMENT,
    contract_id INT           NOT NULL,
    amount      DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    method      ENUM('cash','bank_transfer','card') NOT NULL,
    note        VARCHAR(255)  DEFAULT NULL,
    paid_at     DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_deposit_contract FOREIGN KEY (contract_id) REFERENCES event_contracts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO event_deposits (contract_id, amount, method, note, paid_at) VALUES
 (1, 67500000.00, 'bank_transfer', N'Đặt cọc 30% tiệc cưới',     '2026-06-20 10:30:00'),
 (3, 18000000.00, 'cash',          N'Đặt cọc 30% sinh nhật VIP',  '2026-06-22 15:00:00');

CREATE TABLE event_timelines (
    id          INT          NOT NULL AUTO_INCREMENT,
    contract_id INT          NOT NULL,
    time        TIME         NOT NULL,
    activity    VARCHAR(255) NOT NULL,
    note        TEXT         DEFAULT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    CONSTRAINT fk_timeline_contract FOREIGN KEY (contract_id) REFERENCES event_contracts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO event_timelines (contract_id, time, activity, note, sort_order) VALUES
 -- Tiệc cưới (contract 1)
 (1, '16:00:00', N'Khách đến, chụp ảnh đón khách', NULL, 1),
 (1, '17:00:00', N'Lễ cưới tại sân khấu',          NULL, 2),
 (1, '18:00:00', N'Khai tiệc, phục vụ khai vị',    NULL, 3),
 (1, '19:00:00', N'Phục vụ món chính',              NULL, 4),
 (1, '20:30:00', N'Cắt bánh cưới, tráng miệng',    NULL, 5),
 (1, '21:30:00', N'Kết thúc tiệc',                 NULL, 6),
 -- Sinh nhật VIP (contract 3)
 (3, '17:00:00', N'Khách đến',                     NULL, 1),
 (3, '17:30:00', N'Khai tiệc, khai vị',            NULL, 2),
 (3, '18:30:00', N'Món chính',                     NULL, 3),
 (3, '20:00:00', N'Cắt bánh sinh nhật',            NULL, 4),
 (3, '21:30:00', N'Kết thúc',                      NULL, 5);


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
-- ============================================================================
INSERT INTO loyalty_transactions (customer_id, points, type, ref_invoice_id, note, created_at) VALUES
 -- Khách 1: earn từ invoice #1 (745,200 / 10,000 ≈ 74 điểm) + earn lịch sử → tổng 172
 (1,  74, 'earn',   1,    N'Tích điểm hóa đơn #1 ngày 23/06',     '2026-06-23 13:30:00'),
 (1,  98, 'earn',   NULL, N'Tích điểm tích lũy các lần trước',     '2026-05-01 12:00:00'),
 -- Khách 2: earn + redeem → tổng 400
 (2, 250, 'earn',   NULL, N'Tích điểm lịch sử',                    '2026-04-10 20:00:00'),
 (2, 200, 'earn',   NULL, N'Tích điểm tiệc sinh nhật tháng 5',     '2026-05-10 20:00:00'),
 (2,  50, 'redeem', NULL, N'Đổi điểm giảm giá đơn hàng 01/06',    '2026-06-01 12:00:00'),
 -- Khách 3: earn → tổng 50
 (3,  50, 'earn',   NULL, N'Tích điểm lần đầu đặt bàn',            '2026-04-15 19:00:00'),
 -- Khách 4: earn → tổng 500
 (4, 300, 'earn',   NULL, N'Tích điểm sự kiện VIP tháng 3',        '2026-03-20 18:00:00'),
 (4, 200, 'earn',   NULL, N'Tích điểm tiệc công ty tháng 5',       '2026-05-05 20:00:00'),
 -- Khách 5: earn → tổng 300
 (5, 300, 'earn',   NULL, N'Tích điểm tích lũy',                   '2026-04-01 18:00:00');

-- ============================================================================
--  CẬP NHẬT used_count voucher sau khi đã dùng
-- ============================================================================
UPDATE vouchers SET used_count = 1 WHERE code = 'SAVE10';