import https from "https";

export interface BookingNotificationData {
  id?: number;
  confirmation_code?: string;
  guest_name?: string;
  guest_phone?: string;
  party_size?: number;
  start_time?: string;
  table_name?: string;
  area_name?: string;
  guest_note?: string;
  note?: string;
}

const sendWaiterMessage = async (text: string): Promise<void> => {
  const token = process.env.TELEGRAM_BOT_TOKEN?.replace(/\s+/g, "");
  const chatId = process.env.TELEGRAM_WAITER_CHAT_ID?.trim();

  if (!token || !chatId) {
    console.warn("⚠️ TELEGRAM_BOT_TOKEN hoặc TELEGRAM_WAITER_CHAT_ID chưa được cấu hình.");
    return;
  }

  const payload = JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML" });
  await new Promise<void>((resolve, reject) => {
    const request = https.request(
      {
        hostname: "api.telegram.org",
        port: 443,
        path: `/bot${token}/sendMessage`,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        let responseBody = "";
        response.on("data", (chunk) => (responseBody += chunk));
        response.on("end", () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            resolve();
            return;
          }
          reject(new Error(`Telegram API ${response.statusCode ?? "error"}: ${responseBody}`));
        });
      },
    );

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
};

/**
 * Sends a Telegram notification to the Waiter group when a new booking is created.
 */
export const notifyWaitersAboutBooking = async (booking: BookingNotificationData): Promise<void> => {
  try {
    let formattedTime = booking.start_time || "Chưa xác định";
    if (booking.start_time) {
      try {
        const d = new Date(booking.start_time);
        if (!isNaN(d.getTime())) {
          formattedTime = d.toLocaleString("vi-VN", {
            timeZone: "Asia/Ho_Chi_Minh",
            hour: "2-digit",
            minute: "2-digit",
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          });
        }
      } catch (e) {
        // Fallback to raw string
      }
    }

    const code = booking.confirmation_code || (booking.id ? `#${booking.id}` : "N/A");
    const name = booking.guest_name || "Khách vãng lai";
    const phone = booking.guest_phone || "N/A";
    const party = booking.party_size || 1;
    const table = booking.table_name || "Bàn tự động";
    const area = booking.area_name || "Chưa xếp khu vực";
    const note = booking.guest_note || booking.note || "Không có";

    const text = [
      "🔔 <b>BOOKING MỚI</b>",
      `Mã booking: ${code}`,
      `Khách hàng: ${name}`,
      `SĐT: ${phone}`,
      `Thời gian: ${formattedTime}`,
      `Số khách: ${party}`,
      `Bàn: ${table}`,
      `Khu vực: ${area}`,
      `Ghi chú: ${note}`,
    ].join("\n");

    await sendWaiterMessage(text);
    console.log("🚀 Đã gửi thông báo Telegram đặt bàn mới đến nhóm Waiter.");
  } catch (error) {
    console.error("⚠️ Lỗi khi gửi thông báo Telegram cho nhóm Waiter:", (error as Error).message);
  }
};

/** Sends a one-time reminder shortly before the guest's reservation time. */
export const notifyWaitersAboutUpcomingBooking = async (
  booking: BookingNotificationData,
  minutesUntilBooking: number,
): Promise<void> => {
  const formattedTime = booking.start_time
    ? new Date(booking.start_time).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "Chưa xác định";

  const text = [
    "⏰ <b>NHẮC BOOKING SẮP ĐẾN</b>",
    `Còn khoảng <b>${Math.max(1, Math.ceil(minutesUntilBooking))} phút</b> nữa khách sẽ đến.`,
    "",
    `Mã booking: ${booking.confirmation_code || (booking.id ? `#${booking.id}` : "N/A")}`,
    `Khách hàng: ${booking.guest_name || "Khách vãng lai"}`,
    `SĐT: ${booking.guest_phone || "N/A"}`,
    `Thời gian: ${formattedTime}`,
    `Số khách: ${booking.party_size || 1}`,
    `Bàn: ${booking.table_name || "Chưa xác định"}`,
    `Khu vực: ${booking.area_name || "Chưa xác định"}`,
    `Ghi chú: ${booking.guest_note || booking.note || "Không có"}`,
  ].join("\n");

  try {
    await sendWaiterMessage(text);
    console.log(`⏰ Đã gửi nhắc booking sắp đến: ${booking.confirmation_code || booking.id}.`);
  } catch (error) {
    console.error("⚠️ Lỗi khi gửi nhắc booking Telegram:", (error as Error).message);
  }
};
