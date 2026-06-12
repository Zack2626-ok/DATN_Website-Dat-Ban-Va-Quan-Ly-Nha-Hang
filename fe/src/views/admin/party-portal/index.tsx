import React, { useState } from "react";
import { Clock, Sparkles, CheckCircle, ChevronRight, User, Phone, Mail } from "lucide-react";

type BookingStep = 1 | 2 | 3 | 4;

interface HallOption {
  id: string;
  name: string;
  capacity: string;
  price: string;
  image: string;
  desc: string;
}

interface PackageOption {
  id: string;
  name: string;
  pricePerGuest: string;
  image: string;
  features: string[];
}

const HALLS: HallOption[] = [
  {
    id: "h1",
    name: "Sảnh Hoa Hồng",
    capacity: "100 - 300 khách",
    price: "50.000.000 vnđ / ngày",
    image: "https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=600&auto=format&fit=crop&q=80",
    desc: "Không gian lãng mạn, tràn ngập sắc hoa hồng đỏ, thích hợp cho tiệc cưới và sự kiện gia đình ấm cúng.",
  },
  {
    id: "h2",
    name: "Sảnh Hoa Mai",
    capacity: "50 - 150 khách",
    price: "35.000.000 vnđ / ngày",
    image: "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=600&auto=format&fit=crop&q=80",
    desc: "Không gian hiện đại, mang phong cách sang trọng, tươi sáng của sắc hoa mai vàng.",
  },
];

const PACKAGES: PackageOption[] = [
  {
    id: "p1",
    name: "Gói Tiệc Thượng Hạng (Platinum)",
    pricePerGuest: "1.800.000 vnđ / khách",
    image: "https://images.unsplash.com/photo-1555244162-803834f70033?w=600&auto=format&fit=crop&q=80",
    features: ["Thực đơn 6 món cao cấp", "Rượu vang & nước ngọt miễn phí suốt tiệc", "Trang trí hoa tươi bàn tiệc", "MC & Nhạc công biểu diễn"],
  },
  {
    id: "p2",
    name: "Gói Tiệc Đám Cưới (Gold)",
    pricePerGuest: "1.400.000 vnđ / khách",
    image: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=600&auto=format&fit=crop&q=80",
    features: ["Thực đơn 5 món Á - Âu", "Bia & nước ngọt miễn phí 2 giờ", "Cổng hoa & phông nền chụp ảnh", "Bánh cưới 3 tầng"],
  },
  {
    id: "p3",
    name: "Gói Hội Nghị Tiêu Chuẩn (Silver)",
    pricePerGuest: "950.000 vnđ / khách",
    image: "https://images.unsplash.com/photo-1431540015161-0bf868a2d407?w=600&auto=format&fit=crop&q=80",
    features: ["Tiệc trà Teabreak giữa giờ", "Hệ thống âm thanh ánh sáng hội nghị", "Sổ bút & nước suối cho khách"],
  },
];

