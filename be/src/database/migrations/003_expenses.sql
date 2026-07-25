-- ============================================================================
--  MIGRATION 003 — Chi phí vận hành (lương, mặt bằng, điện nước...)
--  Bổ sung cho báo cáo tài chính vì schema gốc chỉ có chi phí nhập kho (stock_in),
--  chưa có nơi lưu các khoản chi vận hành khác.
-- ============================================================================

CREATE TABLE IF NOT EXISTS expenses (
    id            INT           NOT NULL AUTO_INCREMENT,
    category      VARCHAR(100)  NOT NULL,
    description   VARCHAR(255)  DEFAULT NULL,
    amount        DECIMAL(15,2) NOT NULL,
    expense_date  DATE          NOT NULL,
    created_by    INT           DEFAULT NULL,
    created_at    DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    CONSTRAINT fk_expenses_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_expenses_date ON expenses (expense_date);