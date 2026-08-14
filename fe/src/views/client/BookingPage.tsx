import React, { useState, useEffect } from "react";
import { Phone, Mail, CheckCircle, ArrowRight, Calendar, Loader2, Printer, Star } from "lucide-react";
import { toast } from "react-hot-toast";
import { getAvailableTables, createBooking, Customer, payBookingDeposit } from "../../services/customerService";
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

  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingDeposit, setPayingDeposit] = useState(false);

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

  const [form, setForm] = useState({
    date: "",
    time: "",
    guests: "2",
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
          name: prev.name || customer.name || "",
          email: prev.email || customer.email || "",
          phone: prev.phone || customer.phone || "",
        }));
      } catch (e) {
        console.error("Error parsing customer_info", e);
      }
    }
  }, []);

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.time) {
      toast.error("Vui lòng chọn ngày và giờ đặt bàn!");
      return;
    }
    if (bookingValidationEnabled && form.date > getMaximumBookingDate()) {
      toast.error(`Chỉ có thể đặt bàn trong vòng ${BOOKING_MAX_ADVANCE_DAYS} ngày kể từ hôm nay.`);
      return;
    }
    
    if (bookingValidationEnabled && !isWithinPublicBookingHours(form.time)) {
      toast.error(`Nhà hàng nhận đặt bàn online từ ${PUBLIC_BOOKING_HOURS.OPEN} đến ${ONLINE_BOOKING_LAST_ARRIVAL_TIME}.`);
      return;
    }

    const selectedDateTime = new Date(`${form.date}T${form.time}:00`);
    const now = new Date();
    if (bookingValidationEnabled && selectedDateTime < now) {
      toast.error("Thời gian đặt bàn không được ở quá khứ. Vui lòng chọn thời gian khác!");
      return;
    }

    const guestCount = Number(form.guests);
    if (isNaN(guestCount) || guestCount < 1 || guestCount > 30) {
      toast.error("Số lượng khách phải từ 1 đến 30 người!");
      return;
    }

    if (!form.name.trim()) {
      toast.error("Vui lòng điền Họ và tên người đặt bàn!");
      return;
    }

    const phone = form.phone.trim();
    if (!phone) {
      toast.error("Vui lòng điền Số điện thoại liên hệ!");
      return;
    }

    const hasLetters = /[a-zA-Z]/g.test(phone);
    const cleanRegex = /^[0-9+\s-]+$/;
    if (hasLetters || !cleanRegex.test(phone)) {
      toast.error("Số điện thoại chỉ được chứa các chữ số, dấu cộng (+), dấu gạch ngang (-) hoặc khoảng trắng.");
      return;
    }
    const cleanedPhone = phone.replace(/[\s-]/g, '');
    if (cleanedPhone.startsWith("+840") || cleanedPhone.startsWith("840")) {
      toast.error("Khi sử dụng mã quốc gia '+84' hoặc '84', vui lòng bỏ số '0' ở đầu số điện thoại tiếp theo (ví dụ: +84912345678).");
      return;
    }
    if (!cleanedPhone.startsWith("0") && !cleanedPhone.startsWith("+84") && !cleanedPhone.startsWith("84")) {
      toast.error("Số điện thoại Việt Nam phải bắt đầu bằng số '0', '84' hoặc mã quốc gia '+84'.");
      return;
    }
    if (cleanedPhone.length < 10 || cleanedPhone.length > 12) {
      toast.error("Số điện thoại không đúng độ dài (phải từ 10 đến 12 ký tự).");
      return;
    }
    let prefixDigit = "";
    if (cleanedPhone.startsWith("0")) {
      prefixDigit = cleanedPhone.charAt(1);
    } else if (cleanedPhone.startsWith("+84")) {
      prefixDigit = cleanedPhone.charAt(3);
    } else if (cleanedPhone.startsWith("84")) {
      prefixDigit = cleanedPhone.charAt(2);
    }
    const validPrefixes = ["3", "5", "7", "8", "9", "2"];
    if (!validPrefixes.includes(prefixDigit)) {
      toast.error("Đầu số nhà mạng không hợp lệ. Vui lòng nhập đầu số di động hợp lệ (bắt đầu bằng 03, 05, 07, 08, 09) hoặc số cố định (bắt đầu bằng 02).");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Email không đúng định dạng!");
      return;
    }

    if (guestCount > 30) {
      toast.error("Số lượng khách đặt bàn tối đa là 30 người!");
      return;
    }

    setSubmitting(true);
    try {
      // Auto find available table for guest count and schedule, with fallback for group bookings
      let tables = await getAvailableTables(form.date, form.time, guestCount).catch(() => []);
      if (!tables || tables.length === 0) {
        tables = await getAvailableTables(form.date, form.time, 1).catch(() => []);
      }

      const primaryTable = tables && tables.length > 0 ? tables[0] : null;
      const targetTableId = primaryTable ? Number(primaryTable.id) : 1;
      const targetTableName = primaryTable ? primaryTable.name : "Khu vực sảnh";
      const targetAreaName = primaryTable ? (primaryTable.area_name || "Tầng 2") : "Tầng 2";
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
        table_id: targetTableId,
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

      setCreatedBooking({
        ...bookingResult,
        table_name: targetTableName,
        area_name: targetAreaName
      });
      setStep(4);
      toast.success("Đặt bàn thành công!");
    } catch (err: any) {
      const errMsg: string = err.response?.data?.message || "";
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
              <CheckCircle size={12} /> Đặt bàn thành công
            </span>
            <h1 className="text-xl font-bold text-client-text font-display">Cảm ơn quý khách!</h1>
            <p className="text-xs text-client-muted mt-1">Yêu cầu đặt bàn của bạn đã được tiếp nhận</p>
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
               <span className="font-bold text-amber-600">Chờ xác nhận</span>
             </div>
             {/* Deposit Information Box */}
             {createdBooking?.deposit_amount > 0 && (
               <div className="mt-4 pt-3 border-t border-client-accent space-y-3">
                 <div className="flex justify-between text-xs items-center">
                   <span className="text-client-muted font-bold uppercase tracking-wider">Tiền cọc món (20%):</span>
                   <span className="font-black text-rose-600 text-sm font-mono">{Number(createdBooking.deposit_amount).toLocaleString("vi-VN")}đ</span>
                 </div>
                 <div className="flex justify-between text-xs items-center">
                   <span className="text-client-muted font-bold uppercase tracking-wider">Trạng thái cọc:</span>
                   {createdBooking.deposit_status === "paid" ? (
                     <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 uppercase text-[10px] tracking-wider">Đã đặt cọc</span>
                   ) : (
                     <span className="font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg border border-rose-100 uppercase text-[10px] tracking-wider">Chờ thanh toán</span>
                   )}
                 </div>
                 {createdBooking.deposit_status !== "paid" && (
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
              setStep(1);
              setCreatedBooking(null);
              setForm({
                date: "",
                time: "",
                guests: "2",
                name: "",
                phone: "",
                email: "",
                note: "",
              });
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
                  src={`https://img.vietqr.io/image/MB-0912345678-compact2.png?amount=${createdBooking.deposit_amount}&addInfo=${createdBooking.confirmation_code}&accountName=NHA%20HANG%20RESMANAGER`}
                  alt="Mã QR Chuyển khoản VietQR"
                  className="mx-auto w-52 h-52 object-contain border border-client-accent rounded-2xl shadow-xs p-2 bg-white"
                />
              </div>

              {/* Account Details */}
              <div className="bg-client-bg rounded-2xl p-4 border border-client-accent text-left text-xs space-y-2 text-client-muted">
                <div className="flex justify-between"><span>Ngân hàng:</span> <span className="font-bold text-client-text">MB Bank</span></div>
                <div className="flex justify-between"><span>Số tài khoản:</span> <span className="font-bold text-client-text">0912345678</span></div>
                <div className="flex justify-between"><span>Chủ tài khoản:</span> <span className="font-bold text-client-text">NHA HANG RESMANAGER</span></div>
                <div className="flex justify-between"><span>Số tiền cọc (20%):</span> <span className="font-bold text-rose-600 text-sm font-mono">{Number(createdBooking.deposit_amount).toLocaleString("vi-VN")}đ</span></div>
                <div className="flex justify-between"><span>Nội dung chuyển:</span> <span className="font-bold text-client-primary uppercase font-mono">{createdBooking.confirmation_code}</span></div>
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
          <form onSubmit={handleSubmitBooking} className="space-y-6 animate-fade-in">
            {/* Card 1: Chọn lịch trình đặt bàn */}
            <div className="bg-white rounded-3xl shadow-sm border border-client-accent p-8">
              <h2 className="text-lg font-bold text-client-text font-display mb-6 border-b border-[#f0eae1] pb-4 flex items-center gap-2">
                <Calendar size={18} className="text-client-primary" /> Chọn lịch trình đặt bàn
              </h2>
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Ngày đến *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setField("date", e.target.value)}
                    min={bookingValidationEnabled ? new Date().toISOString().split("T")[0] : undefined}
                    max={bookingValidationEnabled ? getMaximumBookingDate() : undefined}
                    className="w-full rounded-xl border border-client-accent px-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Giờ đến *</label>
                  <input
                    required
                    type="time"
                    min={bookingValidationEnabled ? PUBLIC_BOOKING_HOURS.OPEN : undefined}
                    max={bookingValidationEnabled ? ONLINE_BOOKING_LAST_ARRIVAL_TIME : undefined}
                    value={form.time}
                    onChange={(e) => setField("time", e.target.value)}
                    className="w-full rounded-xl border border-client-accent px-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none bg-white transition-all"
                  />
                  <p className="mt-2 text-xs text-client-muted">Nhận đặt online từ 10:00 đến 19:00, tối đa 30 ngày.</p>
                </div>
                <div>
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Số khách *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="30"
                    value={form.guests}
                    onChange={(e) => setField("guests", e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full rounded-xl border border-client-accent px-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none bg-white transition-all"
                    placeholder="2"
                  />
                  <p className="mt-2 text-xs text-client-muted">Tối đa 30 người / đơn đặt online.</p>
                </div>
              </div>
            </div>

            {/* Card 2: Thông tin người đặt bàn */}
            <div className="bg-white rounded-3xl shadow-sm border border-client-accent p-8 space-y-6">
              <h2 className="text-lg font-bold text-client-text font-display border-b border-[#f0eae1] pb-4">
                Thông tin người đặt & Ghi chú
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Họ và tên *</label>
                  <input
                    required
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none transition-all"
                  />
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Số điện thoại *</label>
                  <div className="relative">
                    <Phone size={16} className="absolute left-4 top-4 text-[#7b6f65]" />
                    <input
                      required
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setField("phone", e.target.value.replace(/[^0-9+]/g, '').replace(/(?!^\+)\+/g, ''))}
                      placeholder="0912345678"
                      className="w-full rounded-xl border border-gray-300 pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none transition-all"
                    />
                  </div>
                </div>
                
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Email (Tùy chọn)</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-4 top-4 text-[#7b6f65]" />
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="email@example.com"
                      className="w-full rounded-xl border border-gray-300 pl-11 pr-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none transition-all"
                    />
                  </div>
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
