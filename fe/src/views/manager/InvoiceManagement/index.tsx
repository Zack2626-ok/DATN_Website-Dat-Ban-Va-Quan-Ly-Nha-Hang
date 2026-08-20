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
  Plus,
  AlertTriangle,
  History,
  FileSpreadsheet,
  DownloadCloud,
  RefreshCw,
  Edit
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "react-hot-toast";
import {
  getInvoiceByIdApi,
  getPaymentHistoryApi
} from "../../../services/invoiceService";
import { getRestaurantInfo, type RestaurantInfo } from "../../../services/restaurantInfoService";
import { printCashierInvoice, printExpenseInvoice } from "../../../utils/printBill";
import { RefundModal } from "../../cashier/payment/components/RefundModal";
import { formatCurrency } from "../../../utils/formatCurrency";
import { io } from "socket.io-client";
import type { Invoice } from "../../../interfaces/invoice";
import { getSuppliersApi } from "../../../services/api";

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

const formatForDatetimeLocal = (dateVal: Date): string => {
  const pad = (num: number) => String(num).padStart(2, "0");
  return `${dateVal.getFullYear()}-${pad(dateVal.getMonth() + 1)}-${pad(dateVal.getDate())}T${pad(dateVal.getHours())}:${pad(dateVal.getMinutes())}`;
};

const MOCK_EXPENSES: OperationalExpense[] = [
  // Tháng 8/2026
  { id: "EXP-08-01", category: "Gas", amount: 1500000, date: "2026-08-08T14:30:00", note: "Thay bình Gas nấu bếp chính", payee: "Đại lý Gas Bình Minh HCM" },
  { id: "EXP-08-02", category: "Điện", amount: 4500000, date: "2026-08-05T09:15:00", note: "Tiền điện kỳ tháng 08/2026", payee: "Tổng Công ty Điện lực miền Nam (EVN)" },
  { id: "EXP-08-03", category: "Nước", amount: 850000, date: "2026-08-03T11:45:00", note: "Tiền nước kỳ tháng 08/2026", payee: "Công ty Cổ phần Cấp nước Chợ Lớn" },
  { id: "EXP-08-04", category: "Internet", amount: 350000, date: "2026-08-01T08:00:00", note: "Cước mạng Viettel tháng 08/2026", payee: "Chi nhánh Tập đoàn Viễn thông Viettel" },

  // Tháng 7/2026
  { id: "EXP-07-01", category: "Gas", amount: 1600000, date: "2026-07-10T15:20:00", note: "Thay bình Gas nấu bếp phụ", payee: "Đại lý Gas Bình Minh HCM" },
  { id: "EXP-07-02", category: "Điện", amount: 4200000, date: "2026-07-05T10:00:00", note: "Tiền điện kỳ tháng 07/2026", payee: "Tổng Công ty Điện lực miền Nam (EVN)" },
  { id: "EXP-07-03", category: "Nước", amount: 780000, date: "2026-07-03T14:10:00", note: "Tiền nước kỳ tháng 07/2026", payee: "Công ty Cổ phần Cấp nước Chợ Lớn" },
  { id: "EXP-07-04", category: "Internet", amount: 350000, date: "2026-07-01T09:30:00", note: "Cước mạng Viettel tháng 07/2026", payee: "Chi nhánh Tập đoàn Viễn thông Viettel" },
  { id: "EXP-07-05", category: "Tiền Thuế", amount: 5000000, date: "2026-07-15T08:30:00", note: "Thuế môn bài / thuế tháng 07/2026", payee: "Chi cục Thuế Quận 1" },
  { id: "EXP-07-06", category: "Bảo Trì", amount: 2200000, date: "2026-07-19T16:00:00", note: "Bảo trì máy hút mùi & điều hòa bếp", payee: "Công ty Cơ điện lạnh Việt Nam (REE)" },

  // Tháng 6/2026
  { id: "EXP-06-01", category: "Gas", amount: 1550000, date: "2026-06-12T14:45:00", note: "Thay bình Gas nấu bếp", payee: "Đại lý Gas Bình Minh HCM" },
  { id: "EXP-06-02", category: "Điện", amount: 4800000, date: "2026-06-05T11:00:00", note: "Tiền điện kỳ tháng 06/2026", payee: "Tổng Công ty Điện lực miền Nam (EVN)" },
  { id: "EXP-06-03", category: "Nước", amount: 920000, date: "2026-06-03T10:30:00", note: "Tiền nước kỳ tháng 06/2026", payee: "Công ty Cổ phần Cấp nước Chợ Lớn" },
  { id: "EXP-06-04", category: "Internet", amount: 350000, date: "2026-06-01T09:00:00", note: "Cước mạng Viettel tháng 06/2026", payee: "Chi nhánh Tập đoàn Viễn thông Viettel" },

  // Tháng 5/2026
  { id: "EXP-05-01", category: "Gas", amount: 1450000, date: "2026-05-08T15:00:00", note: "Thay bình Gas nấu bếp", payee: "Đại lý Gas Bình Minh HCM" },
  { id: "EXP-05-02", category: "Điện", amount: 3900000, date: "2026-05-05T10:15:00", note: "Tiền điện kỳ tháng 05/2026", payee: "Tổng Công ty Điện lực miền Nam (EVN)" },
  { id: "EXP-05-03", category: "Nước", amount: 710000, date: "2026-05-03T11:30:00", note: "Tiền nước kỳ tháng 05/2026", payee: "Công ty Cổ phần Cấp nước Chợ Lớn" },
  { id: "EXP-05-04", category: "Internet", amount: 350000, date: "2026-05-01T08:30:00", note: "Cước mạng Viettel tháng 05/2026", payee: "Chi nhánh Tập đoàn Viễn thông Viettel" },
  { id: "EXP-05-05", category: "Bảo Trì", amount: 1800000, date: "2026-05-20T14:00:00", note: "Sửa chữa hệ thống thoát nước bếp", payee: "Công ty Cơ điện lạnh Việt Nam (REE)" },
  { id: "EXP-05-06", category: "Khác", amount: 500000, date: "2026-05-15T16:30:00", note: "Mua dụng cụ dọn dẹp vệ sinh", payee: "Cửa hàng tạp hóa Cô Ba" }
];

const DEFAULT_UTILITY_PROVIDERS = [
  "Tổng Công ty Điện lực miền Nam (EVN)",
  "Công ty Cổ phần Cấp nước Chợ Lớn",
  "Đại lý Gas Bình Minh HCM",
  "Chi nhánh Tập đoàn Viễn thông Viettel",
  "Chi cục Thuế Quận 1",
  "Công ty Cơ điện lạnh Việt Nam (REE)",
  "Cửa hàng tạp hóa Cô Ba"
];

const CATEGORY_DEFAULT_PAYEES: Record<string, string> = {
  "Điện": "Tổng Công ty Điện lực miền Nam (EVN)",
  "Nước": "Công ty Cổ phần Cấp nước Chợ Lớn",
  "Gas": "Đại lý Gas Bình Minh HCM",
  "Internet": "Chi nhánh Tập đoàn Viễn thông Viettel",
  "Tiền Thuế": "Chi cục Thuế Quận 1",
  "Bảo Trì": "Công ty Cơ điện lạnh Việt Nam (REE)",
  "Khác": "Cửa hàng tạp hóa Cô Ba"
};