export const PartyPortalDemo: React.FC = () => {
  const [step, setStep] = useState<BookingStep>(1);
  const [selectedDate, setSelectedDate] = useState<number>(12);
  const [selectedTime, setSelectedTime] = useState<string>("17:00 - 20:00");
  const [selectedHall, setSelectedHall] = useState<HallOption>(HALLS[0]);
  const [selectedPackage, setSelectedPackage] = useState<PackageOption>(PACKAGES[0]);
  
  // Client Info Form
  const [clientName, setClientName] = useState("Nguyễn Văn An");
  const [clientPhone, setClientPhone] = useState("+84 901 234 567");
  const [clientMail, setClientMail] = useState("an.nguyen@example.com");
  const [guestsCount, setGuestsCount] = useState(150);
  const [bookingSuccess, setBookingSuccess] = useState(false);

  const handleNextStep = () => {
    if (step < 4) {
      setStep((s) => (s + 1) as BookingStep);
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep((s) => (s - 1) as BookingStep);
    }
  };

  const handleConfirmBooking = (e: React.FormEvent) => {
    e.preventDefault();
    setBookingSuccess(true);
  };

  const handleReset = () => {
    setStep(1);
    setBookingSuccess(false);
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in text-slate-800">
      
      {/* Banner Jumbotron Header */}
      <div className="relative rounded-3xl overflow-hidden min-h-[260px] flex items-center p-8 md:p-12 text-white bg-slate-900">
        {/* Background Image overlay */}
        <div className="absolute inset-0 opacity-40">
          <img
            src="https://images.unsplash.com/photo-1519167758481-83f550bb49b3?w=1200&auto=format&fit=crop&q=80"
            alt="Event banquet hall setup"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-900/90 to-transparent" />
        
        <div className="relative flex flex-col items-start gap-4 max-w-2xl z-10">
          <span className="inline-flex items-center gap-1 bg-[#d4af37]/20 border border-[#d4af37]/40 text-[#f3e5ab] text-[10px] font-black tracking-widest px-3 py-1 rounded-full uppercase">
            <Sparkles size={11} className="text-[#f3e5ab]" /> Restaurantos Premium
          </span>
          <h2 className="text-3xl md:text-4xl font-black font-display tracking-tight leading-tight">
            Đặt Tiệc & Sự Kiện
          </h2>
          <p className="text-slate-300 text-xs md:text-sm leading-relaxed">
            Chúng tôi mang đến không gian hoàn hảo cho mọi kỷ niệm đáng nhớ — từ tiệc cưới sang trọng đến hội nghị doanh nghiệp đẳng cấp.
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] text-slate-400 font-semibold border-t border-white/10 pt-3 w-full">
            <span>📍 123 Đường Lê Lợi, Quận 1, TP.HCM</span>
            <span>📞 1800-1234</span>
            <span className="text-[#f3e5ab]">⭐ 4.9/5 (1,200+ đánh giá)</span>
          </div>
        </div>
      </div>

      {bookingSuccess ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center flex flex-col items-center gap-4 max-w-xl mx-auto shadow-sm animate-scale-up">
          <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-500 border border-emerald-150 flex items-center justify-center">
            <CheckCircle size={36} />
          </div>
          <h3 className="text-lg font-black font-display text-slate-950">Gửi yêu cầu thành công!</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Kính chào <strong>{clientName}</strong>, điều phối viên sự kiện của chúng tôi đã nhận được thông tin đặt tiệc <strong>{selectedHall.name}</strong> ngày <strong>{selectedDate} Tháng 6, 2026</strong>. Chúng tôi sẽ liên hệ trong vòng 30 phút để xác nhận báo giá.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-left text-[11px] text-slate-600 flex flex-col gap-1.5 w-full">
            <div><strong>Sảnh tổ chức:</strong> {selectedHall.name}</div>
            <div><strong>Gói thực đơn:</strong> {selectedPackage.name}</div>
            <div><strong>Thời gian:</strong> {selectedTime} (Ngày {selectedDate}/06/2026)</div>
            <div><strong>Số lượng dự kiến:</strong> {guestsCount} khách</div>
          </div>
          <button
            onClick={handleReset}
            className="mt-3 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-display cursor-pointer transition-colors shadow-2xs"
          >
            ĐẶT TIỆC KHÁC
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          
          {/* Step Progress indicators */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
            <div className="grid grid-cols-4 relative">
              {[
                { num: 1, label: "Chọn ngày & giờ" },
                { num: 2, label: "Chọn sảnh" },
                { num: 3, label: "Chọn gói tiệc" },
                { num: 4, label: "Thông tin & Đặt cọc" },
              ].map((s) => {
                const isActive = step === s.num;
                const isPassed = step > s.num;
                return (
                  <button
                    key={s.num}
                    onClick={() => setStep(s.num as BookingStep)}
                    className="flex flex-col items-center gap-2 text-center group cursor-pointer"
                  >
                    <div
                      className={`w-8 h-8 rounded-full font-bold text-xs flex items-center justify-center transition-all ${
                        isActive
                          ? "bg-rose-500 text-white shadow-md shadow-rose-500/20 scale-105"
                          : isPassed
                          ? "bg-emerald-500 text-white"
                          : "bg-slate-100 text-slate-400 group-hover:bg-slate-200"
                      }`}
                    >
                      {isPassed ? "✓" : s.num}
                    </div>
                    <span
                      className={`text-[10px] font-black transition-colors ${
                        isActive ? "text-rose-500" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    >
                      {s.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step Panels */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-2xs">
            
            {/* STEP 1: DATE AND TIME PICKER */}
            {step === 1 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h4 className="text-base font-black text-slate-900 font-display">Chọn ngày & giờ tổ chức</h4>
                  <p className="text-xs text-slate-400 mt-1">Lên lịch ngày cưới hoặc hội nghị của bạn</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Calendar layout */}
                  <div className="flex flex-col gap-4">
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Tháng 6, 2026
                    </span>
                    <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 bg-slate-50 p-4 rounded-2xl border border-slate-200/60">
                      {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((d) => (
                        <div key={d} className="py-1 text-[10px] text-slate-400 font-black">{d}</div>
                      ))}
                      {/* Fake days array for demonstration */}
                      {Array.from({ length: 30 }).map((_, idx) => {
                        const dayNum = idx + 1;
                        const isSelected = selectedDate === dayNum;
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedDate(dayNum)}
                            className={`py-2 rounded-lg text-xs font-extrabold cursor-pointer transition-all ${
                              isSelected
                                ? "bg-rose-500 text-white shadow-md shadow-rose-500/15"
                                : "text-slate-800 hover:bg-slate-200/60"
                            }`}
                          >
                            {dayNum}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div className="flex flex-col gap-4">
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Khung giờ tổ chức
                    </span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {[
                        "11:00 - 14:00",
                        "14:00 - 17:00",
                        "17:00 - 20:00",
                        "20:00 - 23:00",
                      ].map((slot) => {
                        const isSelected = selectedTime === slot;
                        return (
                          <button
                            key={slot}
                            onClick={() => setSelectedTime(slot)}
                            className={`p-4 border rounded-xl text-xs font-bold transition-all text-center cursor-pointer ${
                              isSelected
                                ? "border-rose-500 bg-rose-50/40 text-rose-700 font-black"
                                : "border-slate-200 text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {slot}
                          </button>
                        );
                      })}
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-500 leading-relaxed font-semibold mt-auto flex items-start gap-2.5">
                      <Clock size={16} className="text-slate-400 flex-shrink-0 mt-0.5" />
                      <span>
                        Đặt chỗ cưới và hội nghị yêu cầu chuẩn bị trước ít nhất 15 ngày. Vui lòng thanh toán đặt cọc để giữ sảnh chính thức.
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: HALL SELECTOR */}
            {step === 2 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h4 className="text-base font-black text-slate-900 font-display">Chọn sảnh tổ chức</h4>
                  <p className="text-xs text-slate-400 mt-1">Nhiều lựa chọn không gian phù hợp với quy mô sự kiện</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {HALLS.map((hall) => {
                    const isSelected = selectedHall.id === hall.id;
                    return (
                      <div
                        key={hall.id}
                        onClick={() => setSelectedHall(hall)}
                        className={`group border rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all ${
                          isSelected
                            ? "border-rose-500 ring-1 ring-rose-500/20 bg-rose-500/[0.01]"
                            : "border-slate-200 hover:border-slate-350 hover:shadow-2xs"
                        }`}
                      >
                        <div className="aspect-[16/10] overflow-hidden relative">
                          <img src={hall.image} alt={hall.name} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
                          <span className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/70 text-white font-black text-[10px] rounded-lg tracking-wide">
                            {hall.price}
                          </span>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div>
                            <h5 className="font-extrabold text-sm text-slate-900 group-hover:text-rose-500 transition-colors">
                              {hall.name}
                            </h5>
                            <span className="text-[10px] font-black text-slate-400 block mt-1 uppercase tracking-wider">
                              Sức chứa: {hall.capacity}
                            </span>
                            <p className="text-xs text-slate-500 leading-relaxed mt-2">
                              {hall.desc}
                            </p>
                          </div>
                          <span
                            className={`w-full py-2 border text-center text-[10px] font-black rounded-lg transition-all ${
                              isSelected
                                ? "bg-rose-500 border-rose-500 text-white"
                                : "border-slate-200 text-slate-600 bg-white group-hover:bg-slate-50"
                            }`}
                          >
                            {isSelected ? "ĐÃ CHỌN SẢNH" : "CHỌN SẢNH NÀY"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 3: FOOD PACKAGES */}
            {step === 3 && (
              <div className="flex flex-col gap-6">
                <div>
                  <h4 className="text-base font-black text-slate-900 font-display">Chọn gói tiệc thực đơn</h4>
                  <p className="text-xs text-slate-400 mt-1">Các gói ẩm thực được chuẩn bị bởi đầu bếp tiêu chuẩn Michelin</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {PACKAGES.map((pkg) => {
                    const isSelected = selectedPackage.id === pkg.id;
                    return (
                      <div
                        key={pkg.id}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`group border rounded-2xl overflow-hidden flex flex-col cursor-pointer transition-all ${
                          isSelected
                            ? "border-rose-500 ring-1 ring-rose-500/20 bg-rose-500/[0.01]"
                            : "border-slate-200 hover:border-slate-350 hover:shadow-2xs"
                        }`}
                      >
                        <div className="aspect-[16/10] overflow-hidden relative">
                          <img src={pkg.image} alt={pkg.name} className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500" />
                          <span className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/70 text-white font-black text-[10px] rounded-lg tracking-wide">
                            {pkg.pricePerGuest}
                          </span>
                        </div>
                        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                          <div className="flex flex-col gap-2">
                            <h5 className="font-extrabold text-sm text-slate-900 group-hover:text-rose-500 transition-colors">
                              {pkg.name}
                            </h5>
                            <ul className="flex flex-col gap-1.5 mt-1 text-[11px] text-slate-500 font-medium list-disc pl-3">
                              {pkg.features.map((f, i) => (
                                <li key={i}>{f}</li>
                              ))}
                            </ul>
                          </div>
                          <span
                            className={`w-full py-2 border text-center text-[10px] font-black rounded-lg transition-all ${
                              isSelected
                                ? "bg-rose-500 border-rose-500 text-white"
                                : "border-slate-200 text-slate-600 bg-white group-hover:bg-slate-50"
                            }`}
                          >
                            {isSelected ? "ĐÃ CHỌN GÓI THỰC ĐƠN" : "CHỌN GÓI THỰC ĐƠN NÀY"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* STEP 4: RESERVATION INFO & SUBMIT */}
            {step === 4 && (
              <form onSubmit={handleConfirmBooking} className="flex flex-col gap-6">
                <div>
                  <h4 className="text-base font-black text-slate-900 font-display">Thông tin cá nhân & Đặt cọc</h4>
                  <p className="text-xs text-slate-400 mt-1">Xác nhận lịch đặt phòng và thực đơn</p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  
                  {/* Inputs */}
                  <div className="lg:col-span-2 flex flex-col gap-4 text-xs font-semibold text-slate-700">
                    <div className="flex flex-col gap-1.5">
                      <label>Họ và tên người đặt *</label>
                      <div className="relative">
                        <User size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={clientName}
                          onChange={(e) => setClientName(e.target.value)}
                          className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-350 text-slate-900 font-medium"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <label>Số điện thoại *</label>
                        <div className="relative">
                          <Phone size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="tel"
                            required
                            value={clientPhone}
                            onChange={(e) => setClientPhone(e.target.value)}
                            className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-350 text-slate-900 font-medium"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <label>Email liên hệ</label>
                        <div className="relative">
                          <Mail size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            value={clientMail}
                            onChange={(e) => setClientMail(e.target.value)}
                            className="w-full pl-9.5 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-350 text-slate-900 font-medium"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label>Số lượng khách dự kiến (Tối đa sảnh: {selectedHall.capacity}) *</label>
                      <input
                        type="number"
                        min={10}
                        required
                        value={guestsCount}
                        onChange={(e) => setGuestsCount(parseInt(e.target.value) || 10)}
                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-slate-350 text-slate-900 font-medium"
                      />
                    </div>
                  </div>

                  {/* Summary bill */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex flex-col gap-4 text-xs font-semibold text-slate-600">
                    <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
                      Tóm tắt tiệc đặt
                    </span>
                    <div className="flex flex-col gap-2 border-b border-slate-200/60 pb-3 text-slate-700">
                      <div className="flex justify-between">
                        <span>Sảnh:</span>
                        <span className="font-extrabold">{selectedHall.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Thời gian:</span>
                        <span className="font-extrabold">Ngày {selectedDate}/06/2026</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Khung giờ:</span>
                        <span className="font-extrabold">{selectedTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Gói ẩm thực:</span>
                        <span className="font-extrabold">{selectedPackage.name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Số lượng:</span>
                        <span className="font-extrabold">{guestsCount} khách</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between text-slate-500">
                        <span>Phí thuê sảnh:</span>
                        <span>{selectedHall.price}</span>
                      </div>
                      <div className="flex justify-between text-slate-500">
                        <span>Bàn tiệc ({guestsCount} khách):</span>
                        <span>{(guestsCount * parseFloat(selectedPackage.pricePerGuest.replace(/[^0-9]/g, ""))).toLocaleString("vi-VN")} vnđ</span>
                      </div>
                      <div className="flex justify-between text-slate-900 font-bold border-t border-slate-100 pt-2.5 text-sm">
                        <span>Tổng tạm tính:</span>
                        <span className="text-rose-500">
                          {(parseFloat(selectedHall.price.replace(/[^0-9]/g, "")) + (guestsCount * parseFloat(selectedPackage.pricePerGuest.replace(/[^0-9]/g, "")))).toLocaleString("vi-VN")} vnđ
                        </span>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full py-3 bg-rose-500 hover:bg-rose-600 text-white rounded-xl text-xs font-black tracking-widest uppercase transition-colors cursor-pointer text-center font-display mt-2"
                    >
                      XÁC NHẬN & ĐẶT CỌC
                    </button>
                  </div>

                </div>
              </form>
            )}

            {/* Step navigation triggers */}
            <div className="flex justify-between border-t border-slate-150 pt-5 mt-6">
              <button
                type="button"
                onClick={handlePrevStep}
                disabled={step === 1}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-xs font-bold font-display disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer transition-all"
              >
                Quay lại
              </button>
              {step < 4 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold font-display cursor-pointer transition-all flex items-center gap-1"
                >
                  Tiếp theo <ChevronRight size={14} />
                </button>
              ) : null}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
