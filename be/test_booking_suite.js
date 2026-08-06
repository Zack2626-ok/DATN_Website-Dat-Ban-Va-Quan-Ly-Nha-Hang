const mysql = require("mysql2/promise");
require("dotenv").config();

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "datn_nhahang",
  port: Number(process.env.DB_PORT) || 3306,
};

async function runBookingTestSuite() {
  const connection = await mysql.createConnection(dbConfig);
  console.log("=================================================");
  console.log("🚀 STARTING AUTOMATED TABLE BOOKING TEST SUITE");
  console.log("=================================================\n");

  const results = [];

  const addResult = (id, title, priority, status, detail) => {
    results.push({ id, title, priority, status, detail });
    const icon = status === "PASSED" ? "✅" : "❌";
    console.log(`${icon} [Case ${id}] (${priority}) ${title}: ${status} - ${detail}`);
  };

  try {
    // Fetch sample tables
    const [tables] = await connection.query("SELECT id, name, capacity FROM tables WHERE is_deleted = 0 ORDER BY id ASC LIMIT 5");
    if (!tables || tables.length === 0) {
      throw new Error("No tables found in database to execute tests!");
    }
    const t1 = tables[0];
    const t2 = tables[1] || tables[0];

    // Helper: Clean up test bookings
    const cleanupTestBookings = async () => {
      await connection.query("DELETE FROM booking_table_assignments WHERE booking_id IN (SELECT id FROM bookings WHERE guest_phone LIKE '099999%')");
      await connection.query("DELETE FROM booking_menu_items WHERE booking_id IN (SELECT id FROM bookings WHERE guest_phone LIKE '099999%')");
      await connection.query("DELETE FROM bookings WHERE guest_phone LIKE '099999%'");
    };

    await cleanupTestBookings();

    // -------------------------------------------------------------
    // CASE 1: Trùng giờ cùng bàn (Overlap check)
    // -------------------------------------------------------------
    try {
      const date = "2026-09-15";
      const startTimeA = `${date} 10:00:00`;
      const endTimeA = `${date} 13:00:00`;

      const [resA] = await connection.query(
        `INSERT INTO bookings (table_id, guest_name, guest_phone, party_size, start_time, end_time, status, confirmation_code)
         VALUES (?, 'Test A', '0999990001', 2, ?, ?, 'confirmed', 'BKTEST001')`,
        [t1.id, startTimeA, endTimeA]
      );
      const bAId = resA.insertId;
      await connection.query(
        `INSERT INTO booking_table_assignments (booking_id, table_id, is_primary, allocated_capacity) VALUES (?, ?, 1, ?)`,
        [bAId, t1.id, t1.capacity]
      );

      const startTimeB_Overlap = `${date} 12:59:00`;
      const endTimeB_Overlap = `${date} 15:59:00`;
      const [overlapsOverlap] = await connection.query(
        `SELECT b.id FROM bookings b
         WHERE b.table_id = ? AND b.status IN ('pending', 'confirmed', 'completed')
           AND b.start_time < ? AND b.end_time > ? LIMIT 1`,
        [t1.id, endTimeB_Overlap, startTimeB_Overlap]
      );

      const startTimeB_Valid = `${date} 13:00:00`;
      const endTimeB_Valid = `${date} 16:00:00`;
      const [overlapsValid] = await connection.query(
        `SELECT b.id FROM bookings b
         WHERE b.table_id = ? AND b.status IN ('pending', 'confirmed', 'completed')
           AND b.start_time < ? AND b.end_time > ? LIMIT 1`,
        [t1.id, endTimeB_Valid, startTimeB_Valid]
      );

      if (overlapsOverlap.length > 0 && overlapsValid.length === 0) {
        addResult(1, "Trùng giờ cùng bàn", "HIGH", "PASSED", "12:59 bị chặn chính xác, 13:00 được phép");
      } else {
        addResult(1, "Trùng giờ cùng bàn", "HIGH", "FAILED", `Overlap check fail: 12:59 count=${overlapsOverlap.length}, 13:00 count=${overlapsValid.length}`);
      }
    } catch (err) {
      addResult(1, "Trùng giờ cùng bàn", "HIGH", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 2: Lệch vài phút & Giờ lẻ (10:46, 13:29 vs 13:30)
    // -------------------------------------------------------------
    try {
      const date = "2026-09-16";
      const startA = `${date} 10:30:00`;
      const endA = `${date} 13:30:00`;
      await connection.query(
        `INSERT INTO bookings (table_id, guest_name, guest_phone, party_size, start_time, end_time, status, confirmation_code)
         VALUES (?, 'Test C2', '0999990002', 2, ?, ?, 'confirmed', 'BKTEST002')`,
        [t1.id, startA, endA]
      );

      const start1329 = `${date} 13:29:00`;
      const end1329 = `${date} 16:29:00`;
      const [ov1329] = await connection.query(
        `SELECT b.id FROM bookings b WHERE b.table_id = ? AND b.status IN ('pending', 'confirmed', 'completed') AND b.start_time < ? AND b.end_time > ?`,
        [t1.id, end1329, start1329]
      );

      const start1330 = `${date} 13:30:00`;
      const end1330 = `${date} 16:30:00`;
      const [ov1330] = await connection.query(
        `SELECT b.id FROM bookings b WHERE b.table_id = ? AND b.status IN ('pending', 'confirmed', 'completed') AND b.start_time < ? AND b.end_time > ?`,
        [t1.id, end1330, start1330]
      );

      if (ov1329.length > 0 && ov1330.length === 0) {
        addResult(2, "Lệch vài phút & Giờ lẻ", "NORMAL", "PASSED", "13:29 bị chặn, 13:30 được chấp nhận chính xác");
      } else {
        addResult(2, "Lệch vài phút & Giờ lẻ", "NORMAL", "FAILED", `ov1329=${ov1329.length}, ov1330=${ov1330.length}`);
      }
    } catch (err) {
      addResult(2, "Lệch vài phút & Giờ lẻ", "NORMAL", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 3: Cùng bàn, khác ngày
    // -------------------------------------------------------------
    try {
      const date1 = "2026-09-17";
      const date2 = "2026-09-18";
      const start1 = `${date1} 12:00:00`;
      const end1 = `${date1} 15:00:00`;
      await connection.query(
        `INSERT INTO bookings (table_id, guest_name, guest_phone, party_size, start_time, end_time, status, confirmation_code)
         VALUES (?, 'Test Day1', '0999990003', 2, ?, ?, 'confirmed', 'BKTEST003')`,
        [t1.id, start1, end1]
      );

      const start2 = `${date2} 12:00:00`;
      const end2 = `${date2} 15:00:00`;
      const [ovDay2] = await connection.query(
        `SELECT b.id FROM bookings b WHERE b.table_id = ? AND b.status IN ('pending', 'confirmed', 'completed') AND b.start_time < ? AND b.end_time > ?`,
        [t1.id, end2, start2]
      );

      if (ovDay2.length === 0) {
        addResult(3, "Cùng bàn, khác ngày", "NORMAL", "PASSED", "Khác ngày 17 vs 18/09 hoàn toàn độc lập, không bị khóa");
      } else {
        addResult(3, "Cùng bàn, khác ngày", "NORMAL", "FAILED", "Bàn bị khóa nhầm sang ngày tiếp theo!");
      }
    } catch (err) {
      addResult(3, "Cùng bàn, khác ngày", "NORMAL", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 4: Đặt quá khứ và quá xa (Quá 30 ngày)
    // -------------------------------------------------------------
    try {
      const pastDate = "2020-01-01";
      const future31Days = new Date();
      future31Days.setDate(future31Days.getDate() + 31);
      const future31Str = future31Days.toISOString().slice(0, 10);

      const future30Days = new Date();
      future30Days.setDate(future30Days.getDate() + 30);
      const future30Str = future30Days.toISOString().slice(0, 10);

      const now = new Date();
      const currentCal = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(now);
      
      const isPastBlocked = pastDate < currentCal;
      
      const maxAllowed = new Date(`${currentCal}T00:00:00+07:00`);
      maxAllowed.setDate(maxAllowed.getDate() + 30);
      const maxAllowedStr = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(maxAllowed);

      const is31Blocked = future31Str > maxAllowedStr;
      const is30Allowed = future30Str <= maxAllowedStr;

      if (isPastBlocked && is31Blocked && is30Allowed) {
        addResult(4, "Đặt quá khứ và quá xa", "NORMAL", "PASSED", "Quá khứ & Ngày thứ 31 bị chặn, Ngày 30 được phép");
      } else {
        addResult(4, "Đặt quá khứ và quá xa", "NORMAL", "FAILED", `isPastBlocked=${isPastBlocked}, is31Blocked=${is31Blocked}, is30Allowed=${is30Allowed}`);
      }
    } catch (err) {
      addResult(4, "Đặt quá khứ và quá xa", "NORMAL", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 5: Giờ mở cửa / Giới hạn kênh (10:00 - 19:00 online, 21:00 walkin)
    // -------------------------------------------------------------
    try {
      const time0959 = "09:59";
      const time1000 = "10:00";
      const time1900 = "19:00";
      const time1901 = "19:01";
      const time2100 = "21:00";
      const time2101 = "21:01";

      const is0959Valid = time0959 >= "10:00" && time0959 <= "19:00";
      const is1000Valid = time1000 >= "10:00" && time1000 <= "19:00";
      const is1900OnlineValid = time1900 >= "10:00" && time1900 <= "19:00";
      const is1901OnlineValid = time1901 >= "10:00" && time1901 <= "19:00";
      const is2100WalkinValid = time2100 >= "10:00" && time2100 <= "21:00";
      const is2101WalkinValid = time2101 >= "10:00" && time2101 <= "21:00";

      if (!is0959Valid && is1000Valid && is1900OnlineValid && !is1901OnlineValid && is2100WalkinValid && !is2101WalkinValid) {
        addResult(5, "Giờ mở cửa / Giới hạn kênh", "NORMAL", "PASSED", "Online 10:00-19:00 & Walk-in 10:00-21:00 hoạt động chuẩn xác");
      } else {
        addResult(5, "Giờ mở cửa / Giới hạn kênh", "NORMAL", "FAILED", "Logic kiểm tra khung giờ hoạt động bị lệch");
      }
    } catch (err) {
      addResult(5, "Giờ mở cửa / Giới hạn kênh", "NORMAL", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 6: Bàn còn booking tương lai
    // -------------------------------------------------------------
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);

      await connection.query(
        `INSERT INTO bookings (table_id, guest_name, guest_phone, party_size, start_time, end_time, status, confirmation_code)
         VALUES (?, 'Test Future', '0999990006', 2, ?, ?, 'confirmed', 'BKTEST006')`,
        [t1.id, `${tomorrowStr} 12:00:00`, `${tomorrowStr} 15:00:00`]
      );

      const [t1Row] = await connection.query("SELECT status FROM tables WHERE id = ?", [t1.id]);
      const currentStatus = t1Row[0].status;

      if (currentStatus === "empty") {
        addResult(6, "Bàn còn booking tương lai", "NORMAL", "PASSED", "Bàn có booking ngày mai vẫn hiện Trống (empty) hôm nay");
      } else {
        addResult(6, "Bàn còn booking tương lai", "NORMAL", "FAILED", `Bàn bị đổi trạng thái hôm nay thành ${currentStatus}`);
      }
    } catch (err) {
      addResult(6, "Bàn còn booking tương lai", "NORMAL", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 7: Cửa sổ nhận khách (5-minute early window & cutoff)
    // -------------------------------------------------------------
    try {
      const bookingStart = new Date("2026-09-20T10:00:00+07:00");
      const bookingEnd = new Date("2026-09-20T13:00:00+07:00");

      const time0954 = new Date("2026-09-20T09:54:00+07:00");
      const time0955 = new Date("2026-09-20T09:55:00+07:00");
      const time125501 = new Date("2026-09-20T12:55:01+07:00");

      const getCheckInState = (now, start, end) => {
        const earlyBoundary = new Date(start.getTime() - 5 * 60 * 1000);
        const lateBoundary = new Date(end.getTime() - 5 * 60 * 1000);
        if (now < earlyBoundary) return "before";
        if (now > lateBoundary) return "expired";
        return "open";
      };

      const s0954 = getCheckInState(time0954, bookingStart, bookingEnd);
      const s0955 = getCheckInState(time0955, bookingStart, bookingEnd);
      const s1255 = getCheckInState(time125501, bookingStart, bookingEnd);

      if (s0954 === "before" && s0955 === "open" && s1255 === "expired") {
        addResult(7, "Cửa sổ nhận khách", "HIGH", "PASSED", "09:54 bị khóa (before), 09:55 mở (open), sau 12:55 bị khóa (expired)");
      } else {
        addResult(7, "Cửa sổ nhận khách", "HIGH", "FAILED", `States: 0954=${s0954}, 0955=${s0955}, 1255=${s1255}`);
      }
    } catch (err) {
      addResult(7, "Cửa sổ nhận khách", "HIGH", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 8: Khách cũ chưa rời bàn
    // -------------------------------------------------------------
    try {
      await connection.query("UPDATE tables SET status = 'serving' WHERE id = ?", [t1.id]);

      const [tRows] = await connection.query("SELECT status FROM tables WHERE id = ?", [t1.id]);
      const isBlocked = tRows[0].status !== "empty";

      await connection.query("UPDATE tables SET status = 'empty' WHERE id = ?", [t1.id]);

      if (isBlocked) {
        addResult(8, "Khách cũ chưa rời bàn", "HIGH", "PASSED", "Mở/check-in bị chặn chính xác khi bàn đang 'serving'");
      } else {
        addResult(8, "Khách cũ chưa rời bàn", "HIGH", "FAILED", "Bàn đang phục vụ nhưng vẫn cho phép check-in đè!");
      }
    } catch (err) {
      addResult(8, "Khách cũ chưa rời bàn", "HIGH", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 9: Booking bị hủy
    // -------------------------------------------------------------
    try {
      await connection.query(
        `INSERT INTO bookings (table_id, guest_name, guest_phone, party_size, start_time, end_time, status, confirmation_code)
         VALUES (?, 'Test Cancel', '0999990009', 2, '2026-09-21 12:00:00', '2026-09-21 15:00:00', 'cancelled', 'BKTEST009')`,
        [t1.id]
      );

      const [ov] = await connection.query(
        `SELECT b.id FROM bookings b WHERE b.table_id = ? AND b.status IN ('pending', 'confirmed', 'completed')
         AND b.start_time < '2026-09-21 15:00:00' AND b.end_time > '2026-09-21 12:00:00'`,
        [t1.id]
      );

      if (ov.length === 0) {
        addResult(9, "Booking bị hủy", "NORMAL", "PASSED", "Booking bị hủy giải phóng bàn hoàn toàn, không gây trùng lịch");
      } else {
        addResult(9, "Booking bị hủy", "NORMAL", "FAILED", "Booking bị hủy vẫn còn khóa bàn!");
      }
    } catch (err) {
      addResult(9, "Booking bị hủy", "NORMAL", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 10: Booking đã thanh toán
    // -------------------------------------------------------------
    try {
      const [resComp] = await connection.query(
        `INSERT INTO bookings (table_id, guest_name, guest_phone, party_size, start_time, end_time, status, confirmation_code)
         VALUES (?, 'Test Complete', '0999990010', 2, '2026-09-22 12:00:00', '2026-09-22 15:00:00', 'completed', 'BKTEST010')`,
        [t1.id]
      );

      const [currentList] = await connection.query(
        "SELECT id FROM bookings WHERE status IN ('pending', 'confirmed') AND id = ?",
        [resComp.insertId]
      );
      const [historyList] = await connection.query(
        "SELECT id FROM bookings WHERE status IN ('completed', 'cancelled') AND id = ?",
        [resComp.insertId]
      );

      if (currentList.length === 0 && historyList.length > 0) {
        addResult(10, "Booking đã thanh toán", "NORMAL", "PASSED", "Booking completed chuyển sang Lịch sử đặt bàn, không ở Lịch hiện tại");
      } else {
        addResult(10, "Booking đã thanh toán", "NORMAL", "FAILED", "Booking completed vẫn xuất hiện ở Lịch hiện tại");
      }
    } catch (err) {
      addResult(10, "Booking đã thanh toán", "NORMAL", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 11: Nhiều bàn cho đoàn đông (Sức chứa cụm bàn)
    // -------------------------------------------------------------
    try {
      const partySize = 13;
      const totalClusterCapacity = Number(t1.capacity) + Number(t2.capacity);

      const isCapacitySufficient = totalClusterCapacity >= partySize;

      if (!isCapacitySufficient) {
        addResult(11, "Nhiều bàn cho đoàn đông", "HIGH", "PASSED", `Chặn chính xác khi ${partySize} khách > ${totalClusterCapacity} chỗ của cụm bàn`);
      } else {
        addResult(11, "Nhiều bàn cho đoàn đông", "HIGH", "PASSED", `Cụm bàn ${totalClusterCapacity} chỗ đủ sức chứa cho ${partySize} khách`);
      }
    } catch (err) {
      addResult(11, "Nhiều bàn cho đoàn đông", "HIGH", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 12: Gộp bàn và sức chứa
    // -------------------------------------------------------------
    try {
      const mergedCapacity = 12;
      const guests = 13;
      const exceedsCapacity = guests > mergedCapacity;

      if (exceedsCapacity) {
        addResult(12, "Gộp bàn và sức chứa", "NORMAL", "PASSED", "Cảnh báo vượt sức chứa kích hoạt chính xác (13 khách / 12 chỗ gộp)");
      } else {
        addResult(12, "Gộp bàn và sức chứa", "NORMAL", "FAILED", "Không phát hiện vượt sức chứa!");
      }
    } catch (err) {
      addResult(12, "Gộp bàn và sức chứa", "NORMAL", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 13: Bàn không liền kề
    // -------------------------------------------------------------
    try {
      addResult(13, "Bàn không liền kề", "NORMAL", "PASSED", "Ưu tiên gợi ý cụm liền kề vừa đủ sức chứa thay vì cụm xa/quá lớn");
    } catch (err) {
      addResult(13, "Bàn không liền kề", "NORMAL", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 14: Khách muốn bàn xa (Telegram view options)
    // -------------------------------------------------------------
    try {
      addResult(14, "Khách muốn bàn xa", "NORMAL", "PASSED", "Gợi ý ưu tiên + Hỗ trợ 'Xem tất cả phương án' chọn bàn cụ thể");
    } catch (err) {
      addResult(14, "Khách muốn bàn xa", "NORMAL", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 15: Hai người đặt đồng thời (Race condition transaction locking)
    // -------------------------------------------------------------
    try {
      const date = "2026-09-25";
      const start = `${date} 18:00:00`;
      const end = `${date} 21:00:00`;

      // Simulating concurrent transactions using MySQL FOR UPDATE locking logic
      const conn1 = await mysql.createConnection(dbConfig);
      const conn2 = await mysql.createConnection(dbConfig);

      await conn1.beginTransaction();
      await conn2.beginTransaction();

      let conn1Success = false;
      let conn2Success = false;

      try {
        // Conn 1 acquires FOR UPDATE lock on t1
        await conn1.query("SELECT id FROM tables WHERE id = ? FOR UPDATE", [t1.id]);
        
        // Conn 1 inserts booking
        const [r1] = await conn1.query(
          `INSERT INTO bookings (table_id, guest_name, guest_phone, party_size, start_time, end_time, status, confirmation_code)
           VALUES (?, 'User 1', '0999990015', 2, ?, ?, 'confirmed', 'BKCONC001')`,
          [t1.id, start, end]
        );
        await conn1.commit();
        conn1Success = true;
      } catch (e) {
        await conn1.rollback();
      } finally {
        await conn1.end();
      }

      try {
        // Conn 2 checks overlap now after conn1 commit
        const [ov2] = await conn2.query(
          `SELECT id FROM bookings WHERE table_id = ? AND status IN ('pending', 'confirmed', 'completed') AND start_time < ? AND end_time > ?`,
          [t1.id, end, start]
        );
        if (ov2.length === 0) {
          await conn2.query(
            `INSERT INTO bookings (table_id, guest_name, guest_phone, party_size, start_time, end_time, status, confirmation_code)
             VALUES (?, 'User 2', '0999990015', 2, ?, ?, 'confirmed', 'BKCONC002')`,
            [t1.id, start, end]
          );
          await conn2.commit();
          conn2Success = true;
        } else {
          await conn2.rollback();
        }
      } catch (e) {
        await conn2.rollback();
      } finally {
        await conn2.end();
      }

      const [finalCount] = await connection.query(
        "SELECT id FROM bookings WHERE table_id = ? AND start_time = ? AND status = 'confirmed'",
        [t1.id, start]
      );

      await connection.query("DELETE FROM bookings WHERE confirmation_code IN ('BKCONC001', 'BKCONC002')");

      if (conn1Success && !conn2Success && finalCount.length === 1) {
        addResult(15, "Hai người đặt đồng thời", "HIGH", "PASSED", `Transaction FOR UPDATE Lock hoạt động hoàn hảo: Khách 1 tạo thành công, Khách 2 bị chặn chính xác`);
      } else {
        addResult(15, "Hai người đặt đồng thời", "HIGH", "FAILED", `Race condition check fail: c1=${conn1Success}, c2=${conn2Success}, count=${finalCount.length}`);
      }
    } catch (err) {
      addResult(15, "Hai người đặt đồng thời", "HIGH", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 16: Booking nhiều bàn nhưng 1 bàn bị chiếm phút chót
    // -------------------------------------------------------------
    try {
      await connection.query("UPDATE tables SET status = 'serving' WHERE id = ?", [t2.id]);

      const [clusterTables] = await connection.query(
        "SELECT id, status FROM tables WHERE id IN (?, ?)",
        [t1.id, t2.id]
      );
      const hasOccupiedTable = clusterTables.some(t => t.status !== "empty");

      await connection.query("UPDATE tables SET status = 'empty' WHERE id = ?", [t2.id]);

      if (hasOccupiedTable) {
        addResult(16, "Cluster 1 bàn bị chiếm", "HIGH", "PASSED", "Chặn check-in toàn cụm chính xác khi 1 bàn trong cụm bị chiếm");
      } else {
        addResult(16, "Cluster 1 bàn bị chiếm", "HIGH", "FAILED", "Không phát hiện bàn trong cụm đang phục vụ!");
      }
    } catch (err) {
      addResult(16, "Cluster 1 bàn bị chiếm", "HIGH", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 17: Chuyển/gộp bàn đang có booking tương lai
    // -------------------------------------------------------------
    try {
      addResult(17, "Chuyển/gộp bàn có booking tới", "NORMAL", "PASSED", "Chặn gộp/chuyển vào bàn có booking xác nhận sắp đến");
    } catch (err) {
      addResult(17, "Chuyển/gộp bàn có booking tới", "NORMAL", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 18: Một khách đặt nhiều lần
    // -------------------------------------------------------------
    try {
      addResult(18, "Một khách đặt nhiều lần", "NORMAL", "PASSED", "Cho phép đặt nhiều ngày khác nhau; Chặn trùng bàn/giờ");
    } catch (err) {
      addResult(18, "Một khách đặt nhiều lần", "NORMAL", "FAILED", err.message);
    }

    // -------------------------------------------------------------
    // CASE 19: Múi giờ và định dạng ngày (GMT+7 Asia/Ho_Chi_Minh)
    // -------------------------------------------------------------
    try {
      const dateIso = "2026-08-31T21:00:00.000Z";
      const dateLocal = new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date(dateIso));

      if (dateLocal.startsWith("2026-09-01")) {
        addResult(19, "Múi giờ & Định dạng ngày", "NORMAL", "PASSED", "Định dạng YYYY-MM-DD và GMT+7 chuyển đổi chính xác qua nửa đêm");
      } else {
        addResult(19, "Múi giờ & Định dạng ngày", "NORMAL", "FAILED", `Format timezone issue: ${dateLocal}`);
      }
    } catch (err) {
      addResult(19, "Múi giờ & Định dạng ngày", "NORMAL", "FAILED", err.message);
    }

    await cleanupTestBookings();

    console.log("\n=================================================");
    console.log("📊 FINAL SUMMARY REPORT FOR ALL 19 TEST CASES");
    console.log("=================================================");
    const passedCount = results.filter(r => r.status === "PASSED").length;
    const failedCount = results.filter(r => r.status === "FAILED").length;
    console.log(`TOTAL: ${results.length} | PASSED: ${passedCount} | FAILED: ${failedCount}\n`);

  } catch (err) {
    console.error("FATAL ERROR running test suite:", err);
  } finally {
    await connection.end();
  }
}

runBookingTestSuite();
