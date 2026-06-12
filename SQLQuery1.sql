-- ============================================================================
--  ResManager — FULL MYSQL SCHEMA (v1)
--  Đồ án tốt nghiệp: Quản lý nhà hàng đa mô hình
--  Mô hình: Nhà hàng ngồi tại bàn + Sự kiện/Tiệc
--  Engine: MySQL 8.x | utf8mb4 | InnoDB
--
--  Quy ước chung:
--   - Số tiền        -> DECIMAL(10,2) / (12,2)
--   - Số lượng kho    -> DECIMAL(10,3)
--   - Trạng thái cố định -> ENUM
--   - Cờ boolean      -> TINYINT(1) DEFAULT 0
--   - Soft delete     -> is_deleted TINYINT(1) DEFAULT 0, deleted_at DATETIME DEFAULT NULL
--   - Optional FK     -> DEFAULT NULL
-- ============================================================================

CREATE DATABASE IF NOT EXISTS resmanager
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE resmanager;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================================================
--  MODULE 6 — AUTH / RBAC / CRM & NHÂN SỰ  (làm trước tiên)
-- ============================================================================

-- ---------- roles ----------
CREATE TABLE roles (
    id          INT          NOT NULL AUTO_INCREMENT,
    name        ENUM('admin','manager','waiter','cashier','chef','sales_event')
                              NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO roles (name, description) VALUES
 ('admin',        N'Toàn quyền hệ thống'),
 ('manager',      N'Quản lý thực đơn, báo cáo, nhân sự'),
 ('waiter',       N'Mở bàn, gọi món, chuyển bàn'),
 ('cashier',      N'Thanh toán, áp voucher'),
 ('chef',         N'Xem KDS, cập nhật trạng thái món'),
 ('sales_event',  N'Quản lý hợp đồng, đặt tiệc');

-- ---------- users (nhân viên nội bộ) ----------
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

-- ---------- customers (khách hàng / web public) ----------
CREATE TABLE customers (
    id              INT          NOT NULL AUTO_INCREMENT,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(150) DEFAULT NULL,
    phone           VARCHAR(20)  DEFAULT NULL,
    password_hash   VARCHAR(255) DEFAULT NULL,    -- NULL = khách vãng lai chưa đăng ký
    member_level    ENUM('bronze','silver','gold','vip') NOT NULL DEFAULT 'bronze',
    loyalty_points  INT          NOT NULL DEFAULT 0,
    is_deleted      TINYINT(1)   NOT NULL DEFAULT 0,
    deleted_at      DATETIME     DEFAULT NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_customers_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- loyalty_transactions (tính năng 53, 54) ----------
CREATE TABLE loyalty_transactions (
    id              INT          NOT NULL AUTO_INCREMENT,
    customer_id     INT          NOT NULL,
    points          INT          NOT NULL,         -- (+) earn, (-) redeem
    type            ENUM('earn','redeem') NOT NULL,
    ref_invoice_id  INT          DEFAULT NULL,
    note            VARCHAR(255) DEFAULT NULL,
    created_at      DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_loyalty_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- vouchers (tính năng 55) ----------
CREATE TABLE vouchers (
    id          INT           NOT NULL AUTO_INCREMENT,
    code        VARCHAR(50)   NOT NULL,
    type        ENUM('percent','fixed') NOT NULL,
    value       DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    min_order   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    max_uses    INT           DEFAULT NULL,        -- NULL = không giới hạn
    used_count  INT           NOT NULL DEFAULT 0,
    expired_at  DATETIME      DEFAULT NULL,
    is_active   TINYINT(1)    NOT NULL DEFAULT 1,
    created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_vouchers_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- promotions (Module 0 — trang web khách) ----------
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

-- ---------- shifts (tính năng 59) ----------
CREATE TABLE shifts (
    id          INT           NOT NULL AUTO_INCREMENT,
    employee_id INT           NOT NULL,
    start_time  DATETIME      NOT NULL,
    end_time    DATETIME      DEFAULT NULL,        -- NULL = ca chưa đóng
    cash_open   DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    cash_close  DECIMAL(10,2) DEFAULT NULL,
    note        TEXT          DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_shifts_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- attendance (tính năng 58) ----------
CREATE TABLE attendance (
    id          INT       NOT NULL AUTO_INCREMENT,
    employee_id INT       NOT NULL,
    clock_in    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP,
    clock_out   DATETIME  DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_attendance_employee FOREIGN KEY (employee_id) REFERENCES users(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
--  MODULE 1 — TIỀN SẢNH & SƠ ĐỒ BÀN
-- ============================================================================

-- ---------- table_areas ----------
CREATE TABLE table_areas (
    id        INT          NOT NULL AUTO_INCREMENT,
    name      VARCHAR(100) NOT NULL,
    is_active TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO table_areas (name) VALUES (N'Tầng 1'), (N'Tầng 2'), (N'Sân vườn');

-- ---------- tables ----------
CREATE TABLE tables (
    id          INT          NOT NULL AUTO_INCREMENT,
    area_id     INT          NOT NULL,
    name        VARCHAR(20)  NOT NULL,
    capacity    INT          NOT NULL DEFAULT 4,
    row_pos     CHAR(1)      NOT NULL DEFAULT 'A',   -- toạ độ hàng cho sơ đồ dạng lưới
    col_pos     TINYINT      NOT NULL DEFAULT 1,     -- toạ độ cột
    status      ENUM('empty','reserved','serving','pending_payment')
                             NOT NULL DEFAULT 'empty',
    is_deleted  TINYINT(1)   NOT NULL DEFAULT 0,
    deleted_at  DATETIME     DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_tables_area FOREIGN KEY (area_id) REFERENCES table_areas(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- bookings ----------
CREATE TABLE bookings (
    id                INT          NOT NULL AUTO_INCREMENT,
    table_id          INT          NOT NULL,
    customer_id       INT          DEFAULT NULL,     -- NULL = khách vãng lai
    promotion_id      INT          DEFAULT NULL,
    guest_name        VARCHAR(100) NOT NULL,
    guest_phone       VARCHAR(20)  NOT NULL,
    party_size        INT          NOT NULL DEFAULT 1,
    start_time        DATETIME     NOT NULL,
    end_time          DATETIME     NOT NULL,
    confirmation_code VARCHAR(20)  NOT NULL,
    status            ENUM('pending','confirmed','cancelled','completed')
                                   NOT NULL DEFAULT 'pending',
    guest_note        TEXT         DEFAULT NULL,
    note              TEXT         DEFAULT NULL,
    created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_bookings_code (confirmation_code),
    CONSTRAINT fk_bookings_table      FOREIGN KEY (table_id)     REFERENCES tables(id)     ON DELETE RESTRICT,
    CONSTRAINT fk_bookings_customer   FOREIGN KEY (customer_id)  REFERENCES customers(id)  ON DELETE SET NULL,
    CONSTRAINT fk_bookings_promotion  FOREIGN KEY (promotion_id) REFERENCES promotions(id) ON DELETE SET NULL,
    -- chống đặt trùng: index hỗ trợ query overlap (tính năng 9)
    INDEX idx_bookings_table_time (table_id, start_time, end_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- waitlist (tính năng 10) ----------
CREATE TABLE waitlist (
    id           INT          NOT NULL AUTO_INCREMENT,
    guest_name   VARCHAR(100) NOT NULL,
    party_size   INT          NOT NULL DEFAULT 1,
    phone        VARCHAR(20)  DEFAULT NULL,
    joined_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    notified_at  DATETIME     DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- table_merges (tính năng 5) ----------
CREATE TABLE table_merges (
    id                INT      NOT NULL AUTO_INCREMENT,
    primary_table_id  INT      NOT NULL,
    merged_table_id   INT      NOT NULL,
    merged_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_merge_primary FOREIGN KEY (primary_table_id) REFERENCES tables(id) ON DELETE CASCADE,
    CONSTRAINT fk_merge_merged  FOREIGN KEY (merged_table_id)  REFERENCES tables(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- table_splits (tính năng 6) ----------
CREATE TABLE table_splits (
    id               INT          NOT NULL AUTO_INCREMENT,
    parent_table_id  INT          NOT NULL,
    child_label      VARCHAR(10)  NOT NULL,   -- ví dụ '6:1', '6:2'
    created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_split_parent FOREIGN KEY (parent_table_id) REFERENCES tables(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
--  MODULE 2 — THỰC ĐƠN & GỌI MÓN
-- ============================================================================

-- ---------- categories ----------
CREATE TABLE categories (
    id         INT          NOT NULL AUTO_INCREMENT,
    name       VARCHAR(100) NOT NULL,
    sort_order INT          NOT NULL DEFAULT 0,
    is_active  TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- menu_items ----------
CREATE TABLE menu_items (
    id              INT           NOT NULL AUTO_INCREMENT,
    category_id     INT           NOT NULL,
    name            VARCHAR(150)  NOT NULL,
    description     TEXT          DEFAULT NULL,
    price           DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    image_url       VARCHAR(255)  DEFAULT NULL,
    kitchen_station ENUM('hot_kitchen','bar','cold_kitchen') NOT NULL DEFAULT 'hot_kitchen',
    is_featured     TINYINT(1)    NOT NULL DEFAULT 0,   -- hiển thị trang chủ (W1)
    is_active       TINYINT(1)    NOT NULL DEFAULT 1,
    is_deleted      TINYINT(1)    NOT NULL DEFAULT 0,
    deleted_at      DATETIME      DEFAULT NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_menuitems_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- modifier_groups (tính năng 14) ----------
CREATE TABLE modifier_groups (
    id           INT          NOT NULL AUTO_INCREMENT,
    menu_item_id INT          NOT NULL,
    name         VARCHAR(100) NOT NULL,        -- ví dụ "Kích cỡ", "Độ cay"
    is_required  TINYINT(1)   NOT NULL DEFAULT 0,
    min_select   INT          NOT NULL DEFAULT 0,
    max_select   INT          NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    CONSTRAINT fk_modgroup_item FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- modifiers (tính năng 15 — lồng nhau 2 cấp) ----------
CREATE TABLE modifiers (
    id                 INT          NOT NULL AUTO_INCREMENT,
    group_id           INT          NOT NULL,
    parent_modifier_id INT          DEFAULT NULL,  -- NULL = cấp 1, có giá trị = cấp 2 (lồng nhau)
    name               VARCHAR(100) NOT NULL,
    extra_price        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (id),
    CONSTRAINT fk_modifier_group  FOREIGN KEY (group_id)           REFERENCES modifier_groups(id) ON DELETE CASCADE,
    CONSTRAINT fk_modifier_parent FOREIGN KEY (parent_modifier_id) REFERENCES modifiers(id)        ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- combos (tính năng 16) ----------
CREATE TABLE combos (
    id        INT           NOT NULL AUTO_INCREMENT,
    name      VARCHAR(150)  NOT NULL,
    price     DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active TINYINT(1)    NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE combo_items (
    id           INT NOT NULL AUTO_INCREMENT,
    combo_id     INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity     INT NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    CONSTRAINT fk_comboitem_combo FOREIGN KEY (combo_id)     REFERENCES combos(id)     ON DELETE CASCADE,
    CONSTRAINT fk_comboitem_menu  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- orders (bảng trung tâm — dùng chung TV1 & TV2) ----------
CREATE TABLE orders (
    id          INT          NOT NULL AUTO_INCREMENT,
    table_id    INT          DEFAULT NULL,   -- NULL = takeaway
    customer_id INT          DEFAULT NULL,   -- NULL = khách vãng lai
    created_by  INT          NOT NULL,       -- nhân viên mở order
    order_type  ENUM('dine_in','takeaway','delivery') NOT NULL DEFAULT 'dine_in',
    split_label VARCHAR(10)  DEFAULT NULL,   -- tách bàn: '6:1', '6:2'
    status      ENUM('open','serving','pending_payment','completed','cancelled')
                             NOT NULL DEFAULT 'open',
    note        TEXT         DEFAULT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    closed_at   DATETIME     DEFAULT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_orders_table    FOREIGN KEY (table_id)    REFERENCES tables(id)    ON DELETE SET NULL,
    CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
    CONSTRAINT fk_orders_user     FOREIGN KEY (created_by)  REFERENCES users(id)     ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- order_items ----------
CREATE TABLE order_items (
    id            INT           NOT NULL AUTO_INCREMENT,
    order_id      INT           NOT NULL,
    menu_item_id  INT           NOT NULL,
    quantity      INT           NOT NULL DEFAULT 1,
    unit_price    DECIMAL(10,2) NOT NULL,        -- snapshot giá lúc gọi món
    seat_number   TINYINT       DEFAULT NULL,
    course_number INT           NOT NULL DEFAULT 1,
    kitchen_note  TEXT          DEFAULT NULL,
    status        ENUM('pending','cooking','done','cancelled','voided')
                                NOT NULL DEFAULT 'pending',
    voided_at     DATETIME      DEFAULT NULL,
    void_reason   VARCHAR(255)  DEFAULT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_orderitems_order FOREIGN KEY (order_id)     REFERENCES orders(id)     ON DELETE CASCADE,
    CONSTRAINT fk_orderitems_menu  FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE RESTRICT,
    INDEX idx_orderitems_station (order_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- order_item_status_log (KDS lịch sử — Module 3) ----------
CREATE TABLE order_item_status_log (
    id            INT      NOT NULL AUTO_INCREMENT,
    order_item_id INT      NOT NULL,
    from_status   VARCHAR(50) DEFAULT NULL,
    to_status     VARCHAR(50) NOT NULL,
    changed_by    INT      DEFAULT NULL,
    changed_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_itemlog_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_itemlog_user FOREIGN KEY (changed_by)    REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================================
--  MODULE 4 — KHO & ĐỊNH MỨC
-- ============================================================================

-- ---------- suppliers (tính năng 40) ----------
CREATE TABLE suppliers (
    id         INT           NOT NULL AUTO_INCREMENT,
    name       VARCHAR(150)  NOT NULL,
    phone      VARCHAR(20)   DEFAULT NULL,
    address    VARCHAR(255)  DEFAULT NULL,
    total_debt DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- ingredients (tính năng 31) ----------
CREATE TABLE ingredients (
    id           INT           NOT NULL AUTO_INCREMENT,
    name         VARCHAR(150)  NOT NULL,
    unit         VARCHAR(20)   NOT NULL,        -- 'kg','lit','g','ml'...
    current_stock DECIMAL(10,3) NOT NULL DEFAULT 0.000,
    min_stock    DECIMAL(10,3)  NOT NULL DEFAULT 0.000,
    is_deleted   TINYINT(1)    NOT NULL DEFAULT 0,
    deleted_at   DATETIME      DEFAULT NULL,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- recipes / recipe_items (tính năng 32 — BOM) ----------
CREATE TABLE recipes (
    id           INT NOT NULL AUTO_INCREMENT,
    menu_item_id INT NOT NULL,
    PRIMARY KEY (id),
    UNIQUE KEY uq_recipes_menuitem (menu_item_id),
    CONSTRAINT fk_recipe_menuitem FOREIGN KEY (menu_item_id) REFERENCES menu_items(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE recipe_items (
    id            INT            NOT NULL AUTO_INCREMENT,
    recipe_id     INT            NOT NULL,
    ingredient_id INT            NOT NULL,
    quantity      DECIMAL(10,4)  NOT NULL,   -- lượng tiêu hao / 1 phần
    PRIMARY KEY (id),
    UNIQUE KEY uk_recipe_ingredient (recipe_id, ingredient_id),  -- chống trùng nguyên liệu trong 1 công thức
    CONSTRAINT fk_recipeitem_recipe     FOREIGN KEY (recipe_id)     REFERENCES recipes(id)     ON DELETE CASCADE,
    CONSTRAINT fk_recipeitem_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- stock_in (tính năng 35) ----------
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

-- ---------- stock_out (tính năng 36) ----------
CREATE TABLE stock_out (
    id            INT           NOT NULL AUTO_INCREMENT,
    ingredient_id INT           NOT NULL,
    quantity      DECIMAL(10,3) NOT NULL,
    reason        ENUM('waste','internal_use','expired','sale_deduction','other')
                                NOT NULL DEFAULT 'other',
    ref_invoice_id INT          DEFAULT NULL,   -- liên kết khi trừ kho do bán hàng (tính năng 33)
    note          TEXT          DEFAULT NULL,
    created_by    INT           DEFAULT NULL,   -- NULL nếu hệ thống tự trừ
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_stockout_ingredient FOREIGN KEY (ingredient_id) REFERENCES ingredients(id) ON DELETE RESTRICT,
    CONSTRAINT fk_stockout_user       FOREIGN KEY (created_by)    REFERENCES users(id)       ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- stock_inventory (tính năng 37, 38 — kiểm kê & hao hụt) ----------
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


-- ============================================================================
--  MODULE 5 — THANH TOÁN & CHIA HOÁ ĐƠN
-- ============================================================================

-- ---------- invoices ----------
CREATE TABLE invoices (
    id               INT           NOT NULL AUTO_INCREMENT,
    order_id         INT           NOT NULL,
    parent_invoice_id INT          DEFAULT NULL,   -- dùng cho tách bill (42,43) / gộp bill (46)
    subtotal         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount         DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax              DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    service_fee      DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tips             DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    total            DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    voucher_id       INT           DEFAULT NULL,
    status           ENUM('draft','paid','refunded') NOT NULL DEFAULT 'draft',
    paid_at          DATETIME      DEFAULT NULL,
    created_by       INT           NOT NULL,
    created_at       DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_invoices_order   FOREIGN KEY (order_id)         REFERENCES orders(id)   ON DELETE RESTRICT,
    CONSTRAINT fk_invoices_parent  FOREIGN KEY (parent_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoices_voucher FOREIGN KEY (voucher_id)       REFERENCES vouchers(id) ON DELETE SET NULL,
    CONSTRAINT fk_invoices_user    FOREIGN KEY (created_by)       REFERENCES users(id)    ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- invoice_items (tách bill theo món — tính năng 42, 43) ----------
CREATE TABLE invoice_items (
    id            INT           NOT NULL AUTO_INCREMENT,
    invoice_id    INT           NOT NULL,
    order_item_id INT           NOT NULL,
    amount        DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    PRIMARY KEY (id),
    CONSTRAINT fk_invoiceitems_invoice FOREIGN KEY (invoice_id)    REFERENCES invoices(id)    ON DELETE CASCADE,
    CONSTRAINT fk_invoiceitems_item    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- payments ----------
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


-- ============================================================================
--  MODULE 8 — QUẢN LÝ SỰ KIỆN & TIỆC
-- ============================================================================

-- ---------- halls (tính năng 71) ----------
CREATE TABLE halls (
    id          INT          NOT NULL AUTO_INCREMENT,
    name        VARCHAR(150) NOT NULL,
    capacity    INT          NOT NULL DEFAULT 100,
    description TEXT         DEFAULT NULL,
    is_active   TINYINT(1)   NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- event_packages (tính năng 77) ----------
CREATE TABLE event_packages (
    id              INT           NOT NULL AUTO_INCREMENT,
    name            VARCHAR(150)  NOT NULL,
    price_per_person DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    description     TEXT          DEFAULT NULL,
    is_active       TINYINT(1)    NOT NULL DEFAULT 1,
    PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE event_package_items (
    id           INT NOT NULL AUTO_INCREMENT,
    package_id   INT NOT NULL,
    menu_item_id INT NOT NULL,
    quantity     INT NOT NULL DEFAULT 1,
    PRIMARY KEY (id),
    CONSTRAINT fk_pkgitem_package FOREIGN KEY (package_id)   REFERENCES event_packages(id) ON DELETE CASCADE,
    CONSTRAINT fk_pkgitem_menu    FOREIGN KEY (menu_item_id) REFERENCES menu_items(id)     ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- event_contracts (tính năng 75) ----------
CREATE TABLE event_contracts (
    id              INT           NOT NULL AUTO_INCREMENT,
    hall_id         INT           NOT NULL,
    customer_id     INT           DEFAULT NULL,
    package_id      INT           DEFAULT NULL,
    contact_name    VARCHAR(100)  NOT NULL,
    contact_phone   VARCHAR(20)   NOT NULL,
    event_date      DATE          NOT NULL,
    guest_count     INT           NOT NULL DEFAULT 0,
    table_count     INT           NOT NULL DEFAULT 0,
    total_amount    DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    deposit_amount  DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    remaining       DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status          ENUM('draft','confirmed','completed','cancelled') NOT NULL DEFAULT 'draft',
    note            TEXT          DEFAULT NULL,
    created_by      INT           NOT NULL,
    created_at      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_contract_hall     FOREIGN KEY (hall_id)     REFERENCES halls(id)         ON DELETE RESTRICT,
    CONSTRAINT fk_contract_customer FOREIGN KEY (customer_id) REFERENCES customers(id)     ON DELETE SET NULL,
    CONSTRAINT fk_contract_package  FOREIGN KEY (package_id)  REFERENCES event_packages(id) ON DELETE SET NULL,
    CONSTRAINT fk_contract_user     FOREIGN KEY (created_by)  REFERENCES users(id)         ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------- hall_bookings (tính năng 72, 73 — chống double-book) ----------
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

-- ---------- event_deposits (tính năng 76) ----------
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

-- ---------- event_timelines (tính năng 79) ----------
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


SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
--  BỔ SUNG FK CHO CÁC CỘT THAM CHIẾU invoices (TẠO SAU invoices)
-- ============================================================================
ALTER TABLE loyalty_transactions
  ADD CONSTRAINT fk_loyalty_invoice FOREIGN KEY (ref_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;

ALTER TABLE stock_out
  ADD CONSTRAINT fk_stockout_invoice FOREIGN KEY (ref_invoice_id) REFERENCES invoices(id) ON DELETE SET NULL;


-- ============================================================================
--  SEED DATA MẪU (đã hash sẵn — mật khẩu thật là "123456")
--  Hash bcrypt thật, generate bằng bcryptjs (cost 10)
-- ============================================================================

INSERT INTO users (role_id, full_name, email, password_hash, phone) VALUES
 (1, N'System Admin',     'admin@gmail.com',    '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000001'),
 (2, N'Restaurant Manager','manager@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000002'),
 (4, N'Cashier 1',         'cashier@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000003'),
 (3, N'Waiter 1',          'waiter1@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000004'),
 (3, N'Waiter 2',          'waiter2@gmail.com', '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000005'),
 (5, N'Chef 1',            'chef1@gmail.com',   '$2b$10$XhEJ5WeSSOWqHdLJqOsYY.0JDp01.jVQYk7jXp4/MvE3iK57lgiTa', '0900000006');

INSERT INTO customers (name, phone, email, member_level, loyalty_points) VALUES
 (N'Nguyen Van A', '0911111111', 'a@gmail.com', 'silver', 100),
 (N'Tran Thi B',   '0922222222', 'b@gmail.com', 'gold',   250),
 (N'Le Van C',     '0933333333', 'c@gmail.com', 'silver',  50),
 (N'Pham Thi D',   '0944444444', 'd@gmail.com', 'vip',    500),
 (N'Hoang Van E',  '0955555555', 'e@gmail.com', 'gold',   300);

INSERT INTO tables (area_id, name, capacity, row_pos, col_pos) VALUES
 (1,'B01',4,'A',1), (1,'B02',4,'A',2), (1,'B03',6,'A',3),
 (1,'B04',8,'B',1), (1,'B05',4,'B',2),
 (2,'B06',4,'A',1), (2,'B07',6,'A',2), (2,'B08',8,'A',3), (2,'B09',10,'B',1),
 (3,'B10',6,'A',1);

INSERT INTO categories (name, sort_order) VALUES
 (N'Khai vị',1), (N'Món chính',2), (N'Lẩu',3), (N'Đồ uống',4), (N'Tráng miệng',5);

INSERT INTO menu_items (category_id, name, price, image_url, kitchen_station, is_featured) VALUES
 (1, N'Gỏi hải sản',        120000, 'goi.jpg',    'cold_kitchen', 1),
 (1, N'Chả giò',             80000, 'chagio.jpg', 'hot_kitchen',  0),
 (2, N'Bò lúc lắc',         180000, 'bo.jpg',     'hot_kitchen',  1),
 (2, N'Gà nướng',           160000, 'ga.jpg',     'hot_kitchen',  0),
 (2, N'Cá hồi sốt chanh',   220000, 'cahoi.jpg',  'hot_kitchen',  1),
 (3, N'Lẩu Thái',           350000, 'lauthai.jpg','hot_kitchen',  0),
 (3, N'Lẩu hải sản',        400000, 'lauhs.jpg',  'hot_kitchen',  0),
 (4, N'Coca Cola',           20000, 'coca.jpg',   'bar',          0),
 (4, N'Pepsi',               20000, 'pepsi.jpg',  'bar',          0),
 (4, N'Trà đào',             35000, 'tradao.jpg', 'bar',          0),
 (5, N'Kem Vani',            45000, 'kem.jpg',    'cold_kitchen', 0);

INSERT INTO halls (name, capacity, description) VALUES
 (N'Sảnh Hoa Hồng', 150, N'Sảnh tiệc cưới chính, có sân khấu'),
 (N'Sảnh Hoa Mai',  80,  N'Sảnh nhỏ cho tiệc công ty/sinh nhật');