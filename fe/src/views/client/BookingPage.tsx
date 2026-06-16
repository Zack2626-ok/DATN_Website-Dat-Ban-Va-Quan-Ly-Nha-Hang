import React, { useState } from "react";
import { CalendarDays, Clock, Users, Phone, Mail, CheckCircle, UtensilsCrossed } from "lucide-react";

/**
 * BookingPage — Trang đặt bàn trực tuyến (Module 0, Actor: Khách hàng)
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
  };

  if (submitted) {
    return (
      <section className="mx-auto max-w-xl py-24 px-4 text-center">
        <div className="flex justify-center mb-6">
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
            <CheckCircle size={48} />
          </span>
        </div>
        <h1 className="text-3xl font-bold text-gray-700">Đặt bàn thành công!</h1>
        <p className="mt-3 text-gray-500">
          Cảm ơn bạn <strong>{form.name}</strong> đã đặt bàn. Chúng tôi sẽ liên hệ qua số{" "}
          <strong>{form.phone}</strong> để xác nhận.
        </p>
        <div className="mt-8 rounded-xl border border-gray-200 bg-white p-6 text-left shadow-sm">
          <h3 className="font-semibold text-gray-700 mb-4">Thông tin đặt bàn:</h3>
          <ul className="space-y-3 text-sm text-gray-600">
            <li className="flex items-center gap-3">
              <CalendarDays size={16} className="text-blue-600" />
              Ngày: <strong>{form.date}</strong>
            </li>
            <li className="flex items-center gap-3">
              <Clock size={16} className="text-blue-600" />
              Giờ: <strong>{form.time}</strong>
            </li>
            <li className="flex items-center gap-3">
              <Users size={16} className="text-blue-600" />
              Số khách: <strong>{form.guests} người</strong>
            </li>
          </ul>
        </div>
        <button
          onClick={() => { setSubmitted(false); setForm({ name: "", phone: "", email: "", date: "", time: "", guests: "2", note: "" }); }}
          className="mt-6 rounded-xl bg-blue-700 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
        >
          Đặt thêm bàn khác
        </button>
      </section>
    );
  }

  return (
    <>
      {/* Hero */}
      <section className="relative bg-gradient-to-r from-blue-800 to-indigo-700 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="flex justify-center mb-4">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-sm">
              <UtensilsCrossed size={28} />
            </span>
          </div>
          <h1 className="text-4xl font-bold text-white sm:text-5xl">Đặt bàn trực tuyến</h1>
          <p className="mt-3 text-blue-100 text-lg max-w-lg mx-auto">
            Chọn thời gian phù hợp, chúng tôi sẽ chuẩn bị mọi thứ cho bạn
          </p>
        </div>
      </section>

      {/* Booking Form */}
      <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg sm:p-10"
        >
          <h2 className="text-2xl font-bold text-gray-700 mb-6">Thông tin đặt bàn</h2>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Họ tên */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Họ và tên *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="Nguyễn Văn A"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* SĐT */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Số điện thoại *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Phone size={16} />
                </span>
                <input
                  required
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setField("phone", e.target.value)}
                  placeholder="0912345678"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Email */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Email</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setField("email", e.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Ngày */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Ngày *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <CalendarDays size={16} />
                </span>
                <input
                  required
                  type="date"
                  value={form.date}
                  onChange={(e) => setField("date", e.target.value)}
                  min={new Date().toISOString().split("T")[0]}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Giờ */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Giờ *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Clock size={16} />
                </span>
                <select
                  required
                  value={form.time}
                  onChange={(e) => setField("time", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  <option value="">Chọn giờ</option>
                  {["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30",
                    "17:00", "17:30", "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00"].map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Số khách */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Số khách *</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-400">
                  <Users size={16} />
                </span>
                <select
                  required
                  value={form.guests}
                  onChange={(e) => setField("guests", e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 pl-10 pr-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                >
                  {[1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 15, 20].map((n) => (
                    <option key={n} value={n}>{n} người</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Ghi chú */}
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1.5">Ghi chú</label>
              <textarea
                value={form.note}
                onChange={(e) => setField("note", e.target.value)}
                rows={3}
                placeholder="Yêu cầu đặc biệt (bàn gần cửa sổ, tiệc sinh nhật...)"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              />
            </div>
          </div>

          <button
            type="submit"
            className="mt-6 w-full rounded-xl bg-blue-700 py-3.5 text-sm font-bold text-white transition-colors hover:bg-blue-800 shadow-lg"
          >
            Xác nhận đặt bàn
          </button>
        </form>
      </section>
    </>
  );
};
