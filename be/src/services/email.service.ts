import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
  },
});

export const sendBookingConfirmationEmail = async (booking: any): Promise<void> => {
  try {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("SMTP not configured (missing SMTP_USER or SMTP_PASS)");
      return;
    }

    const startDate = new Date(booking.start_time);
    const endDate = new Date(booking.end_time);
    const formatDate = (d: Date) =>
      d.toLocaleString("vi-VN", { dateStyle: "full", timeStyle: "short" });

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #d4380d; text-align: center;">Xác nhận đặt bàn</h2>
        <p>Xin chào <strong>${booking.guest_name}</strong>,</p>
        <p>Đặt bàn của bạn đã được xác nhận với thông tin sau:</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Bàn số</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">#${booking.table_id}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Số lượng khách</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${booking.party_size} người</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Thời gian bắt đầu</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDate(startDate)}</td>
          </tr>
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Thời gian kết thúc</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${formatDate(endDate)}</td>
          </tr>
          ${booking.guest_note ? `
          <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-weight: bold;">Ghi chú</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee;">${booking.guest_note}</td>
          </tr>` : ""}
        </table>
        <p style="color: #888; font-size: 13px; text-align: center; margin-top: 24px;">
          Cảm ơn bạn đã chọn nhà hàng của chúng tôi!
        </p>
      </div>
    `;

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || "ResManager <noreply@resmanager.vn>",
      to: booking.email || booking.guest_phone + "@placeholder.com",
      subject: `Xác nhận đặt bàn - Bàn #${booking.table_id}`,
      html,
    });
  } catch (error) {
    console.error("Failed to send booking confirmation email:", (error as Error).message);
  }
};
