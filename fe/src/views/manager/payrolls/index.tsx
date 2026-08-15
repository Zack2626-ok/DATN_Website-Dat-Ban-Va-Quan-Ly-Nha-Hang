import React, { useEffect, useState } from "react";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { CircleDollarSign, Calculator, CheckCircle2 } from "lucide-react";

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
  const [calculating, setCalculating] = useState(false);
  
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

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

  const handleCalculate = async () => {
    if (!window.confirm(`Bạn có chắc muốn tự động tính lương tháng ${month}/${year}?`)) return;
    setCalculating(true);
    try {
      await api.post(`/payrolls/calculate`, { month, year });
      toast.success("Tính lương thành công");
      fetchPayrolls();
    } catch (error) {
      toast.error("Lỗi khi tính lương");
    } finally {
      setCalculating(false);
    }
  };

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
            value={month} 
            onChange={(e) => setMonth(Number(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
          >
            {Array.from({length: 12}, (_, i) => i + 1).map(m => (
              <option key={m} value={m}>Tháng {m}</option>
            ))}
          </select>
          <select 
            value={year} 
            onChange={(e) => setYear(Number(e.target.value))}
            className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none"
          >
            {[year - 1, year, year + 1].map(y => (
              <option key={y} value={y}>Năm {y}</option>
            ))}
          </select>

          <button 
            onClick={handleCalculate}
            disabled={calculating}
            className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm disabled:opacity-50 transition-colors"
          >
            <Calculator size={16} />
            {calculating ? "Đang tính..." : "Tính Lương"}
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
                    Chưa có dữ liệu lương cho tháng này. Hãy bấm "Tính Lương".
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
                      {p.status === 'pending' && (
                        <button 
                          onClick={() => handleMarkAsPaid(p.id)}
                          className="text-green-600 hover:text-green-700 p-1 rounded-full hover:bg-green-50 transition-colors"
                          title="Xác nhận thanh toán"
                        >
                          <CheckCircle2 size={18} />
                        </button>
                      )}
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
