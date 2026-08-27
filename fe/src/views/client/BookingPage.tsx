import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import {
  Phone,
  Mail,
  CheckCircle,
  ArrowRight,
  Calendar,
  Loader2,
  Printer,
  Star,
  AlertCircle,
  Clock,
  ChevronDown,
  Sun,
  Moon,
  Minus,
  Plus,
  Users,
  User,
  Sparkles,
  MessageSquare,
  ShieldCheck,
  Award,
  MapPin,
  Copy,
  History,
  Utensils,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { createBooking, payBookingDeposit } from "../../services/customerService";
import type { CreatedBooking, Customer } from "../../services/customerService";
import { getComboConstituents } from "../../utils/comboHelper";
import {
  BOOKING_DURATION_MINUTES,
  BOOKING_MAX_ADVANCE_DAYS,
  isWithinPublicBookingHours,
  ONLINE_BOOKING_LAST_ARRIVAL_TIME,
  PUBLIC_BOOKING_HOURS,
} from "../../constants/booking";
import { getBookingValidationStatus } from "../../services/systemService";

/** Formats ISO date to friendly Vietnamese weekday and date */
const getFormattedVietnameseDate = (dateStr: string): string => {
  if (!dateStr) return "Chưa chọn ngày";
  try {
    const d = new Date(dateStr + "T00:00:00");
    const dayNames = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayName = dayNames[d.getDay()];
    const [year, month, day] = dateStr.split("-");
    return `${dayName}, ${day}/${month}/${year}`;
  } catch {
    return dateStr;
  }
};

/** Returns a date input value offset by the configured booking horizon. */
const getMaximumBookingDate = (): string => {
  const date = new Date();
  date.setDate(date.getDate() + BOOKING_MAX_ADVANCE_DAYS);
  return date.toISOString().slice(0, 10);
};

/** Builds a Vietnam-local SQL datetime after a configured booking duration. */
const getBookingEndTime = (date: string, time: string): string => {
  const start = new Date(`${date}T${time}:00+07:00`);
  const end = new Date(start.getTime() + BOOKING_DURATION_MINUTES * 60 * 1000);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(end).replace("T", " ");
};

export const BookingPage: React.FC = () => {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [bookingValidationEnabled, setBookingValidationEnabled] = useState<boolean>(true);

  useEffect(() => {
    getBookingValidationStatus().then(setBookingValidationEnabled).catch(() => {});
  }, []);

  const [createdBooking, setCreatedBooking] = useState<CreatedBooking | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingDeposit, setPayingDeposit] = useState(false);

  // Time picker popover state & ref
  const [timePickerOpen, setTimePickerOpen] = useState(false);
  const timePickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (timePickerRef.current && !timePickerRef.current.contains(event.target as Node)) {
        setTimePickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSlotDisabled = (slot: string, selectedDate: string): boolean => {
    if (!selectedDate) return false;
    if (!bookingValidationEnabled) return false;
    const todayStr = new Date().toISOString().split("T")[0];
    if (selectedDate < todayStr) return true;
    if (selectedDate > todayStr) return false;
    
    // If today: check if time is past
    const now = new Date();
    const [slotH, slotM] = slot.split(":").map(Number);
    const slotDate = new Date();
    slotDate.setHours(slotH, slotM, 0, 0);
    return slotDate <= now;
  };

  // Field validation states
  const [errors, setErrors] = useState<{
    date?: string;
    time?: string;
    guests?: string;
    name?: string;
    phone?: string;
    email?: string;
  }>({});

  const handlePayDeposit = async () => {
    if (!createdBooking?.id) return;
    setPayingDeposit(true);
    try {
      const updated = await payBookingDeposit(createdBooking.id);
      setCreatedBooking(updated);
      toast.success("🎉 Mô phỏng thanh toán tiền cọc thành công!");
      setShowPaymentModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể thực hiện thanh toán tiền cọc lúc này.");
    } finally {
      setPayingDeposit(false);
    }
  };

  const getCustomerProfile = (): { name: string; phone: string; email: string } => {
    const infoStr = localStorage.getItem("customer_info");
    if (infoStr) {
      try {
        const customer = JSON.parse(infoStr) as Customer;
        return {
          name: customer.name || "",
          phone: customer.phone || "",
          email: customer.email || "",
        };
      } catch (e) {
        console.error("Error parsing customer_info", e);
      }
    }
    return { name: "", phone: "", email: "" };
  };

  const [form, setForm] = useState(() => {
    const profile = getCustomerProfile();
    return {
      date: "",
      time: "",
      guests: "2",
      name: profile.name,
      phone: profile.phone,
      email: profile.email,
      note: "",
    };
  });

  // Auto fill profile if logged in
  useEffect(() => {
    const profile = getCustomerProfile();
    if (profile.name || profile.phone || profile.email) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || profile.name,
        email: prev.email || profile.email,
        phone: prev.phone || profile.phone,
      }));
    }
  }, []);

  const validateBookingForm = (values = form) => {
    const errs: Record<string, string> = {};

    // 1. Ngày đến
    if (!values.date) {
      errs.date = "Vui lòng chọn ngày đến";
    } else {
      const today = new Date().toISOString().split("T")[0];
      if (bookingValidationEnabled && values.date < today) {
        errs.date = "Ngày đến không được ở quá khứ";
      } else if (bookingValidationEnabled && values.date > getMaximumBookingDate()) {
        errs.date = `Chỉ có thể đặt bàn trước tối đa ${BOOKING_MAX_ADVANCE_DAYS} ngày`;
      }
    }

    // 2. Giờ đến
    if (!values.time) {
      errs.time = "Vui lòng chọn giờ đến";
    } else {
      if (bookingValidationEnabled && !isWithinPublicBookingHours(values.time)) {
        errs.time = `Giờ nhận khách online từ ${PUBLIC_BOOKING_HOURS.OPEN} đến ${ONLINE_BOOKING_LAST_ARRIVAL_TIME}`;
      } else if (values.date) {
        const selectedDateTime = new Date(`${values.date}T${values.time}:00`);
        const now = new Date();
        if (bookingValidationEnabled && selectedDateTime < now) {
          errs.time = "Giờ đến đã qua so với thời gian hiện tại";
        }
      }
    }

    // 3. Số khách
    const guestNum = Number(values.guests);
    if (!values.guests || isNaN(guestNum) || guestNum < 1) {
      errs.guests = "Tối thiểu 1 khách";
    } else if (guestNum > 30) {
      errs.guests = "Tối đa 30 khách cho mỗi đơn đặt online";
    }

    // 4. Họ và tên
    if (!values.name || !values.name.trim()) {
      errs.name = "Vui lòng nhập họ và tên người đặt bàn";
    } else if (values.name.trim().length < 2) {
      errs.name = "Họ và tên tối thiểu 2 ký tự";
    }

    // 5. Số điện thoại
    const phone = values.phone ? values.phone.trim() : "";
    if (!phone) {
      errs.phone = "Vui lòng nhập số điện thoại liên hệ";
    } else {
      const hasLetters = /[a-zA-Z]/g.test(phone);
      const cleanRegex = /^[0-9+\s-]+$/;
      if (hasLetters || !cleanRegex.test(phone)) {
        errs.phone = "Số điện thoại chỉ được chứa chữ số và dấu +, -";
      } else {
        const cleanedPhone = phone.replace(/[\s-]/g, '');
        if (cleanedPhone.startsWith("+840") || cleanedPhone.startsWith("840")) {
          errs.phone = "Vui lòng bỏ số 0 sau mã +84 (VD: +84912345678)";
        } else if (!cleanedPhone.startsWith("0") && !cleanedPhone.startsWith("+84") && !cleanedPhone.startsWith("84")) {
          errs.phone = "SĐT phải bắt đầu bằng 0, 84 hoặc +84";
        } else if (cleanedPhone.length < 10 || cleanedPhone.length > 12) {
          errs.phone = "Số điện thoại phải từ 10 đến 12 ký tự";
        } else {
          let prefixDigit = "";
          if (cleanedPhone.startsWith("0")) prefixDigit = cleanedPhone.charAt(1);
          else if (cleanedPhone.startsWith("+84")) prefixDigit = cleanedPhone.charAt(3);
          else if (cleanedPhone.startsWith("84")) prefixDigit = cleanedPhone.charAt(2);
          
          const validPrefixes = ["3", "5", "7", "8", "9", "2"];
          if (!validPrefixes.includes(prefixDigit)) {
            errs.phone = "Đầu số nhà mạng không hợp lệ (VD: 03, 05, 07, 08, 09)";
          }
        }
      }
    }

    // 6. Email (tùy chọn)
    if (values.email && values.email.trim()) {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
        errs.email = "Định dạng email không hợp lệ (VD: name@example.com)";
      }
    }

    return errs;
  };

  const setField = (key: string, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      const fieldErrors = validateBookingForm(next);
      setErrors((prevErr) => ({ ...prevErr, [key]: fieldErrors[key] }));
      return next;
    });
  };

  const handleBlur = (_key: string) => {
    const formErrors = validateBookingForm();
    setErrors(formErrors);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();

    const formErrors = validateBookingForm();
    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0) {
      const firstError = Object.values(formErrors)[0];
      toast.error(firstError || "Vui lòng kiểm tra lại các trường thông tin có lỗi!");
      return;
    }

    setSubmitting(true);
    try {
      const startTimeStr = `${form.date} ${form.time}:00`;
      const endTimeStr = getBookingEndTime(form.date, form.time);

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

      const bookingResult = await createBooking({
        customer_id: customerId,
        promotion_id: null,
        guest_name: form.name.trim(),
        guest_phone: form.phone.trim(),
        guest_email: form.email.trim(),
        party_size: Number(form.guests),
        start_time: startTimeStr,
        end_time: endTimeStr,
        guest_note: form.note.trim(),
        booking_channel: "online",
      });

      setCreatedBooking(bookingResult);
      setStep(4);
      toast.success("Yêu cầu đặt bàn đã được ghi nhận thành công.");
    } catch (err: any) {
      const errMsg: string =
        err.response?.data?.message ||
        err.response?.data?.error ||
        (err.message === "Network Error" || err.code === "ERR_NETWORK"
          ? "Không thể kết nối tới Server Backend. Vui lòng bật server Backend (npm run dev trong thư mục be)."
          : err.message) ||
        "";
      toast.error(errMsg || "Đặt bàn thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  if (step === 4) {
    return (
      <div className="min-h-screen bg-client-bg pb-20">
        {/* HERO BANNER CELEBRATION */}
        <section className="relative h-[240px] sm:h-[280px] w-full overflow-hidden mb-8">
          <img
            src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&auto=format&fit=crop&q=80"
            alt="Restro Celebration Banner"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-black/65 backdrop-blur-xs" />
          
          <div className="relative mx-auto flex h-full max-w-5xl flex-col items-center justify-center px-4 text-center text-white">
            <span className="mb-2 text-[#dfb05b] text-xs uppercase font-black tracking-widest inline-flex items-center gap-1.5 bg-black/40 px-3.5 py-1 rounded-full border border-[#dfb05b]/40">
              <Sparkles size={13} className="text-[#dfb05b]" /> ĐẶT BÀN THÀNH CÔNG <Sparkles size={13} className="text-[#dfb05b]" />
            </span>
            <h1 className="text-2xl sm:text-4xl font-bold font-display tracking-wide text-white">
              Cảm Ơn Quý Khách Đã Lựa Chọn Restro!
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-gray-200 max-w-xl">
              Yêu cầu đặt bàn của quý khách đã được hệ thống tiếp nhận. Nhà hàng đang chuẩn bị không gian hoàn hảo nhất cho quý khách.
            </p>
          </div>
        </section>

        {/* MAIN 2-COLUMN DASHBOARD */}
        <main className="mx-auto px-4 sm:px-6 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start animate-fade-in">
            
            {/* LEFT COLUMN: Luxury Boarding Pass Ticket (lg:col-span-7) */}
            <div className="lg:col-span-7 space-y-6">
              
              <div className="bg-[#fdfbf9] rounded-3xl border border-[#e8dfd5] shadow-xl overflow-hidden relative">
                
                {/* Ticket Top Header Bar */}
                <div className="bg-gradient-to-r from-client-primary via-[#9e201b] to-[#731512] text-white px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Award size={20} className="text-[#dfb05b]" />
                    <div>
                      <h3 className="font-bold text-sm sm:text-base font-display">Phiếu Xác Nhận Đặt Bàn</h3>
                      <span className="text-[10px] text-white/75 block">Restro Luxury Dining Experience</span>
                    </div>
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/20 border border-emerald-400/30 rounded-full text-[11px] font-bold text-emerald-200">
                    <CheckCircle size={12} className="text-emerald-400" /> Đã Tiếp Nhận
                  </span>
                </div>

                <div className="p-6 sm:p-8 space-y-6">
                  
                  {/* Golden Monospace Confirmation Code Card */}
                  <div className="bg-gradient-to-br from-[#fbf8f2] to-[#f4ede0] border border-[#dfb05b]/50 rounded-2xl p-5 text-center shadow-inner relative overflow-hidden">
                    <span className="text-[10px] text-[#8a6828] font-extrabold uppercase tracking-widest block">
                      Mã xác nhận đặt bàn của quý khách
                    </span>
                    
                    <div className="flex items-center justify-center gap-3 my-2">
                      <span className="text-2xl sm:text-3xl font-black text-client-primary tracking-widest font-mono select-all">
                        {createdBooking?.confirmation_code}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          if (createdBooking?.confirmation_code) {
                            navigator.clipboard.writeText(createdBooking.confirmation_code);
                            toast.success("Đã sao chép mã đặt bàn: " + createdBooking.confirmation_code);
                          }
                        }}
                        title="Sao chép mã đặt bàn"
                        className="p-2 rounded-xl bg-white border border-[#dfb05b]/40 hover:bg-[#dfb05b]/10 text-[#8a6828] transition-all cursor-pointer shadow-2xs active:scale-95"
                      >
                        <Copy size={15} />
                      </button>
                    </div>

                    {/* Monospace Barcode */}
                    <div className="flex justify-center items-center gap-[2px] h-6 opacity-60 mt-3 max-w-[220px] mx-auto">
                      <div className="w-[3px] h-full bg-[#2a221c]"></div>
                      <div className="w-[1px] h-full bg-[#2a221c]"></div>
                      <div className="w-[2px] h-full bg-[#2a221c]"></div>
                      <div className="w-[3px] h-full bg-[#2a221c]"></div>
                      <div className="w-[1px] h-full bg-[#2a221c]"></div>
                      <div className="w-[2px] h-full bg-[#2a221c]"></div>
                      <div className="w-[4px] h-full bg-[#2a221c]"></div>
                      <div className="w-[1px] h-full bg-[#2a221c]"></div>
                      <div className="w-[3px] h-full bg-[#2a221c]"></div>
                      <div className="w-[1px] h-full bg-[#2a221c]"></div>
                      <div className="w-[2px] h-full bg-[#2a221c]"></div>
                      <div className="w-[4px] h-full bg-[#2a221c]"></div>
                      <div className="w-[2px] h-full bg-[#2a221c]"></div>
                      <div className="w-[1px] h-full bg-[#2a221c]"></div>
                      <div className="w-[3px] h-full bg-[#2a221c]"></div>
                      <div className="w-[1px] h-full bg-[#2a221c]"></div>
                      <div className="w-[2px] h-full bg-[#2a221c]"></div>
                    </div>
                  </div>

                  {/* Reservation Detailed Specs */}
                  <div className="bg-white rounded-2xl p-5 border border-[#e8dfd5] shadow-2xs space-y-3.5 text-xs">
                    
                    {/* Row 1: Khách hàng */}
                    <div className="flex justify-between items-center py-1 border-b border-[#f0eae1]">
                      <span className="text-client-muted font-bold flex items-center gap-2 uppercase tracking-wider text-[11px]">
                        <User size={14} className="text-client-primary" /> Người đặt bàn:
                      </span>
                      <span className="font-bold text-client-text text-sm">
                        {createdBooking?.guest_name || form.name}
                      </span>
                    </div>

                    {/* Row 2: Số điện thoại */}
                    <div className="flex justify-between items-center py-1 border-b border-[#f0eae1]">
                      <span className="text-client-muted font-bold flex items-center gap-2 uppercase tracking-wider text-[11px]">
                        <Phone size={14} className="text-client-primary" /> Số điện thoại:
                      </span>
                      <span className="font-mono font-bold text-client-text text-sm">
                        {createdBooking?.guest_phone || form.phone}
                      </span>
                    </div>

                    {/* Row 3: Ngày dùng bữa */}
                    <div className="flex justify-between items-center py-1 border-b border-[#f0eae1]">
                      <span className="text-client-muted font-bold flex items-center gap-2 uppercase tracking-wider text-[11px]">
                        <Calendar size={14} className="text-client-primary" /> Ngày dùng bữa:
                      </span>
                      <span className="font-bold text-client-text">
                        {getFormattedVietnameseDate(form.date)}
                      </span>
                    </div>

                    {/* Row 4: Thời gian nhận bàn */}
                    <div className="flex justify-between items-center py-1 border-b border-[#f0eae1]">
                      <span className="text-client-muted font-bold flex items-center gap-2 uppercase tracking-wider text-[11px]">
                        <Clock size={14} className="text-client-primary" /> Giờ nhận bàn:
                      </span>
                      <span className="font-bold text-client-text">
                        {form.time} ({parseInt(form.time?.split(':')[0] || '12') < 15 ? 'Bữa Trưa' : 'Bữa Tối'})
                      </span>
                    </div>

                    {/* Row 5: Số thực khách */}
                    <div className="flex justify-between items-center py-1 border-b border-[#f0eae1]">
                      <span className="text-client-muted font-bold flex items-center gap-2 uppercase tracking-wider text-[11px]">
                        <Users size={14} className="text-client-primary" /> Số lượng khách:
                      </span>
                      <span className="font-black text-client-text">
                        {createdBooking?.party_size || form.guests} khách
                      </span>
                    </div>

                    {/* Row 6: Email */}
                    {form.email && (
                      <div className="flex justify-between items-center py-1 border-b border-[#f0eae1]">
                        <span className="text-client-muted font-bold flex items-center gap-2 uppercase tracking-wider text-[11px]">
                          <Mail size={14} className="text-client-primary" /> Email:
                        </span>
                        <span className="font-medium text-client-text truncate max-w-[200px]">
                          {form.email}
                        </span>
                      </div>
                    )}

                    {/* Row 7: Trạng thái */}
                    <div className="flex justify-between items-center py-1">
                      <span className="text-client-muted font-bold flex items-center gap-2 uppercase tracking-wider text-[11px]">
                        <ShieldCheck size={14} className="text-amber-600" /> Trạng thái đặt:
                      </span>
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 font-bold border border-amber-200 rounded-full text-xs">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                        Chờ nhà hàng xác nhận
                      </span>
                    </div>

                    {/* Row 8: Ghi chú & Dịp đặc biệt */}
                    {form.note && (
                      <div className="pt-2 border-t border-[#f0eae1]">
                        <span className="text-[11px] text-client-muted font-bold block mb-1">Ghi chú & Dịp đặc biệt:</span>
                        <p className="text-xs bg-[#fdfbf9] p-3 rounded-xl border border-[#e8dfd5] text-client-text italic leading-relaxed">
                          "{form.note}"
                        </p>
                      </div>
                    )}

                    {/* Pre-order & Deposit Box */}
                    {Boolean(createdBooking && (createdBooking.deposit_amount ?? 0) > 0) && (
                      <div className="mt-4 pt-3 border-t border-[#e8dfd5] space-y-3 bg-amber-50/50 p-4 rounded-2xl">
                        <div className="flex justify-between text-xs items-center">
                          <span className="text-client-muted font-bold uppercase tracking-wider">Tiền cọc món (20%):</span>
                          <span className="font-black text-rose-600 text-sm font-mono">{Number(createdBooking?.deposit_amount || 0).toLocaleString("vi-VN")}đ</span>
                        </div>
                        <div className="flex justify-between text-xs items-center">
                          <span className="text-client-muted font-bold uppercase tracking-wider">Trạng thái cọc:</span>
                          {createdBooking?.deposit_status === "paid" ? (
                            <span className="font-bold text-emerald-700 bg-emerald-100/70 px-2.5 py-1 rounded-lg border border-emerald-200 uppercase text-[10px] tracking-wider">Đã đặt cọc</span>
                          ) : (
                            <span className="font-bold text-rose-600 bg-rose-100/70 px-2.5 py-1 rounded-lg border border-rose-200 uppercase text-[10px] tracking-wider">Chờ thanh toán</span>
                          )}
                        </div>
                        {createdBooking?.deposit_status !== "paid" && (
                          <button
                            type="button"
                            onClick={() => setShowPaymentModal(true)}
                            className="w-full mt-2 py-3 bg-gradient-to-r from-[#8A1915] to-[#b43a2b] hover:from-[#70120f] hover:to-[#8A1915] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Sparkles size={14} /> Thanh toán tiền cọc qua VietQR ngay
                          </button>
                        )}
                      </div>
                    )}

                  </div>

                  {/* Print & Copy actions bar */}
                  <div className="flex flex-col sm:flex-row gap-3 pt-2">
                    {(createdBooking?.deposit_amount === 0 || createdBooking?.deposit_status === "paid") && (
                      <button
                        type="button"
                        onClick={handlePrintInvoice}
                        className="flex-1 inline-flex items-center justify-center gap-2 py-3.5 px-4 bg-white hover:bg-client-accent text-client-text border border-[#e8dfd5] rounded-2xl font-bold text-xs shadow-xs transition-all cursor-pointer"
                      >
                        <Printer size={15} className="text-gray-500" /> In vé xác nhận đặt bàn
                      </button>
                    )}
                  </div>

                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Arrival Guide, Location, Navigation (lg:col-span-5) */}
            <div className="lg:col-span-5 space-y-6">
              
              {/* Card 1: Lưu ý đón tiếp (Arrival Guide) */}
              <div className="bg-[#fdfbf9] rounded-3xl border border-[#e8dfd5] p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2.5 border-b border-[#f0eae1] pb-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
                    <Clock size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-client-text font-display">Lưu ý khi đến dùng bữa</h4>
                    <span className="text-[10px] text-client-muted">Để bữa tiệc của quý khách diễn ra trọn vẹn nhất</span>
                  </div>
                </div>

                <div className="space-y-3 text-xs text-client-text">
                  <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-[#f0eae1]">
                    <Clock size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-gray-900">Giữ chỗ đúng giờ:</span>
                      <p className="text-client-muted text-[11px] mt-0.5">Nhà hàng sẽ giữ bàn tối đa 15 phút so với giờ hẹn. Quý khách vui lòng đến đúng giờ.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-[#f0eae1]">
                    <ShieldCheck size={15} className="text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-gray-900">Bãi đỗ xe miễn phí:</span>
                      <p className="text-client-muted text-[11px] mt-0.5">Có nhân viên bảo vệ hỗ trợ đỗ xe ô tô và xe máy an toàn ngay trước sảnh chính.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 bg-white p-3 rounded-2xl border border-[#f0eae1]">
                    <Phone size={15} className="text-client-primary shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold block text-gray-900">Hotline hỗ trợ:</span>
                      <p className="text-client-muted text-[11px] mt-0.5">Liên hệ hotline <strong className="text-client-primary font-mono font-bold">028 3829 4000</strong> nếu cần hỗ trợ dời giờ hoặc đổi thông tin.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2: Thông tin nhà hàng (Location & Info) */}
              <div className="bg-[#fdfbf9] rounded-3xl border border-[#e8dfd5] p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2.5 border-b border-[#f0eae1] pb-3">
                  <div className="w-8 h-8 rounded-xl bg-client-primary/10 text-client-primary flex items-center justify-center font-bold">
                    <MapPin size={16} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-client-text font-display">Nhà Hàng Restro</h4>
                    <span className="text-[10px] text-client-muted">Fine Dining Restaurant & Lounge</span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-client-muted">
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-gray-700 shrink-0">Địa chỉ:</span>
                    <span className="text-right text-gray-900 font-medium">123 Nguyễn Huệ, Quận 1, TP.HCM</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-gray-700 shrink-0">Giờ hoạt động:</span>
                    <span className="text-right text-gray-900 font-medium">10:00 – 22:00 (Hàng ngày)</span>
                  </div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="font-bold text-gray-700 shrink-0">Email:</span>
                    <span className="text-right text-gray-900 font-medium">contact@restro.vn</span>
                  </div>
                </div>
              </div>

              {/* Navigation Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => {
                    const profile = getCustomerProfile();
                    setStep(1);
                    setCreatedBooking(null);
                    setForm((prev) => ({
                      date: "",
                      time: "",
                      guests: "2",
                      name: prev.name || profile.name || "",
                      phone: prev.phone || profile.phone || "",
                      email: prev.email || profile.email || "",
                      note: "",
                    }));
                  }}
                  className="w-full py-4 bg-gradient-to-r from-client-primary via-[#9e201b] to-[#731512] hover:from-[#731512] hover:to-client-primary text-white rounded-2xl font-extrabold text-sm shadow-lg shadow-client-primary/25 hover:shadow-xl transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                >
                  <Plus size={16} /> Tạo đơn đặt bàn mới
                </button>

                <Link
                  to="/account?tab=bookings"
                  className="w-full py-3.5 bg-white hover:bg-client-accent text-client-text border border-[#e8dfd5] rounded-2xl font-bold text-xs shadow-2xs transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                >
                  <History size={15} /> Xem trong lịch sử đặt bàn của tôi
                </Link>

                <Link
                  to="/menu"
                  className="w-full py-3 bg-transparent hover:bg-white/60 text-client-muted hover:text-client-text rounded-2xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer text-center"
                >
                  <Utensils size={14} /> Khám phá thực đơn món ăn Restro
                </Link>
              </div>

            </div>

          </div>
        </main>

        {/* Printable Booking Receipt */}
        <div id="booking-invoice-print" className="hidden print:block p-8 bg-white text-gray-900 font-mono text-sm max-w-md mx-auto">
          <div className="text-center border-b border-dashed border-gray-400 pb-4">
            <h2 className="text-lg font-bold uppercase tracking-wider">Nhà Hàng Restro</h2>
            <p className="text-xs mt-1">123 Nguyễn Huệ, Quận 1, TP.HCM</p>
            <p className="text-xs">Hotline: 028 3829 4000</p>
            <h3 className="text-base font-black uppercase mt-4 tracking-widest">Hóa Đơn Xác Nhận Đặt Bàn</h3>
            <p className="text-xs mt-1">Mã: <span className="font-bold">{createdBooking?.confirmation_code}</span></p>
          </div>

          <div className="py-4 space-y-2 border-b border-dashed border-gray-400">
            <div className="flex justify-between"><span>Khách hàng:</span> <span className="font-bold">{createdBooking?.guest_name || form.name}</span></div>
            <div className="flex justify-between"><span>Số điện thoại:</span> <span>{createdBooking?.guest_phone || form.phone}</span></div>
            <div className="flex justify-between"><span>Thời gian đến:</span> <span className="font-bold">{form.time} - {form.date ? new Date(form.date).toLocaleDateString("vi-VN") : ""}</span></div>
            <div className="flex justify-between"><span>Số lượng khách:</span> <span>{createdBooking?.party_size || form.guests} người</span></div>
            <div className="flex justify-between"><span>Trạng thái:</span> <span className="font-bold uppercase text-xs">Chờ xác nhận</span></div>
          </div>

          {/* Món đặt trước (nếu có) */}
          {createdBooking?.pre_ordered_items && createdBooking.pre_ordered_items.length > 0 && (
            <div className="py-4 border-b border-dashed border-gray-400">
              <h4 className="font-bold mb-2 uppercase text-xs tracking-wider">Danh sách món đặt trước:</h4>
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-300">
                    <th className="py-1">Món ăn</th>
                    <th className="py-1 text-center">SL</th>
                    <th className="py-1 text-right">Đơn giá</th>
                    <th className="py-1 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {createdBooking.pre_ordered_items.map((item: any) => {
                    const constituents = getComboConstituents(item.menu_item_name);
                    return (
                      <tr key={item.id} className="border-b border-gray-100">
                        <td className="py-1 text-left">
                          <div className="font-bold">{item.menu_item_name}</div>
                          {constituents && (
                            <div className="pl-3 text-[10px] text-gray-500 font-medium mt-0.5 leading-relaxed">
                              {constituents.map((sub: string, sIdx: number) => (
                                <div key={sIdx}>• {sub}</div>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="py-1 text-center font-bold">{item.quantity}</td>
                        <td className="py-1 text-right">{Number(item.unit_price).toLocaleString("vi-VN")}đ</td>
                        <td className="py-1 text-right font-bold">{(item.quantity * item.unit_price).toLocaleString("vi-VN")}đ</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              <div className="mt-4 space-y-1.5 text-xs text-right">
                <div>Tổng tiền món: <span className="font-bold">{Number(createdBooking.pre_order_total).toLocaleString("vi-VN")}đ</span></div>
                <div className="font-semibold">Đã cọc (20%): <span className="font-black text-rose-700">{Number(createdBooking.deposit_amount).toLocaleString("vi-VN")}đ</span></div>
                <div>Trạng thái cọc: <span className="font-bold text-green-700">{createdBooking.deposit_status === "paid" ? "ĐÃ THANH TOÁN" : "CHƯA THANH TOÁN"}</span></div>
              </div>
            </div>
          )}

          <div className="text-center pt-6 space-y-2">
            <p className="text-xs italic">Cảm ơn quý khách đã đặt bàn tại Restro Fine Dining!</p>
            <p className="text-[10px] text-gray-500">Giờ in: {new Date().toLocaleString("vi-VN")}</p>
          </div>
        </div>

        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #booking-invoice-print, #booking-invoice-print * {
              visibility: visible !important;
            }
            #booking-invoice-print {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              display: block !important;
            }
          }
        `}</style>

        {/* VietQR Payment Modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl flex flex-col p-6 text-center animate-fade-in border border-client-accent">
              <h3 className="text-lg font-bold text-client-text font-display">Thanh Toán Tiền Cọc</h3>
              <p className="text-xs text-client-muted mt-1">Quét mã QR bằng ứng dụng ngân hàng của bạn</p>

              {/* VietQR image */}
              <div className="my-4">
                <img
                  src={`https://img.vietqr.io/image/MB-0912345678-compact2.png?amount=${createdBooking?.deposit_amount || 0}&addInfo=${createdBooking?.confirmation_code || ""}&accountName=NHA%20HANG%20RESMANAGER`}
                  alt="Mã QR Chuyển khoản VietQR"
                  className="mx-auto w-52 h-52 object-contain border border-client-accent rounded-2xl shadow-xs p-2 bg-white"
                />
              </div>

              {/* Account Details */}
              <div className="bg-client-bg rounded-2xl p-4 border border-client-accent text-left text-xs space-y-2 text-client-muted">
                <div className="flex justify-between"><span>Ngân hàng:</span> <span className="font-bold text-client-text">MB Bank</span></div>
                <div className="flex justify-between"><span>Số tài khoản:</span> <span className="font-bold text-client-text">0912345678</span></div>
                <div className="flex justify-between"><span>Chủ tài khoản:</span> <span className="font-bold text-client-text">NHA HANG RESMANAGER</span></div>
                <div className="flex justify-between"><span>Số tiền cọc (20%):</span> <span className="font-bold text-rose-600 text-sm font-mono">{Number(createdBooking?.deposit_amount || 0).toLocaleString("vi-VN")}đ</span></div>
                <div className="flex justify-between"><span>Nội dung chuyển:</span> <span className="font-bold text-client-primary uppercase font-mono">{createdBooking?.confirmation_code || ""}</span></div>
              </div>

              {/* Simulated Payment Actions */}
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handlePayDeposit}
                  disabled={payingDeposit}
                  className="w-full py-3 bg-client-primary hover:bg-client-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {payingDeposit ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Đang xử lý...
                    </>
                  ) : (
                    "Xác nhận đã chuyển khoản (Mô phỏng)"
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="w-full py-3 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Đóng / Thanh toán sau
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-client-bg pb-20">
      {/* 1. HERO BANNER */}
      <section className="relative h-[280px] w-full overflow-hidden mb-10">
        <img
          src="https://images.unsplash.com/photo-1544025162-d76694265947?w=1600&auto=format&fit=crop&q=80"
          alt="Restro Table Booking Banner"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60 backdrop-blur-xs" />
        
        <div className="relative mx-auto flex h-full max-w-7xl flex-col items-center justify-center px-4 text-center text-white">
          <span className="mb-2 text-client-secondary text-xs uppercase font-bold tracking-widest flex items-center gap-1.5 justify-center">
            <Star size={12} className="fill-client-secondary text-client-secondary" /> Table Reservation <Star size={12} className="fill-client-secondary text-client-secondary" />
          </span>
          <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-wide text-white">Đặt Bàn Trực Tuyến</h1>
          <p className="mt-2 text-xs text-gray-300 max-w-md">
            Chống trùng lịch · Đặt chỗ thời gian thực · Trải nghiệm trọn vẹn ẩm thực Restro
          </p>

          {/* Progress stepper overlay */}
          <div className="mt-6 flex items-center gap-3 text-[11px] font-bold text-white/60 bg-white/10 px-5 py-2.5 rounded-full border border-white/20">
            <span className="text-client-secondary font-extrabold">1. Điền thông tin đặt bàn</span>
            <span>&rarr;</span>
            <span className={step >= 4 ? "text-client-secondary font-extrabold" : ""}>2. Xác nhận & Hoàn tất</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="mx-auto px-4 sm:px-6 mt-8 max-w-6xl transition-all">
        {step === 1 && (
          <form noValidate onSubmit={handleSubmitBooking} className="animate-fade-in">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* LEFT COLUMN: Booking Details & Guest Info (lg:col-span-7 xl:col-span-8) */}
              <div className="lg:col-span-7 xl:col-span-8 space-y-8">
                
                {/* Card 1: Chọn lịch trình đặt bàn */}
                <div className="bg-[#fdfbf9] rounded-3xl border border-[#e8dfd5] p-6 sm:p-8 shadow-sm relative overflow-visible z-20 transition-all">
                  
                  {/* Card 1 Header */}
                  <div className="flex items-center justify-between border-b border-[#f0eae1] pb-5 mb-6 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-client-primary/10 text-client-primary flex items-center justify-center font-bold shadow-2xs">
                        <Calendar size={22} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-client-text font-display flex items-center gap-2">
                          1. Chọn lịch trình dùng bữa
                        </h2>
                        <p className="text-xs text-client-muted">Thời gian và số lượng khách thưởng thức ẩm thực</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200 shadow-2xs">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        Nhận khách: 10:00 - 19:00
                      </span>
                    </div>
                  </div>

                  <div className="grid gap-6 sm:grid-cols-3 items-stretch">
                    
                    {/* 1. Ngày đến */}
                    <div className="flex flex-col justify-between bg-white p-4 rounded-2xl border border-[#f0eae1] shadow-2xs space-y-2">
                      <label className="block text-xs font-bold text-client-text uppercase tracking-wider flex items-center justify-between">
                        <span>Ngày đến <span className="text-rose-500">*</span></span>
                        <Calendar size={13} className="text-gray-400" />
                      </label>
                      
                      <div className="relative">
                        <input
                          type="date"
                          value={form.date}
                          onChange={(e) => {
                            setField("date", e.target.value);
                            if (form.time) {
                              setTimeout(() => {
                                setField("time", form.time);
                              }, 0);
                            }
                          }}
                          onBlur={() => handleBlur("date")}
                          min={bookingValidationEnabled ? new Date().toISOString().split("T")[0] : undefined}
                          max={bookingValidationEnabled ? getMaximumBookingDate() : undefined}
                          className={`w-full rounded-2xl border px-3 py-2.5 text-xs outline-none transition-all ${
                            errors.date
                              ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 focus:border-rose-500 text-rose-950"
                              : "border-[#e8dfd5] bg-white focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20"
                          }`}
                        />
                      </div>

                      {/* Quick Date Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setField("date", new Date().toISOString().split("T")[0])}
                          className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                            form.date === new Date().toISOString().split("T")[0]
                              ? "bg-client-primary text-white border-client-primary shadow-xs"
                              : "bg-[#fdfbf9] hover:bg-client-accent text-client-text border-[#e8dfd5]"
                          }`}
                        >
                          Hôm nay
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 1);
                            setField("date", d.toISOString().split("T")[0]);
                          }}
                          className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                            (() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 1);
                              return form.date === d.toISOString().split("T")[0];
                            })()
                              ? "bg-client-primary text-white border-client-primary shadow-xs"
                              : "bg-[#fdfbf9] hover:bg-client-accent text-client-text border-[#e8dfd5]"
                          }`}
                        >
                          Ngày mai
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            d.setDate(d.getDate() + 2);
                            setField("date", d.toISOString().split("T")[0]);
                          }}
                          className={`px-2 py-1 rounded-xl text-[10px] font-bold transition-all cursor-pointer border ${
                            (() => {
                              const d = new Date();
                              d.setDate(d.getDate() + 2);
                              return form.date === d.toISOString().split("T")[0];
                            })()
                              ? "bg-client-primary text-white border-client-primary shadow-xs"
                              : "bg-[#fdfbf9] hover:bg-client-accent text-client-text border-[#e8dfd5]"
                          }`}
                        >
                          Ngày kia
                        </button>
                      </div>

                      {errors.date && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-rose-600 font-medium animate-slide-in">
                          <AlertCircle size={12} className="shrink-0 text-rose-500" />
                          <span className="text-[11px] leading-tight">{errors.date}</span>
                        </div>
                      )}
                    </div>

                    {/* 2. Giờ đến (Custom Time Slot Popover Picker) */}
                    <div className="flex flex-col justify-between bg-white p-4 rounded-2xl border border-[#f0eae1] shadow-2xs space-y-2 relative z-30" ref={timePickerRef}>
                      <label className="block text-xs font-bold text-client-text uppercase tracking-wider flex items-center justify-between">
                        <span>Giờ đến <span className="text-rose-500">*</span></span>
                        <Clock size={13} className="text-gray-400" />
                      </label>

                      <div
                        onClick={() => setTimePickerOpen((prev) => !prev)}
                        className={`w-full rounded-2xl border px-3 py-2.5 text-xs flex items-center justify-between cursor-pointer transition-all select-none ${
                          errors.time
                            ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 text-rose-950"
                            : timePickerOpen
                            ? "border-client-secondary ring-2 ring-client-secondary/20 bg-white"
                            : "border-[#e8dfd5] bg-white hover:border-client-secondary"
                        }`}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Clock size={14} className={`shrink-0 ${errors.time ? "text-rose-500" : form.time ? "text-client-primary" : "text-gray-400"}`} />
                          <span className={`text-xs truncate ${form.time ? "font-bold text-gray-900 font-mono" : "text-gray-400"}`}>
                            {form.time ? `${form.time} (${parseInt(form.time.split(':')[0]) < 15 ? 'Trưa' : 'Tối'})` : "Chọn giờ đến..."}
                          </span>
                        </div>
                        <ChevronDown size={14} className={`shrink-0 text-gray-400 transition-transform ${timePickerOpen ? "rotate-180 text-client-primary" : ""}`} />
                      </div>

                      {/* Quick Time Slots Chips */}
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {["11:30", "12:00", "18:00", "18:30"].map((slot) => {
                          const disabled = isSlotDisabled(slot, form.date);
                          const isSelected = form.time === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={disabled}
                              onClick={() => setField("time", slot)}
                              className={`px-2 py-1 rounded-xl text-[10px] font-mono font-bold transition-all cursor-pointer border ${
                                isSelected
                                  ? "bg-client-primary text-white border-client-primary shadow-xs"
                                  : disabled
                                  ? "bg-gray-100 text-gray-300 border-transparent cursor-not-allowed"
                                  : "bg-[#fdfbf9] hover:bg-client-accent text-client-text border-[#e8dfd5]"
                              }`}
                            >
                              {slot}
                            </button>
                          );
                        })}
                      </div>

                      {/* Popover Time Slot Picker Dropdown */}
                      {timePickerOpen && (
                        <div className="absolute left-0 sm:-left-2 md:-left-4 top-full mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-amber-300/80 p-4 z-50 animate-fade-in backdrop-blur-md">
                          <div className="flex items-center justify-between pb-3 border-b border-[#f0eae1] mb-3">
                            <div className="flex items-center gap-1.5">
                              <Clock size={15} className="text-client-primary" />
                              <span className="text-xs font-bold text-gray-900 font-display">Chọn khung giờ dùng bữa</span>
                            </div>
                            <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full">
                              10:00 - 19:00
                            </span>
                          </div>

                          <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                            {/* Bữa Trưa (Lunch) */}
                            <div>
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-2">
                                <Sun size={13} className="text-amber-500" />
                                <span>Khung giờ trưa (10:00 - 14:00)</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1.5">
                                {["10:00", "10:30", "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00"].map((slot) => {
                                  const disabled = isSlotDisabled(slot, form.date);
                                  const isSelected = form.time === slot;

                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      disabled={disabled}
                                      onClick={() => {
                                        setField("time", slot);
                                        setTimePickerOpen(false);
                                      }}
                                      className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all text-center cursor-pointer ${
                                        isSelected
                                          ? "bg-client-primary text-white shadow-md ring-2 ring-[#dfb05b] scale-105"
                                          : disabled
                                          ? "bg-gray-100 text-gray-300 line-through cursor-not-allowed border border-transparent"
                                          : "bg-[#fdfbf9] hover:bg-client-accent text-gray-800 border border-[#e8dfd5]"
                                      }`}
                                    >
                                      {slot}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Bữa Tối (Dinner) */}
                            <div>
                              <div className="flex items-center gap-1.5 text-[11px] font-bold text-indigo-800 uppercase tracking-wider mb-2">
                                <Moon size={13} className="text-indigo-500" />
                                <span>Khung giờ tối (16:30 - 19:00)</span>
                              </div>
                              <div className="grid grid-cols-4 gap-1.5">
                                {["16:30", "17:00", "17:30", "18:00", "18:30", "19:00"].map((slot) => {
                                  const disabled = isSlotDisabled(slot, form.date);
                                  const isSelected = form.time === slot;

                                  return (
                                    <button
                                      key={slot}
                                      type="button"
                                      disabled={disabled}
                                      onClick={() => {
                                        setField("time", slot);
                                        setTimePickerOpen(false);
                                      }}
                                      className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all text-center cursor-pointer ${
                                        isSelected
                                          ? "bg-client-primary text-white shadow-md ring-2 ring-[#dfb05b] scale-105"
                                          : disabled
                                          ? "bg-gray-100 text-gray-300 line-through cursor-not-allowed border border-transparent"
                                          : "bg-[#fdfbf9] hover:bg-client-accent text-gray-800 border border-[#e8dfd5]"
                                      }`}
                                    >
                                      {slot}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                          {/* Manual Time input for exact minute */}
                          <div className="mt-3 pt-3 border-t border-[#f0eae1] flex items-center justify-between">
                            <span className="text-[10px] text-gray-500 font-medium">Hoặc nhập giờ tùy ý:</span>
                            <input
                              type="time"
                              min={bookingValidationEnabled ? PUBLIC_BOOKING_HOURS.OPEN : undefined}
                              max={bookingValidationEnabled ? ONLINE_BOOKING_LAST_ARRIVAL_TIME : undefined}
                              value={form.time}
                              onChange={(e) => setField("time", e.target.value)}
                              className="px-2.5 py-1 text-xs border border-[#e8dfd5] rounded-xl outline-none font-mono bg-[#fdfbf9]"
                            />
                          </div>
                        </div>
                      )}

                      {errors.time && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-rose-600 font-medium animate-slide-in">
                          <AlertCircle size={12} className="shrink-0 text-rose-500" />
                          <span className="text-[11px] leading-tight">{errors.time}</span>
                        </div>
                      )}
                    </div>

                    {/* 3. Số khách */}
                    <div className="flex flex-col justify-between bg-white p-4 rounded-2xl border border-[#f0eae1] shadow-2xs space-y-2">
                      <label className="block text-xs font-bold text-client-text uppercase tracking-wider flex items-center justify-between">
                        <span>Số khách <span className="text-rose-500">*</span></span>
                        <Users size={13} className="text-gray-400" />
                      </label>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            const current = parseInt(form.guests) || 1;
                            if (current > 1) {
                              setField("guests", String(current - 1));
                            }
                          }}
                          disabled={parseInt(form.guests) <= 1}
                          className="w-10 h-11 rounded-xl border border-[#e8dfd5] bg-white hover:bg-client-accent disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-client-text font-bold transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                          aria-label="Giảm số khách"
                        >
                          <Minus size={16} />
                        </button>

                        <div className="relative flex-1 min-w-0">
                          <input
                            type="number"
                            min="1"
                            max="30"
                            value={form.guests}
                            onChange={(e) => setField("guests", e.target.value.replace(/[^0-9]/g, ""))}
                            onBlur={() => handleBlur("guests")}
                            className={`w-full h-11 rounded-xl border px-2 text-base sm:text-lg text-center font-black outline-none transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${
                              errors.guests
                                ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 focus:border-rose-500 text-rose-950"
                                : "border-[#e8dfd5] bg-white focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20 text-slate-800"
                            }`}
                            placeholder="2"
                          />
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const current = parseInt(form.guests) || 0;
                            if (current < 30) {
                              setField("guests", String(current + 1));
                            }
                          }}
                          disabled={parseInt(form.guests) >= 30}
                          className="w-10 h-11 rounded-xl border border-[#e8dfd5] bg-white hover:bg-client-accent disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center text-client-text font-bold transition-all cursor-pointer shrink-0 active:scale-95 shadow-2xs"
                          aria-label="Tăng số khách"
                        >
                          <Plus size={16} />
                        </button>
                      </div>

                      <div className="text-[11px] text-gray-400 text-center font-medium pt-0.5">
                        Tối đa 30 khách / bàn đặt online
                      </div>

                      {errors.guests && (
                        <div className="flex items-center gap-1 mt-1 text-xs text-rose-600 font-medium animate-slide-in">
                          <AlertCircle size={12} className="shrink-0 text-rose-500" />
                          <span className="text-[11px] leading-tight">{errors.guests}</span>
                        </div>
                      )}
                    </div>

                  </div>
                </div>

                {/* Card 2: Thông tin người đặt bàn & Ghi chú */}
                <div className="bg-[#fdfbf9] rounded-3xl border border-[#e8dfd5] p-6 sm:p-8 shadow-sm relative overflow-hidden space-y-6">
                  
                  {/* Card 2 Header */}
                  <div className="flex items-center justify-between border-b border-[#f0eae1] pb-5 mb-2 flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold shadow-2xs">
                        <User size={22} />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-client-text font-display flex items-center gap-2">
                          2. Thông tin thực khách
                        </h2>
                        <p className="text-xs text-client-muted">Thông tin liên hệ xác nhận và lưu ý dịch vụ chuẩn 5 sao</p>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100/70 border border-amber-200 px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 shadow-2xs">
                      <Sparkles size={13} className="text-amber-600" />
                      Giữ chỗ miễn phí 15 phút
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pt-2">
                    
                    {/* Họ và tên */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                        Họ và tên <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${errors.name ? "text-rose-500" : "text-gray-400"}`} />
                        <input
                          value={form.name}
                          onChange={(e) => setField("name", e.target.value)}
                          onBlur={() => handleBlur("name")}
                          placeholder="Nguyễn Văn A"
                          className={`w-full rounded-2xl border bg-white pl-10 pr-4 py-3 text-xs sm:text-sm text-client-text outline-none transition-all shadow-2xs ${
                            errors.name
                              ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 focus:border-rose-500 text-rose-950"
                              : "border-[#e8dfd5] focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20"
                          }`}
                        />
                      </div>
                      {errors.name && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-600 font-medium animate-slide-in">
                          <AlertCircle size={13} className="shrink-0 text-rose-500" />
                          <span>{errors.name}</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Số điện thoại */}
                    <div className="space-y-1.5">
                      <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                        Số điện thoại <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <Phone size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${errors.phone ? "text-rose-500" : "text-gray-400"}`} />
                        <input
                          type="tel"
                          value={form.phone}
                          onChange={(e) => setField("phone", e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^\+)\+/g, ''))}
                          onBlur={() => handleBlur("phone")}
                          placeholder="0912345678"
                          className={`w-full rounded-2xl border bg-white pl-10 pr-4 py-3 text-xs sm:text-sm text-client-text outline-none transition-all shadow-2xs ${
                            errors.phone
                              ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 focus:border-rose-500 text-rose-950"
                              : "border-[#e8dfd5] focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20"
                          }`}
                        />
                      </div>
                      {errors.phone ? (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-600 font-medium animate-slide-in">
                          <AlertCircle size={13} className="shrink-0 text-rose-500" />
                          <span>{errors.phone}</span>
                        </div>
                      ) : (
                        <p className="text-[11px] text-client-muted">Định dạng 10 số để nhận SMS mã đặt bàn và hỗ trợ check-in.</p>
                      )}
                    </div>
                    
                    {/* Email */}
                    <div className="sm:col-span-2 space-y-1.5">
                      <label className="block text-xs font-bold text-client-text uppercase tracking-wider">
                        Email nhận vé điện tử (Tùy chọn)
                      </label>
                      <div className="relative">
                        <Mail size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${errors.email ? "text-rose-500" : "text-gray-400"}`} />
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setField("email", e.target.value)}
                          onBlur={() => handleBlur("email")}
                          placeholder="email@example.com"
                          className={`w-full rounded-2xl border bg-white pl-10 pr-4 py-3 text-xs sm:text-sm text-client-text outline-none transition-all shadow-2xs ${
                            errors.email
                              ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/15 focus:border-rose-500 text-rose-950"
                              : "border-[#e8dfd5] focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20"
                          }`}
                        />
                      </div>
                      {errors.email && (
                        <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-600 font-medium animate-slide-in">
                          <AlertCircle size={13} className="shrink-0 text-rose-500" />
                          <span>{errors.email}</span>
                        </div>
                      )}
                    </div>

                    {/* Ghi chú & Yêu cầu */}
                    <div className="sm:col-span-2 border-t border-[#f0eae1] pt-5 space-y-2">
                      <label className="block text-xs font-bold text-client-text uppercase tracking-wider flex items-center justify-between">
                        <span>Ghi chú & Yêu cầu không gian bàn (Tùy chọn)</span>
                        <MessageSquare size={13} className="text-gray-400" />
                      </label>
                      <textarea
                        value={form.note}
                        onChange={(e) => setField("note", e.target.value)}
                        rows={3}
                        placeholder="Các yêu cầu đặc biệt như ăn kiêng, dị ứng, trang trí bàn tiệc, vị trí ngồi..."
                        className="w-full rounded-2xl border border-[#e8dfd5] bg-white px-4 py-3 text-xs sm:text-sm text-client-text focus:border-client-secondary focus:ring-2 focus:ring-client-secondary/20 outline-none resize-none transition-all shadow-2xs"
                      />
                      
                      {/* Tag ghi chú nhanh */}
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] text-gray-500 font-medium">Gợi ý nhanh:</span>
                        <div className="flex flex-wrap gap-1.5">
                          {[
                            "Bàn gần cửa sổ",
                            "Ghế trẻ em",
                            "Không gian yên tĩnh",
                            "Bàn ngoài trời",
                          ].map((tag) => {
                            const isAdded = form.note.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => {
                                  setForm((prev) => {
                                    const trimmed = prev.note.trim();
                                    if (trimmed.includes(tag)) {
                                      const updated = trimmed
                                        .replace(tag, "")
                                        .replace(/,\s*,/g, ",")
                                        .replace(/^,\s*/, "")
                                        .replace(/,\s*$/, "")
                                        .trim();
                                      return { ...prev, note: updated };
                                    }
                                    const separator = trimmed ? ", " : "";
                                    return { ...prev, note: trimmed + separator + tag };
                                  });
                                }}
                                className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer border ${
                                  isAdded
                                    ? "bg-client-primary text-white border-client-primary shadow-xs"
                                    : "bg-[#fdfbf9] hover:bg-client-accent text-gray-700 border-[#e8dfd5]"
                                }`}
                              >
                                {isAdded ? `✓ ${tag}` : `+ ${tag}`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

              </div>

              {/* RIGHT COLUMN: Sticky Luxury Reservation Summary & Perks (lg:col-span-5 xl:col-span-4) */}
              <div className="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-24 space-y-6">
                
                {/* Live Reservation Card */}
                <div className="bg-[#fdfbf9] rounded-3xl border border-[#e8dfd5] overflow-hidden shadow-lg">
                  
                  {/* Card Cover */}
                  <div className="relative h-36 w-full overflow-hidden">
                    <img
                      src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&auto=format&fit=crop&q=80"
                      alt="Restro Fine Dining"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute bottom-3 left-4 right-4 text-white">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-[#dfb05b] flex items-center gap-1">
                        <Award size={12} className="text-[#dfb05b]" /> Fine Dining Experience
                      </span>
                      <h3 className="text-base font-bold font-display">Nhà Hàng Restro</h3>
                      <p className="text-[10px] text-gray-300 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} /> Không gian ẩm thực sang trọng & lãng mạn
                      </p>
                    </div>
                  </div>

                  {/* Summary Ticket Details */}
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#f0eae1] pb-3">
                      <span className="text-xs font-bold text-client-text uppercase tracking-wider">
                        Phiếu đặt chỗ của bạn
                      </span>
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                        Bước 1 / 2
                      </span>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {/* Ngày */}
                      <div className="flex items-center justify-between py-1 border-b border-dashed border-[#f0eae1]">
                        <span className="text-client-muted flex items-center gap-1.5">
                          <Calendar size={14} className="text-client-primary" /> Ngày dùng bữa:
                        </span>
                        <span className="font-bold text-client-text text-right">
                          {getFormattedVietnameseDate(form.date)}
                        </span>
                      </div>

                      {/* Giờ */}
                      <div className="flex items-center justify-between py-1 border-b border-dashed border-[#f0eae1]">
                        <span className="text-client-muted flex items-center gap-1.5">
                          <Clock size={14} className="text-client-primary" /> Giờ nhận bàn:
                        </span>
                        <span className="font-bold text-client-text text-right">
                          {form.time ? `${form.time} (${parseInt(form.time.split(':')[0]) < 15 ? 'Bữa Trưa' : 'Bữa Tối'})` : "Chưa chọn giờ"}
                        </span>
                      </div>

                      {/* Số khách */}
                      <div className="flex items-center justify-between py-1 border-b border-dashed border-[#f0eae1]">
                        <span className="text-client-muted flex items-center gap-1.5">
                          <Users size={14} className="text-client-primary" /> Số thực khách:
                        </span>
                        <span className="font-black text-client-text">
                          {form.guests || 2} khách
                        </span>
                      </div>

                      {/* Người liên hệ */}
                      <div className="flex items-center justify-between py-1 border-b border-dashed border-[#f0eae1]">
                        <span className="text-client-muted flex items-center gap-1.5">
                          <User size={14} className="text-client-primary" /> Khách hàng:
                        </span>
                        <span className="font-bold text-client-text truncate max-w-[150px]">
                          {form.name || "Chưa điền họ tên"}
                        </span>
                      </div>

                      {/* Số điện thoại */}
                      <div className="flex items-center justify-between py-1 border-b border-dashed border-[#f0eae1]">
                        <span className="text-client-muted flex items-center gap-1.5">
                          <Phone size={14} className="text-client-primary" /> Điện thoại:
                        </span>
                        <span className="font-mono font-bold text-client-text">
                          {form.phone || "Chưa điền SĐT"}
                        </span>
                      </div>

                      {/* Ghi chú */}
                      {form.note && (
                        <div className="pt-1">
                          <span className="text-[11px] text-client-muted block mb-1">Ghi chú & Dịp đặc biệt:</span>
                          <p className="text-[11px] bg-white p-2.5 rounded-xl border border-[#e8dfd5] text-client-text italic leading-relaxed">
                            "{form.note}"
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Submit CTA Button inside Sticky Card */}
                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full flex items-center justify-center gap-2 py-4 px-6 rounded-2xl bg-gradient-to-r from-client-primary via-[#9e201b] to-[#731512] hover:from-[#731512] hover:to-client-primary text-white shadow-lg shadow-client-primary/25 hover:shadow-xl transition-all cursor-pointer active:scale-[0.99] font-bold text-sm disabled:opacity-50"
                      >
                        {submitting ? (
                          <>
                            <Loader2 size={16} className="animate-spin text-white" />
                            <span>Đang tạo đơn đặt bàn...</span>
                          </>
                        ) : (
                          <>
                            <span>Xác nhận đặt bàn</span>
                            <ArrowRight size={16} />
                          </>
                        )}
                      </button>
                      <p className="text-[10px] text-center text-client-muted mt-2">
                        Bằng việc bấm xác nhận, quý khách đồng ý với chính sách giữ bàn của Restro.
                      </p>
                    </div>

                  </div>
                </div>

              </div>

            </div>
          </form>
        )}
      </main>
    </div>
  );
};
