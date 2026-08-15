/**
 * Automated Integration Test Suite for ResManager Table Split & Bill Split Features
 * Executed against live express server at http://localhost:5000 and MySQL database.
 */

const mysql = require('mysql2/promise');

const API_BASE = 'http://localhost:5000/api/v1';
const DB_CONFIG = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'resmanager',
  port: 3306,
};

let dbPool;

async function initDb() {
  dbPool = await mysql.createPool(DB_CONFIG);
}

async function closeDb() {
  if (dbPool) await dbPool.end();
}

async function apiPost(url, body) {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { status: response.status, ok: response.ok, data };
}

async function runTests() {
  console.log("===============================================================================");
  console.log("🚀 STARTING AUTOMATED TABLE SPLIT & BILL SPLIT INTEGRATION TESTS");
  console.log(`⏰ Time: ${new Date().toISOString()} (Asia/Ho_Chi_Minh)`);
  console.log("===============================================================================\n");

  await initDb();

  let passedCount = 0;
  let failedCount = 0;

  async function testCase(name, fn) {
    try {
      console.log(`-------------------------------------------------------------------------------`);
      console.log(`RUNNING: ${name}`);
      await fn();
      console.log(`✅ PASSED: ${name}\n`);
      passedCount++;
    } catch (err) {
      console.error(`❌ FAILED: ${name}`);
      console.error(`   Error details:`, err.message);
      console.log('');
      failedCount++;
    }
  }

  let testTableId;
  let testTableName = "TEST_T_SPLIT_99";
  let testParentOrderId;

  async function cleanupTestData() {
    const [tbls] = await dbPool.query("SELECT id FROM tables WHERE name = ?", [testTableName]);
    if (tbls.length > 0) {
      const tid = tbls[0].id;
      const [orders] = await dbPool.query("SELECT id FROM orders WHERE table_id = ?", [tid]);

      for (const o of orders) {
        await dbPool.query("DELETE FROM order_items WHERE order_id = ?", [o.id]);
        await dbPool.query("DELETE FROM invoices WHERE order_id = ?", [o.id]);
        await dbPool.query("DELETE FROM orders WHERE id = ?", [o.id]);
      }
      await dbPool.query("DELETE FROM table_splits WHERE parent_table_id = ?", [tid]);
      await dbPool.query("DELETE FROM table_split_sessions WHERE parent_table_id = ?", [tid]);
      await dbPool.query("DELETE FROM tables WHERE id = ?", [tid]);
    }
  }

  try {
    await cleanupTestData();

    // Setup: Create test physical table and order with items
    await testCase("SETUP: Create test table and order with items", async () => {
      const [areaRows] = await dbPool.query("SELECT id FROM table_areas LIMIT 1");
      const areaId = areaRows[0]?.id || 1;

      const [resTbl] = await dbPool.query(
        "INSERT INTO tables (area_id, name, capacity, status, row_pos, col_pos) VALUES (?, ?, 8, 'serving', 'A', 99)",
        [areaId, testTableName]
      );
      testTableId = resTbl.insertId;

      const [resOrd] = await dbPool.query(
        "INSERT INTO orders (table_id, created_by, order_type, status, guest_count) VALUES (?, 1, 'dine_in', 'serving', 8)",
        [testTableId]
      );
      testParentOrderId = resOrd.insertId;

      const [menuRows] = await dbPool.query("SELECT id FROM menu_items LIMIT 2");
      const menuId1 = menuRows[0]?.id || 1;
      const menuId2 = menuRows[1]?.id || menuId1;

      // Add items: 1 pending, 1 cooking
      await dbPool.query(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, status) VALUES
         (?, ?, 2, 100000, 'pending'),
         (?, ?, 1, 50000, 'cooking')`,
        [testParentOrderId, menuId1, testParentOrderId, menuId2]
      );
    });

    // Test 1: Kitchen status protection when splitting table
    await testCase("TEST 1: Block transferring cooking/served items to sub-order group 2", async () => {
      const [items] = await dbPool.query("SELECT id, status FROM order_items WHERE order_id = ?", [testParentOrderId]);
      const cookingItem = items.find(i => i.status === 'cooking');

      const payload = {
        groups: [
          { guest_count: 4, item_allocations: [] },
          { guest_count: 4, item_allocations: [{ order_item_id: cookingItem.id, quantity: 1 }] }
        ]
      };

      const res = await apiPost(`${API_BASE}/tables/${testTableId}/split`, payload);
      if (res.status === 400 && res.data.message.includes("không được chuyển sang nhóm khác")) {
        console.log("   --> Received expected rejection:", res.data.message);
      } else {
        throw new Error(`Expected 400 rejection, got status ${res.status}: ${JSON.stringify(res.data)}`);
      }
    });

    // Test 2: Successful Table Split with table_split_sessions & table_splits records
    let splitSessionId;
    let subOrder1Id;
    let subOrder2Id;

    await testCase("TEST 2: Execute valid Table Split into 2 sub-orders (B04:1, B04:2)", async () => {
      const [items] = await dbPool.query("SELECT id, status FROM order_items WHERE order_id = ?", [testParentOrderId]);
      const pendingItem = items.find(i => i.status === 'pending');

      const payload = {
        groups: [
          { guest_count: 4, item_allocations: [{ order_item_id: pendingItem.id, quantity: 1 }] },
          { guest_count: 4, item_allocations: [{ order_item_id: pendingItem.id, quantity: 1 }] }
        ]
      };

      const res = await apiPost(`${API_BASE}/tables/${testTableId}/split`, payload);
      if (!res.ok) throw new Error(`Split failed: ${JSON.stringify(res.data)}`);

      const data = res.data.data;
      splitSessionId = data.splitSessionId;
      subOrder1Id = data.subOrders[0].childOrderId;
      subOrder2Id = data.subOrders[1].childOrderId;

      console.log(`   --> Created Split Session #${splitSessionId}`);
      console.log(`   --> SubOrder 1 (${data.subOrders[0].childLabel}): Order #${subOrder1Id}`);
      console.log(`   --> SubOrder 2 (${data.subOrders[1].childLabel}): Order #${subOrder2Id}`);

      // Verify DB records
      const [sessions] = await dbPool.query("SELECT * FROM table_split_sessions WHERE id = ?", [splitSessionId]);
      if (sessions.length === 0 || sessions[0].status !== 'active') throw new Error("Split session not active");

      const [splits] = await dbPool.query("SELECT * FROM table_splits WHERE split_session_id = ?", [splitSessionId]);
      if (splits.length !== 2) throw new Error("Expected 2 table_splits rows");

      // Verify physical table status remains SERVING
      const [tbl] = await dbPool.query("SELECT status FROM tables WHERE id = ?", [testTableId]);
      if (tbl[0].status !== 'serving') throw new Error("Physical table should remain serving");
    });

    // Test 3: KDS payload verification
    await testCase("TEST 3: Verify KDS ticket payload contains splitLabel", async () => {
      const [kdsItems] = await dbPool.query(
        "SELECT oi.id, o.split_label FROM order_items oi JOIN orders o ON oi.order_id = o.id WHERE o.id IN (?, ?)",
        [subOrder1Id, subOrder2Id]
      );
      console.log("   --> Verified order items split_labels:", kdsItems);
      if (!kdsItems.some(i => i.split_label && i.split_label.includes(testTableName))) {
        throw new Error("Missing split_label in order items");
      }
    });

    // Test 4: Conflict blocking - Active split session blocks Table Merge
    await testCase("TEST 4: Active split session blocks table merge attempt", async () => {
      const [areaRows] = await dbPool.query("SELECT id FROM table_areas LIMIT 1");

      const [resTbl2] = await dbPool.query(
        "INSERT INTO tables (area_id, name, capacity, status, row_pos, col_pos) VALUES (?, 'TEST_DUMMY_2', 4, 'empty', 'A', 98)",
        [areaRows[0]?.id || 1]
      );
      const dummyTableId = resTbl2.insertId;

      try {
        const res = await apiPost(`${API_BASE}/tables/${testTableId}/merge`, { merged_table_ids: [dummyTableId] });
        if (res.status === 400 && res.data.message.includes("Không thể gộp bàn đang có phiên tách bàn")) {
          console.log("   --> Successfully blocked merge:", res.data.message);
        } else {
          throw new Error(`Expected 400 merge block, got status ${res.status}: ${JSON.stringify(res.data)}`);
        }
      } finally {
        await dbPool.query("DELETE FROM tables WHERE id = ?", [dummyTableId]);
      }
    });

    // Test 5: Pay Sub-Order 1 (Partial payment of session) - Table stays SERVING
    await testCase("TEST 5: Payment of Sub-Order 1 completes child order, session stays active, table stays SERVING", async () => {
      const res = await apiPost(`${API_BASE}/invoices/${subOrder1Id}/pay`, {
        paymentMethod: "cash"
      });

      console.log("   --> Sub-Order 1 payment HTTP Status:", res.status);
      if (!res.ok) throw new Error(`Payment 1 failed: ${JSON.stringify(res.data)}`);

      // Verify sub-order 1 order status is completed
      const [ord1] = await dbPool.query("SELECT status FROM orders WHERE id = ?", [subOrder1Id]);
      if (ord1[0].status !== 'completed') throw new Error("Sub-order 1 order status should be completed");

      // Verify table_splits status is paid
      const [sp1] = await dbPool.query("SELECT status FROM table_splits WHERE child_order_id = ?", [subOrder1Id]);
      if (sp1[0].status !== 'paid') throw new Error("Sub-order 1 table_splits status should be paid");

      // Verify split session is STILL active
      const [ss] = await dbPool.query("SELECT status FROM table_split_sessions WHERE id = ?", [splitSessionId]);
      if (ss[0].status !== 'active') throw new Error("Split session should still be active");

      // Verify physical table status is STILL SERVING
      const [tbl] = await dbPool.query("SELECT status FROM tables WHERE id = ?", [testTableId]);
      if (tbl[0].status !== 'serving') throw new Error("Physical table must stay serving while Sub-Order 2 is unpaid");
    });

    // Test 6: Pay Sub-Order 2 (Final payment of session) - Session completes, table released!
    await testCase("TEST 6: Payment of final Sub-Order 2 completes split session and releases physical table", async () => {
      const res = await apiPost(`${API_BASE}/invoices/${subOrder2Id}/pay`, {
        paymentMethod: "cash"
      });

      console.log("   --> Sub-Order 2 payment HTTP Status:", res.status);
      if (!res.ok) throw new Error(`Payment 2 failed: ${JSON.stringify(res.data)}`);

      // Verify sub-order 2 order status is completed
      const [ord2] = await dbPool.query("SELECT status FROM orders WHERE id = ?", [subOrder2Id]);
      if (ord2[0].status !== 'completed') throw new Error("Sub-order 2 order status should be completed");

      // Verify table_splits status is paid
      const [sp2] = await dbPool.query("SELECT status FROM table_splits WHERE child_order_id = ?", [subOrder2Id]);
      if (sp2[0].status !== 'paid') throw new Error("Sub-order 2 table_splits status should be paid");

      // Verify split session is NOW completed!
      const [ss] = await dbPool.query("SELECT status, closed_at FROM table_split_sessions WHERE id = ?", [splitSessionId]);
      if (ss[0].status !== 'completed' || !ss[0].closed_at) throw new Error("Split session should be completed with closed_at timestamp");

      // Verify physical table status is RELEASED (cleaning/empty)
      const [tbl] = await dbPool.query("SELECT status FROM tables WHERE id = ?", [testTableId]);
      console.log("   --> Physical Table final status:", tbl[0].status);
      if (tbl[0].status !== 'cleaning' && tbl[0].status !== 'empty') throw new Error("Physical table should be released (cleaning/empty)");
    });

  } finally {
    await cleanupTestData();
    await closeDb();
  }

  console.log("===============================================================================");
  console.log(`📊 SUMMARY: Total Tests: ${passedCount + failedCount} | PASSED: ${passedCount} | FAILED: ${failedCount}`);
  console.log("===============================================================================");
}

runTests().catch((err) => {
  console.error("Fatal Test Script Error:", err);
  process.exit(1);
});
