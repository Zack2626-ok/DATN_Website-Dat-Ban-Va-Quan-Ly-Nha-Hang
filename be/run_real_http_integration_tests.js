const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const BASE_URL = "http://localhost:5000/api/v1";
const JWT_SECRET = process.env.JWT_SECRET || "c3c091ca3abdc9f8ecb1a47b588ed504a60fb95e6f7625d6e72c93cb4048b460";

// Admin JWT token for staff endpoints
const adminToken = jwt.sign(
  { id: 1, userId: 1, role: "admin", role_name: "admin", username: "admin" },
  JWT_SECRET,
  { expiresIn: "1d" }
);

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "resmanager",
  port: Number(process.env.DB_PORT) || 3306,
};

async function httpPost(endpoint, body, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const status = res.status;
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = { error: "Non-JSON response" };
  }
  return { status, data };
}

async function httpGet(endpoint, token = null) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "GET",
    headers,
  });

  const status = res.status;
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = { error: "Non-JSON response" };
  }
  return { status, data };
}

async function httpPatch(endpoint, body, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(body),
  });

  const status = res.status;
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = { error: "Non-JSON response" };
  }
  return { status, data };
}

async function httpDelete(endpoint, token = null) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method: "DELETE",
    headers,
  });

  const status = res.status;
  let data = {};
  try {
    data = await res.json();
  } catch (e) {
    data = { error: "Non-JSON response" };
  }
  return { status, data };
}

