import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Phone, Mail, CheckCircle, UtensilsCrossed, ArrowRight, ArrowLeft, Calendar, Loader2, Landmark, Percent, ShoppingBag, Plus, Minus, Trash2 } from "lucide-react";
import { toast } from "react-hot-toast";
import { getAvailableTables, createBooking, Customer, getPublicPromotions, getPublicMenu } from "../../services/customerService";

export const BookingPage: React.FC = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loadingTables, setLoadingTables] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableTables, setAvailableTables] = useState<any[]>([]);

  // Bắt buộc đăng nhập tài khoản khách hàng trước khi đặt bàn
  useEffect(() => {
    const token = localStorage.getItem("customer_token");
    if (!token) {
      toast.error("Bạn cần đăng ký hoặc đăng nhập tài khoản Khách hàng để sử dụng tính năng đặt bàn!");
      navigate("/customer/login?redirect=/booking");
    }
  }, [navigate]);
  const [confirmationCode, setConfirmationCode] = useState("");
  const [selectedArea, setSelectedArea] = useState("Tất cả");

  const [searchParams] = useSearchParams();
  const promoParam = searchParams.get("promo");

  const [promotionsList, setPromotionsList] = useState<any[]>([]);
  const [menuItemsList, setMenuItemsList] = useState<any[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string>("");
  const [preOrderedDishes, setPreOrderedDishes] = useState<{ [id: number]: { name: string; price: number; quantity: number } }>({});
  const [showMenuModal, setShowMenuModal] = useState(false);

  // Fetch promotions and menu items
  useEffect(() => {
    getPublicPromotions()
      .then((data) => {
        setPromotionsList(data || []);
        if (promoParam) {
          setSelectedPromoId(promoParam);
        }
      })
      .catch((e) => console.error("Error loading promotions in booking page:", e));

    getPublicMenu()
      .then((data) => {
        setMenuItemsList(data.items || []);
      })
      .catch((e) => console.error("Error loading menu in booking page:", e));
  }, [promoParam]);

  // Reset filter when tables change
  useEffect(() => {
    setSelectedArea("Tất cả");
  }, [availableTables]);

  const uniqueAreas = ["Tất cả", ...new Set(availableTables.map((t) => t.area_name).filter(Boolean))];

  const filteredTables = selectedArea === "Tất cả"
    ? availableTables
    : availableTables.filter((t) => t.area_name === selectedArea);
  
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
    
    // Kiểm tra không cho đặt giờ trong quá khứ nếu chọn ngày hôm nay
    const selectedDateTime = new Date(`${form.date}T${form.time}:00`);
    const now = new Date();
    if (selectedDateTime < now) {
      toast.error("Thời gian đặt bàn không được ở quá khứ. Vui lòng chọn thời gian khác!");
      return;
    }

    const guestCount = Number(form.guests);
    if (isNaN(guestCount) || guestCount < 1 || guestCount > 30) {
      toast.error("Số lượng khách phải từ 1 đến 30 người!");
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
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Vui lòng điền họ tên và số điện thoại liên hệ!");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Email không đúng định dạng!");
      return;
    }

    const cleanedPhone = form.phone.trim().replace(/[\s-]/g, '');
    const phoneRegex = /^(03|09)\d{8}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      toast.error("Số điện thoại không hợp lệ (bắt buộc 10 chữ số, bắt đầu bằng 03 hoặc 09)");
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
      const tokenStr = localStorage.getItem("customer_token");
      if (infoStr && tokenStr) {
        try {
          customerId = JSON.parse(infoStr).id || null;
        } catch (e) {
          console.error("Error parsing customer_info", e);
        }
      }

      // Tổng hợp món ăn đặt trước chèn vào ghi chú
      const orderedItems = Object.values(preOrderedDishes).filter((d) => d.quantity > 0);
      let finalGuestNote = form.note.trim();
      if (orderedItems.length > 0) {
        const foodSummary = orderedItems.map((d) => `${d.quantity}x ${d.name}`).join(", ");
        finalGuestNote = finalGuestNote 
          ? `${finalGuestNote}\n[Món đặt trước: ${foodSummary}]`
          : `[Món đặt trước: ${foodSummary}]`;
      }

      const bookingResult = await createBooking({
        table_id: Number(form.tableId),
        customer_id: customerId,
        promotion_id: selectedPromoId ? Number(selectedPromoId) : null,
        guest_name: form.name,
        guest_phone: form.phone,
        party_size: Number(form.guests),
        start_time: startTimeStr,
        end_time: endTimeStr,
        guest_note: finalGuestNote,
        items: orderedItems.map((d) => ({
          menu_item_id: d.id,
          quantity: d.quantity,
          unit_price: d.price,
          name: d.name,
        })),
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
                    {[
                      "08:00", "08:30", "09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "12:00", "12:30",
                      "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00", "16:30", "17:00", "17:30",
                      "18:00", "18:30", "19:00", "19:30", "20:00", "20:30", "21:00", "21:30", "22:00"
                    ].map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Số khách *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="30"
                    value={form.guests}
                    onChange={(e) => setField("guests", e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
                    placeholder="2"
                  />
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
                <>
                  {/* Area/Floor Filter Tabs */}
                  {uniqueAreas.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-100 pb-4">
                      {uniqueAreas.map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => setSelectedArea(area)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            selectedArea === area
                              ? "bg-blue-700 text-white shadow-xs"
                              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                          }`}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="grid gap-4 grid-cols-2 sm:grid-cols-3">
                    {filteredTables.map((table) => {
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
                </>
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
                      onChange={(e) => setField("phone", e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^\+)\+/g, ''))}
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

                {/* Chọn ưu đãi */}
                <div className="sm:col-span-2 border-t border-gray-100 pt-6">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Percent size={14} className="text-blue-600" /> Chọn chương trình ưu đãi (Tùy chọn)
                  </label>
                  <select
                    value={selectedPromoId}
                    onChange={(e) => setSelectedPromoId(e.target.value)}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
                  >
                    <option value="">Không áp dụng ưu đãi</option>
                    {promotionsList.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.title} ({p.discount_type === "percent" ? `Giảm ${p.discount_value}%` : `Giảm ${Number(p.discount_value).toLocaleString("vi-VN")}đ`})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Đặt trước món ăn */}
                <div className="sm:col-span-2 border-t border-gray-100 pt-6">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <ShoppingBag size={14} className="text-blue-600" /> Đặt trước món ăn (Tùy chọn)
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowMenuModal(true)}
                    className="inline-flex items-center gap-2 rounded-xl border border-blue-200 bg-blue-50/50 hover:bg-blue-50 text-blue-700 px-4 py-2.5 text-xs font-bold transition-all"
                  >
                    <Plus size={14} /> Thêm món ăn vào đơn đặt bàn
                  </button>

                  {/* Hiển thị danh sách món đã chọn */}
                  {Object.keys(preOrderedDishes).length > 0 && (
                    <div className="mt-4 space-y-2 max-h-48 overflow-y-auto bg-gray-50 p-4 rounded-2xl border border-gray-100">
                      {Object.entries(preOrderedDishes).map(([idStr, d]) => (
                        <div key={idStr} className="flex justify-between items-center text-xs text-gray-700">
                          <span className="font-semibold">{d.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-gray-500">{Number(d.price).toLocaleString("vi-VN")}đ x {d.quantity}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPreOrderedDishes((prev) => {
                                  const copy = { ...prev };
                                  delete copy[Number(idStr)];
                                  return copy;
                                });
                              }}
                              className="text-red-500 hover:text-red-750 transition-colors"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Ghi chú */}
                <div className="sm:col-span-2 border-t border-gray-100 pt-6">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Ghi chú (Tùy chọn)</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => setField("note", e.target.value)}
                    rows={3}
                    placeholder="Các yêu cầu đặc biệt như ăn kiêng, đặt trước món ăn, vị trí ngồi..."
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all"
                  />
                  {/* Tag ghi chú nhanh */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Đặt trước món ăn", "Bàn gần cửa sổ", "Không lấy hành", "Có em bé", "VIP", "Không gian yên tĩnh"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => {
                          setForm((prev) => {
                            const trimmed = prev.note.trim();
                            if (trimmed.includes(tag)) return prev;
                            const separator = trimmed ? ", " : "";
                            return { ...prev, note: trimmed + separator + tag };
                          });
                        }}
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
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

      {/* Modal chọn món ăn đặt trước */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-xl flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-base font-bold text-gray-900 font-display flex items-center gap-2">
                <UtensilsCrossed size={16} className="text-blue-600" /> Thực đơn nhà hàng
              </h3>
              <button
                type="button"
                onClick={() => setShowMenuModal(false)}
                className="text-gray-400 hover:text-gray-600 text-sm font-semibold"
              >
                Đóng
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {menuItemsList.length === 0 ? (
                <p className="text-gray-500 text-xs text-center py-6">Không có món ăn nào khả dụng.</p>
              ) : (
                menuItemsList.map((item) => {
                  const qty = preOrderedDishes[item.id]?.quantity || 0;
                  return (
                    <div key={item.id} className="flex items-center justify-between border-b border-gray-50 pb-3 last:border-0 last:pb-0">
                      <div>
                        <h4 className="text-sm font-semibold text-gray-800">{item.name}</h4>
                        <p className="text-xs text-gray-500">{Number(item.price).toLocaleString("vi-VN")}đ</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {qty > 0 ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setPreOrderedDishes((prev) => {
                                  const current = prev[item.id];
                                  if (current.quantity <= 1) {
                                    const copy = { ...prev };
                                    delete copy[item.id];
                                    return copy;
                                  }
                                  return {
                                    ...prev,
                                    [item.id]: { ...current, quantity: current.quantity - 1 },
                                  };
                                });
                              }}
                              className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="text-sm font-bold w-6 text-center">{qty}</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPreOrderedDishes((prev) => {
                                  const current = prev[item.id];
                                  return {
                                    ...prev,
                                    [item.id]: { ...current, quantity: current.quantity + 1 },
                                  };
                                });
                              }}
                              className="p-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => {
                              setPreOrderedDishes((prev) => ({
                                ...prev,
                                [item.id]: { name: item.name, price: item.price, quantity: 1 },
                              }));
                            }}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50 px-3 py-1.5 text-xs font-bold transition-all"
                          >
                            <Plus size={12} /> Thêm
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-6 border-t border-gray-100 flex justify-between items-center bg-gray-50/50 rounded-b-3xl">
              <div>
                <span className="text-xs text-gray-500 block">Tổng cộng đặt trước</span>
                <span className="text-sm font-bold text-gray-900">
                  {Object.values(preOrderedDishes)
                    .reduce((sum, d) => sum + d.price * d.quantity, 0)
                    .toLocaleString("vi-VN")}đ
                </span>
              </div>
              <button
                type="button"
                onClick={() => setShowMenuModal(false)}
                className="px-5 py-2.5 bg-blue-700 text-white rounded-xl text-xs font-bold hover:bg-blue-800 transition-colors"
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
