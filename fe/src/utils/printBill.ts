export const printCashierInvoice = (invoice: any, restaurantName: string = "NHÀ HÀNG RESMANAGER") => {
  const printWindow = window.open("", "_blank", "width=400,height=600");
  if (!printWindow) return;

  const now = new Date();
  const printDate = now.toLocaleDateString("vi-VN");
  const printTime = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

  const tableName = invoice.tableName || "Khách lẻ";
  const invId = invoice.id ? `#${String(invoice.id).slice(-8).toUpperCase()}` : "N/A";
  const guestName = invoice.customerName || invoice.guestName || "";
  const guestPhone = invoice.customerPhone || invoice.guestPhone || "";
  const validItems = (invoice.items || []).filter((item: any) => item.status !== "voided" && item.status !== "cancelled");

  const subtotal = invoice.subtotal !== undefined ? Number(invoice.subtotal) : Number(invoice.totalAmount || 0);
  const tax = Number(invoice.tax || 0);
  const vatRate = Number(invoice.vatRate || (tax > 0 && subtotal > 0 ? Math.round((tax / subtotal) * 100) : 10));
  const discount = Number(invoice.discount || 0);
  const finalAmount = Number(invoice.totalAmount || (subtotal + tax - discount));

  printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8" />
      <title>Hóa đơn thanh toán - ${tableName}</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Courier New', Courier, monospace;
          font-size: 12px;
          width: 80mm;
          padding: 8px 10px;
          color: #111;
        }
        .center { text-align: center; }
        .bold { font-weight: bold; }
        .lg { font-size: 14px; }
        .xl { font-size: 16px; }
        .divider { border-top: 1px dashed #999; margin: 6px 0; }
        .row { display: flex; justify-content: space-between; margin: 3px 0; }
        .col-name { flex: 1; padding-right: 6px; }
        .col-qty { width: 60px; text-align: center; }
        .col-price { width: 70px; text-align: right; }
        .total-row { font-size: 15px; font-weight: bold; margin-top: 6px; }
        .note { font-size: 10px; color: #555; font-style: italic; margin-top: 4px; }
        .item-note { font-size: 10px; color: #777; padding-left: 4px; }
      </style>
    </head>
    <body>
      <div class="center bold lg">${restaurantName}</div>
      <div class="center" style="font-size:10px; margin-bottom:4px;">Hóa đơn thanh toán</div>
      <div class="divider"></div>
      <div class="center bold xl" style="margin: 4px 0;">HÓA ĐƠN THANH TOÁN</div>
      <div class="center bold" style="font-size:14px; margin-bottom:6px;">${tableName}</div>
      <div class="divider"></div>
      <div class="row"><span>Mã Hóa Đơn:</span><span class="bold">${invId}</span></div>
      <div class="row"><span>Ngày:</span><span>${printDate}</span></div>
      <div class="row"><span>Giờ in:</span><span>${printTime}</span></div>
      ${guestName || guestPhone ? `
      <div class="divider"></div>
      ${guestName ? `<div class="row"><span>Khách:</span><span class="bold">${guestName}</span></div>` : ""}
      ${guestPhone ? `<div class="row"><span>SĐT:</span><span>${guestPhone}</span></div>` : ""}
      ` : ""}
      <div class="divider"></div>
      <div class="row bold" style="font-size:11px; color:#555;">
        <span class="col-name">TÊN MÓN</span>
        <span class="col-qty">SL x ĐG</span>
        <span class="col-price">T.TIỀN</span>
      </div>
      <div class="divider"></div>
      ${validItems.map((item: any) => `
        <div class="row">
          <span class="col-name">${item.item_name || item.name || item.menu_item_name || "—"}</span>
          <span class="col-qty">${item.quantity} × ${Number(item.price || item.unit_price || 0).toLocaleString("vi-VN")}</span>
          <span class="col-price">${(item.quantity * Number(item.price || item.unit_price || 0)).toLocaleString("vi-VN")}đ</span>
        </div>
        ${item.kitchen_note ? `<div class="item-note">↳ ${item.kitchen_note}</div>` : ""}
      `).join("")}
      <div class="divider"></div>
      <div class="row">
        <span>Tạm tính:</span>
        <span>${subtotal.toLocaleString("vi-VN")} đ</span>
      </div>
      ${tax > 0 ? `
      <div class="row">
        <span>VAT (${vatRate}%):</span>
        <span>+${tax.toLocaleString("vi-VN")} đ</span>
      </div>
      ` : ""}
      ${discount > 0 ? `
      <div class="row">
        <span>Voucher/Giảm giá:</span>
        <span>-${discount.toLocaleString("vi-VN")} đ</span>
      </div>
      ` : ""}
      <div class="divider"></div>
      <div class="row total-row">
        <span>TỔNG THANH TOÁN:</span>
        <span>${finalAmount.toLocaleString("vi-VN")} đ</span>
      </div>
      <div class="divider"></div>
      <div class="center note" style="margin-top:8px;">Cảm ơn quý khách và hẹn gặp lại!</div>
    </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 300);
};
