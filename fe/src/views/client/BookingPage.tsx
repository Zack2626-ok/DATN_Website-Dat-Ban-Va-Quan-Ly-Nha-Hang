import React, { useState } from "react";
import { Phone, Mail, CheckCircle, UtensilsCrossed, ArrowRight } from "lucide-react";
import { toast } from "react-hot-toast";

/**
 * BookingPage — Trang đặt bàn trực tuyến (Tái thiết kế SaaS Style)
 */
export const BookingPage: React.FC = () => {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    date: "",
    time: "",
    guests: "2",
    note: "",
  });

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    toast.success("Đặt bàn thành công!");
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center animate-fade-in">
          <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Đặt bàn thành công!</h1>
          <p className="mt-2 text-sm text-gray-600">Cảm ơn {form.name}, chúng tôi đã nhận yêu cầu.</p>
          
          <div className="mt-8 text-left bg-gray-50 rounded-xl p-5 border border-gray-100 space-y-3">
             <div className="flex justify-between text-sm"><span className="text-gray-500">Ngày:</span> <span className="font-semibold text-gray-900">{form.date}</span></div>
             <div className="flex justify-between text-sm"><span className="text-gray-500">Giờ:</span> <span className="font-semibold text-gray-900">{form.time}</span></div>
             <div className="flex justify-between text-sm"><span className="text-gray-500">Số khách:</span> <span className="font-semibold text-gray-900">{form.guests} người</span></div>
          </div>

          <button
            onClick={() => { setSubmitted(false); setForm({ name: "", phone: "", email: "", date: "", time: "", guests: "2", note: "" }); }}
            className="mt-8 w-full py-3 bg-blue-700 text-white rounded-xl font-semibold text-sm hover:bg-blue-800 transition-all"
          >
            Quay lại đặt bàn
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-8">
        <div className="mx-auto max-w-3xl px-6 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-700 rounded-xl">
            <UtensilsCrossed size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900 font-display">Đặt bàn trực tuyến</h1>
            <p className="text-xs text-gray-500">Trải nghiệm dịch vụ chuyên nghiệp</p>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-6 mt-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Section 1: Customer */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-lg font-bold text-gray-900 font-display mb-6 border-b border-gray-50 pb-4">Thông tin liên hệ</h2>
            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Họ và tên *</label>
                <input required value={form.name} onChange={(e) => setField("name", e.target.value)} placeholder="Nguyễn Văn A" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Số điện thoại *</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input required type="tel" value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="0912345678" className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3 top-3.5 text-gray-400" />
                  <input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} placeholder="email@example.com" className="w-full rounded-lg border border-gray-300 pl-10 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Booking */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <h2 className="text-lg font-bold text-gray-900 font-display mb-6 border-b border-gray-50 pb-4">Thông tin bàn</h2>
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ngày *</label>
                <input required type="date" value={form.date} onChange={(e) => setField("date", e.target.value)} min={new Date().toISOString().split("T")[0]} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Giờ *</label>
                <select required value={form.time} onChange={(e) => setField("time", e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Chọn giờ</option>
                  {["10:00", "11:00", "12:00", "18:00", "19:00", "20:00"].map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Số khách *</label>
                <select required value={form.guests} onChange={(e) => setField("guests", e.target.value)} className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  {[1, 2, 4, 6, 8].map((n) => <option key={n} value={n}>{n} khách</option>)}
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-sm font-semibold text-gray-700 mb-2">Ghi chú</label>
                <textarea value={form.note} onChange={(e) => setField("note", e.target.value)} rows={3} placeholder="Yêu cầu đặc biệt (tiệc sinh nhật, vị trí bàn...)" className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none" />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-4 text-sm font-bold text-white transition-all hover:bg-blue-800 shadow-sm hover:shadow-md"
          >
            Xác nhận đặt bàn <ArrowRight size={16} />
          </button>
        </form>
      </main>
    </div>
  );
};