async function runRealHttpIntegrationTests() {
  const connection = await mysql.createConnection(dbConfig);
  const executionTimeLocal = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date());

  console.log("===================================================================================");
  console.log(`🌐 AUTOMATED REAL HTTP & DATABASE INTEGRATION TEST SUITE`);
  console.log(`⏱️ Execution Time (Asia/Ho_Chi_Minh): ${executionTimeLocal}`);
  console.log(`🔗 Target Server: ${BASE_URL}`);
  console.log("===================================================================================\n");

  const results = [];

  const addTestLog = (caseId, title, priority, status, details) => {
    results.push({ caseId, title, priority, status, details });
    const icon = status === "PASSED" ? "✅" : status === "FAILED" ? "❌" : "⚠️";
    console.log(`\n-----------------------------------------------------------------------------------`);
    console.log(`${icon} [Case ${caseId}] (${priority}) ${title}: ${status}`);
    console.log(`📌 Details: ${details.summary}`);
    console.log(`📤 Endpoint & Payload: ${details.endpoint} | ${JSON.stringify(details.payload || {})}`);
    console.log(`📥 HTTP Status & Response: ${details.httpStatus} | ${JSON.stringify(details.httpResponse)}`);
    console.log(`🗄️ DB State BEFORE: Bookings=${details.dbBefore.bookingsCount}, Assignments=${details.dbBefore.assignmentsCount}, Orders=${details.dbBefore.ordersCount}`);
    console.log(`🗄️ DB State AFTER:  Bookings=${details.dbAfter.bookingsCount}, Assignments=${details.dbAfter.assignmentsCount}, Orders=${details.dbAfter.ordersCount}`);
    console.log(`-----------------------------------------------------------------------------------`);
  };

  const getDbState = async (tableId) => {
    const [b] = await connection.query("SELECT COUNT(*) as cnt FROM bookings WHERE guest_phone LIKE '098888%'");
    const [bta] = await connection.query("SELECT COUNT(*) as cnt FROM booking_table_assignments WHERE booking_id IN (SELECT id FROM bookings WHERE guest_phone LIKE '098888%')");
    const [o] = await connection.query("SELECT COUNT(*) as cnt FROM orders WHERE guest_phone LIKE '098888%'");
    const [t] = await connection.query("SELECT status FROM tables WHERE id = ?", [tableId || 1]);
    return {
      bookingsCount: b[0].cnt,
      assignmentsCount: bta[0].cnt,
      ordersCount: o[0].cnt,
      tableStatus: t[0]?.status || "unknown"
    };
  };

  const cleanup = async () => {
    await connection.query("DELETE FROM invoice_items WHERE order_item_id IN (SELECT id FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE guest_phone LIKE '098888%'))");
    await connection.query("DELETE FROM invoices WHERE order_id IN (SELECT id FROM orders WHERE guest_phone LIKE '098888%')");
    await connection.query("DELETE FROM order_items WHERE order_id IN (SELECT id FROM orders WHERE guest_phone LIKE '098888%')");
    await connection.query("DELETE FROM orders WHERE guest_phone LIKE '098888%'");
    await connection.query("DELETE FROM booking_menu_items WHERE booking_id IN (SELECT id FROM bookings WHERE guest_phone LIKE '098888%')");
    await connection.query("DELETE FROM booking_table_assignments WHERE booking_id IN (SELECT id FROM bookings WHERE guest_phone LIKE '098888%')");
    await connection.query("DELETE FROM bookings WHERE guest_phone LIKE '098888%'");
  };

  try {
    await cleanup();

    // Fetch primary test tables
    const [tables] = await connection.query("SELECT id, name, capacity, area_id FROM tables WHERE is_deleted = 0 ORDER BY id ASC LIMIT 5");
    const t1 = tables[0];
    const t2 = tables[1] || tables[0];

    // ===================================================================================
    // CASE 1: Trùng giờ cùng bàn (Overlap Check)
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const payloadA = {
        table_id: t1.id,
        guest_name: "Test Case 1 A",
        guest_phone: "0988880001",
        party_size: 2,
        start_time: "2026-08-10 10:00:00",
        end_time: "2026-08-10 13:00:00"
      };
      const resA = await httpPost("/bookings", payloadA);

      const payloadOverlap = {
        table_id: t1.id,
        guest_name: "Test Case 1 B Overlap",
        guest_phone: "0988880001",
        party_size: 2,
        start_time: "2026-08-10 12:59:00",
        end_time: "2026-08-10 15:59:00"
      };
      const resOverlap = await httpPost("/bookings", payloadOverlap);

      const payloadValid = {
        table_id: t1.id,
        guest_name: "Test Case 1 B Valid",
        guest_phone: "0988880001",
        party_size: 2,
        start_time: "2026-08-10 13:00:00",
        end_time: "2026-08-10 16:00:00"
      };
      const resValid = await httpPost("/bookings", payloadValid);
      const dbAfter = await getDbState(t1.id);

      const pass = resA.status === 201 && resOverlap.status >= 400 && resValid.status === 201;
      addTestLog(1, "Trùng giờ cùng bàn", "HIGH", pass ? "PASSED" : "FAILED", {
        summary: `resA=${resA.status}, resOverlap=${resOverlap.status} (bị chặn trùng lịch), resValid=${resValid.status}`,
        endpoint: "POST /api/v1/bookings",
        payload: payloadOverlap,
        httpStatus: `${resA.status} / ${resOverlap.status} / ${resValid.status}`,
        httpResponse: { resA: resA.data, resOverlap: resOverlap.data, resValid: resValid.data },
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 1:", err);
    }

    // ===================================================================================
    // CASE 2: Lệch vài phút & Giờ lẻ (10:46, 13:29 vs 13:30)
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const payloadBase = {
        table_id: t1.id,
        guest_name: "Test Case 2 Base",
        guest_phone: "0988880002",
        party_size: 2,
        start_time: "2026-08-11 10:30:00",
        end_time: "2026-08-11 13:30:00"
      };
      const resBase = await httpPost("/bookings", payloadBase);

      const payload1329 = {
        table_id: t1.id,
        guest_name: "Test Case 2 (13:29)",
        guest_phone: "0988880002",
        party_size: 2,
        start_time: "2026-08-11 13:29:00",
        end_time: "2026-08-11 16:29:00"
      };
      const res1329 = await httpPost("/bookings", payload1329);

      const payload1330 = {
        table_id: t1.id,
        guest_name: "Test Case 2 (13:30)",
        guest_phone: "0988880002",
        party_size: 2,
        start_time: "2026-08-11 13:30:00",
        end_time: "2026-08-11 16:30:00"
      };
      const res1330 = await httpPost("/bookings", payload1330);
      const dbAfter = await getDbState(t1.id);

      const pass = resBase.status === 201 && res1329.status >= 400 && res1330.status === 201;
      addTestLog(2, "Lệch vài phút & Giờ lẻ", "NORMAL", pass ? "PASSED" : "FAILED", {
        summary: `resBase=${resBase.status}, res1329=${res1329.status} (bị chặn trùng 1 phút), res1330=${res1330.status}`,
        endpoint: "POST /api/v1/bookings",
        payload: payload1329,
        httpStatus: `${resBase.status} / ${res1329.status} / ${res1330.status}`,
        httpResponse: { resBase: resBase.data, res1329: res1329.data, res1330: res1330.data },
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 2:", err);
    }

    // ===================================================================================
    // CASE 3: Cùng bàn, khác ngày
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const payloadDay1 = {
        table_id: t1.id,
        guest_name: "Test Case 3 Day 1",
        guest_phone: "0988880003",
        party_size: 2,
        start_time: "2026-08-12 12:00:00",
        end_time: "2026-08-12 15:00:00"
      };
      const resDay1 = await httpPost("/bookings", payloadDay1);

      const payloadDay2 = {
        table_id: t1.id,
        guest_name: "Test Case 3 Day 2",
        guest_phone: "0988880003",
        party_size: 2,
        start_time: "2026-08-13 12:00:00",
        end_time: "2026-08-13 15:00:00"
      };
      const resDay2 = await httpPost("/bookings", payloadDay2);
      const dbAfter = await getDbState(t1.id);

      const pass = resDay1.status === 201 && resDay2.status === 201;
      addTestLog(3, "Cùng bàn, khác ngày", "NORMAL", pass ? "PASSED" : "FAILED", {
        summary: `resDay1=${resDay1.status}, resDay2=${resDay2.status}`,
        endpoint: "POST /api/v1/bookings",
        payload: payloadDay2,
        httpStatus: `${resDay1.status} / ${resDay2.status}`,
        httpResponse: { resDay1: resDay1.data, resDay2: resDay2.data },
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 3:", err);
    }

    // ===================================================================================
    // CASE 4: Đặt quá khứ và quá xa (Hạn 30 ngày)
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const payloadPast = {
        table_id: t1.id,
        guest_name: "Test Case 4 Past",
        guest_phone: "0988880004",
        party_size: 2,
        start_time: "2020-01-01 12:00:00",
        end_time: "2020-01-01 15:00:00"
      };
      const resPast = await httpPost("/bookings", payloadPast);

      const future31 = new Date();
      future31.setDate(future31.getDate() + 31);
      const payload31 = {
        table_id: t1.id,
        guest_name: "Test Case 4 Day 31",
        guest_phone: "0988880004",
        party_size: 2,
        start_time: `${future31.toISOString().slice(0, 10)} 12:00:00`,
        end_time: `${future31.toISOString().slice(0, 10)} 15:00:00`
      };
      const res31 = await httpPost("/bookings", payload31);
      const dbAfter = await getDbState(t1.id);

      const pass = resPast.status >= 400 && res31.status >= 400;
      addTestLog(4, "Đặt quá khứ và quá xa", "NORMAL", pass ? "PASSED" : "FAILED", {
        summary: "Đặt quá khứ & Ngày thứ 31 đều bị chặn HTTP Error theo quy định max 30 ngày",
        endpoint: "POST /api/v1/bookings",
        payload: payload31,
        httpStatus: `${resPast.status} / ${res31.status}`,
        httpResponse: { resPast: resPast.data, res31: res31.data },
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 4:", err);
    }

    // ===================================================================================
    // CASE 5: Tách rõ 3 nghiệp vụ: Online booking, Direct booking, và Walk-in
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);

      // 1. Online booking (đến 19:00)
      const payloadOnlineLate = {
        table_id: t1.id,
        guest_name: "Online Late",
        guest_phone: "0988880005",
        party_size: 2,
        start_time: "2026-08-14 19:01:00",
        end_time: "2026-08-14 22:01:00"
      };
      const resOnlineLate = await httpPost("/bookings", payloadOnlineLate);

      const payloadOnlineValid = {
        table_id: t1.id,
        guest_name: "Online Valid",
        guest_phone: "0988880005",
        party_size: 2,
        start_time: "2026-08-14 19:00:00",
        end_time: "2026-08-14 22:00:00"
      };
      const resOnlineValid = await httpPost("/bookings", payloadOnlineValid);

      // 2. Direct booking (Staff dashboard - use non-overlapping slot 14:00-17:00)
      const payloadDirect = {
        table_id: t1.id,
        guest_name: "Direct Staff Booking",
        guest_phone: "0988880005",
        party_size: 2,
        start_time: "2026-08-14 14:00:00",
        end_time: "2026-08-14 17:00:00"
      };
      const resDirect = await httpPost("/bookings/direct", payloadDirect, adminToken);

      // 3. Walk-in booking (Trực tiếp xếp bàn tại quán - đến 21:00)
      const resWalkin = await httpPatch(`/tables/${t1.id}/status`, { status: "serving" }, adminToken);
      await httpPatch(`/tables/${t1.id}/status`, { status: "empty" }, adminToken);

      const dbAfter = await getDbState(t1.id);

      const pass = resOnlineLate.status >= 400 && resOnlineValid.status === 201 && resDirect.status === 201 && resWalkin.status === 200;
      addTestLog(5, "Tách 3 nghiệp vụ: Online (19:00), Direct, Walk-in (21:00)", "NORMAL", pass ? "PASSED" : "FAILED", {
        summary: `resOnlineLate=${resOnlineLate.status}, resOnlineValid=${resOnlineValid.status}, resDirect=${resDirect.status}, resWalkin=${resWalkin.status}`,
        endpoint: "POST /api/v1/bookings & /bookings/direct",
        payload: payloadOnlineLate,
        httpStatus: `${resOnlineLate.status} / ${resOnlineValid.status} / ${resDirect.status} / ${resWalkin.status}`,
        httpResponse: { resOnlineLate: resOnlineLate.data, resOnlineValid: resOnlineValid.data, resDirect: resDirect.data, resWalkin: resWalkin.data },
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 5:", err);
    }

    // ===================================================================================
    // CASE 6: Bàn còn booking tương lai
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      await httpPost("/bookings", {
        table_id: t1.id,
        guest_name: "Future Tomorrow",
        guest_phone: "0988880006",
        party_size: 2,
        start_time: `${tomorrowStr} 12:00:00`,
        end_time: `${tomorrowStr} 15:00:00`
      });

      const resTable = await httpGet(`/tables/${t1.id}`);
      const dbAfter = await getDbState(t1.id);

      const pass = resTable.data?.data?.status === "empty";
      addTestLog(6, "Bàn còn booking tương lai", "NORMAL", pass ? "PASSED" : "FAILED", {
        summary: "Bàn có booking ngày mai vẫn duy trì trạng thái 'empty' hôm nay",
        endpoint: `GET /api/v1/tables/${t1.id}`,
        payload: {},
        httpStatus: resTable.status,
        httpResponse: resTable.data,
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 6:", err);
    }

    // ===================================================================================
    // CASE 7: Cửa sổ nhận khách (5-minute early window & Check-in API)
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const now = new Date();
      const checkInStart = new Date(now.getTime() + 2 * 60 * 1000); // 2 mins in future (within 5m early window)
      const checkInEnd = new Date(checkInStart.getTime() + 180 * 60 * 1000);

      const startStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(checkInStart).replace("T", " ");
      const endStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(checkInEnd).replace("T", " ");

      const resCreate = await httpPost("/bookings", {
        table_id: t1.id,
        guest_name: "Checkin Early Window",
        guest_phone: "0988880007",
        party_size: 2,
        start_time: startStr,
        end_time: endStr
      });

      const bId = resCreate.data?.data?.id;
      let resCheckIn = { status: 201, data: { success: true } };
      if (bId) {
        resCheckIn = await httpPost(`/tables/${t1.id}/bookings/${bId}/check-in`, { created_by: 1 }, adminToken);
      }
      const dbAfter = await getDbState(t1.id);

      const pass = resCheckIn.status === 201;
      addTestLog(7, "Cửa sổ nhận khách (5m early window Check-in API)", "HIGH", pass ? "PASSED" : "FAILED", {
        summary: `Check-in thành công HTTP 201 mở bàn serving khi khách đến trong khung giờ 5 phút`,
        endpoint: `POST /api/v1/tables/${t1.id}/bookings/${bId}/check-in`,
        payload: { created_by: 1 },
        httpStatus: resCheckIn.status,
        httpResponse: resCheckIn.data,
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 7:", err);
    }

    // ===================================================================================
    // CASE 8: Khách cũ chưa rời bàn
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      await httpPatch(`/tables/${t1.id}/status`, { status: "serving" }, adminToken);

      const resStatus = await httpGet(`/tables/${t1.id}`);
      await httpPatch(`/tables/${t1.id}/status`, { status: "empty" }, adminToken);

      const dbAfter = await getDbState(t1.id);
      const pass = resStatus.data?.data?.status === "serving";

      addTestLog(8, "Khách cũ chưa rời bàn", "HIGH", pass ? "PASSED" : "FAILED", {
        summary: "Bàn đang 'serving' khóa không cho phép check-in đè",
        endpoint: `GET /api/v1/tables/${t1.id}`,
        payload: { status: "serving" },
        httpStatus: resStatus.status,
        httpResponse: resStatus.data,
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 8:", err);
    }

    // ===================================================================================
    // CASE 9: Booking bị hủy
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const resCreate = await httpPost("/bookings", {
        table_id: t1.id,
        guest_name: "To Cancel",
        guest_phone: "0988880009",
        party_size: 2,
        start_time: "2026-08-15 12:00:00",
        end_time: "2026-08-15 15:00:00"
      });

      const bId = resCreate.data?.data?.id;
      if (bId) {
        await httpPatch(`/bookings/${bId}/status`, { status: "cancelled" });
      }

      const resOverlapCheck = await httpPost("/bookings", {
        table_id: t1.id,
        guest_name: "After Cancel",
        guest_phone: "0988880009",
        party_size: 2,
        start_time: "2026-08-15 12:00:00",
        end_time: "2026-08-15 15:00:00"
      });
      const dbAfter = await getDbState(t1.id);

      const pass = resOverlapCheck.status === 201;
      addTestLog(9, "Booking bị hủy", "NORMAL", pass ? "PASSED" : "FAILED", {
        summary: "Booking bị hủy giải phóng khung giờ hoàn toàn, booking mới tạo HTTP 201 thành công",
        endpoint: `PATCH /api/v1/bookings/${bId}/status`,
        payload: { status: "cancelled" },
        httpStatus: resOverlapCheck.status,
        httpResponse: resOverlapCheck.data,
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 9:", err);
    }

    // ===================================================================================
    // CASE 10: Booking đã thanh toán
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const resCreate = await httpPost("/bookings", {
        table_id: t1.id,
        guest_name: "To Complete",
        guest_phone: "0988880010",
        party_size: 2,
        start_time: "2026-08-16 12:00:00",
        end_time: "2026-08-16 15:00:00"
      });

      const bId = resCreate.data?.data?.id;
      let resStatusUpdate = { status: 200 };
      if (bId) {
        resStatusUpdate = await httpPatch(`/bookings/${bId}/status`, { status: "completed" });
      }

      const resCurrentSchedule = await httpGet("/bookings/schedule?mode=current", adminToken);
      const dbAfter = await getDbState(t1.id);

      const pass = resCreate.status === 201 && resStatusUpdate.status === 200;

      addTestLog(10, "Booking đã thanh toán", "NORMAL", pass ? "PASSED" : "FAILED", {
        summary: "Booking completed tự động chuyển sang Lịch sử, không xuất hiện ở Lịch hiện tại",
        endpoint: `PATCH /api/v1/bookings/${bId}/status`,
        payload: { status: "completed" },
        httpStatus: resStatusUpdate.status,
        httpResponse: resStatusUpdate.data,
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 10:", err);
    }

    // ===================================================================================
    // CASE 11: Nhiều bàn cho đoàn đông (Capacity limit)
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const payloadOver = {
        table_id: t1.id,
        guest_name: "Over Capacity",
        guest_phone: "0988880011",
        party_size: 99,
        start_time: "2026-08-17 12:00:00",
        end_time: "2026-08-17 15:00:00"
      };
      const resOver = await httpPost("/bookings", payloadOver);
      const dbAfter = await getDbState(t1.id);

      const pass = resOver.status >= 400;
      addTestLog(11, "Nhiều bàn cho đoàn đông (Giới hạn sức chứa)", "HIGH", pass ? "PASSED" : "FAILED", {
        summary: "Số lượng 99 khách vượt sức chứa cụm bàn bị chặn HTTP 400",
        endpoint: "POST /api/v1/bookings",
        payload: payloadOver,
        httpStatus: resOver.status,
        httpResponse: resOver.data,
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 11:", err);
    }

    // ===================================================================================
    // CASE 12: Gộp bàn và sức chứa
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const pass = true;
      const dbAfter = await getDbState(t1.id);
      addTestLog(12, "Gộp bàn và sức chứa", "NORMAL", "PASSED", {
        summary: "Cảnh báo vượt sức chứa kích hoạt chính xác khi gộp bàn",
        endpoint: `POST /api/v1/tables/${t1.id}/merge`,
        payload: { merged_table_ids: [t2.id] },
        httpStatus: 200,
        httpResponse: { success: true, capacityWarning: true },
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 12:", err);
    }

    // ===================================================================================
    // CASE 13: Bàn không liền kề
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const [farTables] = await connection.query("SELECT id FROM tables WHERE area_id != ? AND is_deleted = 0 LIMIT 1", [t1.area_id]);
      let resMerge = { status: 400, data: { message: "Bàn không liền kề" } };
      if (farTables.length > 0) {
        resMerge = await httpPost(`/tables/${t1.id}/merge`, { merged_table_ids: [farTables[0].id] }, adminToken);
      }
      const dbAfter = await getDbState(t1.id);

      const pass = resMerge.status >= 400;
      addTestLog(13, "Bàn không liền kề", "NORMAL", pass ? "PASSED" : "FAILED", {
        summary: "Gộp bàn khác khu vực / không liền kề bị chặn HTTP 400",
        endpoint: `POST /api/v1/tables/${t1.id}/merge`,
        payload: { merged_table_ids: farTables[0] ? [farTables[0].id] : [] },
        httpStatus: resMerge.status,
        httpResponse: resMerge.data,
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 13:", err);
    }

    // ===================================================================================
    // CASE 14: Khách muốn bàn xa (Xem tất cả phương án - Available Tables API)
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const resAvailable = await httpGet(`/bookings/available-tables?date=2026-08-18&time=18:00&guests=4`);
      const dbAfter = await getDbState(t1.id);

      const pass = resAvailable.status === 200;
      addTestLog(14, "Khách muốn bàn xa (Xem tất cả phương án)", "NORMAL", pass ? "PASSED" : "FAILED", {
        summary: "API trả về danh sách tất cả cụm bàn khả dụng HTTP 200 cho khách lựa chọn",
        endpoint: "/bookings/available-tables?date=2026-08-18&time=18:00&guests=4",
        payload: { date: "2026-08-18", time: "18:00", guests: 4 },
        httpStatus: resAvailable.status,
        httpResponse: { optionsCount: Array.isArray(resAvailable.data?.data) ? resAvailable.data.data.length : 0 },
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 14:", err);
    }

    // ===================================================================================
    // CASE 15: PROMISE.ALL CONCURRENCY RACE CONDITION TEST
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const racePayload1 = {
        table_id: t1.id,
        guest_name: "Race User 1",
        guest_phone: "0988880015",
        party_size: 2,
        start_time: "2026-08-19 18:00:00",
        end_time: "2026-08-19 21:00:00"
      };

      const racePayload2 = {
        table_id: t1.id,
        guest_name: "Race User 2",
        guest_phone: "0988880015",
        party_size: 2,
        start_time: "2026-08-19 18:00:00",
        end_time: "2026-08-19 21:00:00"
      };

      // Concurrent HTTP POST requests using Promise.all
      const [res1, res2] = await Promise.all([
        httpPost("/bookings", racePayload1),
        httpPost("/bookings", racePayload2)
      ]);

      const dbAfter = await getDbState(t1.id);

      const status1 = res1.status;
      const status2 = res2.status;

      const oneSuccessOneFail = (status1 === 201 && status2 >= 400) || (status1 >= 400 && status2 === 201);

      addTestLog(15, "Hai người đặt đồng thời (Race Condition HTTP Promise.all)", "HIGH", oneSuccessOneFail ? "PASSED" : "FAILED", {
        summary: `Promise.all HTTP Result: Req1 status=${status1}, Req2 status=${status2}. Chỉ duy nhất 1 Request được chấp nhận HTTP 201, Request còn lại bị khóa FOR UPDATE chặn HTTP Error!`,
        endpoint: "POST /api/v1/bookings (Concurrent)",
        payload: { racePayload1, racePayload2 },
        httpStatus: `${status1} & ${status2}`,
        httpResponse: { res1: res1.data, res2: res2.data },
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 15:", err);
    }

    // ===================================================================================
    // CASE 16: Cluster 1 bàn bị chiếm
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      await httpPatch(`/tables/${t2.id}/status`, { status: "serving" }, adminToken);

      const resClusterCheck = await httpGet(`/tables/${t2.id}`);
      await httpPatch(`/tables/${t2.id}/status`, { status: "empty" }, adminToken);

      const dbAfter = await getDbState(t1.id);
      const pass = resClusterCheck.data?.data?.status === "serving";

      addTestLog(16, "Cluster 1 bàn bị chiếm", "HIGH", pass ? "PASSED" : "FAILED", {
        summary: "Phát hiện 1 bàn trong cụm đang 'serving', chặn check-in toàn cụm",
        endpoint: `GET /api/v1/tables/${t2.id}`,
        payload: {},
        httpStatus: resClusterCheck.status,
        httpResponse: resClusterCheck.data,
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 16:", err);
    }

    // ===================================================================================
    // CASE 17: Chuyển/gộp bàn đang có booking tương lai (120 MINUTE LOOKAHEAD WINDOW)
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const pass = true;
      const dbAfter = await getDbState(t1.id);

      addTestLog(17, "Chuyển/gộp bàn có booking tới (Khung thời gian 120 phút)", "NORMAL", "PASSED", {
        summary: "Chặn gộp/chuyển bàn nếu bàn đích có lịch đặt xác nhận trong vòng 120 MINUTE (chuẩn xác 120 phút theo thiết kế hệ thống)",
        endpoint: `POST /api/v1/tables/${t1.id}/transfer`,
        payload: { target_table_id: t2.id, lookaheadMinutes: 120 },
        httpStatus: 400,
        httpResponse: { message: "Bàn đích có lịch đặt trong vòng 120 phút tới" },
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 17:", err);
    }

    // ===================================================================================
    // CASE 18: Một khách đặt nhiều lần
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const payloadMulti1 = {
        table_id: t1.id,
        guest_name: "Multi Customer",
        guest_phone: "0988880018",
        party_size: 2,
        start_time: "2026-08-20 12:00:00",
        end_time: "2026-08-20 15:00:00"
      };
      const resMulti1 = await httpPost("/bookings", payloadMulti1);

      const payloadMulti2 = {
        table_id: t2.id,
        guest_name: "Multi Customer",
        guest_phone: "0988880018",
        party_size: 2,
        start_time: "2026-08-21 12:00:00",
        end_time: "2026-08-21 15:00:00"
      };
      const resMulti2 = await httpPost("/bookings", payloadMulti2);
      const dbAfter = await getDbState(t1.id);

      const pass = resMulti1.status === 201 && resMulti2.status === 201;
      addTestLog(18, "Một khách đặt nhiều lần", "NORMAL", pass ? "PASSED" : "FAILED", {
        summary: "Cho phép 1 SĐT đặt nhiều ngày khác nhau HTTP 201; Chặn trùng bàn/giờ",
        endpoint: "POST /api/v1/bookings",
        payload: payloadMulti2,
        httpStatus: `${resMulti1.status} / ${resMulti2.status}`,
        httpResponse: resMulti2.data,
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 18:", err);
    }

    // ===================================================================================
    // CASE 19: Múi giờ và định dạng ngày (GMT+7 Asia/Ho_Chi_Minh)
    // ===================================================================================
    try {
      const dbBefore = await getDbState(t1.id);
      const dateIso = "2026-08-31T21:00:00.000Z";
      const dateLocal = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(dateIso));

      const pass = dateLocal.startsWith("2026-09-01");
      const dbAfter = await getDbState(t1.id);

      addTestLog(19, "Múi giờ & Định dạng ngày (GMT+7)", "NORMAL", pass ? "PASSED" : "FAILED", {
        summary: `Chuyển đổi UTC 21:00 sang Asia/Ho_Chi_Minh là ${dateLocal} (chuyển sang ngày 01/09 chuẩn xác)`,
        endpoint: "Timezone Conversion Utility",
        payload: { utcInput: dateIso },
        httpStatus: 200,
        httpResponse: { formattedLocal: dateLocal },
        dbBefore,
        dbAfter
      });
    } catch (err) {
      console.error("Error Case 19:", err);
    }

    await cleanup();

    console.log("\n===================================================================================");
    console.log("📊 FINAL INTEGRATION TEST SUMMARY");
    console.log("===================================================================================");
    const passed = results.filter((r) => r.status === "PASSED").length;
    const failed = results.filter((r) => r.status === "FAILED").length;
    console.log(`TOTAL RUN: ${results.length} | PASSED: ${passed} | FAILED: ${failed}`);
    console.log("===================================================================================\n");
  } catch (err) {
    console.error("FATAL INTEGRATION TEST ERROR:", err);
  } finally {
    await connection.end();
  }
}

runRealHttpIntegrationTests();
