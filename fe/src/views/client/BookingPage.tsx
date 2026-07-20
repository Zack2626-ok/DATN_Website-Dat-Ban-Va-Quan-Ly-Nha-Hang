import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Phone, Mail, CheckCircle, UtensilsCrossed, ArrowRight, ArrowLeft, Calendar, Loader2, Landmark, Percent, ShoppingBag, Plus, Minus, Trash2, Printer, Search, Tag, ChefHat, X } from "lucide-react";
import { toast } from "react-hot-toast";
import { getAvailableTables, createBooking, Customer, getPublicPromotions, getPublicMenu, payBookingDeposit } from "../../services/customerService";

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
  const [createdBooking, setCreatedBooking] = useState<any>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [payingDeposit, setPayingDeposit] = useState(false);

  const [searchParams] = useSearchParams();
  const promoParam = searchParams.get("promo");

  const [promotionsList, setPromotionsList] = useState<any[]>([]);
  const [selectedPromoId, setSelectedPromoId] = useState<string>("");
  const [menuItemsList, setMenuItemsList] = useState<any[]>([]);
  const [menuCategoriesList, setMenuCategoriesList] = useState<any[]>([]);
  const [preOrderedDishes, setPreOrderedDishes] = useState<{ [id: string]: { name: string; price: number; quantity: number; image_url?: string; description?: string; category_name?: string } }>({});
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [menuSearch, setMenuSearch] = useState("");
  const [menuCategory, setMenuCategory] = useState("Tất cả");

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
        setMenuCategoriesList(data.categories || []);
      })
      .catch((e) => console.error("Error loading menu in booking page:", e));
  }, [promoParam]);

  // Filtered menu items based on category + search
  const filteredMenuItems = useMemo(() => {
    return menuItemsList.filter((item) => {
      const matchCat = menuCategory === "Tất cả" || item.category_name === menuCategory;
      const matchSearch = !menuSearch.trim() || item.name.toLowerCase().includes(menuSearch.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [menuItemsList, menuCategory, menuSearch]);

  const totalPreOrderCost = useMemo(() =>
    Object.values(preOrderedDishes).reduce((sum, d) => sum + d.price * d.quantity, 0),
    [preOrderedDishes]
  );

  const totalPreOrderQty = useMemo(() =>
    Object.values(preOrderedDishes).reduce((sum, d) => sum + d.quantity, 0),
    [preOrderedDishes]
  );

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
      // Reset selected table from previous searches
      setForm((prev) => ({
        ...prev,
        tableId: "",
        tableName: "",
        areaName: "",
      }));
      setPreOrderedDishes({}); // Reset giỏ món khi tìm lại lịch trình đặt bàn mới
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

      // Tổng hợp món ăn đặt trước gửi lên API
      const orderedItems = Object.entries(preOrderedDishes)
        .filter(([_, d]) => d.quantity > 0)
        .map(([idStr, d]) => ({
          menu_item_id: String(idStr),
          quantity: d.quantity,
        }));

      const bookingResult = await createBooking({
        table_id: Number(form.tableId),
        customer_id: customerId,
        promotion_id: selectedPromoId ? Number(selectedPromoId) : null,
        guest_name: form.name,
        guest_phone: form.phone,
        party_size: Number(form.guests),
        start_time: startTimeStr,
        end_time: endTimeStr,
        guest_note: form.note.trim(),
        pre_ordered_items: orderedItems,
      });

      setCreatedBooking(bookingResult);
      setConfirmationCode(bookingResult.confirmation_code);
      setPreOrderedDishes({}); // Xóa sạch giỏ món ăn sau khi đặt bàn thành công
      setStep(4);
      toast.success("Đặt bàn thành công!");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Đặt bàn thất bại. Vui lòng thử lại.");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayDeposit = async () => {
    if (!createdBooking?.id) return;
    setPayingDeposit(true);
    try {
      await payBookingDeposit(createdBooking.id);
      setCreatedBooking((prev: any) => {
        if (!prev) return null;
        return { ...prev, deposit_status: "paid" };
      });
      toast.success("Thanh toán tiền cọc thành công!");
      setShowPaymentModal(false);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Không thể thực hiện thanh toán lúc này.");
    } finally {
      setPayingDeposit(false);
    }
  };

  const handlePrintInvoice = () => {
    window.print();
  };

  if (step === 4) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 relative">
        {/* Ticket Outer Wrapper */}
        <div className="w-full max-w-md bg-white rounded-3xl shadow-xl border border-gray-150 p-8 text-center animate-fade-in relative">

          {/* Card Upper Section */}
          <div className="flex flex-col items-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-[10px] font-extrabold uppercase tracking-wider mb-3">
              <CheckCircle size={12} /> Đặt bàn thành công
            </span>
            <h1 className="text-xl font-bold text-gray-900 font-display">Cảm ơn quý khách!</h1>
            <p className="text-xs text-gray-500 mt-1">Yêu cầu đặt bàn của bạn đã được tiếp nhận</p>
          </div>

          <div className="mt-6 p-4 bg-gray-50 border border-dashed border-gray-250 rounded-2xl relative">
            <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block">Mã xác nhận đặt bàn</span>
            <span className="text-3xl font-black text-blue-700 tracking-widest mt-1 block font-mono">{confirmationCode}</span>

            {/* Barcode Mockup */}
            <div className="flex justify-center items-center gap-[2px] h-6 opacity-60 mt-3">
              <div className="w-[3px] h-full bg-gray-800"></div>
              <div className="w-[1px] h-full bg-gray-800"></div>
              <div className="w-[2px] h-full bg-gray-800"></div>
              <div className="w-[3px] h-full bg-gray-800"></div>
              <div className="w-[1px] h-full bg-gray-800"></div>
              <div className="w-[2px] h-full bg-gray-800"></div>
              <div className="w-[4px] h-full bg-gray-800"></div>
              <div className="w-[1px] h-full bg-gray-800"></div>
              <div className="w-[3px] h-full bg-gray-800"></div>
              <div className="w-[1px] h-full bg-gray-800"></div>
              <div className="w-[2px] h-full bg-gray-800"></div>
              <div className="w-[4px] h-full bg-gray-800"></div>
              <div className="w-[2px] h-full bg-gray-800"></div>
              <div className="w-[1px] h-full bg-gray-800"></div>
              <div className="w-[3px] h-full bg-gray-800"></div>
              <div className="w-[1px] h-full bg-gray-800"></div>
              <div className="w-[2px] h-full bg-gray-800"></div>
            </div>
          </div>

          {/* Ticket Perforation & Punches */}
          <div className="my-6 relative border-t border-dashed border-gray-200">
            <div className="absolute -left-11 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-50 border-r border-gray-150"></div>
            <div className="absolute -right-11 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-gray-50 border-l border-gray-150"></div>
          </div>

          {/* Card Lower Section */}
          <div className="text-left bg-gray-50/50 rounded-2xl p-5 border border-gray-100 space-y-3">
             <div className="flex justify-between text-xs"><span className="text-gray-400 font-bold uppercase tracking-wider">Người đặt:</span> <span className="font-semibold text-gray-900">{createdBooking?.guest_name || form.name}</span></div>
             <div className="flex justify-between text-xs"><span className="text-gray-400 font-bold uppercase tracking-wider">Thời gian đến:</span> <span className="font-semibold text-gray-900">{form.time} - {new Date(form.date).toLocaleDateString("vi-VN")}</span></div>
             <div className="flex justify-between text-xs"><span className="text-gray-400 font-bold uppercase tracking-wider">Bàn đã chọn:</span> <span className="font-semibold text-gray-900">{createdBooking?.table_name || form.tableName} ({createdBooking?.area_name || form.areaName || "Nhà hàng"})</span></div>
             <div className="flex justify-between text-xs"><span className="text-gray-400 font-bold uppercase tracking-wider">Số lượng khách:</span> <span className="font-semibold text-gray-900">{createdBooking?.party_size || form.guests} người</span></div>
             <div className="flex justify-between text-xs">
               <span className="text-gray-400 font-bold uppercase tracking-wider">Trạng thái đặt:</span>
               <span className="font-bold text-amber-600">Chờ xác nhận</span>
             </div>

             {/* Deposit Information Box */}
             {createdBooking?.deposit_amount > 0 && (
               <div className="mt-4 pt-3 border-t border-gray-250/50 space-y-3">
                 <div className="flex justify-between text-xs items-center">
                   <span className="text-gray-400 font-bold uppercase tracking-wider">Tiền cọc món (20%):</span>
                   <span className="font-black text-rose-600 text-sm font-mono">{Number(createdBooking.deposit_amount).toLocaleString("vi-VN")}đ</span>
                 </div>
                 <div className="flex justify-between text-xs items-center">
                   <span className="text-gray-400 font-bold uppercase tracking-wider">Trạng thái cọc:</span>
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
                     className="w-full mt-2 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5"
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
              className="flex-1 inline-flex items-center justify-center gap-2 py-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 rounded-2xl font-bold text-sm shadow-xs transition-all"
            >
              <Printer size={16} className="text-gray-500" /> In hóa đơn đặt bàn
            </button>
          )}
          <button
            onClick={() => {
              setStep(1);
              setCreatedBooking(null);
              setPreOrderedDishes({});
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
            className="flex-[2] py-4 bg-blue-700 hover:bg-blue-800 text-white rounded-2xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2"
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
            <div className="flex justify-between"><span>Thời gian đến:</span> <span className="font-bold">{form.time} - {new Date(form.date).toLocaleDateString("vi-VN")}</span></div>
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
                  {createdBooking.pre_ordered_items.map((item: any) => (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="py-1">{item.menu_item_name}</td>
                      <td className="py-1 text-center">{item.quantity}</td>
                      <td className="py-1 text-right">{Number(item.unit_price).toLocaleString("vi-VN")}đ</td>
                      <td className="py-1 text-right">{(item.quantity * item.unit_price).toLocaleString("vi-VN")}đ</td>
                    </tr>
                  ))}
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
            <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl flex flex-col p-6 text-center animate-fade-in border border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 font-display">Thanh Toán Tiền Cọc</h3>
              <p className="text-xs text-gray-500 mt-1">Quét mã QR bằng ứng dụng ngân hàng của bạn</p>

              {/* VietQR image */}
              <div className="my-4">
                <img
                  src={`https://img.vietqr.io/image/MB-0912345678-compact2.png?amount=${createdBooking.deposit_amount}&addInfo=${createdBooking.confirmation_code}&accountName=NHA%20HANG%20RESMANAGER`}
                  alt="Mã QR Chuyển khoản VietQR"
                  className="mx-auto w-52 h-52 object-contain border border-gray-200 rounded-2xl shadow-xs p-2 bg-white"
                />
              </div>

              {/* Account Details */}
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 text-left text-xs space-y-2 text-gray-600">
                <div className="flex justify-between"><span>Ngân hàng:</span> <span className="font-bold text-gray-900">MB Bank</span></div>
                <div className="flex justify-between"><span>Số tài khoản:</span> <span className="font-bold text-gray-900">0912345678</span></div>
                <div className="flex justify-between"><span>Chủ tài khoản:</span> <span className="font-bold text-gray-900">NHA HANG RESMANAGER</span></div>
                <div className="flex justify-between"><span>Số tiền cọc (20%):</span> <span className="font-bold text-rose-600 text-sm font-mono">{Number(createdBooking.deposit_amount).toLocaleString("vi-VN")}đ</span></div>
                <div className="flex justify-between"><span>Nội dung chuyển:</span> <span className="font-bold text-blue-700 uppercase font-mono">{createdBooking.confirmation_code}</span></div>
              </div>

              {/* Simulated Payment Actions */}
              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={handlePayDeposit}
                  disabled={payingDeposit}
                  className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs disabled:opacity-50 flex items-center justify-center gap-1.5"
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
                  className="w-full py-3 bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 rounded-xl text-xs font-bold transition-all"
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
    <div className="min-h-screen bg-sky-50/50 pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-6">
        <div className={`mx-auto px-6 flex items-center justify-between transition-all ${step === 2 ? "max-w-7xl" : "max-w-3xl"}`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-50 text-blue-700 rounded-2xl">
              <UtensilsCrossed size={20} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800 font-display">Đặt bàn trực tuyến</h1>
              <p className="text-xs text-slate-400">Chống trùng lịch · Đặt chỗ thời gian thực</p>
            </div>
          </div>
          {/* Progress stepper */}
          <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
            <span className={step >= 1 ? "text-blue-700 font-extrabold" : ""}>1. Chọn thời gian</span>
            <span>&rarr;</span>
            <span className={step >= 2 ? "text-blue-700 font-extrabold" : ""}>2. Chọn bàn & Thông tin liên hệ</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className={`mx-auto px-6 mt-8 transition-all ${step === 2 ? "max-w-7xl" : "max-w-3xl"}`}>
        {step === 1 && (
          <form onSubmit={handleNextToStep2} className="space-y-6">
            <div className="bg-white rounded-3xl shadow-sm border border-sky-50 p-8">
              <h2 className="text-lg font-bold text-slate-800 font-display mb-6 border-b border-gray-50 pb-4 flex items-center gap-2">
                <Calendar size={18} className="text-blue-600" /> Chọn lịch trình đặt bàn
              </h2>
              <div className="grid gap-6 sm:grid-cols-3">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ngày đến *</label>
                  <input
                    required
                    type="date"
                    value={form.date}
                    onChange={(e) => setField("date", e.target.value)}
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Giờ đến *</label>
                  <select
                    required
                    value={form.time}
                    onChange={(e) => setField("time", e.target.value)}
                    className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
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
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Số khách *</label>
                  <input
                    required
                    type="number"
                    min="1"
                    max="30"
                    value={form.guests}
                    onChange={(e) => setField("guests", e.target.value.replace(/[^0-9]/g, ""))}
                    className="w-full rounded-xl border border-sky-200 px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all"
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
          <div className="grid grid-cols-1 lg:grid-cols-10 gap-8 animate-fade-in">
            {/* Cột bên trái: Sơ đồ bàn (60%) */}
            <div className="lg:col-span-6 bg-white rounded-3xl shadow-sm border border-gray-100 p-8 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 border-b border-gray-50 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 font-display flex items-center gap-2">
                    <Landmark size={18} className="text-blue-600" /> Sơ đồ bàn ăn trống
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">Vui lòng chọn một bàn ăn trống màu xanh dưới đây</p>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 bg-blue-50 text-blue-700 rounded-xl whitespace-nowrap self-start">
                  Tìm thấy {availableTables.length} bàn trống
                </span>
              </div>

              {availableTables.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-gray-500 text-sm font-medium">Hiện tại không còn bàn trống nào phù hợp cho thời gian đã chọn.</p>
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="mt-4 px-4 py-2 bg-blue-700 text-white rounded-xl text-xs font-bold hover:bg-blue-800"
                  >
                    Quay lại chọn thời gian khác
                  </button>
                </div>
              ) : (
                <>
                  {/* Bộ lọc khu vực (AreaSelector) */}
                  {uniqueAreas.length > 1 && (
                    <div className="flex flex-wrap gap-2 mb-2 border-b border-gray-100 pb-4">
                      {uniqueAreas.map((area) => (
                        <button
                          key={area}
                          type="button"
                          onClick={() => setSelectedArea(area)}
                          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                            selectedArea === area
                              ? "bg-blue-700 text-white shadow-xs"
                              : "bg-sky-50 text-slate-600 hover:bg-sky-100"
                          }`}
                        >
                          {area}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Sơ đồ bàn theo hàng/cột */}
                  <div className="flex flex-col gap-6 overflow-y-auto max-h-[500px] pr-2">
                    {sortedRowKeys.map((rowKey) => (
                      <div key={rowKey} className="flex flex-row items-center gap-4">
                        <div className="w-8 flex items-center justify-center font-bold text-gray-400 border-r border-gray-100 pr-2 self-stretch">
                          {rowKey}
                        </div>
                        <div className="flex flex-wrap gap-4 flex-1">
                          {groupedRows[rowKey]
                            .sort((a: any, b: any) => (a.col_pos || 0) - (b.col_pos || 0))
                            .map((table: any) => {
                              const isSelected = String(table.id) === form.tableId;
                              return (
                                <div
                                  key={table.id}
                                  onClick={() => handleSelectTable(table)}
                                  className={`cursor-pointer p-4 rounded-xl border-2 transition-all text-center flex flex-col justify-center items-center gap-1 w-[120px] ${
                                    isSelected
                                      ? "bg-blue-50 border-blue-700 text-blue-800 shadow-sm"
                                      : "bg-emerald-50 border-emerald-200 hover:border-emerald-300 text-emerald-800"
                                  }`}
                                >
                                  <span className="text-base font-bold font-display">{table.name}</span>
                                  <span className="text-xs opacity-75">{table.capacity} chỗ</span>
                                  <span className="text-[10px] font-extrabold uppercase mt-1">Đang hoạt động</span>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Cột bên phải: Thông tin liên hệ & Đặt bàn (40%) */}
            <div className="lg:col-span-4 space-y-6">
              {/* Form nhập thông tin */}
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-8">
                <h2 className="text-lg font-bold text-gray-900 font-display mb-6 border-b border-gray-50 pb-4">
                  Thông tin khách & Đặt bàn
                </h2>

                <div className="space-y-4">
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

                  <div>
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
                  <div className="border-t border-gray-100 pt-4">
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
                  <div className="border-t border-gray-100 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                        <ChefHat size={14} className="text-orange-500" /> Đặt trước món ăn (Tùy chọn)
                      </label>
                      <button
                        type="button"
                        onClick={() => setShowMenuModal(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-600 rounded-lg text-xs font-bold transition-all border border-orange-100"
                      >
                        <ShoppingBag size={13} />
                        {totalPreOrderQty > 0 ? `${totalPreOrderQty} món` : "Chọn món"}
                      </button>
                    </div>

                    {/* Giỏ món đặt trước */}
                    {Object.keys(preOrderedDishes).length > 0 && (
                      <div className="bg-orange-50/60 border border-orange-100 rounded-2xl p-3 space-y-2">
                        {Object.entries(preOrderedDishes).map(([id, dish]) => (
                          <div key={id} className="flex items-center justify-between gap-2">
                            <span className="text-xs text-gray-700 font-medium flex-1 line-clamp-1">{dish.name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setPreOrderedDishes((prev) => {
                                    const current = prev[id];
                                    if (current.quantity <= 1) {
                                      const copy = { ...prev };
                                      delete copy[id];
                                      return copy;
                                    }
                                    return { ...prev, [id]: { ...current, quantity: current.quantity - 1 } };
                                  });
                                }}
                                className="w-5 h-5 rounded bg-orange-100 text-orange-600 hover:bg-orange-200 flex items-center justify-center"
                              >
                                <Minus size={10} />
                              </button>
                              <span className="text-xs font-black text-gray-800 w-4 text-center">{dish.quantity}</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreOrderedDishes((prev) => ({
                                    ...prev,
                                    [id]: { ...prev[id], quantity: prev[id].quantity + 1 },
                                  }));
                                }}
                                className="w-5 h-5 rounded bg-orange-500 text-white hover:bg-orange-600 flex items-center justify-center"
                              >
                                <Plus size={10} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setPreOrderedDishes((prev) => {
                                    const copy = { ...prev };
                                    delete copy[id];
                                    return copy;
                                  });
                                }}
                                className="w-5 h-5 rounded bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center ml-0.5"
                              >
                                <Trash2 size={10} />
                              </button>
                            </div>
                            <span className="text-[11px] font-bold text-orange-600 shrink-0 w-16 text-right">
                              {(dish.price * dish.quantity).toLocaleString("vi-VN")}đ
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Ghi chú */}
                  <div className="border-t border-gray-100 pt-4">
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

              {/* Tóm tắt đặt bàn */}
              <div className="bg-blue-50/50 border border-blue-100 rounded-3xl p-6 flex flex-col gap-3 text-sm text-blue-900 font-semibold shadow-2xs">
                <h4 className="font-extrabold uppercase text-xs text-blue-500 tracking-wider">Thông tin tóm tắt đặt bàn</h4>
                <div className="grid grid-cols-1 gap-y-2">
                  <div>Ngày đến: <span className="font-bold text-gray-900">{new Date(form.date).toLocaleDateString("vi-VN")}</span></div>
                  <div>Giờ đến: <span className="font-bold text-gray-900">{form.time}</span></div>
                  <div>Bàn ăn đã chọn: <span className="font-bold text-gray-900">{form.tableName ? `${form.tableName} ${form.areaName ? `(${form.areaName})` : ""}` : "Chưa chọn"}</span></div>
                  <div>Số khách: <span className="font-bold text-gray-900">{form.guests} người</span></div>
                </div>

                {/* Hiển thị tiền cọc dự kiến */}
                {Object.keys(preOrderedDishes).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-blue-100/50 flex justify-between items-center text-xs">
                    <div>
                      <span className="text-gray-500 block">Tổng tiền món đặt trước</span>
                      <span className="font-bold text-gray-900">
                        {Object.values(preOrderedDishes)
                          .reduce((sum, d) => sum + d.price * d.quantity, 0)
                          .toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-blue-500 font-extrabold block uppercase tracking-wider text-[10px]">Tiền đặt cọc (20% để xác nhận)</span>
                      <span className="font-black text-rose-600 text-sm">
                        {Math.round(
                          Object.values(preOrderedDishes).reduce((sum, d) => sum + d.price * d.quantity, 0) * 0.20
                        ).toLocaleString("vi-VN")}đ
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Nút bấm hành động */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-4 border border-gray-250 bg-white hover:bg-gray-50 text-gray-600 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                >
                  <ArrowLeft size={16} /> Quay lại
                </button>
                <button
                  type="button"
                  disabled={submitting || !form.tableId}
                  onClick={handleSubmitBooking}
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
            </div>
          </div>
        )}
      </main>

      {/* ============================================================
          Modal Đặt trước món ăn — Premium Grid UI với Category Filter
      ============================================================ */}
      {showMenuModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] sm:max-h-[85vh]">

            {/* ─── Header ─── */}
            <div className="px-6 pt-6 pb-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-orange-50 rounded-xl">
                    <ChefHat size={18} className="text-orange-500" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">Đặt trước món ăn</h3>
                    <p className="text-[11px] text-gray-400">Chọn món để bếp chuẩn bị sẵn khi bạn đến</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowMenuModal(false); setMenuSearch(""); setMenuCategory("Tất cả"); }}
                  className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Search bar */}
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Tìm kiếm món ăn..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all bg-gray-50"
                />
              </div>

              {/* Category Tabs */}
              <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {["Tất cả", ...menuCategoriesList.map((c) => c.name)].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setMenuCategory(cat)}
                    className={`shrink-0 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all ${
                      menuCategory === cat
                        ? "bg-orange-500 text-white shadow-sm"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* ─── Menu Grid ─── */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {filteredMenuItems.length === 0 ? (
                <div className="text-center py-12">
                  <UtensilsCrossed size={36} className="mx-auto text-gray-200 mb-3" />
                  <p className="text-gray-400 text-sm font-medium">Không tìm thấy món ăn phù hợp</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredMenuItems.map((item) => {
                    const qty = preOrderedDishes[item.id]?.quantity || 0;
                    const imageUrl = item.image_url
                      ? (item.image_url.startsWith("http") ? item.image_url : `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000"}/uploads/${item.image_url}`)
                      : "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400";

                    return (
                      <div
                        key={item.id}
                        className={`relative bg-white rounded-2xl border-2 transition-all overflow-hidden ${
                          qty > 0 ? "border-orange-400 shadow-md" : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                        }`}
                      >
                        {/* Badge số lượng */}
                        {qty > 0 && (
                          <div className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-orange-500 text-white text-[11px] font-black flex items-center justify-center shadow-sm">
                            {qty}
                          </div>
                        )}

                        {/* Hình ảnh món ăn */}
                        <div className="relative h-32 bg-gray-50 overflow-hidden">
                          <img
                            src={imageUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400";
                            }}
                          />
                          {/* Overlay gradient */}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                          {/* Category badge on image */}
                          {item.category_name && (
                            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[9px] font-extrabold text-white bg-black/40 backdrop-blur-sm rounded-md px-1.5 py-0.5">
                              <Tag size={8} />
                              {item.category_name}
                            </span>
                          )}
                        </div>

                        {/* Nội dung card */}
                        <div className="p-3">
                          <h4 className="text-sm font-bold text-gray-900 leading-snug line-clamp-1">{item.name}</h4>
                          <p className="text-[11px] text-gray-400 mt-0.5 line-clamp-2 leading-relaxed">
                            {item.description || "Món ăn đặc trưng của nhà hàng, được chế biến tươi ngon mỗi ngày."}
                          </p>

                          {/* Footer: giá + nút */}
                          <div className="flex items-center justify-between mt-3">
                            <div>
                              <span className="text-sm font-black text-orange-600">
                                {Number(item.price).toLocaleString("vi-VN")}đ
                              </span>
                            </div>

                            {qty > 0 ? (
                              <div className="flex items-center gap-1.5">
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
                                      return { ...prev, [item.id]: { ...current, quantity: current.quantity - 1 } };
                                    });
                                  }}
                                  className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 hover:bg-orange-100 flex items-center justify-center transition-colors font-bold"
                                >
                                  <Minus size={12} />
                                </button>
                                <span className="text-sm font-black text-gray-800 min-w-[20px] text-center">{qty}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPreOrderedDishes((prev) => {
                                      const current = prev[item.id];
                                      return { ...prev, [item.id]: { ...current, quantity: current.quantity + 1 } };
                                    });
                                  }}
                                  className="w-7 h-7 rounded-lg bg-orange-500 text-white hover:bg-orange-600 flex items-center justify-center transition-colors"
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
                                    [item.id]: {
                                      name: item.name,
                                      price: Number(item.price),
                                      quantity: 1,
                                      image_url: item.image_url,
                                      description: item.description,
                                      category_name: item.category_name,
                                    },
                                  }));
                                }}
                                className="inline-flex items-center gap-1 rounded-lg bg-orange-500 hover:bg-orange-600 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-sm"
                              >
                                <Plus size={11} /> Thêm
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── Sticky Footer ─── */}
            <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/80 rounded-b-3xl">
              {totalPreOrderQty > 0 ? (
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500 text-white text-[10px] font-black">{totalPreOrderQty}</span>
                      <span className="text-xs text-gray-500 font-semibold">món đã chọn</span>
                    </div>
                    <span className="text-sm font-black text-gray-900 mt-0.5 block">
                      Tổng cộng: <span className="text-orange-600">{totalPreOrderCost.toLocaleString("vi-VN")}đ</span>
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setShowMenuModal(false); setMenuSearch(""); setMenuCategory("Tất cả"); }}
                    className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-sm font-bold transition-colors shadow-sm flex items-center gap-2"
                  >
                    <CheckCircle size={15} /> Xác nhận
                  </button>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <p className="text-xs text-gray-400">Chưa chọn món nào — tùy chọn, có thể bỏ qua</p>
                  <button
                    type="button"
                    onClick={() => { setShowMenuModal(false); setMenuSearch(""); setMenuCategory("Tất cả"); }}
                    className="px-5 py-2.5 bg-gray-800 hover:bg-gray-900 text-white rounded-xl text-xs font-bold transition-colors"
                  >
                    Đóng
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
