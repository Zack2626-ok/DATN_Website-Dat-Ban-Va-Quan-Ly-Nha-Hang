import React, { useState, useEffect, useRef } from "react";
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
  const [touched, setTouched] = useState<Record<string, boolean>>({});

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
      if (touched[key]) {
        const fieldErrors = validateBookingForm(next);
        setErrors((prevErr) => ({ ...prevErr, [key]: fieldErrors[key] }));
      }
      return next;
    });
  };

  const handleBlur = (key: string) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const formErrors = validateBookingForm();
    setErrors(formErrors);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all fields as touched
    setTouched({
      date: true,
      time: true,
      guests: true,
      name: true,
      phone: true,
      email: true,
    });

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
      <div className="min-h-screen bg-client-bg flex flex-col items-center justify-center p-6 relative">
        {/* Ticket Outer Wrapper */}
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-client-accent p-8 text-center animate-fade-in relative">
          
          {/* Card Upper Section */}
          <div className="flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-3">
              <CheckCircle size={12} /> Đã tiếp nhận yêu cầu
            </span>
            <h1 className="text-xl font-bold text-client-text font-display">Cảm ơn quý khách!</h1>
            <p className="text-xs text-client-muted mt-1">Yêu cầu đặt bàn của quý khách đã được ghi nhận.</p>
          </div>

          <div className="mt-6 p-4 bg-client-bg border border-dashed border-client-accent rounded-2xl relative">
            <span className="text-[10px] text-client-muted font-extrabold uppercase tracking-widest block">Mã xác nhận đặt bàn</span>
            <span className="text-3xl font-black text-client-primary tracking-widest mt-1 block font-mono">{createdBooking?.confirmation_code}</span>
            
            {/* Barcode Mockup */}
            <div className="flex justify-center items-center gap-[2px] h-6 opacity-60 mt-3">
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

          {/* Ticket Perforation & Punches */}
          <div className="my-6 relative border-t border-dashed border-client-accent">
            <div className="absolute -left-11 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-client-bg border-r border-client-accent"></div>
            <div className="absolute -right-11 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-client-bg border-l border-client-accent"></div>
          </div>

          {/* Card Lower Section */}
          <div className="text-left bg-client-bg/50 rounded-2xl p-5 border border-client-accent space-y-3">
             <div className="flex justify-between text-xs"><span className="text-client-muted font-bold uppercase tracking-wider">Người đặt:</span> <span className="font-semibold text-client-text">{createdBooking?.guest_name || form.name}</span></div>
             <div className="flex justify-between text-xs"><span className="text-client-muted font-bold uppercase tracking-wider">Thời gian đến:</span> <span className="font-semibold text-client-text">{form.time} - {form.date ? new Date(form.date).toLocaleDateString("vi-VN") : ""}</span></div>
             <div className="flex justify-between text-xs"><span className="text-client-muted font-bold uppercase tracking-wider">Số lượng khách:</span> <span className="font-semibold text-client-text">{createdBooking?.party_size || form.guests} người</span></div>
             <div className="flex justify-between text-xs">
               <span className="text-client-muted font-bold uppercase tracking-wider">Trạng thái đặt:</span> 
               <span className="font-bold text-amber-600">Chờ nhà hàng xác nhận</span>
             </div>
             {/* Deposit Information Box */}
             {Boolean(createdBooking && (createdBooking.deposit_amount ?? 0) > 0) && (
               <div className="mt-4 pt-3 border-t border-client-accent space-y-3">
                 <div className="flex justify-between text-xs items-center">
                   <span className="text-client-muted font-bold uppercase tracking-wider">Tiền cọc món (20%):</span>
                   <span className="font-black text-rose-600 text-sm font-mono">{Number(createdBooking?.deposit_amount || 0).toLocaleString("vi-VN")}đ</span>
                 </div>
                 <div className="flex justify-between text-xs items-center">
                   <span className="text-client-muted font-bold uppercase tracking-wider">Trạng thái cọc:</span>
                   {createdBooking?.deposit_status === "paid" ? (
                     <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase text-[10px] tracking-wider">Đã đặt cọc</span>
                   ) : (
                     <span className="font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 uppercase text-[10px] tracking-wider">Chờ thanh toán</span>
                   )}
                 </div>
                 {createdBooking?.deposit_status !== "paid" && (
                   <button
                     type="button"
                     onClick={() => setShowPaymentModal(true)}
                     className="w-full mt-2 py-3 bg-[#b43a2b] hover:bg-[#8f2317] text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                   >
                     Thanh toán tiền cọc ngay
                   </button>
                 )}
               </div>
             )}
          </div>

        </div>

        {/* Action Buttons under the Ticket */}
        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-md mt-6">
          {(createdBooking?.deposit_amount === 0 || createdBooking?.deposit_status === "paid") && (
            <button
              onClick={handlePrintInvoice}
              className="flex-1 inline-flex items-center justify-center gap-2 py-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-2xl font-bold text-sm shadow-xs transition-all cursor-pointer"
            >
              <Printer size={16} className="text-gray-500" /> In hóa đơn đặt bàn
            </button>
          )}
          <button
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
            className="flex-[2] py-4 bg-client-primary hover:bg-client-primary-hover text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            Tạo đơn đặt bàn mới
          </button>
        </div>

        {/* Printable Booking Receipt */}
        <div id="booking-invoice-print" className="hidden print:block p-8 bg-white text-gray-900 font-mono text-sm max-w-md mx-auto">
          <div className="text-center border-b border-dashed border-gray-400 pb-4">
            <h2 className="text-lg font-bold uppercase tracking-wider">Nhà Hàng ResManager</h2>
            <p className="text-xs mt-1">123 Đường Hải Phòng, Đà Nẵng</p>
            <p className="text-xs">SĐT: 0236 3123 456</p>
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
            <p className="text-xs italic">Cảm ơn quý khách đã đặt bàn tại ResManager!</p>
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
      <main className="mx-auto px-6 mt-8 max-w-4xl transition-all">
        {step === 1 && (
          <form noValidate onSubmit={handleSubmitBooking} className="space-y-6 animate-fade-in">
            {/* Card 1: Chọn lịch trình đặt bàn */}
            <div className="bg-white rounded-3xl shadow-sm border border-client-accent p-6 sm:p-8">
              <div className="flex items-center justify-between border-b border-[#f0eae1] pb-4 mb-6">
                <h2 className="text-lg font-bold text-client-text font-display flex items-center gap-2">
                  <Calendar size={18} className="text-client-primary" /> Chọn lịch trình đặt bàn
                </h2>
                <span className="text-[11px] font-semibold text-client-muted bg-[#f9f6f0] px-3 py-1 rounded-full border border-[#e8dfd5]">
                  Phục vụ: 10:00 - 21:00 (Nhận khách online đến 19:00)
                </span>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                
                {/* 1. Ngày đến */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider">
                    Ngày đến <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => {
                        setField("date", e.target.value);
                        // If changing date, re-validate time if today is deselected/selected
                        if (form.time) {
                          setTimeout(() => {
                            setField("time", form.time);
                          }, 0);
                        }
                      }}
                      onBlur={() => handleBlur("date")}
                      min={bookingValidationEnabled ? new Date().toISOString().split("T")[0] : undefined}
                      max={bookingValidationEnabled ? getMaximumBookingDate() : undefined}
                      className={`w-full rounded-2xl border px-4 py-3 text-sm outline-none transition-all ${
                        errors.date
                          ? "border-rose-500 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-rose-950"
                          : "border-client-accent focus:ring-2 focus:ring-client-secondary bg-white"
                      }`}
                    />
                  </div>

                  {/* Quick Date Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setField("date", new Date().toISOString().split("T")[0])}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        form.date === new Date().toISOString().split("T")[0]
                          ? "bg-client-primary text-white"
                          : "bg-[#f5f1ea] hover:bg-client-accent text-client-text"
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
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        (() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 1);
                          return form.date === d.toISOString().split("T")[0];
                        })()
                          ? "bg-client-primary text-white"
                          : "bg-[#f5f1ea] hover:bg-client-accent text-client-text"
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
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                        (() => {
                          const d = new Date();
                          d.setDate(d.getDate() + 2);
                          return form.date === d.toISOString().split("T")[0];
                        })()
                          ? "bg-client-primary text-white"
                          : "bg-[#f5f1ea] hover:bg-client-accent text-client-text"
                      }`}
                    >
                      Ngày kia
                    </button>
                  </div>

                  {errors.date && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-600 font-medium animate-slide-in">
                      <AlertCircle size={13} className="shrink-0 text-rose-500" />
                      <span>{errors.date}</span>
                    </div>
                  )}
                </div>

                {/* 2. Giờ đến (Custom Time Slot Popover Picker) */}
                <div className="space-y-1.5 relative" ref={timePickerRef}>
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider">
                    Giờ đến <span className="text-rose-500">*</span>
                  </label>

                  <div
                    onClick={() => setTimePickerOpen((prev) => !prev)}
                    className={`w-full rounded-2xl border px-4 py-3 text-sm flex items-center justify-between cursor-pointer transition-all select-none ${
                      errors.time
                        ? "border-rose-500 bg-rose-50/20 ring-2 ring-rose-500/10 text-rose-950"
                        : timePickerOpen
                        ? "border-client-secondary ring-2 ring-client-secondary/20 bg-white"
                        : "border-client-accent bg-white hover:border-client-secondary"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Clock size={16} className={errors.time ? "text-rose-500" : form.time ? "text-client-primary" : "text-gray-400"} />
                      <span className={form.time ? "font-bold text-gray-900 font-mono text-sm" : "text-gray-400 text-sm"}>
                        {form.time ? `${form.time} (Giờ nhận bàn)` : "Chọn giờ dùng bữa..."}
                      </span>
                    </div>
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${timePickerOpen ? "rotate-180 text-client-primary" : ""}`} />
                  </div>

                  {/* Popover Time Slot Picker Dropdown */}
                  {timePickerOpen && (
                    <div className="absolute left-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-client-accent p-4 z-50 animate-fade-in">
                      <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-3">
                        <div className="flex items-center gap-1.5">
                          <Clock size={15} className="text-client-primary" />
                          <span className="text-xs font-bold text-gray-900 font-display">Chọn khung giờ đến</span>
                        </div>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          10:00 - 19:00
                        </span>
                      </div>

                      <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
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
                                      ? "bg-client-primary text-white shadow-md ring-2 ring-client-secondary scale-105"
                                      : disabled
                                      ? "bg-gray-100 text-gray-300 line-through cursor-not-allowed border border-transparent"
                                      : "bg-[#fdfbf9] hover:bg-client-secondary/15 hover:border-client-secondary text-gray-800 border border-[#e8dfd5]"
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
                                      ? "bg-client-primary text-white shadow-md ring-2 ring-client-secondary scale-105"
                                      : disabled
                                      ? "bg-gray-100 text-gray-300 line-through cursor-not-allowed border border-transparent"
                                      : "bg-[#fdfbf9] hover:bg-client-secondary/15 hover:border-client-secondary text-gray-800 border border-[#e8dfd5]"
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
                      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[10px] text-gray-500">Hoặc chọn giờ tùy ý:</span>
                        <input
                          type="time"
                          min={bookingValidationEnabled ? PUBLIC_BOOKING_HOURS.OPEN : undefined}
                          max={bookingValidationEnabled ? ONLINE_BOOKING_LAST_ARRIVAL_TIME : undefined}
                          value={form.time}
                          onChange={(e) => setField("time", e.target.value)}
                          className="px-2 py-1 text-xs border border-gray-200 rounded-lg outline-none font-mono"
                        />
                      </div>
                    </div>
                  )}

                  {errors.time && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-600 font-medium animate-slide-in">
                      <AlertCircle size={13} className="shrink-0 text-rose-500" />
                      <span>{errors.time}</span>
                    </div>
                  )}
                </div>

                {/* 3. Số khách */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider">
                    Số khách <span className="text-rose-500">*</span>
                  </label>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const current = parseInt(form.guests) || 1;
                        if (current > 1) {
                          setField("guests", String(current - 1));
                        }
                      }}
                      className="w-11 h-11 rounded-2xl border border-client-accent bg-[#fdfbf9] hover:bg-client-accent flex items-center justify-center text-client-text font-bold transition-all cursor-pointer shrink-0 active:scale-95"
                    >
                      <Minus size={15} />
                    </button>

                    <div className="relative flex-1">
                      <Users size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={form.guests}
                        onChange={(e) => setField("guests", e.target.value.replace(/[^0-9]/g, ""))}
                        onBlur={() => handleBlur("guests")}
                        className={`w-full rounded-2xl border pl-10 pr-4 py-3 text-sm text-center font-bold outline-none transition-all ${
                          errors.guests
                            ? "border-rose-500 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-rose-950"
                            : "border-client-accent bg-white focus:ring-2 focus:ring-client-secondary"
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
                      className="w-11 h-11 rounded-2xl border border-client-accent bg-[#fdfbf9] hover:bg-client-accent flex items-center justify-center text-client-text font-bold transition-all cursor-pointer shrink-0 active:scale-95"
                    >
                      <Plus size={15} />
                    </button>
                  </div>

                  {/* Quick Guest Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {["2", "4", "6", "8", "10", "12"].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setField("guests", num)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          form.guests === num
                            ? "bg-client-primary text-white"
                            : "bg-[#f5f1ea] hover:bg-client-accent text-client-text"
                        }`}
                      >
                        {num} người
                      </button>
                    ))}
                  </div>

                  {errors.guests && (
                    <div className="flex items-center gap-1.5 mt-1 text-xs text-rose-600 font-medium animate-slide-in">
                      <AlertCircle size={13} className="shrink-0 text-rose-500" />
                      <span>{errors.guests}</span>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* Card 2: Thông tin người đặt bàn */}
            <div className="bg-white rounded-3xl shadow-sm border border-client-accent p-8 space-y-6">
              <h2 className="text-lg font-bold text-client-text font-display border-b border-[#f0eae1] pb-4">
                Thông tin người đặt & Ghi chú
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* Họ và tên */}
                <div>
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">
                    Họ và tên <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    onBlur={() => handleBlur("name")}
                    placeholder="Nguyễn Văn A"
                    className={`w-full rounded-xl border px-4 py-3 text-sm outline-none transition-all ${
                      errors.name
                        ? "border-rose-500 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-rose-950"
                        : "border-gray-300 focus:ring-2 focus:ring-client-secondary"
                    }`}
                  />
                  {errors.name && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-600 font-medium animate-slide-in">
                      <AlertCircle size={13} className="shrink-0 text-rose-500" />
                      <span>{errors.name}</span>
                    </div>
                  )}
                </div>
                
                {/* Số điện thoại */}
                <div>
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">
                    Số điện thoại <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone size={16} className={`absolute left-4 top-4 ${errors.phone ? "text-rose-500" : "text-[#7b6f65]"}`} />
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^\+)\+/g, ''))}
                      onBlur={() => handleBlur("phone")}
                      placeholder="0912345678"
                      className={`w-full rounded-xl border pl-11 pr-4 py-3 text-sm outline-none transition-all ${
                        errors.phone
                          ? "border-rose-500 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-rose-950"
                          : "border-gray-300 focus:ring-2 focus:ring-client-secondary"
                      }`}
                    />
                  </div>
                  {errors.phone && (
                    <div className="flex items-center gap-1.5 mt-1.5 text-xs text-rose-600 font-medium animate-slide-in">
                      <AlertCircle size={13} className="shrink-0 text-rose-500" />
                      <span>{errors.phone}</span>
                    </div>
                  )}
                </div>
                
                {/* Email */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Email (Tùy chọn)</label>
                  <div className="relative">
                    <Mail size={16} className={`absolute left-4 top-4 ${errors.email ? "text-rose-500" : "text-[#7b6f65]"}`} />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      onBlur={() => handleBlur("email")}
                      placeholder="email@example.com"
                      className={`w-full rounded-xl border pl-11 pr-4 py-3 text-sm outline-none transition-all ${
                        errors.email
                          ? "border-rose-500 bg-rose-50/20 focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 text-rose-950"
                          : "border-gray-300 focus:ring-2 focus:ring-client-secondary"
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

                {/* Ghi chú */}
                <div className="sm:col-span-2 border-t border-[#f0eae1] pt-4">
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Ghi chú (Tùy chọn)</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => setField("note", e.target.value)}
                    rows={3}
                    placeholder="Các yêu cầu đặc biệt như ăn kiêng, vị trí ngồi..."
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none resize-none transition-all"
                  />
                  {/* Tag ghi chú nhanh */}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {["Bàn gần cửa sổ", "Không lấy hành", "Có em bé", "VIP", "Không gian yên tĩnh", "Bàn ngoài trời"].map((tag) => (
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
                        className="px-3 py-1.5 rounded-lg text-[10px] font-bold bg-[#f0eae1] text-client-text hover:bg-client-accent transition-all cursor-pointer"
                      >
                        + {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-client-primary py-4 text-base font-bold text-white transition-all hover:bg-client-primary-hover shadow-lg disabled:opacity-50 cursor-pointer"
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" /> Đang tạo đơn đặt bàn...
                </>
              ) : (
                <>
                  Xác nhận đặt bàn <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>
        )}
      </main>
    </div>
  );
};
