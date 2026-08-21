import React, { useEffect, useState, useRef } from "react";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { CircleDollarSign, Plus, Trash2, Upload, Download, History, X } from "lucide-react";
import { format } from "date-fns";
import * as XLSX from "xlsx";

interface Expense {
  id: number;
  title: string;
  category: 'rent' | 'utilities' | 'marketing' | 'maintenance' | 'other';
  amount: string;
  is_recurring: number;
  expense_date: string;
  creator_name: string;
  created_at: string;
  deleted_at?: string;
  deleted_by_name?: string;
  deleted_reason?: string;
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
  const [deletedExpenses, setDeletedExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  const currentDate = new Date();
  const [month, setMonth] = useState(currentDate.getMonth() + 1);
  const [year, setYear] = useState(currentDate.getFullYear());

  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteReason, setDeleteReason] = useState("");

  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [permanentDeletingId, setPermanentDeletingId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fetchDeletedExpenses = async () => {
    try {
      const res = await api.get(`/expenses/deleted`);
      setDeletedExpenses(res.data.data || []);
    } catch (error) {
      toast.error("Không thể tải lịch sử xóa");
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [month, year]);

  useEffect(() => {
    if (showHistory) {
      fetchDeletedExpenses();
    }
  }, [showHistory]);

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

  const confirmDelete = (id: number) => {
    setDeletingId(id);
    setDeleteReason("");
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    if (!deleteReason.trim()) {
      toast.error("Vui lòng nhập lý do xóa");
      return;
    }
    try {
      // Send DELETE request with body data (supported in axios via 'data' property)
      await api.delete(`/expenses/${deletingId}`, { data: { reason: deleteReason } });
      toast.success("Đã xóa chi phí và lưu vào lịch sử");
      setShowDeleteModal(false);
      setDeletingId(null);
      fetchExpenses();
      if (showHistory) fetchDeletedExpenses();
    } catch (error) {
      toast.error("Lỗi khi xoá");
    }
  };

  const handleRestore = async (id: number) => {
    try {
      await api.patch(`/expenses/${id}/restore`);
      toast.success("Khôi phục chi phí thành công");
      fetchDeletedExpenses();
      if (!showHistory) fetchExpenses();
    } catch (error) {
      toast.error("Lỗi khi khôi phục chi phí");
    }
  };

  const confirmPermanentDelete = (id: number) => {
    setPermanentDeletingId(id);
    setShowPermanentDeleteModal(true);
  };

  const handlePermanentDelete = async () => {
    if (!permanentDeletingId) return;
    try {
      await api.delete(`/expenses/${permanentDeletingId}/permanent`);
      toast.success("Đã xóa vĩnh viễn chi phí");
      setShowPermanentDeleteModal(false);
      setPermanentDeletingId(null);
      fetchDeletedExpenses();
    } catch (error) {
      toast.error("Lỗi khi xóa vĩnh viễn");
    }
  };

  const downloadTemplate = () => {
    const wsData = [
      ["Ngay Chi (YYYY-MM-DD)", "Ten Khoan Chi", "Hang Muc", "So Tien"],
      [format(new Date(), 'yyyy-MM-dd'), "Mua giấy vệ sinh", "other", "500000"],
      [format(new Date(), 'yyyy-MM-dd'), "Đóng tiền điện", "utilities", "3500000"]
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_ChiPhi");
    XLSX.writeFile(wb, "Template_NhapChiPhi.xlsx");
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
        
        // Bỏ qua header
        const rows = data.slice(1) as any[];
        const expensesToImport = [];

        for (const row of rows) {
          if (!row || row.length === 0) continue; // Skip totally empty rows
          
          const rawDate = row[0];
          const title = row[1];
          const categoryRaw = String(row[2] || 'other').toLowerCase();
          const rawAmount = row[3];
          
          if (!title) continue; // Title is required

          // Xử lý ngày: Nếu rỗng -> Lấy ngày hiện tại
          const expenseDate = rawDate ? String(rawDate).trim() : format(new Date(), 'yyyy-MM-dd');
          
          // Xử lý tiền: Loại bỏ ký tự lạ, đưa về số
          const amount = Number(String(rawAmount || '').replace(/\D/g, ''));
          if (!amount || isNaN(amount)) continue; // Bỏ qua nếu tiền không hợp lệ

          let category = 'other';
          if (['rent', 'mặt bằng', 'mat bang'].includes(categoryRaw)) category = 'rent';
          else if (['utilities', 'điện', 'nước', 'dien', 'nuoc'].includes(categoryRaw)) category = 'utilities';
          else if (['marketing', 'quảng cáo'].includes(categoryRaw)) category = 'marketing';
          else if (['maintenance', 'bảo trì', 'bao tri'].includes(categoryRaw)) category = 'maintenance';

          expensesToImport.push({
            expense_date: expenseDate,
            title: String(title).trim(),
            category: category,
            amount: amount
          });
        }

        if (expensesToImport.length === 0) {
          toast.error("Không tìm thấy dữ liệu hợp lệ trong file");
          return;
        }

        await api.post('/expenses/import', { expenses: expensesToImport });
        toast.success(`Nhập thành công ${expensesToImport.length} khoản chi`);
        fetchExpenses();
      } catch (error) {
        console.error(error);
        toast.error("Lỗi khi đọc file hoặc nhập dữ liệu");
      }
      
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CircleDollarSign className="text-red-600" />
            Chi Phí Hoạt Động
          </h1>
          <p className="text-gray-500 text-sm mt-1">Quản lý các khoản chi cố định và phát sinh</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors border ${showHistory ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
          >
            <History size={16} />
            {showHistory ? "Quay lại Danh sách" : "Lịch sử Xóa"}
          </button>

          {!showHistory && (
            <>
              <select 
                value={month} 
                onChange={(e) => setMonth(Number(e.target.value))}
                className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none bg-white"
              >
                {Array.from({length: 12}, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>Tháng {m}</option>
                ))}
              </select>
              <select 
                value={year} 
                onChange={(e) => setYear(Number(e.target.value))}
                className="border rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-black outline-none bg-white"
              >
                {[year - 1, year, year + 1].map(y => (
                  <option key={y} value={y}>Năm {y}</option>
                ))}
              </select>

              <div className="flex gap-2">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                
                <div className="relative group">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors"
                  >
                    <Upload size={16} />
                    Nhập Excel
                  </button>
                  <div className="absolute top-full mt-1 right-0 hidden group-hover:block z-10 w-48 bg-white border border-gray-200 rounded-md shadow-lg overflow-hidden">
                    <button 
                      onClick={downloadTemplate}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Download size={14} /> Tải file mẫu (Template)
                    </button>
                  </div>
                </div>

                <button 
                  onClick={() => setShowModal(true)}
                  className="bg-black hover:bg-gray-800 text-white px-4 py-2 rounded-md flex items-center gap-2 text-sm transition-colors"
                >
                  <Plus size={16} />
                  Thêm Khoản Chi
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-sm font-medium text-gray-500">
                <th className="px-6 py-4">{showHistory ? "Ngày Xóa" : "Ngày Chi"}</th>
                <th className="px-6 py-4">Tên Khoản Chi</th>
                <th className="px-6 py-4">Hạng Mục</th>
                <th className="px-6 py-4 text-right">Số Tiền</th>
                {showHistory ? (
                  <>
                    <th className="px-6 py-4">Người Xóa</th>
                    <th className="px-6 py-4 text-red-500">Lý Do Xóa</th>
                    <th className="px-6 py-4 text-center">Thao Tác</th>
                  </>
                ) : (
                  <>
                    <th className="px-6 py-4 text-center">Định Kỳ</th>
                    <th className="px-6 py-4">Người Nhập</th>
                    <th className="px-6 py-4 text-center">Thao Tác</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : showHistory ? (
                deletedExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                      Chưa có lịch sử xóa chi phí.
                    </td>
                  </tr>
                ) : (
                  deletedExpenses.map((e) => (
                    <tr key={e.id} className="border-b border-gray-100 bg-red-50/30">
                      <td className="px-6 py-4 text-sm text-gray-600">{e.deleted_at ? format(new Date(e.deleted_at), 'dd/MM/yyyy HH:mm') : '-'}</td>
                      <td className="px-6 py-4 font-medium text-sm text-gray-600 line-through">{e.title}</td>
                      <td className="px-6 py-4 text-sm text-gray-400">{CATEGORY_LABELS[e.category] || e.category}</td>
                      <td className="px-6 py-4 font-semibold text-sm text-right text-gray-500">
                        {Number(e.amount).toLocaleString('vi-VN')} đ
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-700">{e.deleted_by_name || 'System'}</td>
                      <td className="px-6 py-4 text-sm text-red-600 font-medium">{e.deleted_reason || 'Không có lý do'}</td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={() => handleRestore(e.id)}
                            className="px-3 py-1 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded transition-colors"
                          >
                            Hoàn tác
                          </button>
                          <button
                            onClick={() => confirmPermanentDelete(e.id)}
                            className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded transition-colors"
                          >
                            Xóa hẳn
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )
              ) : (
                expenses.length === 0 ? (
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
                          onClick={() => confirmDelete(e.id)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                          title="Xóa mềm"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Delete Reason Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h2 className="font-bold text-red-600 flex items-center gap-2">
                <Trash2 size={18} /> Xác nhận xóa chi phí
              </h2>
              <button onClick={() => setShowDeleteModal(false)} className="text-gray-400 hover:text-black">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Lý do xóa (Bắt buộc) <span className="text-red-500">*</span></label>
                <textarea 
                  required
                  rows={3}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:border-red-500"
                  placeholder="VD: Nhập sai số tiền, Đã được hoàn trả..."
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handleDelete}
                  disabled={!deleteReason.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Permanent Delete Modal */}
      {showPermanentDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-red-50">
              <h2 className="font-bold text-red-600 flex items-center gap-2">
                <Trash2 size={18} /> Cảnh báo xóa vĩnh viễn
              </h2>
              <button onClick={() => setShowPermanentDeleteModal(false)} className="text-gray-400 hover:text-black">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-5 space-y-4">
              <p className="text-sm text-gray-700">
                Hành động này sẽ xóa dữ liệu <b>vĩnh viễn</b> khỏi cơ sở dữ liệu và không thể khôi phục. Bạn có chắc chắn muốn xóa?
              </p>

              <div className="pt-2 flex justify-end gap-2">
                <button 
                  type="button" 
                  onClick={() => setShowPermanentDeleteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Hủy
                </button>
                <button 
                  onClick={handlePermanentDelete}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Xóa Vĩnh Viễn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-fade-in">
            <div className="p-5 border-b border-gray-100 flex justify-between items-center">
              <h2 className="font-bold text-lg">Thêm Chi Phí Mới</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-black">
                <X size={20} />
              </button>
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
