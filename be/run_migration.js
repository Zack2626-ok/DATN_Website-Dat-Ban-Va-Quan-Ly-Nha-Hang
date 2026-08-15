const mysql = require('mysql2/promise');

const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'resmanager',
  port: 3306,
};

async function runMigration() {
  console.log("🚀 Recreating table_splits and table_split_sessions with full schema...");
  const conn = await mysql.createConnection(DB_CONFIG);

  try {
    await conn.query(`DROP TABLE IF EXISTS invoice_item_splits`);
    await conn.query(`DROP TABLE IF EXISTS table_splits`);
    await conn.query(`DROP TABLE IF EXISTS table_split_sessions`);

    await conn.query(`
      CREATE TABLE table_split_sessions (
        id INT NOT NULL AUTO_INCREMENT,
        parent_table_id INT NOT NULL,
        parent_order_id INT NOT NULL,
        status ENUM('active', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME NULL,
        PRIMARY KEY (id),
        INDEX idx_split_sessions_table (parent_table_id),
        INDEX idx_split_sessions_order (parent_order_id),
        INDEX idx_split_sessions_status (status),
        CONSTRAINT fk_split_session_table FOREIGN KEY (parent_table_id) REFERENCES tables(id) ON DELETE RESTRICT,
        CONSTRAINT fk_split_session_order FOREIGN KEY (parent_order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Recreated table_split_sessions");

    await conn.query(`
      CREATE TABLE table_splits (
        id INT NOT NULL AUTO_INCREMENT,
        split_session_id INT NOT NULL,
        parent_table_id INT NOT NULL,
        parent_order_id INT NOT NULL,
        child_order_id INT NOT NULL,
        child_label VARCHAR(100) NOT NULL,
        guest_count INT NOT NULL DEFAULT 1,
        status ENUM('active', 'paid', 'cancelled') NOT NULL DEFAULT 'active',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        closed_at DATETIME NULL,
        PRIMARY KEY (id),
        INDEX idx_splits_session (split_session_id),
        INDEX idx_splits_parent_table (parent_table_id),
        INDEX idx_splits_parent_order (parent_order_id),
        INDEX idx_splits_child_order (child_order_id),
        INDEX idx_splits_status (status),
        CONSTRAINT fk_splits_session FOREIGN KEY (split_session_id) REFERENCES table_split_sessions(id) ON DELETE CASCADE,
        CONSTRAINT fk_splits_parent_table FOREIGN KEY (parent_table_id) REFERENCES tables(id) ON DELETE RESTRICT,
        CONSTRAINT fk_splits_parent_order FOREIGN KEY (parent_order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_splits_child_order FOREIGN KEY (child_order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Recreated table_splits");

    await conn.query(`
      CREATE TABLE invoice_item_splits (
        id INT NOT NULL AUTO_INCREMENT,
        parent_invoice_id INT NOT NULL,
        child_invoice_id INT NOT NULL,
        order_item_id INT NOT NULL,
        quantity INT NOT NULL,
        amount DECIMAL(12,2) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        INDEX idx_item_splits_parent (parent_invoice_id),
        INDEX idx_item_splits_child (child_invoice_id),
        INDEX idx_item_splits_order_item (order_item_id),
        CONSTRAINT fk_item_splits_parent FOREIGN KEY (parent_invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        CONSTRAINT fk_item_splits_child FOREIGN KEY (child_invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
        CONSTRAINT fk_item_splits_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log("✅ Recreated invoice_item_splits");

  } finally {
    await conn.end();
  }
}

runMigration().catch(console.error);
