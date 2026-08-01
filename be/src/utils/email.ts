import nodemailer from "nodemailer";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Create emails directory inside uploads if it doesn't exist
const EMAILS_DIR = path.join(process.cwd(), "uploads", "emails");
if (!fs.existsSync(EMAILS_DIR)) {
  fs.mkdirSync(EMAILS_DIR, { recursive: true });
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderDetails {
  id: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress?: string;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  orderType: "dine_in" | "delivery" | "takeaway";
}

/**
 * Generates premium HTML content for order receipts
 */
const generateReceiptHtml = (order: OrderDetails): string => {
  const itemRows = order.items
    .map(
      (item) => `
      <tr style="border-bottom: 1px solid #2a2a35;">
        <td style="padding: 12px 0; color: #f0efe8; font-weight: 500;">${item.name}</td>
        <td style="padding: 12px 0; color: #a5a5b5; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px 0; color: #c5a880; font-weight: bold; text-align: right;">
          ${(item.price).toLocaleString("vi-VN")} vnđ
        </td>
        <td style="padding: 12px 0; color: #c5a880; font-weight: bold; text-align: right;">
          ${(item.price * item.quantity).toLocaleString("vi-VN")} vnđ
        </td>
      </tr>
    `
    )
    .join("");

  const formattedDate = new Date(order.createdAt).toLocaleString("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
  });

  const orderTypeLabel =
    order.orderType === "delivery"
      ? "Giao hàng tận nơi"
      : order.orderType === "takeaway"
      ? "Mang đi"
      : "Đặt bàn ăn tại nhà hàng";

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Hóa Đơn Đặt Hàng L'Ambroisie</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=Syne:wght@700;800&display=swap');
        body {
          font-family: 'DM Sans', sans-serif;
          background-color: #07070a;
          color: #f0efe8;
          margin: 0;
          padding: 40px 20px;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background-color: #12121a;
          border: 1px solid #c5a880;
          border-radius: 24px;
          padding: 40px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.5);
        }
        .header {
          text-align: center;
          border-bottom: 2px dashed #c5a880;
          padding-bottom: 30px;
          margin-bottom: 30px;
        }
        .logo {
          font-family: 'Syne', sans-serif;
          font-size: 24px;
          font-weight: 800;
          letter-spacing: 4px;
          color: #c5a880;
          margin-bottom: 10px;
        }
        .subtitle {
          font-size: 11px;
          color: #a5a5b5;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .title {
          font-family: 'Syne', sans-serif;
          font-size: 20px;
          color: #ffffff;
          margin-top: 15px;
          font-weight: bold;
        }
        .section-title {
          font-family: 'Syne', sans-serif;
          font-size: 13px;
          color: #c5a880;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          margin-bottom: 15px;
          font-weight: bold;
          border-bottom: 1px solid rgba(197, 168, 128, 0.2);
          padding-bottom: 6px;
        }
        .info-grid {
          display: grid;
          grid-template-cols: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
          font-size: 12px;
        }
        .info-block {
          background: rgba(255, 255, 255, 0.02);
          border: 1px solid rgba(255, 255, 255, 0.05);
          padding: 15px;
          border-radius: 12px;
        }
        .info-label {
          color: #a5a5b5;
          margin-bottom: 5px;
          font-weight: 500;
        }
        .info-value {
          color: #ffffff;
          font-weight: bold;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 30px;
          font-size: 12px;
        }
        th {
          color: #a5a5b5;
          text-align: left;
          padding-bottom: 10px;
          border-bottom: 1px solid #c5a880;
          text-transform: uppercase;
          font-size: 10px;
          letter-spacing: 1px;
        }
        .total-section {
          background-color: rgba(197, 168, 128, 0.05);
          border: 1px dashed rgba(197, 168, 128, 0.3);
          border-radius: 16px;
          padding: 20px;
          text-align: right;
          margin-bottom: 30px;
        }
        .total-amount {
          font-size: 24px;
          color: #c5a880;
          font-weight: 800;
          font-family: 'Syne', sans-serif;
          margin-top: 5px;
        }
        .footer {
          text-align: center;
          font-size: 10px;
          color: #a5a5b5;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 25px;
          line-height: 1.8;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">L'AMBROISIE</div>
          <div class="subtitle">Michelin 3-Star Gastronomy</div>
          <div class="title">XÁC NHẬN ĐƠN HÀNG THÀNH CÔNG</div>
        </div>

        <div class="info-grid">
          <div class="info-block">
            <div class="section-title">Thông tin khách hàng</div>
            <div style="margin-bottom: 8px;">
              <div class="info-label">Họ tên:</div>
              <div class="info-value">${order.customerName}</div>
            </div>
            <div style="margin-bottom: 8px;">
              <div class="info-label">Số điện thoại:</div>
              <div class="info-value">${order.customerPhone}</div>
            </div>
            ${order.customerEmail ? `
              <div>
                <div class="info-label">Email:</div>
                <div class="info-value" style="word-break: break-all;">${order.customerEmail}</div>
              </div>
            ` : ""}
          </div>

          <div class="info-block">
            <div class="section-title">Chi tiết đơn hàng</div>
            <div style="margin-bottom: 8px;">
              <div class="info-label">Mã đơn hàng:</div>
              <div class="info-value" style="font-family: monospace; font-size: 13px; color: #c5a880;">${order.id}</div>
            </div>
            <div style="margin-bottom: 8px;">
              <div class="info-label">Phương thức:</div>
              <div class="info-value">${orderTypeLabel}</div>
            </div>
            <div>
              <div class="info-label">Thời gian đặt:</div>
              <div class="info-value">${formattedDate}</div>
            </div>
          </div>
        </div>

        ${order.deliveryAddress ? `
          <div class="info-block" style="margin-bottom: 30px; width: 100%; box-sizing: border-box;">
            <div class="section-title">Địa chỉ nhận hàng</div>
            <div class="info-value">${order.deliveryAddress}</div>
          </div>
        ` : ""}

        <div class="section-title">Danh sách món ăn</div>
        <table>
          <thead>
            <tr>
              <th style="width: 45%;">Món ăn</th>
              <th style="width: 15%; text-align: center;">SL</th>
              <th style="width: 20%; text-align: right;">Đơn giá</th>
              <th style="width: 20%; text-align: right;">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${itemRows}
          </tbody>
        </table>

        <div class="total-section">
          <div style="font-size: 11px; color: #a5a5b5; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">
            Tổng tiền hóa đơn
          </div>
          <div class="total-amount">${(order.totalAmount).toLocaleString("vi-VN")} vnđ</div>
        </div>

        <div class="footer">
          Cảm ơn bạn đã lựa chọn trải nghiệm dịch vụ ẩm thực tại L'Ambroisie.<br>
          Mọi thắc mắc về đơn hàng, vui lòng liên hệ Hotline: <strong>+84 28 3829 4000</strong>.<br>
          <span style="color: #c5a880; font-family: 'Syne', sans-serif; font-weight: bold; letter-spacing: 1px; display: inline-block; margin-top: 10px;">
            ResManager - Quản lý Nhà hàng chuyên nghiệp
          </span>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Sends order receipt confirmation via email
 */
export const sendOrderReceiptEmail = async (order: OrderDetails): Promise<string> => {
  const receiptHtml = generateReceiptHtml(order);

  // 1. Save HTML to local directory for browser review
  const fileName = `receipt_${order.id}.html`;
  const filePath = path.join(EMAILS_DIR, fileName);
  fs.writeFileSync(filePath, receiptHtml, "utf8");
  const localUrl = `/uploads/emails/${fileName}`;
  console.log(`✉️ HTML Receipt mockup generated: http://localhost:5000${localUrl}`);

  // 2. If SMTP configuration exists, send the email
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    order.customerEmail
  ) {
    try {
      const port = parseInt(process.env.SMTP_PORT || "587");
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port,
        secure: port === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"L'Ambroisie Gastronomy" <${process.env.SMTP_USER}>`,
        to: order.customerEmail,
        subject: `[L'Ambroisie] Xác Nhận Đơn Hàng Thành Công #${order.id}`,
        html: receiptHtml,
      });

      console.log(`✉️ Confirmation email sent successfully to ${order.customerEmail}`);
    } catch (err) {
      console.error("⚠️ Failed to send email via SMTP, falling back to local HTML receipt logs.");
      console.error((err as Error).message);
    }
  } else {
    console.log("ℹ️ SMTP settings or Customer Email omitted. Email sending skipped (Mockup HTML saved).");
  }

  return localUrl;
};

