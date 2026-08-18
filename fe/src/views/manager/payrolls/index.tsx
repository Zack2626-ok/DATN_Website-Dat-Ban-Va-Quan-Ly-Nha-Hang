import React, { useEffect, useState } from "react";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { CircleDollarSign, CheckCircle2, RefreshCw, Printer, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";

interface Payroll {
  id: number;
  user_id: string;
  month: number;
  year: number;
  total_hours: string;
  hourly_rate: string;
  total_salary: string;
  status: "pending" | "paid";
  paid_at: string | null;
  full_name: string;
  role_name: string;
  employee_code: string;
}

const PayrollPage: React.FC = () => {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [month, setMonth] = useState(8);
  const [year, setYear] = useState(2026);

  const generateMonths = () => {
    const list = [];
    const startDate = new Date(2026, 7); // index 7 is August
    for (let i = 0; i < 24; i++) {
      const d = new Date(startDate.getFullYear(), startDate.getMonth() - i, 1);
      list.push({
        month: d.getMonth() + 1,
        year: d.getFullYear(),
        label: `Tháng ${d.getMonth() + 1} / ${d.getFullYear()}`
      });
    }
    return list;
  };

  const fetchPayrolls = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/payrolls`, {
        params: { month, year }
      });
      setPayrolls(res.data.data || []);
    } catch (error) {
      toast.error("Không thể tải danh sách bảng lương");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayrolls();
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
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; color: #333; line-height: 1.6; }
            .receipt-box { max-width: 600px; margin: 0 auto; border: 1px solid #ddd; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05); }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 15px; }
            .header h2 { margin: 0; color: #111; }
            .header p { margin: 5px 0 0; color: #666; font-size: 14px; }
            .info-row { display: flex; justify-content: space-between; margin: 15px 0; border-bottom: 1px dashed #eee; padding-bottom: 5px; }
            .info-label { font-weight: 600; color: #555; }
            .info-value { color: #111; }
            .total-salary { font-size: 20px; font-weight: bold; color: #10b981; margin-top: 25px; border-top: 2px solid #eee; padding-top: 15px; }
            .footer { text-align: center; margin-top: 40px; font-size: 12px; color: #999; }
          </style>
        </head>
        <body>
          <div class="receipt-box">
            <div class="header">
              <h2>PHIẾU LƯƠNG NHÂN VIÊN</h2>
              <p>Tháng ${p.month} / Năm ${p.year}</p>
            </div>
            <div class="info-row">
              <span class="info-label">Mã Nhân Viên:</span>
              <span class="info-value">${p.employee_code}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Tên Nhân Viên:</span>
              <span class="info-value">${p.full_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Chức Vụ:</span>
              <span class="info-value" style="text-transform: capitalize;">${p.role_name}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Số Giờ Làm Việc:</span>
              <span class="info-value">${Number(p.total_hours).toFixed(1)} giờ</span>
            </div>
            <div class="info-row">
              <span class="info-label">Lương / Giờ:</span>
              <span class="info-value">${Number(p.hourly_rate).toLocaleString('vi-VN')} đ/giờ</span>
            </div>
            <div class="info-row">
              <span class="info-label">Trạng Thái:</span>
              <span class="info-value" style="font-weight: 600; color: ${p.status === 'paid' ? '#10b981' : '#f59e0b'};">
                ${p.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
              </span>
            </div>
            ${p.paid_at ? `
            <div class="info-row">
              <span class="info-label">Ngày Thanh Toán:</span>
              <span class="info-value">${new Date(p.paid_at).toLocaleString('vi-VN')}</span>
            </div>
            ` : ''}
            <div class="info-row total-salary">
              <span class="info-label" style="color: #111;">TỔNG LƯƠNG NHẬN:</span>
              <span class="info-value">${Number(p.total_salary).toLocaleString('vi-VN')} đ</span>
            </div>
            <div class="footer">
              <p>Bản in tự động từ hệ thống ResManager Bistro</p>
              <p>Ngày in: ${new Date().toLocaleString('vi-VN')}</p>
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
      ["", "Lương mỗi giờ (đ):", Number(p.hourly_rate), ""],
      ["", "Tổng tiền lương (đ):", Number(p.total_salary), ""],
      ["", "Trạng thái:", p.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán', ""],
      ["", "Ngày thanh toán:", p.paid_at ? new Date(p.paid_at).toLocaleString('vi-VN') : 'Chưa thanh toán', ""],
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
    // C12 -> Row 12 (0-indexed 11) is Tổng số giờ làm
    // C13 -> Row 13 (0-indexed 12) is Lương mỗi giờ
    // C14 -> Row 14 (0-indexed 13) is Tổng tiền lương
    if (worksheet["C12"]) worksheet["C12"].z = "0.0";
    if (worksheet["C13"]) worksheet["C13"].z = "#,##0\" đ\"";
    if (worksheet["C14"]) worksheet["C14"].z = "#,##0\" đ\"";

    worksheet["!cols"] = [
      { wch: 4 },   // Column A (indent spacer)
      { wch: 22 },  // Column B
      { wch: 30 },  // Column C
      { wch: 30 }   // Column D
    ];

    XLSX.writeFile(workbook, `Phieu_Luong_${p.employee_code}_T${p.month}_${p.year}.xlsx`);
    toast.success("Xuất file Excel thành công!");
  };

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
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
                <th className="px-6 py-4">Mã NV</th>
                <th className="px-6 py-4">Tên Nhân Viên</th>
                <th className="px-6 py-4">Chức Vụ</th>
                <th className="px-6 py-4 text-right">Số Giờ (h)</th>
                <th className="px-6 py-4 text-right">Lương / Giờ</th>
                <th className="px-6 py-4 text-right">Tổng Lương</th>
                <th className="px-6 py-4 text-center">Trạng Thái</th>
                <th className="px-6 py-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : payrolls.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500">
                    Chưa có dữ liệu lương cho tháng này.
                  </td>
                </tr>
              ) : (
                payrolls.map((p) => (
                  <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm">{p.employee_code}</td>
                    <td className="px-6 py-4 font-medium text-sm text-gray-900">{p.full_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-500 capitalize">{p.role_name}</td>
                    <td className="px-6 py-4 text-sm text-right">{Number(p.total_hours).toFixed(1)}</td>
                    <td className="px-6 py-4 text-sm text-right">{Number(p.hourly_rate).toLocaleString('vi-VN')} đ</td>
                    <td className="px-6 py-4 font-semibold text-sm text-right text-gray-900">
                      {Number(p.total_salary).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                        p.status === 'paid' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.status === 'paid' ? 'Đã thanh toán' : 'Chờ thanh toán'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-3">
                        <button 
                          onClick={() => handlePrint(p)}
                          className="text-blue-600 hover:text-blue-700 p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                          title="In phiếu lương"
                        >
                          <Printer size={18} />
                        </button>
                        
                        <button 
                          onClick={() => handleExportExcel(p)}
                          className="text-emerald-600 hover:text-emerald-700 p-1.5 rounded-full hover:bg-emerald-50 transition-colors"
                          title="Xuất Excel"
                        >
                          <FileSpreadsheet size={18} />
                        </button>

                        {p.status === 'pending' ? (
                          <button 
                            onClick={() => handleMarkAsPaid(p.id)}
                            className="text-green-600 hover:text-green-700 p-1.5 rounded-full hover:bg-green-50 transition-colors"
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PayrollPage;
