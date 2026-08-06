import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Phone, Mail, CheckCircle, ArrowRight, ArrowLeft, Calendar, Loader2, Landmark, Percent, Printer, Star, Users } from "lucide-react";
import { toast } from "react-hot-toast";
import { getAvailableTables, createBooking, Customer, getPublicPromotions, payBookingDeposit } from "../../services/customerService";
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
  const navigate = useNavigate();

  // ── Restore state từ sessionStorage khi F5 ─────────────────────────────
  const BOOKING_SESSION_KEY = "booking_session";
  const savedSession = (() => {
    try { return JSON.parse(sessionStorage.getItem(BOOKING_SESSION_KEY) || "null"); } catch { return null; }
  })();

  const [step, setStep] = useState<number>(savedSession?.step || 1);
  const [loadingTables, setLoadingTables] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [availableTables, setAvailableTables] = useState<any[]>(savedSession?.availableTables || []);

  const [preOrderedDishes, setPreOrderedDishes] = useState<Record<string, { id: number; name: string; price: number; quantity: number }>>({});
  const [bookingValidationEnabled, setBookingValidationEnabled] = useState<boolean>(true);

  useEffect(() => {
    getBookingValidationStatus().then(setBookingValidationEnabled).catch(() => {});
  }, []);

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
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingDeposit, setPayingDeposit] = useState(false);
  const [preOrderedDishes, setPreOrderedDishes] = useState<Record<number, any>>({});

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

  const [searchParams] = useSearchParams();
  const promoParam = searchParams.get("promo");

  const [promotionsList, setPromotionsList] = useState<any[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string>(savedSession?.selectedPromoId || "");

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
  }, [promoParam]);

  // Reset filter when tables change
  useEffect(() => {
    setSelectedArea("Tất cả");
  }, [availableTables]);

  const uniqueAreas = ["Tất cả", ...new Set(availableTables.map((t) => t.area_name).filter(Boolean))];

  const filteredTables = selectedArea === "Tất cả"
    ? availableTables
    : availableTables.filter((t) => t.area_name === selectedArea);

  // Nhóm các bàn theo hàng (row_pos)
  const groupedRows = filteredTables.reduce((acc, table) => {
    const rowKey = table.row_pos || "Khác";
    if (!acc[rowKey]) {
      acc[rowKey] = [];
    }
    acc[rowKey].push(table);
    return acc;
  }, {} as Record<string, any[]>);

  const sortedRowKeys = Object.keys(groupedRows).sort();
  
  const [form, setForm] = useState({
    date:      savedSession?.form?.date      || "",
    time:      savedSession?.form?.time      || "",
    guests:    savedSession?.form?.guests    || "2",
    tableId:   savedSession?.form?.tableId   || "",
    tableName: savedSession?.form?.tableName || "",
    areaName:  savedSession?.form?.areaName  || "",
    name:      savedSession?.form?.name      || "",
    phone:     savedSession?.form?.phone     || "",
    email:     savedSession?.form?.email     || "",
    note:      savedSession?.form?.note      || "",
  });

  // Auto fill profile if logged in (chỉ fill nếu chưa có session được restore)
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

  // ── Lưu state vào sessionStorage mỗi khi thay đổi (phải sau khi form được khai báo) ──
  useEffect(() => {
    if (step === 4) {
      // Xóa session khi đặt bàn hoàn tất — được làm ở setStep(4) nên không cần lưu
      return;
    }
    try {
      sessionStorage.setItem(BOOKING_SESSION_KEY, JSON.stringify({
        step,
        form,
        availableTables,
        selectedPromoId,
      }));
    } catch {
      // sessionStorage đầy hoặc bị disabled — bỏ qua
    }
  }, [step, form, availableTables, selectedPromoId]);

  const setField = (key: string, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const handleNextToStep2 = async (e: React.FormEvent) => {
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

    // Kiểm tra không cho đặt giờ trong quá khứ nếu chọn ngày hôm nay
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
    
    setLoadingTables(true);
    try {
      const tables = await getAvailableTables(form.date, form.time, guestCount);
      setAvailableTables(tables);
      // Reset selected table from previous searches
      setForm((prev) => ({
        ...prev,
        tableId: "",
        tableName: "",
        areaName: "",
      }));
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
      areaName: table.area_name || "",
    }));
  };

  // Hàm refresh sơ đồ bàn — tái sử dụng được
  const [refreshing, setRefreshing] = useState(false);
  const refreshTableStatus = useCallback(async (silent = false) => {
    if (!form.date || !form.time) return;
    if (!silent) setRefreshing(true);
    try {
      const startTimeStr = `${form.date} ${form.time}:00`;
      const tables = await getAvailableTables(startTimeStr);
      const filtered = tables.filter((t: any) => t.capacity >= Number(form.guests));
      setAvailableTables(filtered);
      // Nếu bàn đang chọn đã bị người khác đặt — deselect
      if (form.tableId) {
        const selectedInNew = filtered.find((t: any) => String(t.id) === form.tableId);
        if (!selectedInNew || !selectedInNew.is_bookable) {
          setForm((prev) => ({ ...prev, tableId: "", tableName: "", areaName: "" }));
          if (!silent) toast.error("⚠️ Bàn bạn đang chọn vừa bị người khác đặt! Vui lòng chọn bàn khác.", { duration: 5000 });
        }
      }
    } catch { /* bỏ qua lỗi silent refresh */ }
    finally { setRefreshing(false); }
  }, [form.date, form.time, form.guests, form.tableId]);

  // Auto-refresh sơ đồ bàn mỗi 60 giây khi đang ở step 2
  useEffect(() => {
    if (step !== 2) return;
    const timer = setInterval(() => refreshTableStatus(true), 60_000);
    return () => clearInterval(timer);
  }, [step, refreshTableStatus]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    const phone = form.phone.trim();
    if (!form.name.trim() || !phone) {
      toast.error("Vui lòng điền họ tên và số điện thoại liên hệ!");
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
        table_id: Number(form.tableId),
        customer_id: customerId,
        promotion_id: selectedPromoId ? Number(selectedPromoId) : null,
        guest_name: form.name,
        guest_phone: form.phone,
        guest_email: form.email.trim(),
        party_size: Number(form.guests),
        start_time: startTimeStr,
        end_time: endTimeStr,
        guest_note: form.note.trim(),
        booking_channel: "online",
      });

      setCreatedBooking(bookingResult);
      setConfirmationCode(bookingResult.confirmation_code);
      // Xóa session sau khi đặt bàn thành công — không restore lần sau
      try { sessionStorage.removeItem(BOOKING_SESSION_KEY); } catch { /* ignore */ }
      setStep(4);
      toast.success("Đặt bàn thành công!");
    } catch (err: any) {
      const errMsg: string = err.response?.data?.message || "";
      const isTableConflict = err.response?.status === 400 && errMsg.includes("trùng với lịch đặt khác trên cùng bàn");
      if (isTableConflict) {
        // Tự động refresh sơ đồ bàn và deselect bàn bị tranh giành
        toast.error("⚠️ Bàn này vừa được người khác đặt trước! Đang tải lại sơ đồ bàn...", { duration: 4000 });
        setForm((prev) => ({ ...prev, tableId: "", tableName: "", areaName: "" }));
        await refreshTableStatus(false);
      } else {
        toast.error(errMsg || "Đặt bàn thất bại. Vui lòng thử lại.");
      }
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
            <span className="text-3xl font-black text-client-primary tracking-widest mt-1 block font-mono">{confirmationCode}</span>
            
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
             <div className="flex justify-between text-xs"><span className="text-client-muted font-bold uppercase tracking-wider">Bàn đã chọn:</span> <span className="font-semibold text-client-text">{createdBooking?.table_name || form.tableName} ({createdBooking?.area_name || form.areaName || "Nhà hàng"})</span></div>
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
              className="flex-1 inline-flex items-center justify-center gap-2 py-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-205 rounded-2xl font-bold text-sm shadow-xs transition-all cursor-pointer"
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
                tableId: "",
                tableName: "",
                areaName: "",
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
            <div className="flex justify-between"><span>Bàn ăn:</span> <span className="font-bold">{createdBooking?.table_name || form.tableName} ({createdBooking?.area_name || form.areaName || "Khu vực"})</span></div>
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
                  className="w-full py-3 bg-white hover:bg-gray-50 text-gray-500 border border-gray-250 rounded-xl text-xs font-bold transition-all cursor-pointer"
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
          <p className="mt-2 text-xs text-gray-350 max-w-md">
            Chống trùng lịch · Đặt chỗ thời gian thực · Trải nghiệm trọn vẹn ẩm thực Restro
          </p>

          {/* Progress stepper overlay */}
          <div className="mt-6 flex items-center gap-3 text-[11px] font-bold text-white/60 bg-white/10 px-5 py-2.5 rounded-full border border-white/20">
            <span className={step >= 1 ? "text-client-secondary font-extrabold" : ""}>1. Chọn thời gian</span>
            <span>&rarr;</span>
            <span className={step >= 2 ? "text-client-secondary font-extrabold" : ""}>2. Chọn bàn & Thông tin liên hệ</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className={`mx-auto px-6 mt-8 transition-all ${step === 2 ? "max-w-7xl" : "max-w-3xl"}`}>
        {step === 1 && (
          <form onSubmit={handleNextToStep2} className="space-y-6">
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
                  <p className="mt-2 text-xs text-client-muted">Nhận đặt online từ 10:00 đến 19:00, tối đa 30 ngày. Bạn có thể nhập chính xác từng phút.</p>
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
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loadingTables}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-client-primary py-4 text-sm font-bold text-white transition-all hover:bg-client-primary-hover disabled:opacity-50 cursor-pointer"
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
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 animate-fade-in">
            {/* Cột bên trái: Sơ đồ bàn (60%) */}
            <div className="lg:col-span-6 bg-white rounded-3xl shadow-sm border border-client-accent p-8 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-[#f0eae1] pb-4">
                <div>
                  <h2 className="text-lg font-bold text-client-text font-display flex items-center gap-2">
                    <Landmark size={18} className="text-client-primary" /> Sơ đồ bàn ăn trống
                  </h2>
                  <p className="text-xs text-client-muted mt-1">Vui lòng chọn một bàn ăn trống màu xanh dưới đây</p>
                </div>
                <div className="flex items-center gap-3 self-start flex-wrap">
                  <button
                    type="button"
                    onClick={() => refreshTableStatus(false)}
                    disabled={refreshing}
                    className="text-xs font-bold px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                  >
                    {refreshing ? <Loader2 size={12} className="animate-spin text-client-primary" /> : "🔄 Làm mới sơ đồ"}
                  </button>
                  <span className="text-xs font-bold px-3 py-1.5 bg-client-primary/10 text-client-primary rounded-xl whitespace-nowrap">
                    Tìm thấy {availableTables.length} bàn trống
                  </span>
                </div>
              </div>

              {availableTables.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-client-muted text-sm font-medium">Hiện tại không còn bàn trống nào phù hợp cho thời gian đã chọn.</p>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="mt-4 px-4 py-2 bg-client-primary text-white rounded-xl text-xs font-bold hover:bg-client-primary-hover cursor-pointer"
                  >
                    Quay lại chọn thời gian khác
                  </button>
                </div>
              ) : (
                <>
                  {/* Bộ lọc khu vực */}
                  {uniqueAreas.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-2 border-b border-client-accent pb-4">
                      {uniqueAreas.map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => setSelectedArea(area)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            selectedArea === area
                              ? "bg-client-primary text-white shadow-xs"
                              : "bg-client-accent/50 text-client-muted hover:bg-client-accent"
                          }`}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sơ đồ bàn theo hàng/cột */}
                  <div className="flex flex-col gap-6 flex-1">
                    {sortedRowKeys.map((rowKey) => (
                      <div key={rowKey} className="flex flex-row items-center gap-4">
                        <div className="w-8 flex items-center justify-center font-bold text-[#7b6f65] border-r border-[#f0eae1] pr-2 self-stretch">
                          {rowKey}
                        </div>
                        <div className="flex flex-wrap gap-4 flex-1">
                           {groupedRows[rowKey]
                            .sort((a: any, b: any) => (a.col_pos || 0) - (b.col_pos || 0))
                            .map((table: any) => {
                              const isSelected = String(table.id) === form.tableId;
                              const bookingStatus: string = table.booking_status || table.status || "empty";
                              const isBookable = table.is_bookable === 1 || table.is_bookable === true;

                              type StatusCfg = { bg: string; border: string; text: string; badgeBg: string; badgeText: string; label: string; icon: string };
                              const statusConfig: Record<string, StatusCfg> = {
                                empty:           { bg: "bg-emerald-50",   border: "border-emerald-300", text: "text-emerald-800", badgeBg: "bg-emerald-100", badgeText: "text-emerald-700", label: "Trống",         icon: "✓" },
                                reserved:        { bg: "bg-amber-50",     border: "border-amber-300",   text: "text-amber-700",   badgeBg: "bg-amber-100",   badgeText: "text-amber-700",   label: "Đặt trước",     icon: "🔒" },
                                booked:          { bg: "bg-amber-50",     border: "border-amber-300",   text: "text-amber-700",   badgeBg: "bg-amber-100",   badgeText: "text-amber-700",   label: "Đã đặt",        icon: "🔒" },
                                serving:         { bg: "bg-rose-50",      border: "border-rose-300",    text: "text-rose-600",    badgeBg: "bg-rose-100",    badgeText: "text-rose-600",    label: "Đang phục vụ",  icon: "🍽" },
                                pending_payment: { bg: "bg-rose-50",      border: "border-rose-300",    text: "text-rose-600",    badgeBg: "bg-rose-100",    badgeText: "text-rose-600",    label: "Chờ thanh toán", icon: "💳" },
                                cleaning:        { bg: "bg-sky-50",       border: "border-sky-300",     text: "text-sky-700",     badgeBg: "bg-sky-100",     badgeText: "text-sky-700",     label: "Đang dọn",      icon: "🧹" },
                              };
                              const cfg: StatusCfg = statusConfig[bookingStatus] || statusConfig.empty;

                              if (isSelected) {
                                return (
                                  <div
                                    key={table.id}
                                    onClick={() => handleSelectTable(table)}
                                    className="relative cursor-pointer p-3.5 rounded-2xl border-2 border-blue-600 bg-blue-50 text-blue-800 shadow-lg ring-4 ring-blue-200/50 transition-all w-[110px] text-center flex flex-col items-center gap-1.5"
                                  >
                                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-blue-600 text-white rounded-full text-[10px] font-black flex items-center justify-center shadow-sm">✓</span>
                                    <div className="flex items-center gap-1">
                                      <span className="text-sm font-black">{table.name}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold">
                                      <Users size={10} /> {table.capacity} người
                                    </div>
                                    <span className="text-[9px] font-extrabold uppercase bg-blue-200 text-blue-800 px-2 py-0.5 rounded-full">Đang chọn</span>
                                  </div>
                                );
                              }

                              if (!isBookable) {
                                return (
                                  <div
                                    key={table.id}
                                    title={`Bàn ${table.name} — ${cfg.label}`}
                                    className={`relative p-3.5 rounded-2xl border-2 ${cfg.border} ${cfg.bg} opacity-65 cursor-not-allowed w-[110px] text-center flex flex-col items-center gap-1.5`}
                                  >
                                    <span className="text-sm font-black text-gray-500">{table.name}</span>
                                    <div className="flex items-center gap-1 text-[11px] text-gray-400 font-semibold">
                                      <Users size={10} /> {table.capacity} người
                                    </div>
                                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${cfg.badgeBg} ${cfg.badgeText}`}>
                                      {cfg.icon} {cfg.label}
                                    </span>
                                  </div>
                                );
                              }

                              // Bàn trống — có thể đặt
                              return (
                                <div
                                  key={table.id}
                                  onClick={() => handleSelectTable(table)}
                                  title={`Chọn bàn ${table.name} — ${table.capacity} người`}
                                  className="relative cursor-pointer p-3.5 rounded-2xl border-2 border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-100 hover:shadow-md hover:scale-105 transition-all w-[110px] text-center flex flex-col items-center gap-1.5 group"
                                >
                                  {/* Pulse dot for available */}
                                  <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5">
                                    <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
                                    <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500" />
                                  </span>
                                  <span className="text-sm font-black text-emerald-800 group-hover:text-emerald-900">{table.name}</span>
                                  <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                                    <Users size={10} /> {table.capacity} người
                                  </div>
                                  <span className="text-[9px] font-extrabold uppercase bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded-full">Trống</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 pt-4 border-t border-gray-100">
                    {[
                      { dot: "bg-emerald-400 animate-pulse", label: "Trống — có thể đặt" },
                      { dot: "bg-amber-400",   label: "Đã đặt / Đặt trước" },
                      { dot: "bg-rose-400",    label: "Đang phục vụ" },
                      { dot: "bg-sky-400",     label: "Đang dọn dẹp" },
                      { dot: "bg-blue-600",    label: "Bàn bạn đang chọn" },
                    ].map(({ dot, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${dot}`} />
                        <span className="text-[10px] text-gray-500 font-medium leading-tight">{label}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

            </div>


            {/* Cột bên phải: Thông tin liên hệ & Đặt bàn (40%) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Form nhập thông tin */}
              <div className="bg-white rounded-3xl shadow-sm border border-client-accent p-8">
                <h2 className="text-lg font-bold text-client-text font-display mb-6 border-b border-[#f0eae1] pb-4">
                  Thông tin khách & Đặt bàn
                </h2>
                
                <div className="space-y-4">
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
                  
                  <div>
                    <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Email</label>
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

                  {/* Chọn ưu đãi */}
                  <div className="border-t border-client-accent pt-4">
                    <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <Percent size={14} className="text-client-primary" /> Chọn chương trình ưu đãi (Tùy chọn)
                    </label>
                    <select
                      value={selectedPromoId}
                      onChange={(e) => setSelectedPromoId(e.target.value)}
                      className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:ring-2 focus:ring-client-secondary outline-none bg-white transition-all"
                    >
                      <option value="">Không áp dụng ưu đãi</option>
                      {promotionsList.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({p.discount_type === "percent" ? `Giảm ${p.discount_value}%` : `Giảm ${Number(p.discount_value).toLocaleString("vi-VN")}đ`})
                        </option>
                      ))}
                    </select>
                  </div>

                {/* Ghi chú */}
                <div className="sm:col-span-2 border-t border-[#f0eae1] pt-6">
                  <label className="block text-xs font-bold text-client-muted uppercase tracking-wider mb-2">Ghi chú (Tùy chọn)</label>
                  <textarea
                    value={form.note}
                    onChange={(e) => setField("note", e.target.value)}
                    rows={3}
                    placeholder="Các yêu cầu đặc biệt như ăn kiêng, đặt trước món ăn, vị trí ngồi..."
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

              {/* Tóm tắt đặt bàn */}
              <div className="bg-client-accent/30 border border-client-accent rounded-3xl p-6 flex flex-col gap-3 text-sm text-client-text font-semibold shadow-2xs mt-6">
                <h4 className="font-extrabold uppercase text-xs text-client-primary tracking-wider font-display">Thông tin tóm tắt đặt bàn</h4>
                <div className="grid grid-cols-1 gap-y-2">
                  <div>Ngày đến: <span className="font-bold text-gray-900">{form.date ? new Date(form.date).toLocaleDateString("vi-VN") : "Chưa chọn"}</span></div>
                  <div>Giờ đến: <span className="font-bold text-gray-900">{form.time || "Chưa chọn"}</span></div>
                  <div>Bàn ăn đã chọn: <span className="font-bold text-gray-900">{form.tableName ? `${form.tableName} ${form.areaName ? `(${form.areaName})` : ""}` : "Chưa chọn"}</span></div>
                  <div>Số khách: <span className="font-bold text-gray-900">{form.guests} người</span></div>
                </div>
                {/* Hiển thị tiền cọc dự kiến */}
                {Object.keys(preOrderedDishes).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-client-accent flex justify-between items-center text-xs">
                    <div>
                      <span className="text-[#7b6f65] block">Tổng tiền món đặt trước</span>
                      <span className="font-bold text-[#2a221c]">
                        {Object.values(preOrderedDishes)
                          .reduce((sum: number, d: any) => sum + (Number(d.price || 0) * Number(d.quantity || 0)), 0)
                          .toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-client-primary font-extrabold block uppercase tracking-wider text-[10px]">Tiền đặt cọc (20% để xác nhận)</span>
                      <span className="font-black text-rose-600 text-sm">
                        {Math.round(
                          Object.values(preOrderedDishes).reduce((sum: number, d: any) => sum + (Number(d.price || 0) * Number(d.quantity || 0)), 0) * 0.20
                        ).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Nút bấm hành động */}
              <div className="flex gap-4 mt-6">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <ArrowLeft size={16} /> Quay lại
                </button>
                <button
                  type="button"
                  disabled={submitting || !form.tableId}
                  onClick={handleSubmitBooking}
                  className="flex-[2] py-4 bg-client-primary hover:bg-client-primary-hover text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 shadow-md disabled:opacity-50 cursor-pointer"
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
            </div>
          </div>
        </div>
        )}
      </main>
    </div>
  );
};