export interface BookingEmailDetails {
  id: number;
  confirmation_code?: string;
  guest_name: string;
  guest_phone: string;
  guest_email?: string;
  party_size: number;
  start_time: string;
  end_time?: string;
  table_name?: string;
  area_name?: string;
  guest_note?: string;
  pre_order_total?: number;
  deposit_amount?: number;
  deposit_status?: string;
  pre_ordered_items?: {
    name?: string;
    menu_item_name?: string;
    quantity: number;
    unit_price?: number;
    price?: number;
  }[];
}

const generateBookingReceiptHtml = (booking: BookingEmailDetails): string => {
  const dateObj = new Date(booking.start_time);
  const pad = (num: number) => String(num).padStart(2, "0");
  const timePart = `${pad(dateObj.getHours())}:${pad(dateObj.getMinutes())}`;
  const datePart = `${pad(dateObj.getDate())}/${pad(dateObj.getMonth() + 1)}/${dateObj.getFullYear()}`;
  const formattedDate = `${timePart} — ${datePart}`;

  const preOrderedItems = booking.pre_ordered_items || [];
  const itemRowsHtml = preOrderedItems.length > 0
    ? `
      <div style="margin-top: 30px; border-top: 1px solid rgba(189, 160, 106, 0.25); padding-top: 20px;">
        <div style="font-size: 12px; color: #dcb36c; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px;">
          🍳 Món Ăn Đặt Trước
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #d0c4b2;">
          <thead>
            <tr style="border-bottom: 1px solid rgba(189, 160, 106, 0.25); color: #a48c68; text-align: left;">
              <th style="padding: 10px 12px; font-weight: 700;">Tên món</th>
              <th style="padding: 10px 12px; font-weight: 700; text-align: center;">SL</th>
              <th style="padding: 10px 12px; font-weight: 700; text-align: right;">Đơn giá</th>
            </tr>
          </thead>
          <tbody>
            ${preOrderedItems.map((item) => `
              <tr style="border-bottom: 1px solid rgba(189, 160, 106, 0.15);">
                <td style="padding: 12px; color: #f2ebd9; font-weight: 600;">${item.menu_item_name || item.name}</td>
                <td style="padding: 12px; color: #d0c4b2; font-weight: 700; text-align: center;">${item.quantity}</td>
                <td style="padding: 12px; color: #dcb36c; font-weight: 800; text-align: right;">
                  ${((item.unit_price || item.price || 0)).toLocaleString("vi-VN")} đ
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `
    : "";

  const depositHtml = (booking.deposit_amount && booking.deposit_amount > 0)
    ? `
      <div style="background-color: rgba(189, 160, 106, 0.05); border: 1px solid rgba(189, 160, 106, 0.3); border-radius: 4px; padding: 14px 18px; margin-top: 20px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 13px; color: #a48c68; font-weight: 700;">Tiền cọc cần thanh toán (20%):</span>
        <span style="font-size: 16px; color: #dcb36c; font-weight: 800;">
          ${(booking.deposit_amount).toLocaleString("vi-VN")} đ
        </span>
      </div>
    `
    : "";

  return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <title>Xác Nhận Đặt Bàn L'Ambroisie</title>
    </head>
    <body style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #130e0a; color: #f2ebd9; margin: 0; padding: 30px 15px;">
      
      <!-- Outer Border / Inset Border Container -->
      <div style="max-width: 580px; margin: 0 auto; background-color: #18110b; border: 2px solid #bda06a; padding: 12px; border-radius: 4px; box-shadow: 0 15px 40px rgba(0,0,0,0.8);">
        <table style="width: 100%; border-collapse: collapse; border-spacing: 0;">
          <!-- Top Row (Corners and Top Border) -->
          <tr>
            <td style="width: 60px; height: 60px; padding: 12px 0 0 12px; vertical-align: top; line-height: 0;">
              <!-- Top-Left Corner SVG -->
              <svg viewBox="0 0 100 100" fill="none" stroke="#dcb36c" stroke-width="1.2" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" style="width: 60px; height: 60px; display: block; opacity: 0.65;">
                <path d="M 10,10 C 25,10 40,15 45,25 C 47,29 45,35 40,35 C 35,35 32,28 35,22 C 38,16 48,15 55,20 C 65,27 60,42 50,42 C 40,42 35,30 42,20 C 47,12 60,8 75,12" />
                <path d="M 10,10 C 10,25 15,40 25,45 C 29,47 35,45 35,40 C 35,35 28,32 22,35 C 16,38 15,48 20,55 C 27,65 42,60 42,50 C 42,40 30,35 20,42 C 12,47 8,60 12,75" />
                <circle cx="10" cy="10" r="2" fill="#dcb36c" />
              </svg>
            </td>
            <td style="border-top: 1px solid rgba(189, 160, 106, 0.45); padding: 12px 0 0 0; vertical-align: top;">
              <!-- Spacer -->
            </td>
            <td style="width: 60px; height: 60px; padding: 12px 12px 0 0; vertical-align: top; text-align: right; line-height: 0;">
              <!-- Top-Right Corner SVG -->
              <svg viewBox="0 0 100 100" fill="none" stroke="#dcb36c" stroke-width="1.2" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" style="width: 60px; height: 60px; display: block; opacity: 0.65; margin-left: auto; transform: scaleX(-1);">
                <path d="M 10,10 C 25,10 40,15 45,25 C 47,29 45,35 40,35 C 35,35 32,28 35,22 C 38,16 48,15 55,20 C 65,27 60,42 50,42 C 40,42 35,30 42,20 C 47,12 60,8 75,12" />
                <path d="M 10,10 C 10,25 15,40 25,45 C 29,47 35,45 35,40 C 35,35 28,32 22,35 C 16,38 15,48 20,55 C 27,65 42,60 42,50 C 42,40 30,35 20,42 C 12,47 8,60 12,75" />
                <circle cx="10" cy="10" r="2" fill="#dcb36c" />
              </svg>
            </td>
          </tr>

          <!-- Middle Row (Left border & flourish, Main content, Right border & flourish) -->
          <tr>
            <td style="border-left: 1px solid rgba(189, 160, 106, 0.45); padding: 0 0 0 12px; vertical-align: middle; line-height: 0;">
              <!-- Left Side Flourish -->
              <svg viewBox="0 0 50 150" fill="none" stroke="#dcb36c" stroke-width="1.2" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" style="width: 25px; height: 90px; display: block; opacity: 0.45;">
                <path d="M 10,75 C 10,40 40,40 40,20 C 40,5 20,5 20,20 C 20,35 35,50 10,75 Z" />
                <path d="M 10,75 C 10,110 40,110 40,130 C 40,145 20,145 20,130 C 20,115 35,100 10,75 Z" />
              </svg>
            </td>
            <td style="padding: 10px 20px; vertical-align: top;">
              
              <!-- Header -->
              <div style="text-align: center; margin-bottom: 25px;">
                <div style="color: #dcb36c; font-size: 14px; margin-bottom: 12px; letter-spacing: 6px;">✦ ✦ ✦</div>
                <div style="font-family: 'Playfair Display', 'Georgia', serif; font-size: 26px; font-weight: bold; letter-spacing: 3px; color: #dcb36c; margin-bottom: 6px; text-transform: uppercase;">L'AMBROISIE</div>
                <div style="font-size: 10px; color: #a48c68; letter-spacing: 2px; text-transform: uppercase; font-weight: 700;">Nhà Hàng Fine Dining & Thưởng Thức Ẩm Thực</div>
                <div style="color: #bda06a; font-size: 16px; margin: 15px 0;">◆</div>
                
                <div style="font-size: 18px; font-weight: 800; color: #f2ebd9; letter-spacing: 1px; margin-top: 15px;">🎉 XÁC NHẬN ĐẶT BÀN THÀNH CÔNG</div>
                <div style="font-size: 12px; color: #a48c68; letter-spacing: 1px; margin-top: 6px; text-transform: uppercase; font-weight: 700;">
                  MÃ ĐẶT BÀN: #${booking.confirmation_code || booking.id}
                </div>
              </div>

              <hr style="border: 0; border-top: 1px solid rgba(189, 160, 106, 0.25); margin: 25px 0;" />

              <!-- Greeting -->
              <div style="text-align: center; margin-bottom: 25px;">
                <p style="font-family: 'Playfair Display', 'Georgia', serif; font-style: italic; font-size: 18px; color: #dcb36c; margin-top: 0; margin-bottom: 12px;">
                  Xin chào ${booking.guest_name},
                </p>
                <p style="font-size: 13px; color: #d0c4b2; line-height: 1.7; margin-top: 0; max-width: 480px; margin-left: auto; margin-right: auto;">
                  Cảm ơn bạn đã lựa chọn trải nghiệm dịch vụ tại nhà hàng <strong>L'Ambroisie</strong>. Yêu cầu đặt bàn của bạn đã được ghi nhận thành công với các thông tin chi tiết dưới đây:
                </p>
              </div>

              <!-- Information Cards Grid -->
              <table style="width: 100%; border-collapse: collapse; margin-top: 30px; border-top: 1px solid rgba(189, 160, 106, 0.25); border-bottom: 1px solid rgba(189, 160, 106, 0.25); padding: 15px 0;">
                <tr>
                  <td style="width: 50%; vertical-align: top; padding: 15px 10px; border-bottom: 1px solid rgba(189, 160, 106, 0.15); font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    <div style="font-size: 10px; color: #a48c68; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 6px;">THỜI GIAN NHẬN BÀN</div>
                    <div style="font-size: 15px; font-weight: 700; color: #f2ebd9;">${formattedDate}</div>
                  </td>
                  <td style="width: 50%; vertical-align: top; padding: 15px 10px; border-bottom: 1px solid rgba(189, 160, 106, 0.15); font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    <div style="font-size: 10px; color: #a48c68; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 6px;">SỐ LƯỢNG KHÁCH</div>
                    <div style="font-size: 15px; font-weight: 700; color: #f2ebd9;">${booking.party_size} người</div>
                  </td>
                </tr>
                <tr>
                  <td style="width: 50%; vertical-align: top; padding: 15px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    <div style="font-size: 10px; color: #a48c68; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 6px;">BÀN ĂN CHỌN</div>
                    <div style="font-size: 15px; font-weight: 700; color: #dcb36c;">${booking.table_name || "Bàn tự động"} ${booking.area_name ? `(${booking.area_name})` : ""}</div>
                  </td>
                  <td style="width: 50%; vertical-align: top; padding: 15px 10px; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                    <div style="font-size: 10px; color: #a48c68; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 6px;">SỐ ĐIỆN THOẠI</div>
                    <div style="font-size: 15px; font-weight: 700; color: #f2ebd9;">${booking.guest_phone}</div>
                  </td>
                </tr>
              </table>

              ${booking.guest_note ? `
                <div style="margin-top: 25px; border-left: 2px solid #bda06a; padding-left: 15px; text-align: left;">
                  <div style="font-size: 10px; color: #a48c68; text-transform: uppercase; font-weight: 700; letter-spacing: 1px; margin-bottom: 4px;">Ghi chú từ khách hàng:</div>
                  <div style="font-size: 13px; color: #d0c4b2; font-style: italic; font-family: 'Playfair Display', 'Georgia', serif;">"${booking.guest_note}"</div>
                </div>
              ` : ""}

              ${itemRowsHtml}
              ${depositHtml}

              <!-- Notice Box -->
              <div style="margin-top: 30px; text-align: left; font-size: 13px; color: #d0c4b2; line-height: 1.8; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
                <div style="font-weight: 700; color: #dcb36c; margin-bottom: 8px;">
                  📌 Lưu ý từ nhà hàng:
                </div>
                <div style="margin-bottom: 6px;">• Vui lòng có mặt đúng giờ đã hẹn để nhà hàng phục vụ tốt nhất.</div>
                <div style="margin-bottom: 6px;">• Nếu quý khách đến trễ quá 15 phút mà không thông báo trước, bàn có thể được nhường cho khách hàng tiếp theo.</div>
                <div>• Mọi thay đổi hoặc yêu cầu hỗ trợ, vui lòng gọi Hotline: <strong style="color: #dcb36c;">+84 28 3829 4000</strong>.</div>
              </div>

              <!-- Bottom separator and flourish -->
              <div style="text-align: center; margin: 25px 0;">
                <svg width="180" height="30" viewBox="0 0 200 30" fill="none" stroke="#dcb36c" stroke-width="1.2" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" style="opacity: 0.75; display: inline-block;">
                  <!-- Left scroll -->
                  <path d="M 100,15 C 70,15 50,5 40,15 C 30,25 45,25 50,15 C 55,5 30,5 20,15 C 10,25 5,15 15,10" />
                  <!-- Right scroll -->
                  <path d="M 100,15 C 130,15 150,5 160,15 C 170,25 155,25 150,15 C 145,5 170,5 180,15 C 190,25 195,15 185,10" />
                  <!-- Center diamond -->
                  <polygon points="100,10 105,15 100,20 95,15" fill="#dcb36c" />
                </svg>
              </div>

              <!-- Footer -->
              <div style="text-align: center; font-size: 12px; color: #a48c68; line-height: 1.8;">
                Cảm ơn bạn đã tin tưởng dịch vụ của L'Ambroisie.<br>
                <span style="font-family: 'Playfair Display', 'Georgia', serif; font-style: italic; font-weight: 700; color: #dcb36c; font-size: 14px;">Rất hân hạnh được đón tiếp quý khách!</span><br>
                <div style="color: #a48c68; font-size: 10px; font-weight: 700; letter-spacing: 1px; display: inline-block; margin-top: 15px; text-transform: uppercase;">
                  ResManager System — Restaurant & Booking Management
                </div>
              </div>

            </td>
            <td style="border-right: 1px solid rgba(189, 160, 106, 0.45); padding: 0 12px 0 0; vertical-align: middle; text-align: right; line-height: 0;">
              <!-- Right Side Flourish -->
              <svg viewBox="0 0 50 150" fill="none" stroke="#dcb36c" stroke-width="1.2" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" style="width: 25px; height: 90px; display: block; opacity: 0.45; margin-left: auto; transform: scaleX(-1);">
                <path d="M 10,75 C 10,40 40,40 40,20 C 40,5 20,5 20,20 C 20,35 35,50 10,75 Z" />
                <path d="M 10,75 C 10,110 40,110 40,130 C 40,145 20,145 20,130 C 20,115 35,100 10,75 Z" />
              </svg>
            </td>
          </tr>

          <!-- Bottom Row (Corners and Bottom Border) -->
          <tr>
            <td style="width: 60px; height: 60px; padding: 0 0 12px 12px; vertical-align: bottom; line-height: 0;">
              <!-- Bottom-Left Corner SVG -->
              <svg viewBox="0 0 100 100" fill="none" stroke="#dcb36c" stroke-width="1.2" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" style="width: 60px; height: 60px; display: block; opacity: 0.65; transform: scaleY(-1);">
                <path d="M 10,10 C 25,10 40,15 45,25 C 47,29 45,35 40,35 C 35,35 32,28 35,22 C 38,16 48,15 55,20 C 65,27 60,42 50,42 C 40,42 35,30 42,20 C 47,12 60,8 75,12" />
                <path d="M 10,10 C 10,25 15,40 25,45 C 29,47 35,45 35,40 C 35,35 28,32 22,35 C 16,38 15,48 20,55 C 27,65 42,60 42,50 C 42,40 30,35 20,42 C 12,47 8,60 12,75" />
                <circle cx="10" cy="10" r="2" fill="#dcb36c" />
              </svg>
            </td>
            <td style="border-bottom: 1px solid rgba(189, 160, 106, 0.45); padding: 0 0 12px 0; vertical-align: bottom;">
              <!-- Spacer -->
            </td>
            <td style="width: 60px; height: 60px; padding: 0 12px 12px 0; vertical-align: bottom; text-align: right; line-height: 0;">
              <!-- Bottom-Right Corner SVG -->
              <svg viewBox="0 0 100 100" fill="none" stroke="#dcb36c" stroke-width="1.2" stroke-linecap="round" xmlns="http://www.w3.org/2000/svg" style="width: 60px; height: 60px; display: block; opacity: 0.65; margin-left: auto; transform: scale(-1);">
                <path d="M 10,10 C 25,10 40,15 45,25 C 47,29 45,35 40,35 C 35,35 32,28 35,22 C 38,16 48,15 55,20 C 65,27 60,42 50,42 C 40,42 35,30 42,20 C 47,12 60,8 75,12" />
                <path d="M 10,10 C 10,25 15,40 25,45 C 29,47 35,45 35,40 C 35,35 28,32 22,35 C 16,38 15,48 20,55 C 27,65 42,60 42,50 C 42,40 30,35 20,42 C 12,47 8,60 12,75" />
                <circle cx="10" cy="10" r="2" fill="#dcb36c" />
              </svg>
            </td>
          </tr>
        </table>
      </div>
    </body>
    </html>
  `;
};