const formatNumberWithDots = (val: string | number): string => {
  const num = String(val).replace(/\D/g, "");
  if (!num) return "";
  return Number(num).toLocaleString("vi-VN");
};

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

  // Suppliers states for Add Expense
  const [dbSuppliers, setDbSuppliers] = useState<any[]>([]);
  const [payeeSelectOption, setPayeeSelectOption] = useState<string>("Tổng Công ty Điện lực miền Nam (EVN)");
  const [customPayeeText, setCustomPayeeText] = useState<string>("");
  const [calcBreakdownType, setCalcBreakdownType] = useState<"total" | "electWater" | "others" | null>(null);

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
      const [year, month] = todayStr.split("-");
      const startOfMonthStr = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endOfMonthStr = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
      setDateFrom(startOfMonthStr);
      setDateTo(endOfMonthStr);
    } else if (range === "year") {
      const yearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      setDateFrom(getVietnamDateString(yearAgo));
      setDateTo(todayStr);
    } else if (range.includes("-") && range.length === 7) {
      const [year, month] = range.split("-");
      const startOfMonthStr = `${year}-${month}-01`;
      const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
      const endOfMonthStr = `${year}-${month}-${String(lastDay).padStart(2, "0")}`;
      setDateFrom(startOfMonthStr);
      setDateTo(endOfMonthStr);
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
    id: "",
    category: "Điện" as OperationalExpense["category"],
    amount: "",
    date: "",
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

  // Confirmation and History states for delete expense
  const [expenseToDelete, setExpenseToDelete] = useState<OperationalExpense | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState<boolean>(false);
  const [deleteConfirmStep, setDeleteConfirmStep] = useState<number>(1);
  const [deleteReason, setDeleteReason] = useState<string>("");
  const [selectedDeletedLog, setSelectedDeletedLog] = useState<any>(null);
  const [isDeletedDetailOpen, setIsDeletedDetailOpen] = useState<boolean>(false);
  const expenseExcelInputRef = useRef<HTMLInputElement>(null);
  const [isDeleteHistoryOpen, setIsDeleteHistoryOpen] = useState<boolean>(false);
  const [deleteHistory, setDeleteHistory] = useState<any[]>([]);

  // Edit Expense History states
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState<string>("");
  const [editHistory, setEditHistory] = useState<any[]>([]);
  const [selectedEditedLog, setSelectedEditedLog] = useState<any>(null);
  const [isEditedDetailOpen, setIsEditedDetailOpen] = useState<boolean>(false);
  const [historyModalTab, setHistoryModalTab] = useState<"delete" | "edit">("delete");

  // Socket.io for server time offset sync
  const [serverTimeOffset, setServerTimeOffset] = useState<number>(0);

  useEffect(() => {
    const socketUrl = import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:5000";
    const socket = io(socketUrl, {
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      console.log("⚡ Connected to Socket.io Server in InvoiceManagement for Time Sync");
      const clientTx = Date.now();
      socket.emit("request_server_time", (serverTime: string) => {
        const clientRx = Date.now();
        if (serverTime) {
          const serverMs = new Date(serverTime).getTime();
          const latency = (clientRx - clientTx) / 2;
          const offset = serverMs - (clientTx + latency);
          setServerTimeOffset(offset);
          console.log(`⏱️ Server time offset synced via Socket.io: ${offset}ms`);
        }
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Load restaurant metadata, suppliers and local expenses
  useEffect(() => {
    getRestaurantInfo()
      .then(setRestaurantInfo)
      .catch((err) => console.error("Failed to load restaurant info", err));

    getSuppliersApi()
      .then((data) => {
        if (Array.isArray(data)) {
          setDbSuppliers(data);
        }
      })
      .catch((err) => console.error("Failed to load suppliers from database", err));

    const stored = localStorage.getItem("resmanager_cash_expenses");
    let parsedExp: OperationalExpense[] = [];
    if (stored) {
      try {
        parsedExp = JSON.parse(stored);
        if (parsedExp.length <= 7) {
          parsedExp = MOCK_EXPENSES;
        }
      } catch (e) {
        console.error("Failed to parse expenses, reset to mock", e);
        parsedExp = MOCK_EXPENSES;
      }
    } else {
      parsedExp = MOCK_EXPENSES;
    }

    // Programmatically deduplicate Điện, Nước, Internet per month, keeping the first entry found
    const seenUtilities = new Set<string>();
    const deduplicatedExp: OperationalExpense[] = [];
    for (const exp of parsedExp) {
      const isUtility = ["Điện", "Nước", "Internet"].includes(exp.category);
      if (isUtility) {
        const d = new Date(exp.date);
        const yearMonthKey = `${exp.category}-${d.getFullYear()}-${d.getMonth()}`;
        if (seenUtilities.has(yearMonthKey)) {
          continue;
        }
        seenUtilities.add(yearMonthKey);
      }
      deduplicatedExp.push(exp);
    }

    setExpenses(deduplicatedExp);
    localStorage.setItem("resmanager_cash_expenses", JSON.stringify(deduplicatedExp));

    const storedHistory = localStorage.getItem("resmanager_expenses_delete_history");
    if (storedHistory) {
      try {
        setDeleteHistory(JSON.parse(storedHistory));
      } catch (e) {
        console.error("Failed to parse delete history", e);
      }
    }

    const storedEditHistory = localStorage.getItem("resmanager_expenses_edit_history");
    if (storedEditHistory) {
      try {
        setEditHistory(JSON.parse(storedEditHistory));
      } catch (e) {
        console.error("Failed to parse edit history", e);
      }
    }
  }, []);

  const getPastMonths = useCallback(() => {
    const months = [];
    const now = new Date();
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`;
      const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      months.push({ label, value });
    }
    return months;
  }, []);

  const allSuppliers = useMemo(() => {
    const dbNames = dbSuppliers.map((s: any) => s.name);
    return Array.from(new Set([...DEFAULT_UTILITY_PROVIDERS, ...dbNames]));
  }, [dbSuppliers]);

  const formSuppliers = useMemo(() => {
    const cat = expenseForm.category;
    if (cat === "Khác") {
      const otherCatPayees = Object.values(CATEGORY_DEFAULT_PAYEES).filter(p => p !== "Cửa hàng tạp hóa Cô Ba");
      return allSuppliers.filter(s => !otherCatPayees.includes(s));
    }
    const defaultPayee = CATEGORY_DEFAULT_PAYEES[cat];
    return defaultPayee ? [defaultPayee] : [];
  }, [expenseForm.category, allSuppliers]);

  const isDuplicateId = useMemo(() => {
    const typedId = expenseForm.id.trim();
    if (!typedId) return false;
    return expenses.some(e => {
      if (editingExpenseId && e.id.toLowerCase() === editingExpenseId.toLowerCase()) return false;
      return e.id.toLowerCase() === typedId.toLowerCase();
    });
  }, [expenseForm.id, expenses, editingExpenseId]);

  // Enforce fixed days in the month for utility bills
  const adjustDateForCategory = (cat: string, rawDateStr: string): string => {
    if (!rawDateStr) return rawDateStr;
    const date = new Date(rawDateStr);
    if (cat === "Điện") {
      date.setDate(8);
    } else if (cat === "Nước") {
      date.setDate(3);
    } else if (cat === "Internet") {
      date.setDate(1);
    }
    return formatForDatetimeLocal(date);
  };

  const generateDefaultExpenseId = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `EXP-${mm}-${dd}`;
  };

  const handleDateChangeInForm = (val: string) => {
    const adjusted = adjustDateForCategory(expenseForm.category, val);
    setExpenseForm(prev => {
      const updated = { ...prev, date: adjusted };
      if (!editingExpenseId) {
        updated.id = generateDefaultExpenseId(adjusted);
      }
      return updated;
    });
  };

  const handleCategoryChangeInForm = (cat: OperationalExpense["category"]) => {
    const defaultPayee = CATEGORY_DEFAULT_PAYEES[cat] || "Khác";
    setPayeeSelectOption(defaultPayee);
    if (defaultPayee === "Khác") {
      setCustomPayeeText("");
    }
    setExpenseForm(prev => {
      const adjustedDate = adjustDateForCategory(cat, prev.date);
      const updated = {
        ...prev,
        category: cat,
        date: adjustedDate,
        payee: defaultPayee === "Khác" ? "" : defaultPayee
      };
      if (!editingExpenseId) {
        updated.id = generateDefaultExpenseId(adjustedDate);
      }
      return updated;
    });
  };

  const handlePayeeOptionChange = (val: string) => {
    setPayeeSelectOption(val);
    if (val !== "Khác") {
      setExpenseForm(prev => ({ ...prev, payee: val }));
    } else {
      setCustomPayeeText("");
      setExpenseForm(prev => ({ ...prev, payee: "" }));
    }
  };

  const handleCustomPayeeChange = (val: string) => {
    setCustomPayeeText(val);
    setExpenseForm(prev => ({ ...prev, payee: val }));
  };

  const handleOpenAddExpense = () => {
    setEditingExpenseId(null);
    setEditReason("");
    setIsExpenseModalOpen(true);
    const defaultPayee = CATEGORY_DEFAULT_PAYEES["Điện"];
    const rawSyncedDate = new Date(Date.now() + serverTimeOffset);
    // Force day to 8 for Điện
    rawSyncedDate.setDate(8);
    const syncedDateStr = formatForDatetimeLocal(rawSyncedDate);
    setExpenseForm({
      id: generateDefaultExpenseId(syncedDateStr),
      category: "Điện",
      amount: "",
      date: syncedDateStr,
      note: "",
      payee: defaultPayee
    });
    setPayeeSelectOption(defaultPayee);
    setCustomPayeeText("");
  };

  // Prevent background scrolling when a modal is open
  useEffect(() => {
    const isAnyModalOpen = isDetailsOpen || isExpenseDetailsOpen || isExpenseModalOpen || isRefundOpen || calcBreakdownType !== null || isDeleteConfirmOpen || isDeleteHistoryOpen || isDeletedDetailOpen;
    if (isAnyModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDetailsOpen, isExpenseDetailsOpen, isExpenseModalOpen, isRefundOpen, calcBreakdownType, isDeleteConfirmOpen, isDeleteHistoryOpen, isDeletedDetailOpen]);



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

  const handlePrintExpense = (expense: OperationalExpense) => {
    printExpenseInvoice(expense, restaurantInfo?.name, restaurantInfo);
    toast.success("Đang tiến hành in hóa đơn thanh toán...");
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

  const categorySums = useMemo(() => {
    const sums: Record<string, number> = {
      "Điện": 0,
      "Nước": 0,
      "Gas": 0,
      "Internet": 0,
      "Tiền Thuế": 0,
      "Bảo Trì": 0,
      "Khác": 0
    };
    filteredExpenses.forEach((e) => {
      const cat = e.category;
      if (sums[cat] !== undefined) {
        sums[cat] += Number(e.amount);
      } else {
        sums["Khác"] += Number(e.amount);
      }
    });

    const totalOperating = Object.values(sums).reduce((a, b) => a + b, 0);
    const electWater = (sums["Điện"] || 0) + (sums["Nước"] || 0);
    const others = totalOperating - electWater;

    return {
      sums,
      totalOperating,
      electWater,
      others
    };
  }, [filteredExpenses]);

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
    if (!expenseForm.id.trim()) {
      toast.error("Mã chi phí không được để trống");
      return;
    }
    if (isDuplicateId) {
      toast.error("Mã chi phí này đã tồn tại trên hệ thống! Vui lòng nhập mã khác.");
      return;
    }

    const amountVal = Number(expenseForm.amount.replace(/\D/g, ""));
    if (isNaN(amountVal) || amountVal <= 0) {
      toast.error("Số tiền chi phí phải lớn hơn 0");
      return;
    }
    if (!expenseForm.date) {
      toast.error("Ngày chi phí không được để trống");
      return;
    }

    const finalPayee = payeeSelectOption === "Khác" ? customPayeeText.trim() : payeeSelectOption;
    if (!finalPayee) {
      toast.error("Vui lòng nhập tên người nhận / đơn vị cung cấp khác");
      return;
    }

    // Double utility bill month warning (strict block for Điện, Nước, Internet)
    if (["Điện", "Nước", "Internet"].includes(expenseForm.category)) {
      const inputDate = new Date(expenseForm.date);
      const inputYear = inputDate.getFullYear();
      const inputMonth = inputDate.getMonth();
      const monthLabel = `Tháng ${inputMonth + 1}/${inputYear}`;
      
      const hasExisting = expenses.some(exp => {
        if (editingExpenseId && exp.id === editingExpenseId) return false;
        const expDate = new Date(exp.date);
        return exp.category === expenseForm.category &&
               expDate.getFullYear() === inputYear &&
               expDate.getMonth() === inputMonth;
      });
      
      if (hasExisting) {
        toast.error(`Hóa đơn ${expenseForm.category} của ${monthLabel} đã tồn tại! Mỗi tháng chỉ được đóng 1 lần.`);
        return;
      }
    }

    if (editingExpenseId) {
      // Edit mode
      const oldExpense = expenses.find(exp => exp.id === editingExpenseId);
      if (!oldExpense) return;

      if (!editReason.trim()) {
        toast.error("Vui lòng ghi rõ lý do sửa hóa đơn!");
        return;
      }

      const updatedExpense: OperationalExpense = {
        id: expenseForm.id.trim(),
        category: expenseForm.category,
        amount: amountVal,
        date: expenseForm.date,
        note: expenseForm.note.trim() || undefined,
        payee: finalPayee
      };

      // Record edit log
      let editedBy = "Quản lý";
      try {
        const userStr = localStorage.getItem("user");
        if (userStr) {
          const u = JSON.parse(userStr);
          editedBy = u.name || u.username || "Quản lý";
        }
      } catch (err) {
        console.error(err);
      }

      const log = {
        id: `EDIT-${Date.now().toString().slice(-6)}`,
        expenseId: oldExpense.id,
        editedBy,
        editedAt: new Date().toISOString(),
        reason: editReason.trim(),
        oldData: { ...oldExpense },
        newData: { ...updatedExpense }
      };

      const newEditHistory = [log, ...editHistory];
      setEditHistory(newEditHistory);
      localStorage.setItem("resmanager_expenses_edit_history", JSON.stringify(newEditHistory));

      const newExpenses = expenses.map(exp => exp.id === editingExpenseId ? updatedExpense : exp);
      setExpenses(newExpenses);
      localStorage.setItem("resmanager_cash_expenses", JSON.stringify(newExpenses));

      toast.success("Cập nhật hóa đơn chi phí thành công!");
      setIsExpenseModalOpen(false);
      setEditingExpenseId(null);
      setEditReason("");
    } else {
      // Add mode
      const newExpense: OperationalExpense = {
        id: expenseForm.id.trim(),
        category: expenseForm.category,
        amount: amountVal,
        date: expenseForm.date,
        note: expenseForm.note.trim() || undefined,
        payee: finalPayee
      };

      const newExpenses = [newExpense, ...expenses];
      setExpenses(newExpenses);
      localStorage.setItem("resmanager_cash_expenses", JSON.stringify(newExpenses));

      toast.success("Thêm hóa đơn chi phí thành công!");
      setIsExpenseModalOpen(false);
    }

    // Reset Form
    setExpenseForm({
      id: "",
      category: "Điện",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      note: "",
      payee: ""
    });
    setPayeeSelectOption("Tổng Công ty Điện lực miền Nam (EVN)");
    setCustomPayeeText("");
  };

  const parseExcelNumber = (val: any): number => {
    if (val === undefined || val === null) return 0;
    if (typeof val === "number") return val;
    const str = String(val).replace(/[^0-9.,-]/g, "").replace(",", ".");
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  };

  const handleExportInvoicesExcel = () => {
    const rows = payments.map(p => {
      const method = METHOD_LABELS[p.paymentMethod]?.label || p.paymentMethod || "Khác";
      return {
        "Mã Hóa Đơn": p.order_code || p.id,
        "Khách Hàng": p.guest_name || "Khách vãng lai",
        "Bàn / Khu Vực": p.table_name || "Khách lẻ",
        "Tổng Tiền": formatCurrency(p.amount),
        "Trạng Thái": "Đã thanh toán",
        "Phương Thức Thanh Toán": method,
        "Thời Gian Thanh Toán": formatDateTime(p.completedAt || p.createdAt)
      };
    });

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-fit columns dynamically based on max content length
    if (rows.length > 0) {
      const colKeys = Object.keys(rows[0]);
      ws["!cols"] = colKeys.map(key => {
        let maxLen = key.length;
        rows.forEach(r => {
          const val = r[key as keyof typeof r];
          if (val !== undefined && val !== null) {
            const strLen = String(val).length;
            if (strLen > maxLen) maxLen = strLen;
          }
        });
        return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
      });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "HoaDonKhachHang");
    XLSX.writeFile(wb, `Lich_Su_Hoa_Don_Khach_Hang_${Date.now()}.xlsx`);
    toast.success("Xuất báo cáo hóa đơn khách hàng thành công!");
  };

  const handleExportExpensesExcel = () => {
    const rows = filteredExpenses.map(e => ({
      "Mã Chi Phí": e.id,
      "Hạng mục chi phí": e.category,
      "Đơn vị nhận (Đối tác)": e.payee || "",
      "Số Tiền": `-${formatCurrency(e.amount)}`,
      "Ngày Chi": formatDateTime(e.date),
      "Ghi Chú": e.note || ""
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-fit columns dynamically based on max content length
    if (rows.length > 0) {
      const colKeys = Object.keys(rows[0]);
      ws["!cols"] = colKeys.map(key => {
        let maxLen = key.length;
        rows.forEach(r => {
          const val = r[key as keyof typeof r];
          if (val !== undefined && val !== null) {
            const strLen = String(val).length;
            if (strLen > maxLen) maxLen = strLen;
          }
        });
        return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
      });
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "ChiPhiVanHanh");
    XLSX.writeFile(wb, `Lich_Su_Chi_Phi_${Date.now()}.xlsx`);
    toast.success("Xuất báo cáo chi phí vận hành thành công!");
  };

  const handleDownloadExpenseTemplate = () => {
    const headers = [
      ["Mã Chi Phí", "Hạng mục chi phí", "Đơn vị nhận (Đối tác)", "Số Tiền", "Ngày Chi", "Ghi Chú"]
    ];

    const sampleRows = [
      ["EXP-08-01", "Gas", "Đại lý Gas Bình Minh HCM", 1500000, "08/08/2026", "Thay bình Gas nấu bếp chính"],
      ["EXP-08-02", "Điện", "Tổng Công ty Điện lực miền Nam (EVN)", 4500000, "05/08/2026", "Tiền điện kỳ tháng 08/2026"],
      ["EXP-08-03", "Nước", "Công ty Cổ phần Cấp nước Chợ Lớn", 850000, "03/08/2026", "Tiền nước kỳ tháng 08/2026"],
      ["EXP-08-04", "Internet", "Chi nhánh Tập đoàn Viễn thông Viettel", 350000, "01/08/2026", "Cước Internet cáp quang nhà hàng"]
    ];

    const noteRows = [
      [],
      ["DANH MỤC HẠNG MỤC CHI PHÍ VÀ ĐƠN VỊ ĐỐI TÁC HỢP LỆ TRÊN HỆ THỐNG:"],
      ["Hạng mục chi phí", "Đơn vị nhận (Đối tác) tương ứng"],
      ["Điện", "Tổng Công ty Điện lực miền Nam (EVN)"],
      ["Nước", "Công ty Cổ phần Cấp nước Chợ Lớn"],
      ["Gas", "Đại lý Gas Bình Minh HCM"],
      ["Internet", "Chi nhánh Tập đoàn Viễn thông Viettel"],
      ["Tiền Thuế", "Chi cục Thuế Quận 1"],
      ["Bảo Trì", "Công ty Cơ điện lạnh Việt Nam (REE)"],
      ["Khác", "Cửa hàng tạp hóa Cô Ba (hoặc nhập tên đối tác khác tự chọn)"],
      [],
      ["HƯỚNG DẪN ĐIỀN DỮ LIỆU:"],
      ["1. Số Tiền: Nhập số nguyên dương (ví dụ: 1500000), không chứa ký hiệu tiền tệ (đ, VNĐ) hoặc dấu chấm phân cách."],
      ["2. Ngày Chi: Nhập theo định dạng ngày DD/MM/YYYY (ví dụ: 08/08/2026)."],
      ["3. Mã Chi Phí: Không bắt buộc (nếu để trống hệ thống sẽ tự động tạo mã ngẫu nhiên dạng EXP-XXXXXX)."],
      ["4. Để tránh lỗi trùng lặp, vui lòng không sử dụng lại nguyên văn các dòng dữ liệu mẫu (EXP-08-01 đến EXP-08-04) khi tải lên."]
    ];

    const aoaData = [
      ...headers,
      ...sampleRows,
      ...noteRows
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(aoaData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Mau_Nhap_Chi_Phi");

    worksheet["!cols"] = [
      { wch: 15 },
      { wch: 18 },
      { wch: 35 },
      { wch: 15 },
      { wch: 15 },
      { wch: 40 }
    ];

    for (let r = 2; r <= 5; r++) {
      if (worksheet[`D${r}`]) {
        worksheet[`D${r}`].z = "#,##0";
      }
    }

    XLSX.writeFile(workbook, "Mau_Nhap_Chi_Phi_Van_Hanh.xlsx");
    toast.success("Đã tải về tệp Excel mẫu!");
  };

  const handleImportExpensesExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data: any[] = XLSX.utils.sheet_to_json(ws);

        const isSampleRow = (id: string, category: string, amount: number, payee: string) => {
          const lowerId = id.toLowerCase().replace("#", "").trim();
          if (["exp-08-01", "exp-08-02", "exp-08-03", "exp-08-04"].includes(lowerId)) {
            return true;
          }
          const lowerPayee = payee.toLowerCase().trim();
          if (category === "Gas" && amount === 1500000 && lowerPayee.includes("bình minh")) return true;
          if (category === "Điện" && amount === 4500000 && lowerPayee.includes("evn")) return true;
          if (category === "Nước" && amount === 850000 && lowerPayee.includes("chợ lớn")) return true;
          if (category === "Internet" && amount === 350000 && lowerPayee.includes("viettel")) return true;
          return false;
        };

        const existingIdSet = new Set(expenses.map(exp => exp.id.toLowerCase()));
        
        const getContentKey = (category: string = "", amount: number = 0, payee: string = "", date: string = "") => {
          const cleanDate = (date || "").split("T")[0];
          return `${(category || "").toLowerCase().trim()}|${amount}|${(payee || "").toLowerCase().trim()}|${cleanDate}`;
        };

        const existingContentKeys = new Set(expenses.map(exp => 
          getContentKey(exp.category || "", exp.amount || 0, exp.payee || "", exp.date || "")
        ));

        const excelSeenIds = new Set<string>();
        const excelSeenContents = new Set<string>();
        
        const duplicateIdsInExcel = new Set<string>();
        const duplicateIdsWithSystem = new Set<string>();
        const duplicateContentsInExcel = new Set<string>();
        const duplicateContentsWithSystem = new Set<string>();
        const sampleDataRowsFound = new Set<string>();

        const newExpensesList: OperationalExpense[] = [];

        for (const row of data) {
          const categoryRaw = String(row["Hạng mục chi phí"] || row["Hạng mục"] || row["category"] || "").trim();
          const category = EXPENSE_CATEGORIES.find(c => c.toLowerCase() === categoryRaw.toLowerCase()) || "Khác";
          const amount = parseExcelNumber(row["Số Tiền"] || row["Số tiền"] || row["amount"] || 0);
          const payee = String(row["Đơn vị nhận (Đối tác)"] || row["Đơn vị nhận"] || row["Đối tác"] || row["payee"] || "Khác").trim();
          const note = String(row["Ghi Chú"] || row["Ghi chú"] || row["note"] || "").trim();
          
          let dateStr = row["Ngày Chi"] || row["Ngày chi"] || row["date"] || "";
          let finalDate = "";
          if (dateStr) {
            if (typeof dateStr === "number") {
              const d = new Date((dateStr - (25567 + 2)) * 86400 * 1000);
              finalDate = d.toISOString().split("T")[0] + "T09:00:00";
            } else {
              const s = String(dateStr).trim();
              const parts = s.split("/");
              if (parts.length === 3) {
                finalDate = `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}T09:00:00`;
              } else {
                finalDate = s.includes("T") ? s : `${s.split(" ")[0]}T09:00:00`;
              }
            }
          } else {
            finalDate = new Date().toISOString().split("T")[0] + "T09:00:00";
          }

          if (amount <= 0) continue;

          let expenseId = String(row["Mã Chi Phí"] || row["Mã chi phí"] || row["mã chi phí"] || row["id"] || "").trim();
          if (expenseId.startsWith("#")) {
            expenseId = expenseId.slice(1);
          }

          // Check if this row matches sample data template
          if (isSampleRow(expenseId, category, amount, payee)) {
            sampleDataRowsFound.add(`${category} - ${payee} (${amount.toLocaleString("vi-VN")} đ)`);
            continue;
          }

          // Validate duplicate ID
          if (expenseId) {
            const lowerId = expenseId.toLowerCase();
            if (excelSeenIds.has(lowerId)) {
              duplicateIdsInExcel.add(expenseId);
            } else {
              excelSeenIds.add(lowerId);
            }

            if (existingIdSet.has(lowerId)) {
              duplicateIdsWithSystem.add(expenseId);
            }
          }

          // Validate duplicate content
          const contentKey = getContentKey(category, amount, payee, finalDate);
          const displayContent = `${category}: ${payee} (${amount.toLocaleString("vi-VN")} đ)`;

          if (excelSeenContents.has(contentKey)) {
            duplicateContentsInExcel.add(displayContent);
          } else {
            excelSeenContents.add(contentKey);
          }

          if (existingContentKeys.has(contentKey)) {
            duplicateContentsWithSystem.add(displayContent);
          }

          const finalExpenseId = expenseId || `EXP-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 100)}`;

          newExpensesList.push({
            id: finalExpenseId,
            category,
            amount,
            date: finalDate,
            note: note || undefined,
            payee: payee || "Khác"
          });
        }

        if (
          sampleDataRowsFound.size > 0 ||
          duplicateIdsInExcel.size > 0 ||
          duplicateIdsWithSystem.size > 0 ||
          duplicateContentsInExcel.size > 0 ||
          duplicateContentsWithSystem.size > 0
        ) {
          let errorMsg = "";
          
          if (sampleDataRowsFound.size > 0) {
            errorMsg += `⚠️ Không được nhập dữ liệu mẫu từ tệp tin: ${Array.from(sampleDataRowsFound).join(", ")}. `;
          }
          if (duplicateIdsInExcel.size > 0) {
            errorMsg += `⚠️ Mã chi phí bị trùng lặp trong file Excel: ${Array.from(duplicateIdsInExcel).map(id => `#${id}`).join(", ")}. `;
          }
          if (duplicateIdsWithSystem.size > 0) {
            errorMsg += `⚠️ Mã chi phí đã tồn tại trên hệ thống: ${Array.from(duplicateIdsWithSystem).map(id => `#${id}`).join(", ")}. `;
          }
          if (duplicateContentsInExcel.size > 0) {
            errorMsg += `⚠️ Chi phí bị lặp lại trong file Excel: ${Array.from(duplicateContentsInExcel).join("; ")}. `;
          }
          if (duplicateContentsWithSystem.size > 0) {
            errorMsg += `⚠️ Chi phí đã có sẵn trên hệ thống (trùng khớp ngày, đối tác, số tiền): ${Array.from(duplicateContentsWithSystem).join("; ")}.`;
          }

          toast.error(errorMsg, { duration: 6000 });
          if (expenseExcelInputRef.current) expenseExcelInputRef.current.value = "";
          return;
        }

        if (newExpensesList.length === 0) {
          toast.error("Không có hóa đơn chi phí nào hợp lệ để nhập!");
          return;
        }

        const mergedExpenses = [...newExpensesList, ...expenses];
        setExpenses(mergedExpenses);
        localStorage.setItem("resmanager_cash_expenses", JSON.stringify(mergedExpenses));
        toast.success(`Đã nhập thành công ${newExpensesList.length} hóa đơn chi phí từ Excel!`);
        
        if (expenseExcelInputRef.current) expenseExcelInputRef.current.value = "";
      } catch (err) {
        console.error(err);
        toast.error("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleEditExpenseTrigger = (expense: OperationalExpense) => {
    setEditingExpenseId(expense.id);
    setExpenseForm({
      id: expense.id,
      category: expense.category,
      amount: formatNumberWithDots(expense.amount),
      date: expense.date,
      note: expense.note || "",
      payee: expense.payee || ""
    });

    if (Object.values(CATEGORY_DEFAULT_PAYEES).includes(expense.payee || "")) {
      setPayeeSelectOption(expense.payee || "");
    } else {
      setPayeeSelectOption("Khác");
      setCustomPayeeText(expense.payee || "");
    }

    setEditReason("");
    setIsExpenseModalOpen(true);
  };

  const handleDeleteExpenseTrigger = (expense: OperationalExpense) => {
    setExpenseToDelete(expense);
    setIsDeleteConfirmOpen(true);
    setDeleteConfirmStep(1);
    setDeleteReason("");
  };

  const handleConfirmDeleteExpense = () => {
    if (!expenseToDelete) return;
    const targetId = expenseToDelete.id;

    if (!deleteReason.trim()) {
      toast.error("Vui lòng ghi rõ lý do xóa hóa đơn!");
      return;
    }
    
    let deletedBy = "Quản lý";
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const u = JSON.parse(userStr);
        deletedBy = u.name || u.username || "Quản lý";
      }
    } catch (e) {
      console.error(e);
    }

    const deleteLog = {
      id: `DEL-${Date.now().toString().slice(-6)}`,
      expenseId: expenseToDelete.id,
      category: expenseToDelete.category,
      amount: expenseToDelete.amount,
      date: expenseToDelete.date,
      payee: expenseToDelete.payee,
      note: expenseToDelete.note,
      deletedBy,
      deletedAt: new Date().toISOString(),
      reason: deleteReason.trim()
    };

    const newHistory = [deleteLog, ...deleteHistory];
    setDeleteHistory(newHistory);
    localStorage.setItem("resmanager_expenses_delete_history", JSON.stringify(newHistory));

    const newExpenses = expenses.filter((e) => e.id !== targetId);
    setExpenses(newExpenses);
    localStorage.setItem("resmanager_cash_expenses", JSON.stringify(newExpenses));

    toast.success("Xóa hóa đơn chi phí thành công!");
    setIsDeleteConfirmOpen(false);
    setExpenseToDelete(null);
    setDeleteReason("");
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
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {activeTab === "expenses" ? (
            <>
              <input
                type="file"
                ref={expenseExcelInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleImportExpensesExcel}
              />
              <button
                onClick={handleDownloadExpenseTemplate}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-full border border-slate-300 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                title="Tải tệp Excel mẫu để nhập dữ liệu"
              >
                <DownloadCloud size={14} /> Tải File Mẫu
              </button>
              <button
                onClick={() => expenseExcelInputRef.current?.click()}
                className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200/50 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                title="Nhập danh sách chi phí từ file Excel"
              >
                <DownloadCloud size={14} /> Nhập Excel
              </button>
              <button
                onClick={handleExportExpensesExcel}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200/50 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
                title="Xuất danh sách chi phí ra file Excel"
              >
                <FileSpreadsheet size={14} /> Xuất Excel
              </button>
              <button
                onClick={handleOpenAddExpense}
                className="px-4 py-2 bg-[#3E2016] hover:bg-[#5C2E17] text-[#FFFFFF] text-xs font-bold rounded-full transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              >
                <Plus size={14} /> Thêm chi phí
              </button>
            </>
          ) : (
            <button
              onClick={handleExportInvoicesExcel}
              className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200/50 transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
              title="Xuất lịch sử hóa đơn ra file Excel"
            >
              <FileSpreadsheet size={14} /> Xuất Excel
            </button>
          )}
          <button
            onClick={loadData}
            disabled={loading}
            className="group px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-60 text-xs font-bold rounded-full border border-slate-200 cursor-pointer active:scale-95 transition-all shadow-xs flex items-center gap-1.5 shrink-0 duration-200"
          >
            <RefreshCw size={12} className={`text-slate-500 transition-transform duration-550 group-hover:rotate-180 ${loading ? "animate-spin text-[#3E2016]" : ""}`} />
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
        <div 
          onClick={() => { if (activeTab === "expenses") setCalcBreakdownType("total"); }}
          className={`bg-[#FFFFFF] rounded-2xl border border-slate-200/70 p-4 shadow-xs ${activeTab === "expenses" ? "cursor-pointer hover:shadow-md hover:scale-102 hover:border-emerald-300 transition-all active:scale-98" : ""}`}
        >
          <p className="text-[10px] font-bold uppercase text-[#8A8A8A] tracking-wider">{stats.card2Label}</p>
          <p className="text-xl font-black text-emerald-600 font-display mt-1">{stats.card2Value}</p>
        </div>
        <div 
          onClick={() => { if (activeTab === "expenses") setCalcBreakdownType("electWater"); }}
          className={`bg-[#FFFFFF] rounded-2xl border border-slate-200/70 p-4 shadow-xs ${activeTab === "expenses" ? "cursor-pointer hover:shadow-md hover:scale-102 hover:border-blue-300 transition-all active:scale-98" : ""}`}
        >
          <p className="text-[10px] font-bold uppercase text-[#8A8A8A] tracking-wider">{stats.card3Label}</p>
          <p className="text-xl font-black text-blue-600 font-display mt-1">{stats.card3Value}</p>
        </div>
        <div 
          onClick={() => { if (activeTab === "expenses") setCalcBreakdownType("others"); }}
          className={`bg-[#FFFFFF] rounded-2xl border border-slate-200/70 p-4 shadow-xs ${activeTab === "expenses" ? "cursor-pointer hover:shadow-md hover:scale-102 hover:border-amber-300 transition-all active:scale-98" : ""}`}
        >
          <p className="text-[10px] font-bold uppercase text-[#8A8A8A] tracking-wider">{stats.card4Label}</p>
          <p className="text-xl font-black text-amber-600 font-display mt-1">{stats.card4Value}</p>
        </div>
      </div>
      {activeTab === "expenses" && (
        <p className="text-[10px] font-bold text-slate-400 italic text-right flex items-center justify-end gap-1 px-1 mt-0">
          <Info size={11} className="text-slate-400" /> Bấm vào các thẻ chi phí để xem chi tiết cộng dồn số tiền
        </p>
      )}

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
            {activeTab === "history" ? (
              <>
                <option value="today">Hôm nay</option>
                <option value="week">7 ngày qua</option>
                <option value="month">1 tháng qua</option>
                <option value="year">1 năm qua</option>
              </>
            ) : (
              <>
                {getPastMonths().map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </>
            )}
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

          {activeTab === "expenses" && (
            <button
              type="button"
              onClick={() => setIsDeleteHistoryOpen(true)}
              className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-full transition-all border border-red-200/50 shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0 ml-auto lg:ml-0"
            >
              <History size={14} /> Lịch sử xóa
            </button>
          )}
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-[#FFFFFF] rounded-2xl border border-slate-200/70 shadow-xs overflow-hidden flex flex-col justify-between min-h-[585px]">
        {loading ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-2 py-20">
            <div className="w-8 h-8 border-2 border-[#3E2016] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs text-slate-500">Đang tải dữ liệu...</span>
          </div>
        ) : paginatedData.length === 0 ? (
          <div className="flex-1 flex flex-col justify-center items-center gap-2 text-slate-400 py-20">
            <Receipt size={40} strokeWidth={1} />
            <span className="text-xs font-bold">Không tìm thấy dữ liệu hóa đơn</span>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            {activeTab === "history" ? (
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-[#F8F6F2] font-bold text-slate-600 border-b border-slate-200 text-xs uppercase whitespace-nowrap">
                  <tr>
                    <th className="px-3.5 py-3">Mã Hóa Đơn</th>
                    <th className="px-3.5 py-3">Khách Hàng</th>
                    <th className="px-3.5 py-3">Bàn / Khu Vực</th>
                    <th className="px-3.5 py-3">Tổng Tiền</th>
                    <th className="px-3.5 py-3">Trạng thái</th>
                    <th className="px-3.5 py-3">PHƯƠNG THỨC THANH TOÁN</th>
                    <th className="px-3.5 py-3">Thời gian thanh toán</th>
                    <th className="px-3.5 py-3 text-right">Thao tác</th>
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
                        <td className="px-3.5 py-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          {p.order_code || (p.orderId ? `#${String(p.orderId).slice(-8).toUpperCase()}` : `#${String(p.id).slice(-8).toUpperCase()}`)}
                        </td>
                        <td className="px-3.5 py-3 text-slate-700 font-bold whitespace-nowrap">
                          {p.guest_name || <span className="text-slate-400 font-normal italic">Khách vãng lai</span>}
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">{p.table_name || "Khách lẻ"}</td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="font-bold text-emerald-600">+{formatCurrency(p.amount)}</span>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold text-emerald-700 bg-emerald-50 border-emerald-200">
                            Đã thanh toán
                          </span>
                        </td>
                        <td className="px-3.5 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[10px] font-bold ${method.color}`}>
                            {method.icon}
                            {method.label}
                          </span>
                        </td>
                        <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">
                          {formatDateTime(p.completedAt || p.createdAt)}
                        </td>
                        <td className="px-3.5 py-3 text-right space-x-1.5 whitespace-nowrap">
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
                <thead className="bg-[#F8F6F2] font-bold text-slate-600 border-b border-slate-200 text-xs uppercase whitespace-nowrap">
                  <tr>
                    <th className="px-3.5 py-3">Mã Chi Phí</th>
                    <th className="px-3.5 py-3">Hạng mục chi phí</th>
                    <th className="px-3.5 py-3">Đơn vị nhận (Đối tác)</th>
                    <th className="px-3.5 py-3">Số Tiền</th>
                    <th className="px-3.5 py-3">Ngày Chi</th>
                    <th className="px-3.5 py-3">Ghi Chú</th>
                    <th className="px-3.5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-semibold">
                  {(paginatedData as OperationalExpense[]).map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-3.5 py-3 font-mono font-bold text-slate-500 whitespace-nowrap">#{e.id}</td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span className="bg-[#F8F6F2] px-2.5 py-1 rounded-full border border-slate-200/50 font-bold text-slate-700">
                          {e.category}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-slate-800 font-bold whitespace-nowrap">{e.payee || "Đơn vị cung cấp lẻ"}</td>
                      <td className="px-3.5 py-3 font-bold text-red-600 whitespace-nowrap">-{formatCurrency(e.amount)}</td>
                      <td className="px-3.5 py-3 text-slate-500 whitespace-nowrap">{formatDateTime(e.date)}</td>
                      <td className="px-3.5 py-3 text-slate-500 max-w-[200px] truncate whitespace-nowrap" title={e.note}>{e.note || "—"}</td>
                      <td className="px-3.5 py-3 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => handleOpenExpenseDetails(e)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg cursor-pointer transition-colors"
                          title="Xem chi tiết hóa đơn"
                        >
                          <Info size={14} />
                        </button>
                        <button
                          onClick={() => handlePrintExpense(e)}
                          className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg cursor-pointer transition-colors"
                          title="In hóa đơn thanh toán"
                        >
                          <Printer size={14} />
                        </button>
                        <button
                          onClick={() => handleEditExpenseTrigger(e)}
                          className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-600 rounded-lg cursor-pointer transition-colors"
                          title="Sửa hóa đơn chi phí"
                        >
                          <Edit size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteExpenseTrigger(e)}
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
                <h3 className="text-base font-bold text-slate-800">Hóa đơn thanh toán</h3>
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
                <p className="text-[10px] text-gray-400">
                  Địa chỉ: {restaurantInfo?.address || "123 Nguyễn Huệ, Quận 1, TP.HCM"}
                </p>
                <p className="text-[10px] text-gray-400">Hotline: {restaurantInfo?.hotline || "028 3829 4000"}</p>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              <div className="text-center font-bold text-sm text-slate-800 uppercase tracking-widest my-2">
                HÓA ĐƠN THANH TOÁN
              </div>

              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Mã hóa đơn:</span>
                  <span className="font-bold text-slate-800">#{selectedExpense.id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Hạng mục chi phí:</span>
                  <span className="font-bold text-slate-800 bg-[#F8F6F2] px-2 py-0.5 rounded border border-slate-200/50">
                    {selectedExpense.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Người gửi (Đơn vị chi):</span>
                  <span className="font-bold text-slate-800">Ban Quản lý Nhà hàng</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Người nhận (Đại diện):</span>
                  <span className="font-bold text-slate-800">{selectedExpense.payee || "Đơn vị cung cấp lẻ"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 flex items-center gap-1"><Clock size={10} /> Thời gian:</span>
                  <span>{formatDateTime(selectedExpense.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Ghi chú lý do chi:</span>
                  <span className="text-slate-700 text-right max-w-[220px]">{selectedExpense.note || "—"}</span>
                </div>

                <div className="border-t border-slate-200 my-2 pt-2 flex justify-between font-black text-sm text-slate-800">
                  <span>TỔNG THANH TOÁN:</span>
                  <span className="text-red-600 font-black">
                    -{formatCurrency(selectedExpense.amount)}
                  </span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-200 my-2" />

              {/* Mock Voucher signatures */}
              <div className="grid grid-cols-2 text-center text-[10px] font-sans font-bold pt-2 gap-4">
                <div>
                  <p className="text-slate-500">Người gửi (Lập phiếu)</p>
                  <div className="h-10 border-b border-dashed border-slate-300 w-2/3 mx-auto mt-2" />
                  <p className="text-slate-800 mt-2">Quản lý</p>
                </div>
                <div>
                  <p className="text-slate-500">Người nhận (Ký nhận)</p>
                  <div className="h-10 border-b border-dashed border-slate-300 w-2/3 mx-auto mt-2" />
                  <p className="text-slate-800 mt-2">{selectedExpense.payee ? selectedExpense.payee.slice(0, 15) + (selectedExpense.payee.length > 15 ? "..." : "") : "Đại diện nhận"}</p>
                </div>
              </div>
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-100 bg-slate-50/50 px-6 py-4 font-sans">
              <button
                type="button"
                onClick={() => setIsExpenseDetailsOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsExpenseDetailsOpen(false);
                  handlePrintExpense(selectedExpense);
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

      {/* Operating Cost Breakdown Modal */}
      {calcBreakdownType !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in font-sans text-xs text-slate-700 flex flex-col max-h-[85vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Coins className="text-[#3E2016]" size={20} />
                <h3 className="text-base font-bold text-slate-800">
                  {calcBreakdownType === "total"
                    ? "Chi tiết cộng gộp Tổng chi phí vận hành"
                    : calcBreakdownType === "electWater"
                    ? "Chi tiết cộng gộp Chi phí điện & nước"
                    : "Chi tiết cộng gộp Chi phí khác (Gas, Net, Thuế...)"}
                </h3>
              </div>
              <button
                onClick={() => setCalcBreakdownType(null)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              <p className="font-semibold text-slate-500 leading-relaxed text-center">
                Dưới đây là bảng thống kê chi tiết các khoản chi được cộng dồn tương ứng với thẻ số liệu bạn chọn.
              </p>

              {/* 1. Chi phí Điện & Nước */}
              {calcBreakdownType === "electWater" && (
                <div className="bg-blue-50/40 border border-blue-200/50 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center bg-blue-100/60 p-2.5 rounded-xl border border-blue-200/40 font-extrabold text-blue-800 text-sm">
                    <span>CHI PHÍ ĐIỆN & NƯỚC</span>
                    <span className="font-mono">{formatCurrency(categorySums.electWater)} ₫</span>
                  </div>
                  <div className="pl-3 space-y-1.5 font-bold text-slate-700 border-l-2 border-blue-300/60">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">• Điện:</span>
                      <span>{formatCurrency(categorySums.sums["Điện"])} ₫</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">• Nước:</span>
                      <span>{formatCurrency(categorySums.sums["Nước"])} ₫</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-blue-200/40 text-[10px] text-blue-700 font-extrabold italic text-right">
                    Phép tính: Điện ({formatCurrency(categorySums.sums["Điện"])}) + Nước ({formatCurrency(categorySums.sums["Nước"])}) = {formatCurrency(categorySums.electWater)} ₫
                  </div>
                </div>
              )}

              {/* 2. Chi phí Khác */}
              {calcBreakdownType === "others" && (
                <div className="bg-amber-50/40 border border-amber-200/50 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center bg-amber-100/60 p-2.5 rounded-xl border border-amber-200/40 font-extrabold text-amber-800 text-sm">
                    <span>CHI PHÍ KHÁC (GAS, NET, THUẾ...)</span>
                    <span className="font-mono">{formatCurrency(categorySums.others)} ₫</span>
                  </div>
                  <div className="pl-3 space-y-1.5 font-bold text-slate-700 border-l-2 border-amber-300/60">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">• Gas:</span>
                      <span>{formatCurrency(categorySums.sums["Gas"])} ₫</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">• Internet:</span>
                      <span>{formatCurrency(categorySums.sums["Internet"])} ₫</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">• Tiền Thuế:</span>
                      <span>{formatCurrency(categorySums.sums["Tiền Thuế"])} ₫</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">• Bảo Trì:</span>
                      <span>{formatCurrency(categorySums.sums["Bảo Trì"])} ₫</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">• Khác:</span>
                      <span>{formatCurrency(categorySums.sums["Khác"])} ₫</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-200/40 text-[10px] text-amber-700 font-extrabold italic text-right">
                    Phép tính: Gas + Internet + Tiền Thuế + Bảo Trì + Khác = {formatCurrency(categorySums.others)} ₫
                  </div>
                </div>
              )}

              {/* 3. Tổng chi phí vận hành */}
              {calcBreakdownType === "total" && (
                <div className="bg-emerald-50/40 border border-emerald-200/50 rounded-2xl p-4 space-y-3">
                  <div className="flex justify-between items-center bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-200/40 font-extrabold text-emerald-800 text-sm">
                    <span>TỔNG CHI PHÍ VẬN HÀNH</span>
                    <span className="font-mono text-emerald-700">{formatCurrency(categorySums.totalOperating)} ₫</span>
                  </div>
                  <div className="pl-3 space-y-1.5 font-bold text-slate-700 border-l-2 border-emerald-300/60">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">• Chi phí Điện & Nước:</span>
                      <span>{formatCurrency(categorySums.electWater)} ₫</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">• Chi phí Khác (Gas, Net, Thuế...):</span>
                      <span>{formatCurrency(categorySums.others)} ₫</span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-emerald-200/40 text-[10px] text-emerald-700 font-extrabold italic text-right">
                    Phép tính: Điện & Nước ({formatCurrency(categorySums.electWater)}) + Chi phí Khác ({formatCurrency(categorySums.others)}) = {formatCurrency(categorySums.totalOperating)} ₫
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                onClick={() => setCalcBreakdownType(null)}
                className="rounded-lg bg-[#3E2016] px-5 py-2 text-xs font-bold text-white hover:bg-[#5C2E17] transition-colors shadow-md cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {isDeleteConfirmOpen && expenseToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in font-sans text-xs text-slate-700">
            {deleteConfirmStep === 1 ? (
              <>
                {/* Header Step 1 */}
                <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 bg-amber-50/50">
                  <AlertTriangle className="text-amber-600 animate-pulse" size={20} />
                  <h3 className="text-sm font-bold text-amber-800">Xác nhận xóa hóa đơn chi phí (Bước 1/2)</h3>
                </div>

                {/* Body Step 1 */}
                <div className="p-6 space-y-4">
                  <p className="font-semibold text-slate-600 leading-relaxed">
                    Bạn có chắc chắn muốn xóa hóa đơn chi phí <span className="font-black text-slate-800">#{expenseToDelete.id}</span> không?
                  </p>
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 font-medium text-slate-600">
                    <div className="flex justify-between"><span>Hạng mục:</span><span className="font-bold text-slate-800">{expenseToDelete.category}</span></div>
                    <div className="flex justify-between"><span>Đơn vị nhận:</span><span className="font-bold text-slate-800">{expenseToDelete.payee}</span></div>
                    <div className="flex justify-between"><span>Số tiền:</span><span className="font-bold text-red-600">-{formatCurrency(expenseToDelete.amount)}</span></div>
                    <div className="flex justify-between"><span>Thời gian:</span><span>{formatDateTime(expenseToDelete.date)}</span></div>
                  </div>
                  <p className="text-[10px] text-red-500 italic font-semibold">
                    * Hành động này sẽ được ghi lại vào lịch sử hệ thống của nhà hàng để đối soát.
                  </p>
                </div>

                {/* Footer Step 1 */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteConfirmOpen(false);
                      setExpenseToDelete(null);
                      setDeleteConfirmStep(1);
                    }}
                    className="rounded-lg bg-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmStep(2)}
                    className="rounded-lg bg-amber-600 px-4 py-2 font-bold text-white hover:bg-amber-700 transition-colors shadow-md cursor-pointer"
                  >
                    Tiếp tục (1/2)
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Header Step 2 */}
                <div className="flex items-center gap-2 border-b border-slate-100 px-6 py-4 bg-red-50/50">
                  <AlertTriangle className="text-red-600 animate-bounce" size={20} />
                  <h3 className="text-sm font-bold text-red-800">CẢNH BÁO BẢO MẬT (Bước 2/2)</h3>
                </div>

                {/* Body Step 2 */}
                <div className="p-6 space-y-4">
                  <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl font-bold">
                    <AlertTriangle size={24} className="animate-bounce shrink-0" />
                    <span>HÀNH ĐỘNG NÀY KHÔNG THỂ HOÀN TÁC!</span>
                  </div>
                  <p className="font-semibold text-slate-700 leading-relaxed">
                    Hệ thống yêu cầu bạn xác nhận lại một lần nữa. Bạn có chắc chắn 100% muốn xóa vĩnh viễn hóa đơn chi phí <span className="font-black text-red-600">#{expenseToDelete.id}</span> khỏi hệ thống không?
                  </p>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Lý do xóa hóa đơn <span className="text-red-500">*</span></label>
                    <textarea
                      rows={2}
                      value={deleteReason}
                      onChange={(e) => setDeleteReason(e.target.value)}
                      placeholder="Nhập lý do xóa (ví dụ: sai số tiền, sai đối tác, nhập trùng...)"
                      className="w-full p-2.5 border border-slate-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500 outline-none text-xs font-semibold"
                    />
                  </div>
                </div>

                {/* Footer Step 2 */}
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-4">
                  <button
                    type="button"
                    onClick={() => {
                      setIsDeleteConfirmOpen(false);
                      setExpenseToDelete(null);
                      setDeleteConfirmStep(1);
                    }}
                    className="rounded-lg bg-slate-200 px-4 py-2 font-bold text-slate-700 hover:bg-slate-300 transition-colors cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDeleteExpense}
                    className="rounded-lg bg-red-600 px-4 py-2 font-bold text-white hover:bg-red-700 transition-colors shadow-md cursor-pointer animate-pulse"
                  >
                    Tôi chắc chắn, hãy xóa vĩnh viễn
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete History Log Modal */}
      {/* Delete/Edit History Log Modal */}
      {isDeleteHistoryOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in font-sans text-xs text-slate-700 flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <History className="text-[#3E2016]" size={20} />
                <h3 className="text-base font-bold text-slate-800">Lịch sử chỉnh sửa & xóa hóa đơn chi phí</h3>
              </div>
              <button
                onClick={() => setIsDeleteHistoryOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 px-6 bg-slate-50/30">
              <button
                onClick={() => setHistoryModalTab("delete")}
                className={`py-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                  historyModalTab === "delete"
                    ? "border-[#3E2016] text-[#3E2016]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Lịch sử xóa ({deleteHistory.length})
              </button>
              <button
                onClick={() => setHistoryModalTab("edit")}
                className={`py-3 px-4 font-bold text-xs border-b-2 transition-all cursor-pointer ${
                  historyModalTab === "edit"
                    ? "border-[#3E2016] text-[#3E2016]"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}
              >
                Lịch sử sửa ({editHistory.length})
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {historyModalTab === "delete" ? (
                deleteHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                    <History size={40} strokeWidth={1} />
                    <span className="font-bold">Chưa có lịch sử xóa hóa đơn chi phí nào</span>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200/60 rounded-xl">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#F8F6F2] font-bold text-slate-600 border-b border-slate-200 uppercase text-[10px]">
                        <tr>
                          <th className="px-4 py-3">Thời gian xóa</th>
                          <th className="px-4 py-3">Người thực hiện</th>
                          <th className="px-4 py-3">Mã hóa đơn</th>
                          <th className="px-4 py-3">Hạng mục</th>
                          <th className="px-4 py-3">Đối tác / NCC</th>
                          <th className="px-4 py-3">Số tiền</th>
                          <th className="px-4 py-3">Ghi chú chi</th>
                          <th className="px-4 py-3 text-right">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                        {deleteHistory.map((log: any) => (
                          <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                              {formatDateTime(log.deletedAt)}
                            </td>
                            <td className="px-4 py-3 text-slate-900 font-bold whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 bg-red-50 text-red-700 border border-red-100 px-2 py-0.5 rounded-full text-[10px]">
                                {log.deletedBy}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-mono font-bold text-slate-500 whitespace-nowrap">
                              #{log.expenseId}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="bg-[#F8F6F2] px-2 py-0.5 rounded border border-slate-200/50 font-bold">
                                {log.category}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800 truncate max-w-[150px]">
                              {log.payee}
                            </td>
                            <td className="px-4 py-3 font-bold text-red-600 whitespace-nowrap">
                              -{formatCurrency(log.amount)}
                            </td>
                            <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]" title={log.note}>
                              {log.note || "—"}
                            </td>
                            <td className="px-4 py-3 text-right whitespace-nowrap">
                              <button
                                onClick={() => {
                                  setSelectedDeletedLog(log);
                                  setIsDeletedDetailOpen(true);
                                }}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg cursor-pointer transition-colors"
                                title="Xem chi tiết lý do xóa"
                              >
                                <Info size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : editHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
                  <History size={40} strokeWidth={1} />
                  <span className="font-bold">Chưa có lịch sử chỉnh sửa hóa đơn chi phí nào</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200/60 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-[#F8F6F2] font-bold text-slate-600 border-b border-slate-200 uppercase text-[10px]">
                      <tr>
                        <th className="px-4 py-3">Thời gian sửa</th>
                        <th className="px-4 py-3">Người thực hiện</th>
                        <th className="px-4 py-3">Mã hóa đơn</th>
                        <th className="px-4 py-3">Hạng mục cũ → Mới</th>
                        <th className="px-4 py-3">Số tiền cũ → Mới</th>
                        <th className="px-4 py-3">Lý do sửa</th>
                        <th className="px-4 py-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                      {editHistory.map((log: any) => (
                        <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                            {formatDateTime(log.editedAt)}
                          </td>
                          <td className="px-4 py-3 text-slate-900 font-bold whitespace-nowrap">
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full text-[10px]">
                              {log.editedBy}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-500 whitespace-nowrap">
                            #{log.expenseId}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-slate-400 line-through">{log.oldData.category}</span>
                            <span className="mx-1 text-slate-450">→</span>
                            <span className="text-slate-800 font-bold">{log.newData.category}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-slate-400 line-through">{formatCurrency(log.oldData.amount)}</span>
                            <span className="mx-1 text-slate-450">→</span>
                            <span className="text-red-650 font-bold">{formatCurrency(log.newData.amount)}</span>
                          </td>
                          <td className="px-4 py-3 text-slate-500 truncate max-w-[150px]" title={log.reason}>
                            {log.reason}
                          </td>
                          <td className="px-4 py-3 text-right whitespace-nowrap">
                            <button
                              onClick={() => {
                                setSelectedEditedLog(log);
                                setIsEditedDetailOpen(true);
                              }}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-lg cursor-pointer transition-colors"
                              title="Xem chi tiết chỉnh sửa"
                            >
                              <Info size={13} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsDeleteHistoryOpen(false)}
                className="rounded-lg bg-[#3E2016] px-5 py-2 text-xs font-bold text-white hover:bg-[#5C2E17] transition-colors shadow-md cursor-pointer"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Deleted Expense Invoice Details Modal */}
      {isDeletedDetailOpen && selectedDeletedLog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in font-sans text-xs text-slate-705 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-150 px-6 py-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <History className="text-red-650" size={18} />
                <h3 className="text-sm font-bold text-slate-800">Chi tiết hóa đơn chi phí đã xóa</h3>
              </div>
              <button
                onClick={() => {
                  setIsDeletedDetailOpen(false);
                  setSelectedDeletedLog(null);
                }}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-slate-500 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-4 bg-red-50/60 border border-red-200/50 rounded-xl space-y-1.5">
                <p className="text-[10px] font-bold text-red-500 uppercase tracking-wider">Thông tin xóa</p>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">Mã phiếu xóa:</span>
                  <span className="text-red-700">#{selectedDeletedLog.id}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">Người xóa:</span>
                  <span className="text-slate-800">{selectedDeletedLog.deletedBy}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-500">Thời gian xóa:</span>
                  <span className="text-slate-800">{formatDateTime(selectedDeletedLog.deletedAt)}</span>
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-red-200/40">
                  <span className="text-[10px] font-bold text-red-500 uppercase tracking-wider block mb-1">Lý do xóa hóa đơn:</span>
                  <p className="text-slate-800 font-extrabold bg-white p-2.5 rounded-lg border border-red-200/50 leading-relaxed text-xs italic">
                    "{selectedDeletedLog.reason || "Không ghi rõ lý do chi tiết"}"
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Thông tin hóa đơn chi ban đầu</p>
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2 font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Mã hóa đơn gốc:</span>
                    <span className="font-bold text-slate-800">#{selectedDeletedLog.expenseId}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Hạng mục chi:</span>
                    <span className="font-bold text-slate-800">{selectedDeletedLog.category}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Đơn vị nhận (Đối tác):</span>
                    <span className="font-bold text-slate-800">{selectedDeletedLog.payee}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Số tiền chi:</span>
                    <span className="font-bold text-red-600">-{formatCurrency(selectedDeletedLog.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Thời gian chi gốc:</span>
                    <span>{formatDateTime(selectedDeletedLog.date)}</span>
                  </div>
                  <div className="pt-2 border-t border-slate-200/50 flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ghi chú chi gốc:</span>
                    <span className="text-slate-800 font-bold italic">{selectedDeletedLog.note || "—"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsDeletedDetailOpen(false);
                  setSelectedDeletedLog(null);
                }}
                className="rounded-lg bg-slate-650 hover:bg-slate-700 text-white px-5 py-2 font-bold transition-colors cursor-pointer text-xs"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edited Details Modal */}
      {isEditedDetailOpen && selectedEditedLog && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in font-sans text-xs text-slate-700 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 bg-amber-50/50">
              <div className="flex items-center gap-2">
                <Info className="text-amber-600 animate-pulse" size={20} />
                <h3 className="text-sm font-bold text-amber-800">Chi tiết lịch sử chỉnh sửa hóa đơn</h3>
              </div>
              <button
                onClick={() => {
                  setIsEditedDetailOpen(false);
                  setSelectedEditedLog(null);
                }}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 space-y-2 font-semibold text-slate-600">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã hóa đơn:</span>
                  <span className="font-bold text-slate-800">#{selectedEditedLog.expenseId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Người chỉnh sửa:</span>
                  <span className="font-bold text-slate-800">{selectedEditedLog.editedBy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Thời gian sửa:</span>
                  <span className="text-slate-800">{formatDateTime(selectedEditedLog.editedAt)}</span>
                </div>
                <div className="mt-2.5 pt-2.5 border-t border-amber-200/40">
                  <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block mb-1">Lý do chỉnh sửa:</span>
                  <p className="text-slate-800 font-extrabold bg-white p-2.5 rounded-lg border border-amber-200/50 leading-relaxed text-xs italic">
                    "{selectedEditedLog.reason}"
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/60 space-y-1.5 font-semibold text-slate-650">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Thông tin ban đầu</p>
                  <div>• Hạng mục: <span className="font-bold text-slate-700">{selectedEditedLog.oldData.category}</span></div>
                  <div>• Đối tác: <span className="font-bold text-slate-700">{selectedEditedLog.oldData.payee}</span></div>
                  <div>• Số tiền: <span className="font-bold text-red-500">-{formatCurrency(selectedEditedLog.oldData.amount)} ₫</span></div>
                  <div>• Ngày: <span className="text-[10px] text-slate-500">{formatDateTime(selectedEditedLog.oldData.date)}</span></div>
                  <div>• Ghi chú: <span className="italic text-slate-500">{selectedEditedLog.oldData.note || "—"}</span></div>
                </div>

                <div className="bg-emerald-50/30 p-3 rounded-xl border border-emerald-200/45 space-y-1.5 font-semibold text-slate-650">
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mb-1">Thông tin cập nhật</p>
                  <div>• Hạng mục: <span className="font-bold text-slate-800">{selectedEditedLog.newData.category}</span></div>
                  <div>• Đối tác: <span className="font-bold text-slate-800">{selectedEditedLog.newData.payee}</span></div>
                  <div>• Số tiền: <span className="font-bold text-red-600">-{formatCurrency(selectedEditedLog.newData.amount)} ₫</span></div>
                  <div>• Ngày: <span className="text-[10px] text-slate-700">{formatDateTime(selectedEditedLog.newData.date)}</span></div>
                  <div>• Ghi chú: <span className="italic text-slate-700">{selectedEditedLog.newData.note || "—"}</span></div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setIsEditedDetailOpen(false);
                  setSelectedEditedLog(null);
                }}
                className="rounded-lg bg-slate-600 hover:bg-slate-700 text-white px-5 py-2 font-bold transition-colors cursor-pointer text-xs"
              >
                Đóng lại
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Operational Expense Modal */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-fade-in font-sans flex flex-col max-h-[90vh]">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-sky-50 bg-sky-50/50 px-6 py-4 flex-shrink-0">
              <div className="flex items-center gap-2">
                <Coins className="text-amber-600" size={20} />
                <h3 className="text-base font-bold text-slate-700">
                  {editingExpenseId ? "Cập nhật hóa đơn chi phí" : "Thêm hóa đơn chi phí"}
                </h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200/60 hover:text-slate-500 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Form Content */}
            <form onSubmit={handleAddExpense} className="flex flex-col flex-1 overflow-hidden text-xs font-semibold text-slate-600">
              <div className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Mã chi phí:</label>
                  <input
                    type="text"
                    placeholder="Nhập mã chi phí (ví dụ: EXP-194132-0)..."
                    value={expenseForm.id}
                    disabled={!!editingExpenseId}
                    onChange={(e) => setExpenseForm({ ...expenseForm, id: e.target.value.toUpperCase().replace(/\s+/g, "") })}
                    className={`w-full px-3 py-2 border rounded-lg outline-none transition-all text-xs font-bold uppercase ${
                      editingExpenseId
                        ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed select-none"
                        : `bg-slate-50 focus:bg-white ${
                            isDuplicateId
                              ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500 text-red-600"
                              : "border-slate-200 focus:border-amber-400"
                          }`
                    }`}
                    required
                  />
                  {isDuplicateId && !editingExpenseId && (
                    <p className="text-red-500 text-[10px] font-bold mt-1.5 animate-pulse">
                      ⚠️ Mã chi phí này đã tồn tại trên hệ thống! Vui lòng nhập mã khác.
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Hạng mục chi phí:</label>
                  <select
                    value={expenseForm.category}
                    onChange={(e) => handleCategoryChangeInForm(e.target.value as any)}
                    disabled={!!editingExpenseId}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg outline-none transition-all text-xs ${
                      editingExpenseId
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed select-none"
                        : "bg-slate-50 focus:border-amber-400 focus:bg-white"
                    }`}
                  >
                    {EXPENSE_CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Người nhận / Đơn vị cung cấp (Chuyển cho ai):</label>
                  <select
                    value={payeeSelectOption}
                    onChange={(e) => handlePayeeOptionChange(e.target.value)}
                    disabled={!!editingExpenseId}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg outline-none transition-all text-xs mb-2 ${
                      editingExpenseId
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed select-none"
                        : "bg-slate-50 focus:border-amber-400 focus:bg-white"
                    }`}
                  >
                    {formSuppliers.map((sup) => (
                      <option key={sup} value={sup}>{sup}</option>
                    ))}
                    <option value="Khác">Khác...</option>
                  </select>

                  {payeeSelectOption === "Khác" && (
                    <div className="mt-2 animate-fade-in">
                      <input
                        type="text"
                        placeholder="Nhập tên người nhận hoặc đơn vị cung cấp khác..."
                        value={customPayeeText}
                        onChange={(e) => handleCustomPayeeChange(e.target.value)}
                        disabled={!!editingExpenseId}
                        className={`w-full px-3 py-2 border border-slate-200 rounded-lg outline-none transition-all text-xs ${
                          editingExpenseId
                            ? "bg-slate-100 text-slate-500 cursor-not-allowed select-none"
                            : "bg-slate-50 focus:border-amber-400 focus:bg-white"
                        }`}
                        required
                      />
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Số tiền chi phí (VNĐ):</label>
                  <input
                    type="text"
                    placeholder="Nhập số tiền..."
                    value={expenseForm.amount}
                    onChange={(e) => setExpenseForm({ ...expenseForm, amount: formatNumberWithDots(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg outline-none bg-slate-50 focus:border-amber-400 focus:bg-white transition-all text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1.5">Thời gian chi phí:</label>
                  <input
                    type="datetime-local"
                    value={expenseForm.date}
                    onChange={(e) => handleDateChangeInForm(e.target.value)}
                    disabled={!!editingExpenseId}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-lg outline-none transition-all text-xs ${
                      editingExpenseId
                        ? "bg-slate-100 text-slate-500 cursor-not-allowed select-none"
                        : "bg-slate-50 focus:border-amber-400 focus:bg-white"
                    }`}
                    required
                  />
                  {["Điện", "Nước", "Internet"].includes(expenseForm.category) && (
                    <p className="text-amber-600 text-[10px] font-bold mt-1">
                      ℹ️ Cố định ngày chi cho {expenseForm.category}: ngày {expenseForm.category === "Điện" ? "8" : expenseForm.category === "Nước" ? "3" : "1"} hàng tháng.
                    </p>
                  )}
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

                {editingExpenseId && (
                  <div className="bg-red-50/40 border border-red-200/50 rounded-xl p-3 space-y-2">
                    <label className="block text-red-700 font-bold mb-1">Lý do chỉnh sửa <span className="text-red-500">*</span></label>
                    <textarea
                      placeholder="Ghi rõ lý do tại sao lại sửa hóa đơn này (ví dụ: nhập sai số tiền, đổi đối tác...)"
                      value={editReason}
                      onChange={(e) => setEditReason(e.target.value)}
                      className="w-full px-3 py-2 border border-red-200 rounded-lg outline-none bg-white focus:border-red-500 transition-all text-xs h-16 resize-none"
                      required
                    />
                  </div>
                )}
              </div>

              {/* Fixed Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 bg-slate-50/50 border-t border-slate-100 rounded-b-2xl flex-shrink-0">
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
                  {editingExpenseId ? "Cập nhật" : "Xác nhận"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
