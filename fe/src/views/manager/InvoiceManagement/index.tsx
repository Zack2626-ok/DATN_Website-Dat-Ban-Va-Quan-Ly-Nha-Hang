import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Receipt,
  Search,
  Printer,
  RotateCcw,
  Trash2,
  Info,
  Clock,
  Coins,
  CreditCard,
  Banknote,
  ArrowRightLeft,
  Wallet,
  X,
  Plus
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
  getInvoiceByIdApi,
  getPaymentHistoryApi
} from "../../../services/invoiceService";
import { getRestaurantInfo, type RestaurantInfo } from "../../../services/restaurantInfoService";
import { printCashierInvoice } from "../../../utils/printBill";
import { RefundModal } from "../../cashier/payment/components/RefundModal";
import { formatCurrency } from "../../../utils/formatCurrency";
import { io } from "socket.io-client";
import type { Invoice } from "../../../interfaces/invoice";

type TabType = "history" | "expenses";

interface PaymentHistoryRecord {
  id: string;
  orderId: string;
  order_code?: string;
  amount: number;
  originalAmount?: number;
  paymentMethod: string;
  status: string;
  has_refund?: boolean;
  refunded_total?: number;
  discountAmount?: number;
  discountReason?: string;
  notes?: string;
  createdAt: string;
  completedAt?: string;
  table_name?: string;
  guest_name?: string;
  guest_phone?: string;
  order_type?: string;
}

interface OperationalExpense {
  id: string;
  category: "Điện" | "Nước" | "Gas" | "Internet" | "Tiền Thuế" | "Bảo Trì" | "Khác";
  amount: number;
  date: string; // YYYY-MM-DD
  note?: string;
  payee?: string; // Who it was paid/transferred to
}

const METHOD_LABELS: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
  cash: { label: "Tiền mặt", icon: <Banknote size={14} />, color: "text-emerald-600 bg-emerald-50 border-emerald-200" },
  transfer: { label: "Chuyển khoản", icon: <ArrowRightLeft size={14} />, color: "text-blue-600 bg-blue-50 border-blue-200" },
  card: { label: "Thẻ tín dụng", icon: <CreditCard size={14} />, color: "text-violet-600 bg-violet-50 border-violet-200" },
  wallet: { label: "Ví điện tử", icon: <Wallet size={14} />, color: "text-amber-600 bg-amber-50 border-amber-200" },
};

const EXPENSE_CATEGORIES = ["Điện", "Nước", "Gas", "Internet", "Tiền Thuế", "Bảo Trì", "Khác"] as const;

const MOCK_EXPENSES: OperationalExpense[] = [
  { id: "EXP-01", category: "Gas", amount: 1500000, date: new Date().toISOString().split("T")[0], note: "Thay bình Gas nấu bếp chính", payee: "Đại lý Gas Bình Minh HCM" },
  { id: "EXP-02", category: "Điện", amount: 4500000, date: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString().split("T")[0], note: "Tiền điện kỳ tháng này", payee: "Tổng Công ty Điện lực miền Nam (EVN)" },
  { id: "EXP-03", category: "Nước", amount: 850000, date: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString().split("T")[0], note: "Tiền nước kỳ tháng này", payee: "Công ty Cổ phần Cấp nước Chợ Lớn" },
  { id: "EXP-04", category: "Internet", amount: 350000, date: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().split("T")[0], note: "Cước mạng Viettel cáp quang", payee: "Chi nhánh Tập đoàn Viễn thông Viettel" },
  { id: "EXP-05", category: "Tiền Thuế", amount: 5000000, date: new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString().split("T")[0], note: "Thuế môn bài / thuế tháng", payee: "Chi cục Thuế Quận 1" },
  { id: "EXP-06", category: "Bảo Trì", amount: 2200000, date: new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().split("T")[0], note: "Bảo trì máy hút mùi & điều hòa bếp", payee: "Công ty Cơ điện lạnh Việt Nam (REE)" },
  { id: "EXP-07", category: "Khác", amount: 500000, date: new Date(Date.now() - 25 * 24 * 3600 * 1000).toISOString().split("T")[0], note: "Mua chổi lau nhà & nước tẩy rửa", payee: "Cửa hàng tạp hóa Cô Ba" }
];

/**
 * InvoiceManagement Component
 * Displays Customer Payment History and Operational Expenses (gas, electricity, water, internet, taxes, maintenance, etc.)
 * Support full detail modal views for both customer receipts and operational expense vouchers.
 */
