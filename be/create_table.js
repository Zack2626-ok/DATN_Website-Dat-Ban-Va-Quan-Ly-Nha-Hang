const mysql = require('mysql2/promise');
require('dotenv').config({path: '.env'});

async function run() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '123456',
    database: process.env.DB_NAME || 'resmanager'
  });
  await pool.query(`CREATE TABLE IF NOT EXISTS table_sessions (
    id VARCHAR(50) PRIMARY KEY,
    table_id INT NOT NULL,
    session_token VARCHAR(255) NOT NULL,
    status ENUM('active', 'closed') DEFAULT 'active',
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (table_id) REFERENCES tables(id) ON DELETE CASCADE
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`);
  console.log('Created table_sessions');
  process.exit(0);
}
run();
