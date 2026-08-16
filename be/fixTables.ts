import * as mysql from 'mysql2/promise';

(async () => {
  try {
    const db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '123456',
      database: 'resmanager'
    });
    
    const [result] = await db.query(`
      UPDATE tables 
      SET status = 'empty' 
      WHERE status IN ('serving', 'pending_payment', 'cleaning') 
      AND id NOT IN (
        SELECT table_id FROM orders 
        WHERE status IN ('open', 'serving', 'pending_payment') 
        AND table_id IS NOT NULL
      )
      AND id NOT IN (
        SELECT parent_table_id FROM table_splits WHERE status = 'active'
      )
    `);
    
    console.log('Fixed', (result as any).affectedRows, 'tables');
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