export const InvoiceManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>("history");
  const [loading, setLoading] = useState<boolean>(true);
  const [payments, setPayments] = useState<PaymentHistoryRecord[]>([]);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [timeRange, setTimeRange] = useState<string>("all");

  const getVietnamDateString = (dateVal: Date = new Date()): string => {
    const formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    });
    const parts = formatter.formatToParts(dateVal);
    const yyyy = parts.find(p => p.type === 'year')?.value;
    const mm = parts.find(p => p.type === 'month')?.value;
    const dd = parts.find(p => p.type === 'day')?.value;
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleTimeRangeChange = (range: string) => {
    setTimeRange(range);
    const now = new Date();
    const todayStr = getVietnamDateString(now);
    
    if (range === "all") {
      setDateFrom("");
      setDateTo("");
    } else if (range === "today") {
      setDateFrom(todayStr);
      setDateTo(todayStr);
    } else if (range === "week") {
      const weekAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000);
      setDateFrom(getVietnamDateString(weekAgo));
      setDateTo(todayStr);
    } else if (range === "month") {
      const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
      setDateFrom(getVietnamDateString(monthAgo));
      setDateTo(todayStr);
    } else if (range === "year") {
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      setDateFrom(getVietnamDateString(yearAgo));
      setDateTo(todayStr);
    }
  };

  const handleDateFromChange = (val: string) => {
    setDateFrom(val);
    setTimeRange("custom");
  };

  const handleDateToChange = (val: string) => {
    setDateTo(val);
    setTimeRange("custom");
  };

  // Expenses management state
  const [expenses, setExpenses] = useState<OperationalExpense[]>([]);
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [expenseForm, setExpenseForm] = useState({
    category: "Điện" as OperationalExpense["category"],
    amount: "",
    date: new Date().toISOString().split("T")[0],
    note: "",
    payee: ""
  });

  // Modals & Action States
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(false);
  const [selectedRefundInvoice, setSelectedRefundInvoice] = useState<Invoice | null>(null);
  const [isRefundOpen, setIsRefundOpen] = useState<boolean>(false);
  const [printingId, setPrintingId] = useState<string | null>(null);

  // Expense detail modal state
  const [selectedExpense, setSelectedExpense] = useState<OperationalExpense | null>(null);
  const [isExpenseDetailsOpen, setIsExpenseDetailsOpen] = useState<boolean>(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const ITEMS_PER_PAGE = 9;

  // Load restaurant metadata and local expenses
  useEffect(() => {
    getRestaurantInfo()
      .then(setRestaurantInfo)
      .catch((err) => console.error("Failed to load restaurant info", err));

    const stored = localStorage.getItem("resmanager_cash_expenses");
    if (stored) {
      try {
        setExpenses(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse expenses, reset to mock", e);
        localStorage.setItem("resmanager_cash_expenses", JSON.stringify(MOCK_EXPENSES));
        setExpenses(MOCK_EXPENSES);
      }
    } else {
      localStorage.setItem("resmanager_cash_expenses", JSON.stringify(MOCK_EXPENSES));
      setExpenses(MOCK_EXPENSES);
    }
  }, []);

  // Prevent background scrolling when a modal is open
  useEffect(() => {
    const isAnyModalOpen = isDetailsOpen || isExpenseDetailsOpen || isExpenseModalOpen || isRefundOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDetailsOpen, isExpenseDetailsOpen, isExpenseModalOpen, isRefundOpen]);



  // Fetch payment history
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPaymentHistoryApi({
        search: searchTerm || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        paymentMethod: methodFilter !== "all" ? methodFilter : undefined
      });
      setPayments(data as unknown as PaymentHistoryRecord[]);
    } catch (error) {
      console.error("Failed to load payment history data:", error);
      toast.error("Không thể tải danh sách lịch sử thanh toán");
    } finally {
      setLoading(false);
    }
  }, [searchTerm, dateFrom, dateTo, methodFilter]);

  useEffect(() => {
    loadData();
    setCurrentPage(1);
  }, [loadData, activeTab]);

  // Keep a reference to the latest loadData function to avoid reconnecting socket when filters change
  const loadDataRef = useRef(loadData);
  useEffect(() => {
    loadDataRef.current = loadData;
  }, [loadData]);

  // Listen to real-time socket events for cashier payment updates
  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"],
      withCredentials: true
    });

    socket.on("connect", () => {
      console.log("InvoiceManagement connected to real-time socket updates");
    });

    socket.on("order_updated", () => {
      loadDataRef.current();
    });

    socket.on("invoice_refunded", () => {
      loadDataRef.current();
    });

    socket.on("table_updated", () => {
      loadDataRef.current();
    });

    return () => {
      socket.off("connect");
      socket.off("order_updated");
      socket.off("invoice_refunded");
      socket.off("table_updated");
      socket.disconnect();
    };
  }, []);


  // Clean filters when switching tabs
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchTerm("");
    setDateFrom("");
    setDateTo("");
    setMethodFilter("all");
    setTimeRange("all");
  };

  // Actions
  const handlePrint = async (invoiceId: string) => {
    try {
      setPrintingId(invoiceId);
      const invoice = await getInvoiceByIdApi(invoiceId);
      printCashierInvoice(invoice, restaurantInfo?.name, restaurantInfo);
      toast.success("Đang tiến hành in hóa đơn...");
    } catch (error) {
      console.error("Print error:", error);
      toast.error("Không thể tải chi tiết hóa đơn để in");
    } finally {
      setPrintingId(null);
    }
  };

  const handleOpenRefund = async (invoiceId: string) => {
    try {
      const inv = await getInvoiceByIdApi(invoiceId);
      setSelectedRefundInvoice(inv);
      setIsRefundOpen(true);
    } catch (error) {
      console.error("Failed to load invoice for refund:", error);
      toast.error("Không thể tải thông tin chi tiết hóa đơn để hoàn tiền");
    }
  };

  const handleOpenDetails = async (invoiceId: string) => {
    try {
      const inv = await getInvoiceByIdApi(invoiceId);
      setSelectedInvoice(inv);
      setIsDetailsOpen(true);
    } catch (error) {
      console.error("Details loading error:", error);
      toast.error("Không thể tải thông tin chi tiết hóa đơn");
    }
  };

  const handleOpenExpenseDetails = (expense: OperationalExpense) => {
    setSelectedExpense(expense);
    setIsExpenseDetailsOpen(true);
  };

  // Date filtering logic
  const isWithinDateRange = (itemDateStr: string) => {
    if (!itemDateStr) return true;
    const dateObj = new Date(itemDateStr);
    if (dateFrom && new Date(dateFrom) > dateObj) return false;
    if (dateTo) {
      const endLimit = new Date(dateTo);
      endLimit.setHours(23, 59, 59, 999);
      if (dateObj > endLimit) return false;
    }
    return true;
  };

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      // Date filter
      if (!isWithinDateRange(e.date)) return false;
      // Search filter
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        return (
          e.category.toLowerCase().includes(query) ||
          e.id.toLowerCase().includes(query) ||
          (e.payee || "").toLowerCase().includes(query) ||
          (e.note || "").toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [expenses, searchTerm, dateFrom, dateTo]);

  // Statistics calculation for Top Cards
  const stats = useMemo(() => {
    if (activeTab === "history") {
      const completedList = payments.filter((p) => p.status === "completed");
      const totalRev = completedList.reduce((sum, p) => sum + Number(p.amount), 0);
      const totalRefund = completedList.filter((p) => p.has_refund).reduce((sum, p) => sum + Number(p.refunded_total || 0), 0);
      const transferRev = completedList.filter((p) => p.paymentMethod !== "cash").reduce((sum, p) => sum + Number(p.amount), 0);
      const cashRev = completedList.filter((p) => p.paymentMethod === "cash").reduce((sum, p) => sum + Number(p.amount), 0);

      return {
        count: completedList.length,
        total: totalRev,
        card1Label: "Giao dịch thành công",
        card1Value: String(completedList.length),
        card2Label: "Doanh thu Chuyển khoản",
        card2Value: formatCurrency(transferRev),
        card3Label: "Doanh thu Tiền mặt",
        card3Value: formatCurrency(cashRev),
        card4Label: "Tiền mặt Thực thu (Két)",
        card4Value: formatCurrency(cashRev - totalRefund),
      };
    } else {
      const totalExp = filteredExpenses.reduce((sum, e) => sum + Number(e.amount), 0);
      const electWater = filteredExpenses.filter((e) => e.category === "Điện" || e.category === "Nước").reduce((sum, e) => sum + Number(e.amount), 0);
      const gasInternet = filteredExpenses.filter((e) => e.category === "Gas" || e.category === "Internet").reduce((sum, e) => sum + Number(e.amount), 0);
      const others = totalExp - electWater - gasInternet;

      return {
        count: filteredExpenses.length,
        total: totalExp,
        card1Label: "Tổng hóa đơn chi",
        card1Value: String(filteredExpenses.length),
        card2Label: "Tổng chi phí vận hành",
        card2Value: formatCurrency(totalExp),
        card3Label: "Chi phí Điện & Nước",
        card3Value: formatCurrency(electWater),
        card4Label: "Chi phí khác (Gas, Net, Thuế...)",
        card4Value: formatCurrency(gasInternet + others),
      };
    }
  }, [activeTab, payments, filteredExpenses]);

  // Paginated Data
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    if (activeTab === "expenses") {
      return filteredExpenses.slice(start, start + ITEMS_PER_PAGE);
    }
    return payments.slice(start, start + ITEMS_PER_PAGE);
  }, [activeTab, payments, filteredExpenses, currentPage]);

  const totalPages = Math.ceil(
    (activeTab === "expenses" ? filteredExpenses.length : payments.length) / ITEMS_PER_PAGE
  );

  const formatDateTime = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric"
    });
  };

  // CRUD Operational Expenses
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = Number(expenseForm.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Số tiền chi phí phải lớn hơn 0");
      return;
    }
    if (!expenseForm.date) {
      toast.error("Ngày chi phí không được để trống");
      return;
    }

    const newExpense: OperationalExpense = {
      id: `EXP-${Date.now().toString().slice(-6)}`,
      category: expenseForm.category,
      amount: amountVal,
      date: expenseForm.date,
      note: expenseForm.note.trim() || undefined,
      payee: expenseForm.payee.trim() || "Đơn vị cung cấp lẻ"
    };

    const newExpenses = [newExpense, ...expenses];
    setExpenses(newExpenses);
    localStorage.setItem("resmanager_cash_expenses", JSON.stringify(newExpenses));

    toast.success("Thêm hóa đơn chi phí thành công!");
    setIsExpenseModalOpen(false);
    setExpenseForm({
      category: "Điện",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      note: "",
      payee: ""
    });
  };

  const handleDeleteExpense = (id: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hóa đơn chi phí này?")) return;
    const newExpenses = expenses.filter((e) => e.id !== id);
    setExpenses(newExpenses);
    localStorage.setItem("resmanager_cash_expenses", JSON.stringify(newExpenses));
    toast.success("Xóa hóa đơn chi phí thành công!");
  };

  return (
    <div className="space-y-4 font-sans text-[#1A1A1A]">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-[#FFFFFF] p-5 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            Quản Lý Hóa Đơn & Giao Dịch
          </h1>
          <p className="text-xs font-semibold text-[#8A8A8A] mt-0.5">
            Xem lịch sử thanh toán của khách hàng và hóa đơn chi phí vận hành (điện, nước, gas, internet, thuế, bảo trì).
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === "expenses" && (
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-5 py-2.5 bg-[#3E2016] hover:bg-[#5C2E17] text-[#FFFFFF] text-xs font-black rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus size={16} /> Thêm chi phí
            </button>
          )}
          <button
            onClick={loadData}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full transition-all border border-slate-200 cursor-pointer active:scale-95"
          >
            Làm mới
          </button>
        </div>
      </div>

      {/* Stats Summary Panel */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#FFFFFF] rounded-2xl border border-slate-200/70 p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#8A8A8A] tracking-wider">{stats.card1Label}</p>
          <p className="text-xl font-black text-[#3E2016] font-display mt-1">{stats.card1Value}</p>
        </div>
        <div className="bg-[#FFFFFF] rounded-2xl border border-slate-200/70 p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#8A8A8A] tracking-wider">{stats.card2Label}</p>
          <p className="text-xl font-black text-emerald-600 font-display mt-1">{stats.card2Value}</p>
        </div>
        <div className="bg-[#FFFFFF] rounded-2xl border border-slate-200/70 p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#8A8A8A] tracking-wider">{stats.card3Label}</p>
          <p className="text-xl font-black text-blue-600 font-display mt-1">{stats.card3Value}</p>
        </div>
        <div className="bg-[#FFFFFF] rounded-2xl border border-slate-200/70 p-4 shadow-xs">
          <p className="text-[10px] font-bold uppercase text-[#8A8A8A] tracking-wider">{stats.card4Label}</p>
          <p className="text-xl font-black text-amber-600 font-display mt-1">{stats.card4Value}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-[#FFFFFF] p-3 rounded-3xl border border-slate-200/70 shadow-xs flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => handleTabChange("history")}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "history"
              ? "bg-[#3E2016] text-[#FFFFFF] shadow-xs"
              : "bg-slate-100 text-[#8A8A8A] hover:text-[#1A1A1A]"
          }`}
        >
          <Receipt size={15} />
          Hóa đơn khách hàng
        </button>

        <button
          type="button"
          onClick={() => handleTabChange("expenses")}
          className={`flex-1 sm:flex-initial px-5 py-2 rounded-full text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "expenses"
              ? "bg-[#3E2016] text-[#FFFFFF] shadow-xs"
              : "bg-slate-100 text-[#8A8A8A] hover:text-[#1A1A1A]"
          }`}
        >
          <Coins size={15} />
          Hóa đơn chi phí khác (Điện, nước, gas...)
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="bg-[#FFFFFF] p-4 rounded-3xl border border-slate-200/70 shadow-xs flex flex-col lg:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8A8A8A]" size={17} />
          <input
            placeholder={
              activeTab === "history"
                ? "Tìm theo Mã đơn, tên bàn, tên khách..."
                : "Tìm theo Mã chi phí, hạng mục, đơn vị cung cấp..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2 bg-[#F8F6F2] rounded-full text-xs font-bold text-[#1A1A1A] placeholder-[#8A8A8A] focus:outline-none focus:ring-2 focus:ring-[#3E2016]/30 transition-all border-0"
          />
        </div>

        {/* Date Filter */}
        <div className="flex flex-wrap sm:flex-nowrap gap-2 items-center">
          <select
            value={timeRange}
            onChange={(e) => handleTimeRangeChange(e.target.value)}
            className="bg-[#F8F6F2] rounded-full px-4 py-1.5 border border-slate-200/30 text-xs font-bold text-[#1A1A1A] outline-none"
          >
            <option value="all">Tất cả thời gian</option>
            <option value="today">Hôm nay</option>
            <option value="week">7 ngày qua</option>
            <option value="month">1 tháng qua</option>
            <option value="year">1 năm qua</option>
            <option value="custom">Tự chọn ngày...</option>
          </select>

          {timeRange === "custom" && (
            <div className="flex items-center gap-1.5 animate-fade-in">
              <div className="flex items-center gap-1.5 bg-[#F8F6F2] rounded-full px-3 py-1 border border-slate-200/30">
                <span className="text-[10px] font-bold text-[#8A8A8A]">Từ</span>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => handleDateFromChange(e.target.value)}
                  className="bg-transparent border-0 outline-none text-xs font-bold text-[#1A1A1A] focus:ring-0 p-0.5"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-[#F8F6F2] rounded-full px-3 py-1 border border-slate-200/30">
                <span className="text-[10px] font-bold text-[#8A8A8A]">Đến</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => handleDateToChange(e.target.value)}
                  className="bg-transparent border-0 outline-none text-xs font-bold text-[#1A1A1A] focus:ring-0 p-0.5"
                />
              </div>
            </div>
          )}

          {/* Payment Method filter - history only */}
          {activeTab === "history" && (
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="bg-[#F8F6F2] rounded-full px-4 py-1.5 border border-slate-200/30 text-xs font-bold text-[#1A1A1A] outline-none"
            >
              <option value="all">Tất cả hình thức</option>
              <option value="cash">Tiền mặt</option>
              <option value="transfer">Chuyển khoản</option>
              <option value="card">Thẻ tín dụng</option>
              <option value="wallet">Ví điện tử</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden">
        {loading ? (
          <div className="h-64 flex flex-col justify-center items-center gap-2">
            <div className="w-8 h-8 border-2 border-[#3E2016] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500">Đang tải dữ liệu...</span>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="h-64 flex flex-col justify-center items-center gap-2 text-slate-400">
            <Receipt size={40} strokeWidth={1} />
            <span className="text-xs font-bold">Không tìm thấy dữ liệu hóa đơn</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {activeTab === "history" ? (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#F8F6F2] font-bold text-slate-600 border-b border-slate-200 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Mã Hóa Đơn</th>
                    <th className="px-6 py-4">Bàn / Khu Vực</th>
                    <th className="px-6 py-4">Tổng Tiền</th>
                    <th className="px-6 py-4">Trạng thái</th>
                    <th className="px-6 py-4">PHƯƠNG THỨC THANH TOÁN</th>
                    <th className="px-6 py-4">Thời gian thanh toán</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {(paginatedData as PaymentHistoryRecord[]).map((p) => {
                    const method = METHOD_LABELS[p.paymentMethod] || {
                      label: p.paymentMethod || "Khác",
                      icon: <Coins size={14} />,
                      color: "text-slate-600 bg-slate-50 border-slate-200"
                    };
                    const isRefunded = p.status === "refunded" || p.has_refund;
                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4 font-mono font-bold text-slate-800">
                          {p.order_code || (p.orderId ? `#${String(p.orderId).slice(-8).toUpperCase()}` : `#${String(p.id).slice(-8).toUpperCase()}`)}
                        </td>
                        <td className="px-6 py-4">{p.table_name || "Khách lẻ"}</td>
                        <td className="px-6 py-4">
                          <span className="font-bold text-slate-800">{formatCurrency(p.amount)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                            Đã thanh toán
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${method.color}`}>
                            {method.icon}
                            {method.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500">
                          {formatDateTime(p.completedAt || p.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenDetails(p.orderId)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors"
                            title="Chi tiết"
                          >
                            <Info size={14} />
                          </button>
                          <button
                            onClick={() => handlePrint(p.orderId)}
                            disabled={printingId === p.orderId}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg cursor-pointer transition-colors"
                            title="In hóa đơn"
                          >
                            <Printer size={14} className={printingId === p.orderId ? "animate-pulse" : ""} />
                          </button>
                          {p.status === "completed" && (
                            <button
                              onClick={() => handleOpenRefund(p.orderId)}
                              className={`p-1.5 rounded-lg cursor-pointer transition-colors ${
                                isRefunded
                                  ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                                  : "bg-red-50 hover:bg-red-100 text-red-600"
                              }`}
                              title="Hoàn tiền món ăn"
                            >
                              <RotateCcw size={14} />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#F8F6F2] font-bold text-slate-600 border-b border-slate-200 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-4">Mã Chi Phí</th>
                    <th className="px-6 py-4">Hạng mục chi phí</th>
                    <th className="px-6 py-4">Đơn vị nhận (Đối tác)</th>
                    <th className="px-6 py-4">Số Tiền</th>
                    <th className="px-6 py-4">Ngày Chi</th>
                    <th className="px-6 py-4">Ghi Chú</th>
                    <th className="px-6 py-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {(paginatedData as OperationalExpense[]).map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-500">#{e.id}</td>
                      <td className="px-6 py-4">
                        <span className="bg-[#F8F6F2] px-2.5 py-1 rounded-full border border-slate-200/50 font-bold text-slate-700">
                          {e.category}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-bold">{e.payee || "Đơn vị cung cấp lẻ"}</td>
                      <td className="px-6 py-4 font-bold text-red-600">{formatCurrency(e.amount)}</td>
                      <td className="px-6 py-4 text-slate-500">{new Date(e.date).toLocaleDateString("vi-VN")}</td>
                      <td className="px-6 py-4 text-slate-500 max-w-[200px] truncate" title={e.note}>{e.note || "—"}</td>
                      <td className="px-6 py-4 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenExpenseDetails(e)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors"
                          title="Xem chi tiết phiếu chi"
                        >
                          <Info size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteExpense(e.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg cursor-pointer transition-colors"
                          title="Xóa chi phí"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4 bg-slate-50/50">
            <span className="text-xs text-slate-500">
              Trang {currentPage} / {totalPages}
            </span>
            <div className="flex gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Trước
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3.5 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Details Modal */}
      {isDetailsOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in font-mono text-xs text-slate-700">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 font-sans bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Receipt className="text-[#3E2016]" size={20} />
                <h3 className="text-base font-bold text-slate-800">Chi tiết hóa đơn</h3>
              </div>
              <button
                onClick={() => setIsDetailsOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Receipt Content */}
            <div className="p-6 max-h-[70vh] overflow-y-auto space-y-4">
              <div className="text-center">
                <p className="font-sans font-black text-sm tracking-wider text-slate-800">
                  {restaurantInfo?.name || "NHÀ HÀNG RESMANAGER"}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  Địa chỉ: {restaurantInfo?.address || "123 Nguyễn Huệ, Quận 1, TP.HCM"}
                </p>
                <p className="text-[10px] text-gray-400">Hotline: {restaurantInfo?.hotline || "028 3829 4000"}</p>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mã hóa đơn:</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.order_code || `#${selectedInvoice.id}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Bàn:</span>
                  <span className="font-bold text-slate-800">{selectedInvoice.tableName || "Khách lẻ"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Khách hàng:</span>
                  <span className="font-bold text-slate-800">
                    {selectedInvoice.customerName || "Khách vãng lai"}
                  </span>
                </div>
                {selectedInvoice.customerPhone && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Số điện thoại:</span>
                    <span>{selectedInvoice.customerPhone}</span>
                  </div>
                )}
                {selectedInvoice.staffName && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Nhân viên phục vụ:</span>
                    <span>{selectedInvoice.staffName}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1"><Clock size={10} /> Thời gian:</span>
                  <span>{formatDateTime(selectedInvoice.createdAt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Trạng thái:</span>
                  <span
                    className={`font-bold px-1.5 py-0.5 rounded text-[10px] ${
                      selectedInvoice.invoiceStatus === "paid" ||
                      selectedInvoice.status === "paid" ||
                      selectedInvoice.status === "completed" ||
                      activeTab === "history"
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : selectedInvoice.invoiceStatus === "cancelled" ||
                          selectedInvoice.status === "cancelled"
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : "bg-amber-50 text-amber-700 border border-amber-200"
                    }`}
                  >
                    {selectedInvoice.invoiceStatus === "paid" ||
                    selectedInvoice.status === "paid" ||
                    selectedInvoice.status === "completed" ||
                    activeTab === "history"
                      ? "Đã thanh toán"
                      : selectedInvoice.invoiceStatus === "cancelled" ||
                        selectedInvoice.status === "cancelled"
                      ? "Đã hủy"
                      : "Chưa thanh toán"}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              {/* Items List */}
              <div className="space-y-3">
                <p className="font-bold text-slate-800 text-[11px] font-sans">DANH SÁCH MÓN ĂN</p>
                <div className="space-y-2">
                  {selectedInvoice.items.map((item, idx) => {
                    const isItemRefunded = Boolean(item.is_refunded);
                    const qty = Number(item.quantity || 1);
                    const price = Number(item.price || 0);
                    const total = qty * price;
                    return (
                      <div key={item.id || idx} className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className={`font-bold ${isItemRefunded ? "line-through text-red-500" : "text-slate-800"}`}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {qty} x {formatCurrency(price)}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`font-bold ${isItemRefunded ? "line-through text-red-500" : "text-slate-700"}`}>
                            {formatCurrency(total)}
                          </span>
                          {isItemRefunded && (
                            <span className="block text-[8px] bg-red-50 text-red-600 px-1 py-0.5 rounded font-sans mt-0.5 font-bold">
                              Đã hoàn tiền
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              {/* Totals Breakdown */}
              <div className="space-y-1.5">
                <div className="flex justify-between">
                  <span>Tạm tính:</span>
                  <span>{formatCurrency(selectedInvoice.subtotal ?? selectedInvoice.totalAmount)}</span>
                </div>
                {selectedInvoice.tax ? (
                  <div className="flex justify-between">
                    <span>Thuế VAT ({selectedInvoice.vatRate || 10}%):</span>
                    <span>+{formatCurrency(selectedInvoice.tax)}</span>
                  </div>
                ) : null}
                {selectedInvoice.discount ? (
                  <div className="flex justify-between text-red-600">
                    <span>Khuyến mãi/Giảm giá:</span>
                    <span>-{formatCurrency(selectedInvoice.discount)}</span>
                  </div>
                ) : null}
                {selectedInvoice.depositAmount ? (
                  <div className="flex justify-between text-blue-600">
                    <span>Tiền cọc trước:</span>
                    <span>-{formatCurrency(selectedInvoice.depositAmount)}</span>
                  </div>
                ) : null}
                <div className="border-t border-slate-200 my-1 pt-1.5 flex justify-between font-black text-sm text-slate-800">
                  <span>TỔNG THANH TOÁN:</span>
                  <span className="text-emerald-600">
                    {formatCurrency(selectedInvoice.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 font-sans">
              <button
                type="button"
                onClick={() => setIsDetailsOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsDetailsOpen(false);
                  handlePrint(selectedInvoice.id);
                }}
                className="flex items-center gap-2 rounded-lg bg-[#3E2016] px-5 py-2 text-xs font-bold text-white hover:bg-[#5C2E17] transition-colors shadow-md cursor-pointer"
              >
                <Printer size={14} />
                In hóa đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Expense Details Modal (Phiếu Chi) */}
      {isExpenseDetailsOpen && selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in font-mono text-xs text-slate-700">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 font-sans bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Receipt className="text-amber-600" size={20} />
                <h3 className="text-base font-bold text-slate-800">Chi tiết phiếu chi chi phí</h3>
              </div>
              <button
                onClick={() => setIsExpenseDetailsOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Voucher Receipt Content */}
            <div className="p-6 space-y-4">
              <div className="text-center">
                <p className="font-sans font-black text-sm tracking-wider text-slate-800">
                  {restaurantInfo?.name || "NHÀ HÀNG RESMANAGER"}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">ĐƠN VỊ KINH DOANH F&B</p>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              <div className="text-center font-bold text-sm text-slate-800 uppercase tracking-widest my-2">
                PHIẾU CHI CHI PHÍ
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mã phiếu chi:</span>
                  <span className="font-bold text-slate-800">#{selectedExpense.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hạng mục chi phí:</span>
                  <span className="font-bold text-slate-800 bg-[#F8F6F2] px-2 py-0.5 rounded border border-slate-200/50">
                    {selectedExpense.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Chuyển cho ai (Đối tác):</span>
                  <span className="font-bold text-slate-900">{selectedExpense.payee || "Đơn vị cung cấp lẻ"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1"><Clock size={10} /> Ngày chi phí:</span>
                  <span>{new Date(selectedExpense.date).toLocaleDateString("vi-VN")}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ghi chú lý do chi:</span>
                  <span className="text-slate-700 text-right max-w-[220px]">{selectedExpense.note || "—"}</span>
                </div>

                <div className="border-t border-slate-200 my-2 pt-2 flex justify-between font-black text-sm text-slate-800">
                  <span>SỐ TIỀN CHI:</span>
                  <span className="text-red-600 font-black">
                    {formatCurrency(selectedExpense.amount)}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              {/* Mock Voucher signatures */}
              <div className="grid grid-cols-2 text-center text-[10px] font-sans font-bold pt-2 gap-4">
                <div>
                  <p className="text-slate-500">Người lập phiếu</p>
                  <div className="h-10" />
                  <p className="text-slate-800">Quản lý</p>
                </div>
                <div>
                  <p className="text-slate-500">Người nhận tiền</p>
                  <div className="h-10" />
                  <p className="text-slate-800">{selectedExpense.payee ? selectedExpense.payee.slice(0, 15) + (selectedExpense.payee.length > 15 ? "..." : "") : "Đại diện nhận"}</p>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4 font-sans">
              <button
                type="button"
                onClick={() => setIsExpenseDetailsOpen(false)}
                className="rounded-lg bg-[#3E2016] px-5 py-2 text-xs font-bold text-white hover:bg-[#5C2E17] transition-colors shadow-md cursor-pointer"
              >
                Đóng phiếu chi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {isRefundOpen && selectedRefundInvoice && (
        <RefundModal
          isOpen={isRefundOpen}
          onClose={() => setIsRefundOpen(false)}
          invoice={selectedRefundInvoice}
          onSuccess={() => {
            loadData();
            setIsRefundOpen(false);
          }}
        />
      )}

      {/* Add Operational Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in font-sans">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-sky-50 bg-sky-50/50 px-6 py-4">
              <div className="flex items-center gap-2">
                <Coins className="text-amber-600" size={20} />
                <h3 className="text-base font-bold text-slate-700">Thêm hóa đơn chi phí</h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200/60 hover:text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleAddExpense} className="p-6 space-y-4 text-xs font-semibold text-slate-600">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Hạng mục chi phí:</label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm({ ...expenseForm, category: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:border-amber-400 focus:bg-white transition-all text-xs"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Người nhận / Đơn vị cung cấp (Chuyển cho ai):</label>
                <input
                  type="text"
                  placeholder="Nhập tên người nhận hoặc đơn vị cung cấp..."
                  value={expenseForm.payee}
                  onChange={(e) => setExpenseForm({ ...expenseForm, payee: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:border-amber-400 focus:bg-white transition-all text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Số tiền chi phí (VNĐ):</label>
                <input
                  type="number"
                  placeholder="Nhập số tiền..."
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm({ ...expenseForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:border-amber-400 focus:bg-white transition-all text-xs"
                  required
                  min={1}
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Ngày chi phí:</label>
                <input
                  type="date"
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm({ ...expenseForm, date: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:border-amber-400 focus:bg-white transition-all text-xs"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Ghi chú chi tiết lý do chi:</label>
                <textarea
                  placeholder="Nhập ghi chú chi tiết chi phí..."
                  value={expenseForm.note}
                  onChange={(e) => setExpenseForm({ ...expenseForm, note: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:border-amber-400 focus:bg-white transition-all text-xs h-20 resize-none"
                />
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#3E2016] px-5 py-2 text-xs font-bold text-white hover:bg-[#5C2E17] transition-colors shadow-md cursor-pointer active:scale-95"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
