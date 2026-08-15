import React, { useEffect, useState } from "react";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { CircleDollarSign, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Expense {
  id: number;
  title: string;
  category: 'rent' | 'utilities' | 'marketing' | 'maintenance' | 'other';
  amount: string;
  is_recurring: number;
  expense_date: string;
  creator_name: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  'rent': 'Mặt bằng',
  'utilities': 'Điện / Nước',
  'marketing': 'Marketing',
  'maintenance': 'Bảo trì',
  'other': 'Khác'
};

const ExpensePage: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const [showModal, setShowModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    title: '',
    category: 'other',
    amount: '',
    is_recurring: false,
    expense_date: format(new Date(), 'yyyy-MM-dd')
  });

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/expenses`, {
        params: { month, year }
      });
      setExpenses(res.data.data || []);
    } catch (error) {
      toast.error("Không thể tải danh sách chi phí");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [month, year]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpense.title || !newExpense.amount || !newExpense.expense_date) {
      toast.error("Vui lòng điền đầy đủ thông tin");
      return;
    }

    try {
      await api.post(`/expenses`, newExpense);
      toast.success("Thêm chi phí thành công");
      setShowModal(false);
      setNewExpense({
        title: '',
        category: 'other',
        amount: '',
        is_recurring: false,
        expense_date: format(new Date(), 'yyyy-MM-dd')
      });
      fetchExpenses();
    } catch (error) {
      toast.error("Lỗi khi thêm chi phí");
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm("Bạn có chắc muốn xoá khoản chi phí này?")) return;
    try {
      await api.delete(`/expenses/${id}`);
      toast.success("Xoá chi phí thành công");
      fetchExpenses();
    } catch (error) {
      toast.error("Lỗi khi xoá");
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CircleDollarSign className="text-red-600" />
            Chi Phí Hoạt Động
          </h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý các khoản chi cố định và phát sinh</p>
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
            onClick={() => setShowModal(true)}
            className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors"
          >
            <Plus size={16} />
            Thêm Khoản Chi
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
                <th className="px-6 py-4">Ngày Chi</th>
                <th className="px-6 py-4">Tên Khoản Chi</th>
                <th className="px-6 py-4">Hạng Mục</th>
                <th className="px-6 py-4 text-right">Số Tiền</th>
                <th className="px-6 py-4 text-center">Định Kỳ</th>
                <th className="px-6 py-4">Người Nhập</th>
                <th className="px-6 py-4 text-center">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu chi phí cho tháng này.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="border-b border-gray-100 hover:bg-gray-50/50">
                    <td className="px-6 py-4 text-sm">{format(new Date(e.expense_date), 'dd/MM/yyyy')}</td>
                    <td className="px-6 py-4 font-medium text-sm text-gray-900">{e.title}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{CATEGORY_LABELS[e.category] || e.category}</td>
                    <td className="px-6 py-4 font-semibold text-sm text-right text-gray-900">
                      {Number(e.amount).toLocaleString('vi-VN')} đ
                    </td>
                    <td className="px-6 py-4 text-center">
                      {e.is_recurring ? (
                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md">Có</span>
                      ) : (
                        <span className="text-gray-400 text-sm">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{e.creator_name || 'System'}</td>
                    <td className="px-6 py-4 text-center">
                      <button 
                        onClick={() => handleDelete(e.id)}
                        className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                        title="Xoá"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-lg">Thêm Chi Phí Mới</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-black">&times;</button>
            </div>
            
            <form onSubmit={handleCreate} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên khoản chi</label>
                <input 
                  type="text" 
                  required
                  value={newExpense.title}
                  onChange={(e) => setNewExpense({...newExpense, title: e.target.value})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
                  placeholder="VD: Tiền điện tháng 8"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VNĐ)</label>
                  <input 
                    type="number" 
                    required
                    min="0"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày chi</label>
                  <input 
                    type="date" 
                    required
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hạng mục</label>
                <select 
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({...newExpense, category: e.target.value as any})}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-black"
                >
                  <option value="rent">Mặt bằng</option>
                  <option value="utilities">Điện / Nước</option>
                  <option value="marketing">Marketing</option>
                  <option value="maintenance">Bảo trì</option>
                  <option value="other">Khác</option>
                </select>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input 
                  type="checkbox" 
                  id="recurring"
                  checked={newExpense.is_recurring}
                  onChange={(e) => setNewExpense({...newExpense, is_recurring: e.target.checked})}
                  className="rounded text-black focus:ring-black"
                />
                <label htmlFor="recurring" className="text-sm text-gray-700 cursor-pointer">
                  Đây là khoản chi định kỳ hàng tháng
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 text-sm font-medium text-white bg-black hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Lưu Chi Phí
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpensePage;
