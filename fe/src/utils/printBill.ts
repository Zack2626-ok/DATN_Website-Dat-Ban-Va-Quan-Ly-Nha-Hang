import { getComboConstituents } from "./comboHelper";

export const printCashierInvoice = (
  invoice: any,
  restaurantName: string = "NHÀ HÀNG RESMANAGER",
  restaurantInfo?: any
) => {
  let printWindow: Window | null = null;
  try {
    printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      alert("Không thể mở cửa sổ in. Vui lòng cho phép trình duyệt hiển thị cửa sổ bật lên (pop-up) để in hóa đơn.");
      return;
    }
  } catch (err) {
    console.error("Lỗi khi mở cửa sổ in:", err);
    alert("Không thể mở cửa sổ in do bảo mật trình duyệt. Vui lòng cho phép pop-up và thử lại.");
    return;
  }

  try {
    const now = new Date();
    const printDate = now.toLocaleDateString("vi-VN");
    const printTime = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    const tableName = invoice.tableName || invoice.table_name || "Khách lẻ";
    const invId = invoice.order_code || (invoice.id ? `#${String(invoice.id).slice(-8).toUpperCase()}` : "N/A");
    const guestName = invoice.customerName || invoice.customer_name || invoice.guestName || invoice.guest_name || "";
    const guestPhone = invoice.customerPhone || invoice.customer_phone || invoice.guestPhone || invoice.guest_phone || "";
    const allItems = (invoice.items || []).filter((item: any) => item.status !== "cancelled");
    const activeItems = allItems.filter((item: any) => !item.is_refunded && item.status !== "voided");
    const refundedItems = allItems.filter((item: any) => item.is_refunded || item.status === "voided");

    // Tính từ active items (món chưa hoàn)
    const activeSubtotal = activeItems.reduce((s: number, i: any) => s + Number(i.price || i.unit_price || 0) * Number(i.quantity || 1), 0);
    const hasRefund = refundedItems.length > 0;

    // Nếu có món đã hoàn: tính lại toàn bộ từ active items (tránh dùng giá trị cũ từ DB)
    // Nếu không có hoàn: dùng giá trị từ invoice như bình thường
    const originalSubtotal = invoice.subtotal !== undefined ? Number(invoice.subtotal) : activeSubtotal;
    const subtotal = hasRefund ? activeSubtotal : originalSubtotal;

    const vatRateNum = Number(invoice.vatRate || 10);
    const tax = hasRefund
      ? Math.round(activeSubtotal * vatRateNum / 100)
      : Number(invoice.tax || 0);
    const vatRate = vatRateNum;

    const voucherDiscount = invoice.voucherDiscount !== undefined ? Number(invoice.voucherDiscount) : (invoice.pointsDiscount !== undefined ? 0 : Number(invoice.discount || 0));
    const pointsDiscount = Number(invoice.pointsDiscount || 0);
    const discount = Number(invoice.discount || 0);
    const depositAmount = Number(invoice.depositAmount || 0);

    // Discount/điểm giữ nguyên không đổi dù có hoàn tiền
    // (Đây là quyền lợi khách đã được hưởng khi thanh toán)
    const totalDiscount = voucherDiscount + pointsDiscount || discount;

    const finalAmount = hasRefund
      ? Math.max(0, subtotal + tax - totalDiscount - depositAmount)
      : Number(invoice.totalAmount !== undefined ? invoice.totalAmount : Math.max(0, subtotal + tax - depositAmount - discount));


    // Helper in từng món
    const renderItem = (item: any, isRefunded: boolean) => {
      const itemName = item.item_name || item.name || item.menu_item_name || "—";
      const constituents = getComboConstituents(itemName);
      const subItemsHtml = constituents
        ? `<div style="font-size: 9px; color: #555; padding-left: 12px; margin-top: 2px; line-height: 1.2;">
                ${constituents.map((sub: string) => `<div>• ${sub}</div>`).join("")}
               </div>`
        : "";
      const qty = Number(item.quantity || 1);
      const price = Number(item.price || item.unit_price || 0);
      const lineTotal = qty * price;

      if (isRefunded) {
        return `
          <div class="item-block" style="opacity:0.7;">
            <div class="bold" style="font-size: 11px; text-decoration: line-through; color: #dc2626;">${itemName}</div>
            <div style="display: flex; justify-content: space-between; padding-left: 10px; margin-top: 2px; text-decoration: line-through; color: #dc2626;">
              <span>${qty} x ${price.toLocaleString("vi-VN")}</span>
              <span class="bold">[Đã hoàn] -${lineTotal.toLocaleString("vi-VN")}đ</span>
            </div>
            ${subItemsHtml}
          </div>
        `;
      }
      return `
        <div class="item-block">
          <div class="bold" style="font-size: 11px;">${itemName}</div>
          <div style="display: flex; justify-content: space-between; padding-left: 10px; margin-top: 2px;">
            <span>${qty} x ${price.toLocaleString("vi-VN")}</span>
            <span class="bold">${lineTotal.toLocaleString("vi-VN")}đ</span>
          </div>
          ${subItemsHtml}
          ${item.kitchen_note ? `<div class="item-note">↳ ${item.kitchen_note}</div>` : ""}
        </div>
      `;
    };

    const activeItemsHtml = activeItems.map((item: any) => renderItem(item, false)).join("");
    const refundedItemsHtml = refundedItems.map((item: any) => renderItem(item, true)).join("");


    // Meta & Contact Info
    const rAddr = restaurantInfo?.address || "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM";
    const rHotline = restaurantInfo?.hotline || "028 3829 4000";

    // QR Code & Payment Method Info
    const paymentMethod = invoice.paymentMethod || invoice.method || "";
    const bankCode = restaurantInfo?.bank_code || "";
    const bankAcc = restaurantInfo?.bank_account || "";
    const bankAccName = restaurantInfo?.bank_account_name || "";
    const bankName = restaurantInfo?.bank_name || "";
    const desc = `Thanh toan HD${String(invoice.id || "").slice(-6).toUpperCase()}`;

    let qrUrl = "";
    let qrLabel = "";
    let qrDetails = "";

    if (bankCode && bankAcc) {
      if (paymentMethod === "momo") {
        qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`momo://pay?phone=${rHotline}&amount=${Math.round(finalAmount)}&note=${desc}`)}`;
        qrLabel = "Quét mã MoMo để thanh toán";
        qrDetails = `SĐT: ${rHotline} - ${bankAccName}`;
      } else if (paymentMethod === "vnpay") {
        qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?vnp_Amount=${Math.round(finalAmount) * 100}&vnp_TxnRef=${String(invoice.id || "").slice(-6)}&vnp_OrderInfo=${desc}`)}`;
        qrLabel = "Quét mã VNPay để thanh toán";
        qrDetails = "Cổng thanh toán VNPay Sandbox";
      } else if (paymentMethod === "transfer" || paymentMethod === "bank_transfer" || !paymentMethod) {
        // Default to bank transfer VietQR
        qrUrl = `https://img.vietqr.io/image/${bankCode}-${bankAcc}-qr_only.png?amount=${Math.round(finalAmount)}&addInfo=${encodeURIComponent(desc)}`;
        qrLabel = "Quét mã VietQR để thanh toán";
        qrDetails = `${bankName}<br>STK: ${bankAcc} - ${bankAccName}`;
      }
    }

    const methodLabels: Record<string, string> = {
      cash: "Tiền mặt",
      transfer: "Chuyển khoản ngân hàng (VietQR)",
      bank_transfer: "Chuyển khoản ngân hàng (VietQR)",
      card: "Thẻ tín dụng",
      momo: "Ví điện tử MoMo",
      vnpay: "Cổng thanh toán VNPay"
    };
    const methodLabel = methodLabels[paymentMethod] || "Chưa xác định";

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
            width: 76mm;
            margin: 0 auto;
            padding: 4mm 2mm;
            color: #000;
            background-color: #fff;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .lg { font-size: 14px; }
          .xl { font-size: 16px; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .total-row { font-size: 14px; font-weight: bold; margin-top: 4px; }
          .note { font-size: 10px; color: #333; font-style: italic; margin-top: 4px; }
          .item-note { font-size: 10px; color: #555; padding-left: 10px; margin-top: 1px; }
          .qr-section { text-align: center; margin-top: 8px; padding: 6px; border: 1px dashed #000; border-radius: 4px; }
          .qr-section img { width: 120px; height: 120px; margin-top: 4px; }
          .qr-section p { font-size: 10px; margin-top: 2px; }
          .item-block { margin: 4px 0; }
          @media print {
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              width: 76mm;
              margin: 0 auto;
              padding: 2mm 0mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="center bold lg">${restaurantName}</div>
        <div class="center" style="font-size:9px; margin-top:2px;">Địa chỉ: ${rAddr}</div>
        <div class="center" style="font-size:9px;">Hotline: ${rHotline}</div>
        <div class="divider"></div>
        <div class="center bold xl" style="margin: 4px 0;">HÓA ĐƠN THANH TOÁN</div>
        <div class="center bold lg" style="margin-bottom:6px;">${tableName}</div>
        <div class="divider"></div>
        <div class="row"><span>Mã Hóa Đơn:</span><span class="bold">${invId}</span></div>
        ${invoice.arrivedAt ? `<div class="row"><span>Vào bàn:</span><span>${new Date(invoice.arrivedAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}</span></div>` : ""}
        <div class="row"><span>Thời gian in:</span><span>${printDate} ${printTime}</span></div>
        <div class="row"><span>Hình thức thanh toán:</span><span class="bold">${methodLabel}</span></div>
        ${guestName || guestPhone ? `
        <div class="divider"></div>
        ${guestName ? `<div class="row"><span>Khách:</span><span class="bold">${guestName}</span></div>` : ""}
        ${guestPhone ? `<div class="row"><span>SĐT:</span><span>${guestPhone}</span></div>` : ""}
        ` : ""}
        <div class="divider"></div>
        ${activeItemsHtml}
        ${refundedItems.length > 0 ? `<div style="border-top: 1px dashed #dc2626; margin: 4px 0; font-size:9px; color:#dc2626; text-align:center;">— Các món đã hoàn tiền —</div>${refundedItemsHtml}` : ""}
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
        ${voucherDiscount > 0 ? `
        <div class="row">
          <span>Voucher/Gi\u1ea3m gi\u00e1:</span>
          <span>-${voucherDiscount.toLocaleString("vi-VN")} đ</span>
        </div>
        ` : ""}
        ${pointsDiscount > 0 ? `
        <div class="row">
          <span>Kh\u1ea5u tr\u1eeb \u0111i\u1ec3m:</span>
          <span>-${pointsDiscount.toLocaleString("vi-VN")} đ</span>
        </div>
        ` : ""}
        ${(discount > 0 && voucherDiscount === 0 && pointsDiscount === 0) ? `
        <div class="row">
          <span>Voucher/Gi\u1ea3m gi\u00e1:</span>
          <span>-${discount.toLocaleString("vi-VN")} đ</span>
        </div>
        ` : ""}

        ${depositAmount > 0 ? `
        <div class="row">
          <span>Ti\u1ec1n cọc đặt b\u00e0n:</span>
          <span>-${depositAmount.toLocaleString("vi-VN")} đ</span>
        </div>
        ` : ""}

        <div class="divider"></div>
        <div class="row total-row">
          <span>TỔNG THANH TOÁN:</span>
          <span>${finalAmount.toLocaleString("vi-VN")} đ</span>
        </div>
        <div class="divider"></div>

        ${qrUrl && paymentMethod !== "cash" ? `
        <div class="qr-section">
          <p class="bold" style="font-size:10px;">${qrLabel}</p>
          <img src="${qrUrl}" alt="Payment QR" />
          <p class="bold" style="margin-top:4px;">${qrDetails}</p>
          <p style="font-size:8px; color:#555; margin-top:2px;">Nội dung: ${desc}</p>
        </div>
        <div class="divider"></div>
        ` : ""}

        <div class="center note" style="margin-top:8px;">Cảm ơn quý khách và hẹn gặp lại!</div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => {
      printWindow?.close();
    };
    setTimeout(() => {
      if (printWindow) {
        printWindow.print();
      }
    }, 300);
  } catch (err) {
    console.error("Lỗi khi ghi tài liệu in:", err);
    alert("Có lỗi xảy ra khi chuẩn bị bản in. Vui lòng thử lại.");
    if (printWindow) {
      printWindow.close();
    }
  }
};

export const printExpenseInvoice = (
  expense: any,
  restaurantName: string = "NHÀ HÀNG RESMANAGER",
  restaurantInfo?: any
) => {
  let printWindow: Window | null = null;
  try {
    printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) {
      alert("Không thể mở cửa sổ in. Vui lòng cho phép trình duyệt hiển thị cửa sổ bật lên (pop-up) để in hóa đơn.");
      return;
    }
  } catch (err) {
    console.error("Lỗi khi mở cửa sổ in:", err);
    alert("Không thể mở cửa sổ in do bảo mật trình duyệt. Vui lòng cho phép pop-up và thử lại.");
    return;
  }

  try {
    const now = new Date();
    const printDate = now.toLocaleDateString("vi-VN");
    const printTime = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    const formatDateTime = (dateStr: string) => {
      if (!dateStr) return "-";
      const d = new Date(dateStr);
      return d.toLocaleString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    };

    printWindow.document.write(`
      <html>
      <head>
        <title>Hóa đơn thanh toán - #${expense.id}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 0;
          }
          body {
            font-family: 'Courier New', Courier, monospace;
            width: 72mm;
            margin: 0 auto;
            padding: 4mm 2mm;
            font-size: 10px;
            line-height: 1.4;
            color: #000;
          }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .divider { border-top: 1px dashed #000; margin: 6px 0; }
          .title { font-size: 12px; font-weight: bold; letter-spacing: 1px; margin: 6px 0; text-transform: uppercase; }
          .row { display: flex; justify-content: space-between; margin: 3px 0; }
          .total-row { font-size: 11px; font-weight: bold; margin-top: 6px; }
          .signatures { display: grid; grid-template-cols: 1fr 1fr; text-align: center; margin-top: 15px; font-size: 9px; font-family: sans-serif; }
          .signature-space { height: 35px; border-bottom: 1px dashed #aaa; width: 80%; margin: 5px auto; }
        </style>
      </head>
      <body>
        <div class="center">
          <p class="bold" style="font-size: 12px; margin: 0;">${restaurantName.toUpperCase()}</p>
          <p style="font-size: 8px; margin: 2px 0 0 0; color: #555;">ĐƠN VỊ KINH DOANH F&B</p>
          <p style="font-size: 8px; margin: 2px 0 0 0; color: #555;">Địa chỉ: ${restaurantInfo?.address || "123 Nguyễn Huệ, Quận 1, TP.HCM"}</p>
          <p style="font-size: 8px; margin: 2px 0 0 0; color: #555;">Hotline: ${restaurantInfo?.hotline || "028 3829 4000"}</p>
        </div>

        <div class="divider"></div>
        <div class="center title">HÓA ĐƠN THANH TOÁN</div>
        <div class="divider"></div>

        <div class="row">
          <span>Mã hóa đơn:</span>
          <span class="bold">#${expense.id}</span>
        </div>
        <div class="row">
          <span>Hạng mục:</span>
          <span class="bold">${expense.category}</span>
        </div>
        <div class="row">
          <span>Người gửi:</span>
          <span>Ban Quản lý Nhà hàng</span>
        </div>
        <div class="row">
          <span>Người nhận:</span>
          <span class="bold">${expense.payee || "Đơn vị cung cấp lẻ"}</span>
        </div>
        <div class="row">
          <span>Thời gian:</span>
          <span>${formatDateTime(expense.date)}</span>
        </div>
        <div class="row">
          <span style="min-width: 80px;">Ghi chú chi:</span>
          <span style="text-align: right; max-width: 160px; word-wrap: break-word;">${expense.note || "—"}</span>
        </div>

        <div class="divider"></div>
        <div class="row total-row">
          <span>TỔNG THANH TOÁN:</span>
          <span class="bold">-${expense.amount.toLocaleString("vi-VN")} đ</span>
        </div>
        <div class="divider"></div>

        <div class="signatures">
          <div>
            <p>Người gửi (Lập phiếu)</p>
            <div class="signature-space"></div>
            <p class="bold" style="margin-top: 4px;">Quản lý</p>
          </div>
          <div>
            <p>Người nhận (Ký nhận)</p>
            <div class="signature-space"></div>
            <p class="bold" style="margin-top: 4px;">${expense.payee ? expense.payee.slice(0, 12) + (expense.payee.length > 12 ? "..." : "") : "Đại diện nhận"}</p>
          </div>
        </div>

        <div class="divider" style="margin-top: 15px;"></div>
        <p style="font-size: 8px; text-align: center; color: #555; margin: 4px 0 0 0;">Bản in hóa đơn chi phí nội bộ</p>
        <p style="font-size: 8px; text-align: center; color: #555; margin: 2px 0 0 0;">In lúc: ${printTime} ${printDate}</p>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onafterprint = () => {
      printWindow?.close();
    };
    setTimeout(() => {
      if (printWindow) {
        printWindow.print();
      }
    }, 300);
  } catch (err) {
    console.error("Lỗi khi ghi tài liệu in:", err);
    alert("Có lỗi xảy ra khi chuẩn bị bản in. Vui lòng thử lại.");
    if (printWindow) {
      printWindow.close();
    }
  }
};
