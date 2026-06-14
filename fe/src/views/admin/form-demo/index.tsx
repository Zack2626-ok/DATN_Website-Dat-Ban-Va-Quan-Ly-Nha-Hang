import React, { useState } from "react";
import { CheckCircle } from "lucide-react";

export const FormDemo: React.FC = () => {
  const [formData, setFormData] = useState({
    fullName: "Nguyễn Văn A",
    email: "a.nguyen@example.com",
    role: "waiter",
    notifications: true,
    notes: "Xin vui lòng phản hồi sớm.",
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  return (
    <div className="max-w-xl bg-white rounded-3xl border border-slate-200 p-8 shadow-2xs animate-fade-in text-slate-800">
      <div className="border-b border-slate-100 pb-4 mb-6">
        <h3 className="text-lg font-black font-display text-slate-900">Form Demo</h3>
        <p className="text-xs text-slate-400 mt-1">Trình diễn biểu mẫu nhập liệu và tương tác</p>
      </div>

      {submitted && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2.5 text-xs font-bold mb-5 animate-fade-in">
          <CheckCircle size={16} className="text-emerald-600" />
          Yêu cầu đã được xử lý giả lập thành công!
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 text-xs font-semibold text-slate-700">
        <div className="flex flex-col gap-1.5">
          <label>Họ và tên</label>
          <input
            type="text"
            value={formData.fullName}
            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-350 text-slate-900 font-medium"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label>Email liên hệ</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-350 text-slate-900 font-medium"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label>Vai trò</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-350 text-slate-900 font-medium"
          >
            <option value="manager">Quản lý (Manager)</option>
            <option value="waiter">Phục vụ (Waiter)</option>
            <option value="chef">Đầu bếp (Chef)</option>
            <option value="cashier">Thu ngân (Cashier)</option>
          </select>
        </div>

        <div className="flex items-center gap-2.5 py-1">
          <input
            type="checkbox"
            id="notif-check"
            checked={formData.notifications}
            onChange={(e) => setFormData({ ...formData, notifications: e.target.checked })}
            className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-0 cursor-pointer"
          />
          <label htmlFor="notif-check" className="cursor-pointer">Nhận thông báo qua email</label>
        </div>

        <div className="flex flex-col gap-1.5">
          <label>Ghi chú bổ sung</label>
          <textarea
            rows={3}
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="p-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-350 text-slate-900 font-medium resize-none"
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-colors cursor-pointer text-center font-display mt-2"
        >
          GỬI BIỂU MẪU
        </button>
      </form>
    </div>
  );
};
