import React, { useEffect, useState } from "react";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { CircleDollarSign, CheckCircle2, RefreshCw, Printer, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { io } from "socket.io-client";

interface Payroll {
  id: number;
  user_id: string;
  month: number;
  year: number;
  total_hours: string;
  hourly_rate: string;
  total_salary: string;
  holiday_bonus?: string | number;
  status: "pending" | "paid";
  paid_at: string | null;
  full_name: string;
  role_name: string;
  employee_code: string;
}

const PayrollPage: React.FC = () => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const generateMonths = () => {
    const list = [];
    const startYear = 2024;
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;

    for (let y = currentYear; y >= startYear; y--) {
      const endM = (y === currentYear) ? currentMonth : 12;
      for (let m = endM; m >= 1; m--) {
        list.push({
          month: m,
          year: y,
          label: `Tháng ${m} / ${y}`
        });
      }
    }
    return list;
  };

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payrolls`, {
        params: { month, year, page: 1, limit: 1000 }
      });
      setPayrolls(res.data.data?.data || []);
    } catch (error) {
      toast.error("Không thể tải danh sách bảng lương");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();

    const socketUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      console.log("Payroll socket connected");
    });

    socket.on("system:attendance_changed", () => {
      console.log("Attendance changed, refreshing payrolls in real-time...");
      fetchPayrolls();
    });

    const handleCustomRefresh = () => {
      fetchPayrolls();
    };
    window.addEventListener("refresh_staff_data", handleCustomRefresh);

    return () => {
      socket.disconnect();
      window.removeEventListener("refresh_staff_data", handleCustomRefresh);
    };
  }, [month, year]);

  const handleMarkAsPaid = async (id: number) => {
    if (!window.confirm("Xác nhận đã thanh toán lương cho nhân viên này?")) return;
    try {
      await api.post(`/payrolls/${id}/pay`, {});
      toast.success("Đã xác nhận thanh toán");
      fetchPayrolls();
    } catch (error) {
      toast.error("Lỗi khi cập nhật trạng thái");
    }
  };

  const handlePrint = (p: Payroll) => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Không thể mở cửa sổ in. Vui lòng tắt chặn pop-up.");
      return;
    }

    const html = `
      <html>
        <head>
          <title>Phiếu Lương - ${p.full_name}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 20px; 
              color: #1e293b; 
              background-color: #f8fafc;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .payslip-container { 
              max-width: 650px; 
              margin: 0 auto; 
              background-color: #ffffff;
              border: 1px solid #e2e8f0; 
              padding: 40px; 
              border-radius: 12px; 
              box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05); 
            }
            .header-section { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              border-bottom: 2px solid #e2e8f0; 
              padding-bottom: 20px;
              margin-bottom: 24px;
            }
            .brand-name {
              font-size: 20px;
              font-weight: 700;
              color: #0f172a;
              letter-spacing: -0.025em;
            }
            .brand-sub {
              font-size: 12px;
              color: #64748b;
              margin-top: 2px;
            }
            .document-title {
              text-align: right;
            }
            .document-title h1 {
              margin: 0;
              font-size: 22px;
              font-weight: 800;
              color: #10b981;
              letter-spacing: -0.025em;
            }
            .document-title p {
              margin: 4px 0 0 0;
              font-size: 13px;
              color: #64748b;
              font-weight: 500;
            }
            .employee-info-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 12px 24px;
              background-color: #f8fafc;
              border: 1px solid #f1f5f9;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 28px;
            }
            .info-item {
              display: flex;
              flex-direction: column;
            }
            .info-label {
              font-size: 11px;
              font-weight: 600;
              color: #94a3b8;
              text-transform: uppercase;
              letter-spacing: 0.05em;
            }
            .info-val {
              font-size: 14px;
              font-weight: 600;
              color: #334155;
              margin-top: 2px;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 28px;
            }
            .details-table th {
              background-color: #f1f5f9;
              color: #475569;
              font-size: 12px;
              font-weight: 600;
              text-align: left;
              padding: 10px 16px;
              text-transform: uppercase;
              letter-spacing: 0.025em;
            }
            .details-table td {
              padding: 14px 16px;
              font-size: 13.5px;
              border-bottom: 1px solid #e2e8f0;
              color: #334155;
            }
            .details-table tr:last-child td {
              border-bottom: none;
            }
            .grand-total-row {
              background-color: #f8fafc;
              font-weight: 700;
            }
            .grand-total-label {
              font-size: 14px;
              color: #0f172a;
              font-weight: 700;
            }
            .grand-total-val {
              font-size: 18px;
              color: #10b981;
              font-weight: 800;
              text-align: right;
            }
            .payment-badge-container {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border: 1px solid #e2e8f0;
              padding: 16px 20px;
              border-radius: 8px;
              margin-bottom: 32px;
            }
            .badge-status {
              display: inline-flex;
              align-items: center;
              padding: 4px 12px;
              border-radius: 9999px;
              font-size: 12px;
              font-weight: 600;
            }
            .badge-paid {
              background-color: #d1fae5;
              color: #065f46;
            }
            .badge-pending {
              background-color: #fef3c7;
              color: #92400e;
            }
            .signatures-section {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 40px;
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
            }
            .signature-title {
              font-size: 13px;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
              letter-spacing: 0.025em;
            }
            .signature-sub {
              font-size: 11px;
              color: #94a3b8;
              margin-top: 2px;
            }
            .signature-space {
              height: 70px;
            }
            .footer-info {
              text-align: center;
              margin-top: 48px;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              padding-top: 16px;
            }
            @media print {
              body {
                background-color: #ffffff;
                padding: 0;
              }
              .payslip-container {
                border: none;
                box-shadow: none;
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="payslip-container">
            <div class="header-section">
              <div>
                <div class="brand-name">🍽️ RESMANAGER BISTRO</div>
                <div class="brand-sub">Hệ thống quản lý nhà hàng thông minh</div>
              </div>
              <div class="document-title">
                <h1>PHIẾU LƯƠNG CHI TIẾT</h1>
                <p>Tháng ${p.month} / Năm ${p.year}</p>
              </div>
            </div>

            <div class="employee-info-grid">
              <div class="info-item">
                <span class="info-label">Mã Nhân Viên</span>
                <span class="info-val">${p.employee_code}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Họ và Tên</span>
                <span class="info-val">${p.full_name}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Chức Vụ</span>
                <span class="info-val" style="text-transform: capitalize;">${p.role_name}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Ngày Xuất Phiếu</span>
                <span class="info-val">${new Date().toLocaleDateString('vi-VN')}</span>
              </div>
            </div>

            <table class="details-table">
               <thead>
                 <tr>
                   <th>Hạng mục lương</th>
                   <th style="text-align: right;">Chi tiết định mức</th>
                   <th style="text-align: right;">Thành tiền</th>
                 </tr>
               </thead>
               <tbody>
                 <tr>
                   <td>Lương cơ bản theo giờ</td>
                   <td style="text-align: right; font-weight: 600;">${Number(p.total_hours).toFixed(2)} giờ × ${Number(p.hourly_rate).toLocaleString('vi-VN')} đ/giờ</td>
                   <td style="text-align: right; font-weight: 600;">${Math.round(Number(p.total_hours) * Number(p.hourly_rate)).toLocaleString('vi-VN')} đ</td>
                 </tr>
                 <tr>
                   <td>Thưởng làm việc ngày lễ Tết (lịch VN)</td>
                   <td style="text-align: right; font-weight: 600;">Hệ số x3 cho giờ làm ngày lễ (cộng thêm x2)</td>
                   <td style="text-align: right; font-weight: 600;">${Number(p.holiday_bonus || 0).toLocaleString('vi-VN')} đ</td>
                 </tr>
                 <tr class="grand-total-row">
                   <td class="grand-total-label">Tổng cộng lương thực nhận</td>
                   <td style="text-align: right; color: #64748b;">-</td>
                   <td class="grand-total-val">${Number(p.total_salary).toLocaleString('vi-VN')} đ</td>
                 </tr>
               </tbody>
             </table>

            <div class="signatures-section">
              <div>
                <span class="signature-title">Người lập biểu</span>
                <span class="signature-sub">(Ký, ghi rõ họ tên)</span>
                <div class="signature-space"></div>
                <div style="border-bottom: 1px dashed #cbd5e1; width: 150px; margin: 0 auto;"></div>
              </div>
              <div>
                <span class="signature-title">Người nhận lương</span>
                <span class="signature-sub">(Ký, ghi rõ họ tên)</span>
                <div class="signature-space"></div>
                <div style="border-bottom: 1px dashed #cbd5e1; width: 150px; margin: 0 auto;"></div>
              </div>
            </div>
            <div class="footer-info">
              <p>Phiếu thanh toán được trích xuất tự động bởi ResManager Bistro.</p>
              <p>Mọi thắc mắc vui lòng liên hệ bộ phận Kế toán / Nhân sự để giải quyết.</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleExportExcel = (p: Payroll) => {
    const aoaData = [
      [""],
      ["", "RESMANAGER BISTRO", "", ""],
      ["", "PHIẾU THANH TOÁN LƯƠNG CHI TIẾT", "", ""],
      ["", `Kỳ lương: Tháng ${p.month} / Năm ${p.year}`, "", ""],
      [""],
      ["", "I. THÔNG TIN NHÂN VIÊN", "", ""],
      ["", "Mã nhân viên:", p.employee_code, ""],
      ["", "Họ và tên:", p.full_name, ""],
      ["", "Chức vụ:", p.role_name.charAt(0).toUpperCase() + p.role_name.slice(1), ""],
      [""],
      ["", "II. CHI TIẾT LƯƠNG & CHẤM CÔNG", "", ""],
      ["", "Tổng số giờ làm (h):", Number(p.total_hours), ""],
      ["", "Lương mỗi giờ (đ/h):", Number(p.hourly_rate), ""],
      ["", "Lương cơ bản theo giờ (đ):", Number(p.total_hours) * Number(p.hourly_rate), ""],
      ["", "Thưởng ngày lễ Tết (đ):", Number(p.holiday_bonus || 0), ""],
      ["", "Tổng tiền lương thực nhận (đ):", Number(p.total_salary), ""],
      [""],
      ["", "III. XÁC NHẬN CHI TRẢ", "", ""],
      ["", "Người lập biểu", "", "Người nhận lương"],
      ["", "(Ký và ghi rõ họ tên)", "", "(Ký và ghi rõ họ tên)"],
      [""],
      [""],
      [""],
      ["", `Ngày xuất file: ${new Date().toLocaleString('vi-VN')}`, "", ""]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Phieu Luong");

    // Apply specific number formats to numeric cells
    if (worksheet["C12"]) worksheet["C12"].z = "0.00";
    if (worksheet["C13"]) worksheet["C13"].z = "#,##0\" đ\"";
    if (worksheet["C14"]) worksheet["C14"].z = "#,##0\" đ\"";
    if (worksheet["C15"]) worksheet["C15"].z = "#,##0\" đ\"";
    if (worksheet["C16"]) worksheet["C16"].z = "#,##0\" đ\"";

    worksheet["!cols"] = [
      { wch: 4 },   // Column A (indent spacer)
      { wch: 28 },  // Column B: labels
      { wch: 30 },  // Column C: values
      { wch: 30 }   // Column D
    ];

    XLSX.writeFile(workbook, `Phieu_Luong_${p.employee_code}_T${p.month}_${p.year}.xlsx`);
    toast.success("Xuất file Excel thành công!");
  };

  const handleExportAllExcel = () => {
    if (payrolls.length === 0) {
      toast.error("Không có dữ liệu để xuất Excel!");
      return;
    }

    const header = [
      [""],
      ["", "RESMANAGER BISTRO", "", "", "", "", "", "", "", ""],
      ["", "BẢNG LƯƠNG TỔNG HỢP NHÂN VIÊN", "", "", "", "", "", "", "", ""],
      ["", `Kỳ lương: Tháng ${month} / Năm ${year}`, "", "", "", "", "", "", "", ""],
      [""],
      [
        "",
        "STT",
        "Mã nhân viên",
        "Họ và tên",
        "Chức vụ",
        "Số giờ làm (h)",
        "Lương / Giờ (đ)",
        "Thưởng lễ Tết (đ)",
        "Tổng lương thực nhận (đ)",
        "Trạng thái",
        "Ngày thanh toán"
      ]
    ];

    const rows = payrolls.map((p, index) => [
      "",
      index + 1,
      p.employee_code,
      p.full_name,
      p.role_name.charAt(0).toUpperCase() + p.role_name.slice(1),
      Number(p.total_hours),
      Number(p.hourly_rate),
      Number(p.holiday_bonus || 0),
      Number(p.total_salary),
      p.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán',
      p.paid_at ? new Date(p.paid_at).toLocaleDateString('vi-VN') : '-'
    ]);

    const totalHours = payrolls.reduce((sum, p) => sum + Number(p.total_hours), 0);
    const totalHolidayBonus = payrolls.reduce((sum, p) => sum + Number(p.holiday_bonus || 0), 0);
    const totalSalary = payrolls.reduce((sum, p) => sum + Number(p.total_salary), 0);

    const totalRow = [
      "",
      "",
      "TỔNG CỘNG",
      "",
      "",
      totalHours,
      "",
      totalHolidayBonus,
      totalSalary,
      "",
      ""
    ];

    const footer = [
      [""],
      ["", "Người lập biểu", "", "", "Kế toán trưởng", "", "", "Giám đốc duyệt", "", ""],
      ["", "(Ký và ghi rõ họ tên)", "", "", "(Ký và ghi rõ họ tên)", "", "", "(Ký và ghi rõ họ tên)", "", ""],
      [""],
      [""],
      [""],
      ["", `Ngày lập báo cáo: ${new Date().toLocaleString('vi-VN')}`, "", "", "", "", "", "", "", ""]
    ];

    const aoaData = [
      ...header,
      ...rows,
      totalRow,
      ...footer
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bang Luong Tong Hop");

    // Apply number formats
    const startRowIdx = 7;
    const endRowIdx = startRowIdx + payrolls.length; // 1-indexed

    for (let r = startRowIdx; r <= endRowIdx; r++) {
      const hoursCell = worksheet[`F${r}`];
      const rateCell = worksheet[`G${r}`];
      const bonusCell = worksheet[`H${r}`];
      const salaryCell = worksheet[`I${r}`];

      if (hoursCell) hoursCell.z = "0.00";
      if (rateCell) rateCell.z = "#,##0\" đ\"";
      if (bonusCell) bonusCell.z = "#,##0\" đ\"";
      if (salaryCell) salaryCell.z = "#,##0\" đ\"";
    }

    const totalRowIdx = endRowIdx + 1;
    if (worksheet[`F${totalRowIdx}`]) worksheet[`F${totalRowIdx}`].z = "0.00";
    if (worksheet[`H${totalRowIdx}`]) worksheet[`H${totalRowIdx}`].z = "#,##0\" đ\"";
    if (worksheet[`I${totalRowIdx}`]) worksheet[`I${totalRowIdx}`].z = "#,##0\" đ\"";

    worksheet["!cols"] = [
      { wch: 4 },   // Column A (indent spacer)
      { wch: 6 },   // Column B: STT
      { wch: 15 },  // Column C: Mã NV
      { wch: 25 },  // Column D: Tên NV
      { wch: 15 },  // Column E: Chức vụ
      { wch: 18 },  // Column F: Số giờ làm
      { wch: 18 },  // Column G: Lương / Giờ
      { wch: 18 },  // Column H: Thưởng lễ Tết
      { wch: 25 },  // Column I: Tổng lương
      { wch: 18 },  // Column J: Trạng thái
      { wch: 18 }   // Column K: Ngày thanh toán
    ];

    XLSX.writeFile(workbook, `Bang_Luong_Tong_Hop_T${month}_${year}.xlsx`);
    toast.success("Xuất bảng lương tổng hợp thành công!");
  };

  const handlePrintAll = () => {
    if (payrolls.length === 0) {
      toast.error("Không có dữ liệu để in!");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Không thể mở cửa sổ in. Vui lòng tắt chặn pop-up.");
      return;
    }

    const totalHours = payrolls.reduce((sum, p) => sum + Number(p.total_hours), 0);
    const totalHolidayBonus = payrolls.reduce((sum, p) => sum + Number(p.holiday_bonus || 0), 0);
    const totalSalary = payrolls.reduce((sum, p) => sum + Number(p.total_salary), 0);

    const rowsHtml = payrolls.map((p, index) => `
      <tr>
        <td style="text-align: center; padding: 10px 8px;">${index + 1}</td>
        <td style="padding: 10px 8px;">${p.employee_code}</td>
        <td style="font-weight: 600; padding: 10px 8px;">${p.full_name}</td>
        <td style="text-transform: capitalize; padding: 10px 8px;">${p.role_name}</td>
        <td style="text-align: right; padding: 10px 8px;">${Number(p.total_hours).toFixed(2)}</td>
        <td style="text-align: right; padding: 10px 8px;">${Number(p.hourly_rate).toLocaleString('vi-VN')} đ</td>
        <td style="text-align: right; padding: 10px 8px; color: #b45309; font-weight: 500;">${Number(p.holiday_bonus || 0).toLocaleString('vi-VN')} đ</td>
        <td style="text-align: right; font-weight: 700; padding: 10px 8px;">${Number(p.total_salary).toLocaleString('vi-VN')} đ</td>
      </tr>
    `).join("");

    const html = `
      <html>
        <head>
          <title>Bảng Lương Tổng Hợp - Tháng ${month}/${year}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            body { 
              font-family: 'Inter', sans-serif; 
              padding: 20px; 
              color: #1e293b; 
              background-color: #ffffff;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }
            .payslip-container { 
              max-width: 1000px; 
              margin: 0 auto; 
              padding: 20px; 
            }
            .header-section { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              border-bottom: 2px solid #e2e8f0; 
              padding-bottom: 16px;
              margin-bottom: 24px;
            }
            .brand-name {
              font-size: 18px;
              font-weight: 700;
              color: #0f172a;
            }
            .brand-sub {
              font-size: 12px;
              color: #64748b;
              margin-top: 2px;
            }
            .document-title {
              text-align: right;
            }
            .document-title h1 {
              margin: 0;
              font-size: 20px;
              font-weight: 800;
              color: #1e293b;
            }
            .document-title p {
              margin: 4px 0 0 0;
              font-size: 13px;
              color: #64748b;
              font-weight: 500;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 28px;
            }
            .details-table th {
              background-color: #f1f5f9;
              color: #475569;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.05em;
              border: 1px solid #cbd5e1;
              padding: 10px 8px;
            }
            .details-table td {
              font-size: 13px;
              border: 1px solid #e2e8f0;
              color: #334155;
            }
            .grand-total-row {
              background-color: #f8fafc;
              font-weight: 700;
            }
            .grand-total-row td {
              border: 1px solid #cbd5e1;
              padding: 12px 8px;
            }
            .signatures-section {
              display: flex;
              justify-content: flex-end;
              margin-top: 50px;
              padding-top: 20px;
              padding-right: 40px;
            }
            .signature-block {
              text-align: center;
              width: 250px;
            }
            .signature-title {
              font-size: 13px;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
            }
            .signature-sub {
              font-size: 11px;
              color: #94a3b8;
              margin-top: 2px;
            }
            .signature-space {
              height: 90px;
            }
            .footer-info {
              text-align: center;
              margin-top: 48px;
              font-size: 11px;
              color: #94a3b8;
              border-top: 1px solid #f1f5f9;
              padding-top: 16px;
            }
            @media print {
              body {
                padding: 0;
              }
              .payslip-container {
                padding: 0;
                max-width: 100%;
              }
            }
          </style>
        </head>
        <body>
          <div class="payslip-container">
            <div class="header-section">
              <div>
                <div class="brand-name">🍽️ RESMANAGER BISTRO</div>
                <div class="brand-sub">Hệ thống quản lý nhà hàng thông minh</div>
              </div>
              <div class="document-title">
                <h1>BẢNG TỔNG HỢP THANH TOÁN LƯƠNG NHÂN VIÊN</h1>
                <p>Kỳ lương: Tháng ${month} / Năm ${year}</p>
              </div>
            </div>

            <table class="details-table">
              <thead>
                <tr>
                  <th style="width: 5%;">STT</th>
                  <th style="width: 10%;">Mã NV</th>
                  <th style="width: 20%; text-align: left;">Họ và Tên</th>
                  <th style="width: 12%; text-align: left;">Chức Vụ</th>
                  <th style="width: 13%; text-align: right;">Số Giờ Làm (h)</th>
                  <th style="width: 13%; text-align: right;">Lương / Giờ</th>
                  <th style="width: 13%; text-align: right;">Thưởng Lễ Tết</th>
                  <th style="width: 14%; text-align: right;">Tổng Thực Nhận</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
                <tr class="grand-total-row">
                  <td colspan="4" style="text-align: center; font-weight: 800;">TỔNG CỘNG LŨY KẾ</td>
                  <td style="text-align: right; font-weight: 800;">${totalHours.toFixed(2)}</td>
                  <td style="text-align: right; color: #64748b;">-</td>
                  <td style="text-align: right; font-weight: 800; color: #b45309;">${totalHolidayBonus.toLocaleString('vi-VN')} đ</td>
                  <td style="text-align: right; font-weight: 800; color: #10b981;">${totalSalary.toLocaleString('vi-VN')} đ</td>
                </tr>
              </tbody>
            </table>

            <div class="signatures-section">
              <div class="signature-block">
                <span class="signature-title">Người lập biểu</span>
                <span class="signature-sub">(Ký, ghi rõ họ tên)</span>
                <div class="signature-space"></div>
                <div style="border-bottom: 1px dashed #cbd5e1; width: 180px; margin: 0 auto;"></div>
              </div>
            </div>

            <div class="footer-info">
              <p>Báo cáo lương được lập tự động bởi hệ thống ResManager Bistro vào ngày ${new Date().toLocaleDateString('vi-VN')}.</p>
            </div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            }
          </script>
        </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const totalPages = Math.ceil(payrolls.length / rowsPerPage);
  const paginatedPayrolls = payrolls.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CircleDollarSign className="text-green-600" />
            Bảng Lương Nhân Viên
          </h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý và tính lương tự động dựa trên chấm công</p>
        </div>
        
        <div className="flex items-center gap-4 mt-4 md:mt-0">
          <select
            value={`${month}-${year}`}
            onChange={(e) => {
              const [m, y] = e.target.value.split("-").map(Number);
              setMonth(m);
              setYear(y);
            }}
            className="border border-gray-200 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none bg-white font-medium text-gray-700"
          >
            {generateMonths().map((item) => (
              <option key={`${item.month}-${item.year}`} value={`${item.month}-${item.year}`}>
                {item.label}
              </option>
            ))}
          </select>

          <button 
            onClick={handleExportAllExcel}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={16} />
            Xuất Excel Tổng
          </button>

          <button 
            onClick={handlePrintAll}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm font-semibold transition-colors cursor-pointer"
          >
            <Printer size={16} />
            In Bảng Lương Tổng
          </button>

          <button 
            onClick={fetchPayrolls}
            disabled={loading}
            className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500 whitespace-nowrap">
                <th className="px-6 py-4">Mã NV</th>
                <th className="px-6 py-4">Tên Nhân Viên</th>
                <th className="px-6 py-4">Chức Vụ</th>
                <th className="px-6 py-4 text-right">Số Giờ (h)</th>
                <th className="px-6 py-4 text-right">Lương / Giờ</th>
                <th className="px-6 py-4 text-right">Thưởng Lễ Tết</th>
                <th className="px-6 py-4 text-right">Tổng Lương</th>
                <th className="px-6 py-4 text-center">Trạng Thái</th>
                <th className="px-6 py-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-8 text-center text-gray-500">
                    Chưa có dữ liệu lương cho tháng này.
                  </td>
                </tr>
              ) : (
                paginatedPayrolls.map((p) => {
                  const isPaid = p.status === "paid";
                  const displayHours = isPaid ? 0.0 : Number(p.total_hours || 0);
                  const displayHolidayBonus = isPaid ? 0 : Number(p.holiday_bonus || 0);
                  const displaySalary = isPaid ? 0 : Number(p.total_salary || 0);
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                      <td className="px-6 py-4 text-sm font-medium whitespace-nowrap">{p.employee_code || `NV${String(p.user_id).padStart(3, "0")}`}</td>
                      <td className="px-6 py-4 font-medium text-sm text-gray-900 whitespace-nowrap">{p.full_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 capitalize whitespace-nowrap">{p.role_name}</td>
                      <td className="px-6 py-4 text-sm text-right font-mono font-semibold whitespace-nowrap">{displayHours.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm text-right font-mono whitespace-nowrap">{Number(p.hourly_rate || 25000).toLocaleString('vi-VN')} đ</td>
                      <td className="px-6 py-4 text-sm text-right text-amber-600 font-medium font-mono whitespace-nowrap">
                        {displayHolidayBonus.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-6 py-4 font-semibold text-sm text-right text-gray-900 font-mono whitespace-nowrap">
                        {displaySalary.toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <span className={`px-2.5 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                          isPaid 
                            ? 'bg-green-100 text-green-700 border border-green-200' 
                            : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        }`}>
                          {isPaid ? 'Đã thanh toán' : 'Chờ thanh toán'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-3">
                          <button 
                            onClick={() => handlePrint(p)}
                            className="text-blue-600 hover:text-blue-700 p-1.5 rounded-full hover:bg-blue-50 transition-colors cursor-pointer"
                            title="In phiếu lương"
                          >
                            <Printer size={18} />
                          </button>
                          
                          <button 
                            onClick={() => handleExportExcel(p)}
                            className="text-emerald-600 hover:text-emerald-700 p-1.5 rounded-full hover:bg-emerald-50 transition-colors cursor-pointer"
                            title="Xuất Excel"
                          >
                            <FileSpreadsheet size={18} />
                          </button>

                          {!isPaid ? (
                            <button 
                              onClick={() => handleMarkAsPaid(p.id)}
                              className="text-green-600 hover:text-green-700 p-1.5 rounded-full hover:bg-green-50 transition-colors cursor-pointer"
                              title="Xác nhận thanh toán"
                            >
                              <CheckCircle2 size={18} />
                            </button>
                          ) : (
                            <span className="text-gray-300 p-1.5" title="Đã thanh toán">
                              <CheckCircle2 size={18} className="opacity-40 text-gray-400" />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Controls */}
        {payrolls.length > 0 && (
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white px-6 py-4 border-t border-gray-200 text-sm text-gray-500">
            <div className="flex items-center gap-2">
              <span>Số hàng mỗi trang:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded-md px-2 py-1 outline-none bg-white text-gray-700"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center gap-1.5">
              <span>
                Hiển thị <strong>{(currentPage - 1) * rowsPerPage + 1}</strong> - <strong>{Math.min(currentPage * rowsPerPage, payrolls.length)}</strong> trên <strong>{payrolls.length}</strong>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer text-gray-700 text-xs font-semibold"
              >
                Trước
              </button>
              <span className="px-3 py-1 bg-gray-100 rounded-md text-xs font-bold text-gray-700">
                {currentPage} / {totalPages || 1}
              </span>
              <button
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors cursor-pointer text-gray-700 text-xs font-semibold"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PayrollPage;
