const { query } = require('./dist/utils/db');

async function testFinance() {
  const rows = await query(`
    SELECT si.id, si.batch_code, si.quantity, si.unit_cost, si.note, si.created_at,
      CASE 
        WHEN (si.note LIKE '%Cân bằng kho%' OR si.note LIKE '%hàng thừa%' OR si.batch_code LIKE 'LOT-ADJ-%') THEN 'income'
        ELSE 'expense'
      END as type
    FROM stock_in si
    WHERE si.note LIKE '%Cân bằng kho%' OR si.batch_code LIKE 'LOT-ADJ-%'
    ORDER BY si.id DESC
  `);
  console.log("Stock_in surplus adjustments:", JSON.stringify(rows, null, 2));
  process.exit(0);
}

testFinance();
