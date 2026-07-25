-- ============================================================================
--  MIGRATION 002 — RBAC: Ma trận phân quyền theo hành động (Admin actor)
--  Chạy sau SQLQuery1.sql. An toàn để chạy lại nhiều lần (dùng IF NOT EXISTS /
--  INSERT ... ON DUPLICATE KEY UPDATE).
-- ============================================================================

CREATE TABLE IF NOT EXISTS permissions (
    id          INT          NOT NULL AUTO_INCREMENT,
    `key`       VARCHAR(50)  NOT NULL,
    name        VARCHAR(150) NOT NULL,
    description VARCHAR(255) DEFAULT NULL,
    sort_order  INT          NOT NULL DEFAULT 0,
    PRIMARY KEY (id),
    UNIQUE KEY uq_permissions_key (`key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS role_permissions (
    id            INT       NOT NULL AUTO_INCREMENT,
    role_id       INT       NOT NULL,
    permission_id INT       NOT NULL,
    is_allowed    TINYINT(1) NOT NULL DEFAULT 0,
    updated_at    DATETIME  NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_role_permission (role_id, permission_id),
    CONSTRAINT fk_rp_role       FOREIGN KEY (role_id)       REFERENCES roles(id)       ON DELETE CASCADE,
    CONSTRAINT fk_rp_permission FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Danh sách quyền mặc định (khớp với ma trận từng hiển thị ở FE trước đây)
INSERT INTO permissions (`key`, name, description, sort_order) VALUES
 ('refund',       N'Hoàn tiền đơn hàng',     N'Cho phép hoàn tiền toàn bộ hoặc một phần đơn hàng', 1),
 ('cancel_item',  N'Hủy món trong đơn',      N'Cho phép xóa món khỏi đơn hàng đã tạo',              2),
 ('financials',   N'Xem báo cáo tài chính',  N'Truy cập báo cáo doanh thu và lợi nhuận',            3),
 ('menu',         N'Quản lý thực đơn',       N'Thêm, sửa, xóa món ăn và giá cả',                    4),
 ('staff',        N'Quản lý nhân viên',      N'Thêm, sửa, xóa tài khoản nhân viên',                 5),
 ('inventory',    N'Quản lý tồn kho',        N'Nhập xuất kho, kiểm kê nguyên liệu',                 6),
 ('discount',     N'Áp dụng giảm giá',       N'Cho phép giảm giá đơn hàng',                         7),
 ('split',        N'Tách hóa đơn',           N'Chia bill cho nhiều người',                          8),
 ('edit_closed',  N'Sửa đơn đã đóng',        N'Chỉnh sửa đơn hàng đã thanh toán',                   9)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description);

-- Ma trận mặc định: role_id tra theo bảng roles (1=admin,2=manager,3=waiter,4=cashier,5=chef,6=sales_event)
INSERT INTO role_permissions (role_id, permission_id, is_allowed)
SELECT r.id, p.id, v.is_allowed
FROM (
  SELECT 'admin' AS role_name, 'refund' AS perm_key, 1 AS is_allowed
  UNION ALL SELECT 'admin','cancel_item',1
  UNION ALL SELECT 'admin','financials',1
  UNION ALL SELECT 'admin','menu',1
  UNION ALL SELECT 'admin','staff',1
  UNION ALL SELECT 'admin','inventory',1
  UNION ALL SELECT 'admin','discount',1
  UNION ALL SELECT 'admin','split',1
  UNION ALL SELECT 'admin','edit_closed',1

  UNION ALL SELECT 'manager','refund',1
  UNION ALL SELECT 'manager','cancel_item',1
  UNION ALL SELECT 'manager','financials',1
  UNION ALL SELECT 'manager','menu',1
  UNION ALL SELECT 'manager','staff',1
  UNION ALL SELECT 'manager','inventory',1
  UNION ALL SELECT 'manager','discount',1
  UNION ALL SELECT 'manager','split',1
  UNION ALL SELECT 'manager','edit_closed',0

  UNION ALL SELECT 'cashier','refund',0
  UNION ALL SELECT 'cashier','cancel_item',1
  UNION ALL SELECT 'cashier','financials',0
  UNION ALL SELECT 'cashier','menu',0
  UNION ALL SELECT 'cashier','staff',0
  UNION ALL SELECT 'cashier','inventory',0
  UNION ALL SELECT 'cashier','discount',1
  UNION ALL SELECT 'cashier','split',1
  UNION ALL SELECT 'cashier','edit_closed',0

  UNION ALL SELECT 'chef','refund',0
  UNION ALL SELECT 'chef','cancel_item',0
  UNION ALL SELECT 'chef','financials',0
  UNION ALL SELECT 'chef','menu',0
  UNION ALL SELECT 'chef','staff',0
  UNION ALL SELECT 'chef','inventory',1
  UNION ALL SELECT 'chef','discount',0
  UNION ALL SELECT 'chef','split',0
  UNION ALL SELECT 'chef','edit_closed',0

  UNION ALL SELECT 'waiter','refund',0
  UNION ALL SELECT 'waiter','cancel_item',0
  UNION ALL SELECT 'waiter','financials',0
  UNION ALL SELECT 'waiter','menu',0
  UNION ALL SELECT 'waiter','staff',0
  UNION ALL SELECT 'waiter','inventory',0
  UNION ALL SELECT 'waiter','discount',0
  UNION ALL SELECT 'waiter','split',0
  UNION ALL SELECT 'waiter','edit_closed',0
) v
JOIN roles r ON r.name = v.role_name
JOIN permissions p ON p.`key` = v.perm_key
ON DUPLICATE KEY UPDATE is_allowed = VALUES(is_allowed);