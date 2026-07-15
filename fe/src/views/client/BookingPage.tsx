import React, { useState, useEffect } from "react";
import { Phone, Mail, CheckCircle, UtensilsCrossed, ArrowRight, ArrowLeft, Calendar, Loader2, Landmark } from "lucide-react";
import { toast } from "react-hot-toast";
import { getAvailableTables, createBooking, Customer } from "../../services/customerService";

export const BookingPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [loadingTables, setLoadingTables] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableTables, setAvailableTables] = useState<any[]>([]);
  const [confirmationCode, setConfirmationCode] = useState("");
  
  const [form, setForm] = useState({
    date: "",
    time: "",
    guests: "2",
    tableId: "",
    tableName: "",
    name: "",
    phone: "",
    email: "",
    note: "",
  });

  // Auto fill profile if logged in
  useEffect(() => {
    const infoStr = localStorage.getItem("customer_info");
    if (infoStr) {
      try {
        const customer = JSON.parse(infoStr) as Customer;
        setForm((prev) => ({
          ...prev,
          name: customer.name || "",
          email: customer.email || "",
          phone: customer.phone || "",
        }));
      } catch (e) {
        console.error("Error parsing customer_info", e);
      }
    }
  }, []);

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleNextToStep2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.time) {
      toast.error("Vui lòng chọn ngày và giờ đặt bàn!");
      return;
    }
    
    setLoadingTables(true);
    try {
      const startTimeStr = `${form.date} ${form.time}:00`;
      const tables = await getAvailableTables(startTimeStr);
      // Filter tables that fit the guest count
      const filtered = tables.filter((t: any) => t.capacity >= Number(form.guests));
      setAvailableTables(filtered);
      setStep(2);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể kiểm tra bàn trống lúc này.");
    } finally {
      setLoadingTables(false);
    }
  };

  const handleSelectTable = (table: any) => {
    setForm((prev) => ({
      ...prev,
      tableId: String(table.id),
      tableName: table.name,
    }));
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone) {
      toast.error("Vui lòng điền họ tên và số điện thoại liên hệ!");
      return;
    }

    const cleanedPhone = form.phone.trim().replace(/[\s-]/g, '');
    const phoneRegex = /^(0|\+?84)(3|5|7|8|9|2)[0-9]{8,9}$/;
    if (!phoneRegex.test(cleanedPhone) && !/^[0-9]{10,11}$/.test(cleanedPhone)) {
      toast.error("Số điện thoại không hợp lệ (phải từ 10-11 chữ số)");
      return;
    }

    setSubmitting(true);
    try {
      const startTimeStr = `${form.date} ${form.time}:00`;
      // Calculate end time as start time + 2 hours
      const [h, m] = form.time.split(":");
      const endHour = (parseInt(h) + 2).toString().padStart(2, "0");
      const endTimeStr = `${form.date} ${endHour}:${m}:00`;

      let customerId: number | null = null;
      const infoStr = localStorage.getItem("customer_info");
      if (infoStr) {
        customerId = JSON.parse(infoStr).id || null;
      }

      const bookingResult = await createBooking({
        table_id: Number(form.tableId),
        customer_id: customerId,
        guest_name: form.name,
        guest_phone: form.phone,
        party_size: Number(form.guests),
        start_time: startTimeStr,
        end_time: endTimeStr,
        guest_note: form.note,
      });

      setConfirmationCode(bookingResult.confirmation_code);
      setStep(4);
      toast.success("Đặt bàn thành công!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Đặt bàn thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  if (step === 4) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-100 p-8 text-center animate-fade-in">
          <div className="h-16 w-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 font-display">Đặt bàn thành công!</h1>
          <p className="mt-2 text-sm text-gray-600">Chúng tôi đã nhận được yêu cầu đặt bàn của bạn.</p>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-2xl text-center">
            <span className="text-xs text-blue-500 font-semibold uppercase tracking-wider block">Mã xác nhận đặt bàn</span>
            <span className="text-2xl font-black text-blue-700 tracking-widest mt-1 block">{confirmationCode}</span>
          </div>
          
          <div className="mt-6 text-left bg-gray-50 rounded-2xl p-5 border border-gray-100 space-y-3">
             <div className="flex justify-between text-sm"><span className="text-gray-500">Bàn đã chọn:</span> <span className="font-semibold text-gray-900">{form.tableName}</span></div>
             <div className="flex justify-between text-sm"><span className="text-gray-500">Ngày đặt:</span> <span className="font-semibold text-gray-900">{new Date(form.date).toLocaleDateString("vi-VN")}</span></div>
             <div className="flex justify-between text-sm"><span className="text-gray-500">Giờ đến:</span> <span className="font-semibold text-gray-900">{form.time}</span></div>
             <div className="flex justify-between text-sm"><span className="text-gray-500">Số khách:</span> <span className="font-semibold text-gray-900">{form.guests} khách</span></div>
          </div>

          <button
            onClick={() => {
              setStep(1);
              setForm({
                date: "",
                time: "",
                guests: "2",
                tableId: "",
                tableName: "",
                name: "",
                phone: "",
                email: "",
                note: "",
              });
            }}
            className="mt-8 w-full py-4 bg-blue-700 text-white rounded-xl font-bold text-sm hover:bg-blue-800 transition-all shadow-md"
          >
            Tạo đơn đặt bàn mới
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-6">
        <div className="mx-auto max-w-3xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900 font-display">Đặt bàn trực tuyến</h1>
              <p className="text-xs text-gray-500">Chống trùng lịch · Đặt chỗ thời gian thực</p>
            </div>
          </div>
          {/* Progress stepper */}
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
            <span className={step >= 1 ? "text-blue-700 font-extrabold" : ""}>1. Thời gian</span>
            <span>&rarr;</span>
            <span className={step >= 2 ? "text-blue-700 font-extrabold" : ""}>2. Chọn bàn</span>
            <span>&rarr;</span>
            <span className={step >= 3 ? "text-blue-700 font-extrabold" : ""}>3. Liên hệ</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-3xl px-6 mt-8">
        {step === 1 && (
          <form onSubmit={handleNextToStep2} className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-lg font-bold text-gray-900 font-display mb-6 border-b border-gray-50 pb-4 flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" /> Chọn lịch trình đặt bàn
              </h2>
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ngày đến *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setField("date", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Giờ đến *</label>
                  <select
                    required
                    value={form.time}
                    onChange={(e) => setField("time", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
                  >
                    <option value="">Chọn giờ</option>
                    {["10:00", "11:00", "12:00", "13:00", "14:00", "17:00", "18:00", "19:00", "20:00", "21:00"].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Số khách *</label>
                  <select
                    required
                    value={form.guests}
                    onChange={(e) => setField("guests", e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
                  >
                    {[1, 2, 3, 4, 5, 6, 8, 10, 12, 16].map((n) => (
                      <option key={n} value={n}>{n} khách</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingTables}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-blue-700 py-4 text-sm font-bold text-white transition-all hover:bg-blue-800 disabled:opacity-50"
            >
              {loadingTables ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> Kiểm tra bàn trống...
                </>
              ) : (
                <>
                  Tìm bàn trống <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
                <h2 className="text-lg font-bold text-gray-900 font-display flex items-center gap-2">
                  <Landmark size={18} className="text-blue-600" /> Chọn bàn ăn trống
                </h2>
                <span className="text-xs text-gray-500">Tìm thấy {availableTables.length} bàn phù hợp</span>
              </div>

              {availableTables.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 text-sm font-medium">Hiện tại không còn bàn trống nào phù hợp cho thời gian đã chọn.</p>
                  <p className="text-xs text-gray-400 mt-1">Vui lòng quay lại bước 1 và chọn mốc giờ khác.</p>
                </div>
              ) : (
                <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                  {availableTables.map((table) => {
                    const isSelected = String(table.id) === form.tableId;
                    return (
                      <div
                        key={table.id}
                        onClick={() => handleSelectTable(table)}
                        className={`cursor-pointer p-5 rounded-2xl border-2 transition-all text-center flex flex-col justify-center items-center gap-1 ${
                          isSelected
                            ? "bg-blue-50 border-blue-700 text-blue-800 shadow-sm"
                            : "bg-white border-gray-200 hover:border-gray-300 text-gray-700"
                        }`}
                      >
                        <span className="text-base font-bold font-display">{table.name}</span>
                        <span className="text-xs opacity-75">{table.capacity} chỗ · {table.area_name || "Nhà hàng"}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-4 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> Quay lại
              </button>
              <button
                type="button"
                disabled={!form.tableId}
                onClick={() => setStep(3)}
                className="flex-[2] py-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                Tiếp tục <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <form onSubmit={handleSubmitBooking} className="space-y-6 animate-fade-in">
            {/* Contact details */}
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
              <h2 className="text-lg font-bold text-gray-900 font-display mb-6 border-b border-gray-50 pb-4">
                Thông tin người đặt & Liên hệ
              </h2>
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Họ và tên *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Số điện thoại *</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-4 text-gray-400" />
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value.replace(/[^0-9+\s-]/g, ''))}
                      placeholder="0912345678"
                      className="w-full rounded-xl border border-gray-300 pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Email</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-4 text-gray-400" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="email@example.com"
                      className="w-full rounded-xl border border-gray-300 pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ghi chú (Tùy chọn)</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => setField("note", e.target.value)}
                    rows={3}
                    placeholder="Các yêu cầu đặc biệt như ăn kiêng, tổ chức sinh nhật, vị trí ngồi..."
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Summary Box */}
            <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 flex flex-col gap-3 text-sm text-blue-900 font-semibold shadow-2xs">
              <h4 className="font-extrabold uppercase text-xs text-blue-500 tracking-wider">Thông tin tóm tắt đặt bàn</h4>
              <div className="grid grid-cols-2 gap-y-2">
                <div>Ngày đến: <span className="font-bold text-gray-900">{new Date(form.date).toLocaleDateString("vi-VN")}</span></div>
                <div>Giờ đến: <span className="font-bold text-gray-900">{form.time}</span></div>
                <div>Bàn ăn đã chọn: <span className="font-bold text-gray-900">{form.tableName}</span></div>
                <div>Số khách: <span className="font-bold text-gray-900">{form.guests} người</span></div>
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 py-4 border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              >
                <ArrowLeft size={16} /> Quay lại
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-[2] py-4 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> Đang tạo đơn...
                  </>
                ) : (
                  <>
                    Xác nhận đặt bàn <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
};
