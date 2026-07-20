import https from "https";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";

export const sendTelegramMessage = (message: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      console.warn("Telegram not configured (missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)");
      resolve();
      return;
    }

    const payload = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: "HTML",
    });

    const options = {
      hostname: "api.telegram.org",
      port: 443,
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
        } else {
          console.error("Telegram API error:", data);
          reject(new Error(`Telegram API returned ${res.statusCode}`));
        }
      });
    });

    req.on("error", (err) => {
      console.error("Telegram request error:", err.message);
      reject(err);
    });

    req.write(payload);
    req.end();
  });
};

export const sendBookingNotification = (booking: any): void => {
  const message = [
    "🔔 <b>Đặt bàn mới</b>",
    "",
    `👤 <b>Khách:</b> ${booking.guest_name}`,
    `📞 <b>SĐT:</b> ${booking.guest_phone}`,
    `👥 <b>Số người:</b> ${booking.party_size}`,
    `🪑 <b>Bàn:</b> #${booking.table_id}`,
    `📅 <b>Thời gian:</b> ${booking.start_time} - ${booking.end_time}`,
    booking.guest_note ? `📝 <b>Ghi chú:</b> ${booking.guest_note}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  sendTelegramMessage(message).catch((err) =>
    console.error("Failed to send Telegram booking notification:", err.message),
  );
};
