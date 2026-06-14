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
          ${(item.price * 1000).toLocaleString("vi-VN")} vnđ
        </td>
        <td style="padding: 12px 0; color: #c5a880; font-weight: bold; text-align: right;">
          ${(item.price * item.quantity * 1000).toLocaleString("vi-VN")} vnđ
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
          <div class="total-amount">${(order.totalAmount * 1000).toLocaleString("vi-VN")} vnđ</div>
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