/**
 * Sends booking confirmation email to customer
 */
export const sendBookingConfirmationEmail = async (booking: BookingEmailDetails): Promise<string> => {
  const bookingHtml = generateBookingReceiptHtml(booking);

  // 1. Save HTML mockup to local directory for instant browser review
  const fileName = `booking_receipt_${booking.confirmation_code || booking.id}.html`;
  const filePath = path.join(EMAILS_DIR, fileName);
  fs.writeFileSync(filePath, bookingHtml, "utf8");
  const localUrl = `/uploads/emails/${fileName}`;
  console.log(`✉️ HTML Booking Receipt generated: http://localhost:5000${localUrl}`);

  // 2. Dispatch real email via SMTP
  const targetEmail = booking.guest_email?.trim();
  const hasRealSmtp =
    process.env.SMTP_HOST &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS &&
    !process.env.SMTP_USER.includes("your_email@gmail.com");

  if (targetEmail) {
    if (hasRealSmtp) {
      try {
        const port = parseInt(process.env.SMTP_PORT || "465");
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port,
          secure: port === 465,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"L'Ambroisie Gastronomy" <${process.env.SMTP_USER}>`,
          to: targetEmail,
          subject: `[L'Ambroisie] Xác Nhận Đặt Bàn Thành Công #${booking.confirmation_code || booking.id}`,
          html: bookingHtml,
        });

        console.log(`🚀 Email xác nhận đặt bàn đã gửi THÀNH CÔNG vào hộp thư: ${targetEmail}`);
      } catch (err) {
        console.error("⚠️ Failed to send booking email via SMTP:", (err as Error).message);
      }
    } else {
      // Auto-fallback: generate real online Ethereal test inbox
      try {
        const testAccount = await nodemailer.createTestAccount();
        const testTransporter = nodemailer.createTransport({
          host: "smtp.ethereal.email",
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        const info = await testTransporter.sendMail({
          from: `"L'Ambroisie Gastronomy" <${testAccount.user}>`,
          to: targetEmail,
          subject: `[L'Ambroisie] Xác Nhận Đặt Bàn Thành Công #${booking.confirmation_code || booking.id}`,
          html: bookingHtml,
        });

        const previewUrl = nodemailer.getTestMessageUrl(info);
        console.log(`✉️ [TEST MODE] Thư đã tạo thành công! Xem trực tuyến tại: ${previewUrl}`);
        console.log(`⚠️ CHÚ Ý: Để thư gửi THẲNG VÀO HỘP THƯ GMAIL THỰC TẾ (${targetEmail}), bạn cần mở tệp be/.env và điền Gmail + Mật khẩu ứng dụng 16 ký tự vào SMTP_USER và SMTP_PASS.`);
      } catch (etherealErr) {
        console.log(`⚠️ CHÚ Ý: Cần điền SMTP_USER (Gmail của bạn) & SMTP_PASS (Mật khẩu ứng dụng) vào tệp be/.env để gửi thư vào Gmail thực tế.`);
      }
    }
  }

  return localUrl;
};

