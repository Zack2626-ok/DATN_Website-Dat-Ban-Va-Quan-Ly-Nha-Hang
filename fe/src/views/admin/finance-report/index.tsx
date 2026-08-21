import React, { useState, useEffect, useMemo } from "react";
import { ArrowDownCircle, ArrowUpCircle, DollarSign, RefreshCw, Inbox, Loader2, ChevronDown, ChevronUp, Printer, CheckCircle2, Clock, RotateCcw, Image, X } from "lucide-react";
import { formatCurrency } from "../../../utils/formatCurrency";
import api from "../../../services/axiosInstance";
import { toast } from "react-hot-toast";
import { getInvoiceByIdApi } from "../../../services/invoiceService";
import { printCashierInvoice } from "../../../utils/printBill";
import { getRestaurantInfo, type RestaurantInfo } from "../../../services/restaurantInfoService";

// Helper chuyển đổi góc sang cung SVG vẽ Doughnut Chart
const describeArc = (cx: number, cy: number, r: number, startAngle: number, endAngle: number): string => {
  const startRad = ((startAngle - 90) * Math.PI) / 180.0;
  const endRad = ((endAngle - 90) * Math.PI) / 180.0;
  const x1 = cx + r * Math.cos(startRad);
  const y1 = cy + r * Math.sin(startRad);
  const x2 = cx + r * Math.cos(endRad);
  const y2 = cy + r * Math.sin(endRad);
  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`;
};

export const FinanceReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>({
    summary: { totalIncome: 0, totalExpenses: 0, netProfit: 0 },
    recentTransactions: []
  });
  const [activeTab, setActiveTab] = useState<"all" | "income" | "expense">("all");
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);
  const [restaurantInfo, setRestaurantInfo] = useState<RestaurantInfo | null>(null);
  const [printingId, setPrintingId] = useState<string | null>(null);
  const [previewProofImage, setPreviewProofImage] = useState<string | null>(null);
  const [hoveredSliceIdx, setHoveredSliceIdx] = useState<number | null>(null);

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);

  const [timeRange, setTimeRange] = useState<"today" | "7days" | "30days" | "custom">("30days");

  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const getNDaysAgoStr = (n: number) => {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d.toISOString().split("T")[0];
  };

  const [startDate, setStartDate] = useState<string>(() => getNDaysAgoStr(30));
  const [endDate, setEndDate] = useState<string>(() => getTodayStr());

  const handleTimeRangeChange = (range: "today" | "7days" | "30days" | "custom") => {
    setTimeRange(range);
    if (range === "today") {
      setStartDate(getTodayStr());
      setEndDate(getTodayStr());
    } else if (range === "7days") {
      setStartDate(getNDaysAgoStr(7));
      setEndDate(getTodayStr());
    } else if (range === "30days") {
      setStartDate(getNDaysAgoStr(30));
      setEndDate(getTodayStr());
    }
  };

  useEffect(() => {
    getRestaurantInfo().then(setRestaurantInfo).catch(console.error);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/v1/analytics/finance-report?startDate=${startDate}&endDate=${endDate}`);
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (error) {
      console.error("Lỗi lấy báo cáo tài chính:", error);
      toast.error("Không thể tải báo cáo tài chính.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [startDate, endDate]);

  const handlePrintInvoice = async (orderId: number) => {
    try {
      setPrintingId(String(orderId));
      const res = await getInvoiceByIdApi(String(orderId));
      if (res) {
        printCashierInvoice(res, "ResManager Bistro", restaurantInfo);
      }
    } catch (err) {
      console.error("Print invoice failed:", err);
      toast.error("Không thể tải hóa đơn để in.");
    } finally {
      setPrintingId(null);
    }
  };

  const handlePrintWarehouse = (tx: any) => {
    let printWindow: Window | null = null;
    try {
      printWindow = window.open("", "_blank", "width=800,height=600");
      if (!printWindow) {
        alert("Không thể mở cửa sổ in. Vui lòng cho phép pop-up.");
        return;
      }
    } catch (err) {
      console.error("Lỗi mở cửa sổ in:", err);
      return;
    }

    const now = new Date(tx.date);
    const printDate = now.toLocaleDateString("vi-VN");
    const printTime = now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

    const rName = restaurantInfo?.name || "NHÀ HÀNG RESMANAGER";
    const rAddr = restaurantInfo?.address || "123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP.HCM";
    const rHotline = restaurantInfo?.hotline || "028 3829 4000";

    const totalAmount = Number(tx.amount || 0);
    const isCredit = Boolean(tx.isCredit);
    const totalQty = tx.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="vi">
      <head>
        <meta charset="UTF-8" />
        <title>Phiếu Nhập Kho - ${tx.id}</title>
        <style>
          body { font-family: 'Courier New', Courier, monospace; font-size: 12px; padding: 20px; color: #000; background-color: #fff; max-width: 600px; margin: 0 auto; }
          .center { text-align: center; }
          .bold { font-weight: bold; }
          .lg { font-size: 14px; }
          .xl { font-size: 18px; }
          .divider { border-top: 1px dashed #000; margin: 15px 0; }
          .row { display: flex; justify-content: space-between; margin: 6px 0; }
          .table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          .table th, .table td { border: 1px solid #000; padding: 8px; text-align: left; }
          .table th { background-color: #f2f2f2; }
          .right { text-align: right; }
          .footer { margin-top: 30px; display: flex; justify-content: space-between; text-align: center; }
        </style>
      </head>
      <body>
        <div class="center bold lg">${rName}</div>
        <div class="center" style="font-size:10px; margin-top:2px;">Địa chỉ: ${rAddr}</div>
        <div class="center" style="font-size:10px;">Hotline: ${rHotline}</div>
        <div class="divider"></div>
        <div class="center bold xl" style="margin: 10px 0;">HOÁ ĐƠN NHẬP HÀNG</div>
        <div class="center bold" style="margin-bottom:10px;">Mã phiếu: ${tx.ticketCode || tx.id}</div>
        <div class="divider"></div>
        <div class="row"><span>Nhà cung cấp:</span><span class="bold">${tx.supplierName || "—"}</span></div>
        <div class="row"><span>Ngày nhập:</span><span>${printDate} ${printTime}</span></div>
        <div class="row"><span>Người nhập:</span><span class="bold">Nhân viên kho</span></div>
        <div class="row"><span>Trạng thái công nợ:</span><span class="bold">${isCredit ? "Công nợ (Chưa thanh toán)" : "Đã thanh toán"}</span></div>
        ${isCredit && tx.dueDate ? `<div class="row"><span>Hạn thanh toán:</span><span>${new Date(tx.dueDate).toLocaleDateString("vi-VN")}</span></div>` : ""}
        
        <table class="table">
          <thead>
            <tr>
              <th>STT</th>
              <th>Hàng hóa</th>
              <th class="right">SL</th>
              <th class="right">Đơn giá</th>
              <th class="right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            ${(tx.items || []).map((item: any, idx: number) => `
              <tr>
                <td>${idx + 1}</td>
                <td>${item.ingredientName || "Nguyên liệu"}</td>
                <td class="right">${item.quantity} ${item.ingredientUnit || ""}</td>
                <td class="right">${Number(item.unitCost || 0).toLocaleString("vi-VN")} đ</td>
                <td class="right">${Number(item.amount || 0).toLocaleString("vi-VN")} đ</td>
              </tr>
            `).join("")}
          </tbody>
        </table>
        
        <div style="margin-top: 15px; text-align: right; font-weight: bold;">
          <p>Tổng số lượng: ${totalQty}</p>
          <p>Tổng thanh toán: ${totalAmount.toLocaleString("vi-VN")} đ</p>
          <p>Đã thanh toán: ${isCredit ? "0" : totalAmount.toLocaleString("vi-VN")} đ</p>
        </div>
        
        <div class="footer">
          <div>
            <b>Người giao hàng</b><br><br><br><br>
            (Ký và ghi rõ họ tên)
          </div>
          <div>
            <b>Người nhận hàng</b><br><br><br><br>
            (Ký và ghi rõ họ tên)
          </div>
        </div>
        <script>window.onload = function() { window.print(); };</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const groupedTransactions = useMemo(() => {
    const rawList = data.recentTransactions || [];
    
    // Tách income thành: hóa đơn bán hàng và trả hàng NCC
    const invoiceIncomeList = rawList
      .filter((tx: any) => tx.type === "income" && tx.txSubType !== "return_supplier")
      .map((tx: any) => ({
        ...tx,
        hasRefund: Boolean(tx.hasRefund),
        refundedTotal: Number(tx.refundedTotal || 0)
      }));
    
    // Gom nhóm trả hàng NCC theo SLIP code & theo vết mã phiếu nhập (e.g. PN...) (chỉ tính phiếu ĐÃ TRẢ HÀNG)
    const returnList = rawList.filter((tx: any) => 
      tx.type === "income" && 
      tx.txSubType === "return_supplier" &&
      !String(tx.note || "").includes("[LƯU TẠM]") &&
      !String(tx.note || "").includes("[HOÀN THÀNH]")
    );
    const returnGroups: { [key: string]: any } = {};
    const returnedSlipMap: { [importTicketCode: string]: number } = {};

    returnList.forEach((tx: any) => {
      const noteStr = tx.note || "";
      const slipMatch = noteStr.match(/\[SLIP:([^\]]+)\]/);
      const dateMinuteStr = new Date(tx.date).toISOString().slice(0, 16);
      const supplierName = tx.supplierName || "NCC";
      const groupKey = slipMatch ? `RET-${slipMatch[1]}` : `RET-${dateMinuteStr}_${supplierName}`;
      const ticketCode = slipMatch ? slipMatch[1] : `TXT${new Date(tx.date).getFullYear()}${String(new Date(tx.date).getMonth() + 1).padStart(2, '0')}${String(new Date(tx.date).getDate()).padStart(2, '0')}N-${String(tx.id).slice(-4)}`;

      const qty = Math.abs(Number(tx.quantity) || 0);
      const price = Number(tx.unitCost) || 0;
      const total = qty * price;

      // Extract referenced import slip code from note (e.g. "Trả hàng cho phiếu PN20260804N-1834")
      const importRefMatch = noteStr.match(/PN\d{8}N?-\d+/);
      if (importRefMatch) {
        const importCode = importRefMatch[0];
        returnedSlipMap[importCode] = (returnedSlipMap[importCode] || 0) + total;
      }

      if (!returnGroups[groupKey]) {
        returnGroups[groupKey] = {
          id: groupKey,
          ticketCode,
          type: "income",
          txSubType: "return_supplier",
          date: tx.date,
          status: "completed",
          supplierName,
          isCredit: false,
          note: noteStr,
          items: [],
          amount: 0,
          hasRefund: false,
          refundedTotal: 0
        };
      }
      returnGroups[groupKey].items.push({
        ingredientName: tx.ingredientName || "Nguyên liệu",
        quantity: qty,
        unitCost: price,
        ingredientUnit: tx.ingredientUnit || "kg",
        batchCode: tx.batchCode || "-",
        amount: total
      });
      returnGroups[groupKey].amount += total;
    });



    // Tách riêng các loại chi phí:
    // 1) Chi phí nhập nguyên liệu / hàng hóa (stock_in có batchNo hoặc ingredientName hoặc txSubType === "stock_in")
    const stockInList = rawList.filter((tx: any) => tx.type === "expense" && (tx.txSubType === "stock_in" || tx.ingredientName) && !String(tx.batchNo || "").startsWith("LOT-ADJ-"));
    
    // 2) Các khoản chi trực tiếp khác (Thanh toán công nợ NCC, trả lương, chi phí vận hành)
    const directExpenseList = rawList.filter((tx: any) => tx.type === "expense" && tx.txSubType !== "stock_in" && !tx.ingredientName);
    const expenseGroups: { [key: string]: any } = {};

    stockInList.forEach((tx: any) => {
      const noteStr = tx.note || "";
      const slipMatch = noteStr.match(/\[SLIP:([^\]]+)\]/);
      
      const parts = noteStr.split(" - Ghi chú: ");
      const rawSupplierText = parts[0] || "Khác";
      const cleanSupplier = rawSupplierText
        .replace(/\[SLIP:[^\]]+\]\s*/g, "")
        .replace("[LƯU TẠM] ", "")
        .replace("Nhập hàng từ ", "")
        .trim() || tx.supplierName || "Nhà cung cấp";

      const dateMinuteStr = new Date(tx.date).toISOString().slice(0, 16);
      const groupKey = slipMatch 
        ? slipMatch[1] 
        : `${dateMinuteStr}_${cleanSupplier}_done`;

      const ticketCode = slipMatch ? slipMatch[1] : `PN${new Date(tx.date).getFullYear()}${String(new Date(tx.date).getMonth() + 1).padStart(2, '0')}${String(new Date(tx.date).getDate()).padStart(2, '0')}-${String(tx.id).slice(-4)}`;

      const qty = Math.abs(Number(tx.quantity) || 0);
      const returnedQty = Math.abs(Number(tx.returnedQuantity) || 0);
      const price = Number(tx.unitCost) || 0;
      const total = qty * price;
      const paid = Number(tx.paidAmount !== undefined && tx.paidAmount !== null ? tx.paidAmount : (tx.isCredit ? 0 : total));
      const returnedTotal = returnedQty * price;

      if (!expenseGroups[groupKey]) {
        expenseGroups[groupKey] = {
          id: groupKey,
          ticketCode,
          type: "expense",
          date: tx.date,
          status: "completed",
          supplierName: cleanSupplier || tx.supplierName,
          isCredit: Boolean(tx.isCredit),
          dueDate: tx.dueDate,
          note: parts[1] || "",
          items: [],
          originalAmount: 0,
          returnedAmount: 0,
          paidAmount: 0,
          amount: 0
        };
      }

      expenseGroups[groupKey].items.push({
        ingredientName: tx.ingredientName || "Nguyên liệu",
        quantity: qty,
        returnedQuantity: returnedQty,
        unitCost: price,
        ingredientUnit: tx.ingredientUnit || "kg",
        batchCode: tx.batchCode || "-",
        amount: total,
        paidAmount: paid,
        returnedAmount: returnedTotal
      });

      expenseGroups[groupKey].originalAmount += total;
      expenseGroups[groupKey].paidAmount += paid;
      expenseGroups[groupKey].returnedAmount += returnedTotal;
    });

    const processedExpenses = Object.values(expenseGroups).map((group: any) => {
      const mapReturnedAmt = returnedSlipMap[group.ticketCode] || returnedSlipMap[group.id] || 0;
      const returnedAmount = Math.max(group.returnedAmount, mapReturnedAmt);
      const originalAmount = group.originalAmount;

      const isReturned = returnedAmount >= originalAmount && originalAmount > 0;
      const isPartiallyReturned = returnedAmount > 0 && !isReturned;

      const totalItems = group.items.length;
      const firstItem = group.items[0];
      let description = totalItems > 1 
        ? `Nhập kho: ${firstItem?.ingredientName || 'Nguyên liệu'} (+${totalItems - 1} mặt hàng khác)`
        : `Nhập kho: ${firstItem?.ingredientName || 'Nguyên liệu'}`;

      if (isReturned) {
        description = `Nhập kho (Đã xuất trả NCC): ${firstItem?.ingredientName || 'Nguyên liệu'}` + (totalItems > 1 ? ` (+${totalItems - 1} mặt hàng khác)` : "");
      }

      const netAmount = isReturned 
        ? 0 
        : group.isCredit 
          ? group.paidAmount 
          : Math.max(0, originalAmount - returnedAmount);

      return {
        ...group,
        amount: netAmount,
        originalAmount,
        returnedAmount,
        paidAmount: group.paidAmount,
        isReturned,
        isPartiallyReturned,
        description
      };
    });

    const processedReturns = Object.values(returnGroups)
      .map((group: any) => {
        const totalItems = group.items.length;
        const firstItem = group.items[0];
        const description = totalItems > 1
          ? `Trả hàng NCC: ${firstItem?.ingredientName || 'Nguyên liệu'} (+${totalItems - 1} mặt hàng khác)`
          : `Trả hàng NCC: ${firstItem?.ingredientName || 'Nguyên liệu'}`;
        return { ...group, description };
      })
      .filter((retGroup: any) => {
        // Exclude separate return income rows for slips that are already netted inside processedExpenses
        const hasMatchingExpense = Object.values(expenseGroups).some(
          (exp: any) => (exp.ticketCode && retGroup.ticketCode && exp.ticketCode === retGroup.ticketCode) || exp.id === retGroup.id
        );
        return !hasMatchingExpense;
      });

    const processedDirectExpenses = directExpenseList.map((tx: any) => ({
      ...tx,
      amount: Number(tx.amount || 0),
      isDirectExpense: true,
      items: []
    }));

    const combined = [...invoiceIncomeList, ...processedReturns, ...processedExpenses, ...processedDirectExpenses];
    combined.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return combined;
  }, [data.recentTransactions]);

  const filteredTransactions = useMemo(() => {
    if (activeTab === "all") return groupedTransactions;
    return groupedTransactions.filter((tx: any) => tx.type === activeTab);
  }, [groupedTransactions, activeTab]);

  useEffect(() => {
    setCurrentPage(1);
    setExpandedTxId(null);
  }, [activeTab, startDate, endDate]);

  const totalPages = Math.ceil(filteredTransactions.length / rowsPerPage);

  const paginatedTransactions = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return filteredTransactions.slice(start, start + rowsPerPage);
  }, [filteredTransactions, currentPage, rowsPerPage]);

  const pieData = useMemo(() => {
    const raw = [
      { name: "Nguyên vật liệu", value: Number(data?.summary?.materialCost) || 0, color: "#3b82f6" },
      { name: "Lương nhân viên", value: Number(data?.summary?.salaryCost) || 0, color: "#10b981" },
      { name: "Chi phí vận hành", value: Number(data?.summary?.operationalCost) || 0, color: "#f59e0b" },
    ].filter((d) => d.value > 0);

    if (raw.length === 0 && Number(data?.summary?.totalExpenses) > 0) {
      return [{ name: "Chi phí khác", value: Number(data.summary.totalExpenses), color: "#ef4444" }];
    }
    return raw;
  }, [data?.summary]);

  const SUMMARY = [
    {
      label: "Doanh thu",
      value: data.summary.totalIncome,
      icon: ArrowUpCircle,
      accent: "from-emerald-500 to-emerald-400",
      iconBg: "bg-emerald-50 text-emerald-600",
      ring: "ring-emerald-100",
    },
    {
      label: "Tổng chi phí",
      value: data.summary.totalExpenses,
      icon: ArrowDownCircle,
      accent: "from-rose-500 to-rose-400",
      iconBg: "bg-rose-50 text-rose-600",
      ring: "ring-rose-100",
    },
    {
      label: "Lợi nhuận ròng",
      value: data.summary.netProfit,
      icon: DollarSign,
      accent: "from-sky-600 to-sky-400",
      iconBg: "bg-sky-50 text-sky-700",
      ring: "ring-sky-100",
    },
  ];

  return (
    <div className="space-y-4 font-sans text-[#1A1A1A]">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#FFFFFF] p-5 rounded-3xl border border-slate-200/70 shadow-xs">
        <div>
          <h1 className="text-2xl font-black text-[#1A1A1A] tracking-tight">
            Báo cáo tài chính thu / chi
          </h1>
          <p className="text-xs font-semibold text-[#8A8A8A] mt-0.5">
            Tổng hợp dòng tiền thực tế (Thu từ Hóa đơn, Chi từ Nhập kho)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Date range tab selector matching image 2 */}
          <div className="flex gap-1 bg-slate-100 p-1 rounded-full shrink-0">
            {[
              { value: "today", label: "Hôm nay" },
              { value: "7days", label: "7 ngày qua" },
              { value: "30days", label: "30 ngày qua" },
              { value: "custom", label: "Tùy chỉnh" }
            ].map(range => (
              <button
                key={range.value}
                onClick={() => handleTimeRangeChange(range.value as any)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-bold transition-all cursor-pointer ${
                  timeRange === range.value
                    ? "bg-[#3E2016] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#3E2016] hover:bg-slate-50"
                }`}
              >
                {range.label}
              </button>
            ))}
          </div>

          {/* If custom is selected, show the date pickers */}
          {timeRange === "custom" && (
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-full px-4 py-2 text-xs animate-fade-in">
              <span className="text-slate-500 font-bold">Từ:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
              />
              <span className="text-slate-500 font-bold border-l border-slate-300 pl-2">Đến:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
              />
            </div>
          )}

          <button
            type="button"
            onClick={fetchData}
            disabled={loading}
            className="px-5 py-2.5 bg-[#3E2016] hover:bg-[#5C2E17] text-[#FFFFFF] text-xs font-black rounded-full transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95 shrink-0 disabled:opacity-50"
          >
            <RefreshCw size={17} className={loading ? "animate-spin" : ""} />
            Làm mới
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        {SUMMARY.map((item) => (
          <div
            key={item.label}
            className="group relative overflow-hidden rounded-3xl border border-slate-200/70 bg-[#FFFFFF] p-5 shadow-xs transition-shadow hover:shadow-md"
          >
            <span
              className={`absolute inset-x-0 top-0 h-1 bg-linear-to-r ${item.accent}`}
            />
            <div className="flex items-start justify-between">
              <p className="text-xs font-bold text-[#8A8A8A]">{item.label}</p>
              <span className={`rounded-full p-2.5 ${item.iconBg}`}>
                <item.icon size={18} />
              </span>
            </div>
            <p className="mt-4 text-2xl font-black tabular-nums text-[#1A1A1A]">
              {formatCurrency(item.value)}
            </p>
            {item.label === "Tổng chi phí" && data.summary.materialCost !== undefined && (
              <div className="mt-3 pt-3 border-t border-slate-100 flex flex-col gap-1.5 text-xs font-medium text-slate-500">
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#3b82f6]"></span>Nguyên liệu:</span>
                  <span className="text-slate-700 font-semibold">{formatCurrency(data.summary.materialCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#10b981]"></span>Lương NV:</span>
                  <span className="text-slate-700 font-semibold">{formatCurrency(data.summary.salaryCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b]"></span>Vận hành:</span>
                  <span className="text-slate-700 font-semibold">{formatCurrency(data.summary.operationalCost)}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Expense Doughnut Chart */}
      {pieData.length > 0 && (() => {
        const totalExpenseAmount = pieData.reduce((acc, curr) => acc + curr.value, 0);
        let cumulativeAngle = 0;

        return (
          <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-[#FFFFFF] shadow-xs p-6 flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="w-full md:w-1/3 space-y-2">
              <h2 className="font-playfair text-lg font-bold text-sky-900">Phân bổ chi phí</h2>
              <p className="text-xs text-slate-500">
                Tỷ trọng các loại chi phí trong tổng chi thực tế ({formatCurrency(totalExpenseAmount)})
              </p>
            </div>
            
            <div className="w-full md:w-2/3 flex flex-col sm:flex-row items-center justify-center gap-8">
              {/* SVG Doughnut */}
              <div className="relative w-48 h-48 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                  {pieData.map((item, idx) => {
                    const percentage = totalExpenseAmount > 0 ? (item.value / totalExpenseAmount) : 0;
                    const angle = percentage * 360;
                    const startAngle = cumulativeAngle;
                    const endAngle = cumulativeAngle + angle;
                    cumulativeAngle = endAngle;

                    const isHovered = hoveredSliceIdx === idx;
                    const isSingleSlice = pieData.length === 1 || percentage >= 0.999;

                    if (isSingleSlice) {
                      return (
                        <circle
                          key={idx}
                          cx="100"
                          cy="100"
                          r="68"
                          fill="none"
                          stroke={item.color}
                          strokeWidth={isHovered ? 34 : 28}
                          className="transition-all duration-300 cursor-pointer"
                          onMouseEnter={() => setHoveredSliceIdx(idx)}
                          onMouseLeave={() => setHoveredSliceIdx(null)}
                        />
                      );
                    }

                    const pathD = describeArc(100, 100, 68, startAngle, Math.max(startAngle + 0.1, endAngle - 1.5));
                    return (
                      <path
                        key={idx}
                        d={pathD}
                        fill="none"
                        stroke={item.color}
                        strokeWidth={isHovered ? 34 : 28}
                        strokeLinecap="round"
                        className="transition-all duration-300 cursor-pointer hover:opacity-90"
                        onMouseEnter={() => setHoveredSliceIdx(idx)}
                        onMouseLeave={() => setHoveredSliceIdx(null)}
                      />
                    );
                  })}
                </svg>

                {/* Center text in Donut */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 pointer-events-none">
                  {hoveredSliceIdx !== null && pieData[hoveredSliceIdx] ? (
                    <>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[110px]">
                        {pieData[hoveredSliceIdx].name}
                      </span>
                      <span className="text-xs font-black text-slate-800 mt-0.5">
                        {formatCurrency(pieData[hoveredSliceIdx].value)}
                      </span>
                      <span className="text-[10px] font-bold text-sky-600 mt-0.5">
                        {totalExpenseAmount > 0 ? ((pieData[hoveredSliceIdx].value / totalExpenseAmount) * 100).toFixed(1) : 0}%
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Tổng chi phí
                      </span>
                      <span className="text-xs font-black text-slate-800 mt-0.5">
                        {formatCurrency(totalExpenseAmount)}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Legend List */}
              <div className="flex flex-col gap-2.5 w-full max-w-xs">
                {pieData.map((item, idx) => {
                  const pct = totalExpenseAmount > 0 ? ((item.value / totalExpenseAmount) * 100).toFixed(1) : "0";
                  const isHovered = hoveredSliceIdx === idx;
                  return (
                    <div
                      key={idx}
                      onMouseEnter={() => setHoveredSliceIdx(idx)}
                      onMouseLeave={() => setHoveredSliceIdx(null)}
                      className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isHovered
                          ? "bg-slate-50 border-slate-300 shadow-xs scale-102"
                          : "bg-white border-slate-100 hover:border-slate-200"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-bold text-slate-700">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-slate-900">{formatCurrency(item.value)}</span>
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-md">
                          {pct}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Transactions table */}
      <div className="overflow-hidden rounded-3xl border border-slate-200/70 bg-[#FFFFFF] shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 px-6 py-4 gap-3">
          <div className="flex items-center gap-2">
            <h2 className="font-playfair text-base font-bold text-sky-800">
              Chi tiết giao dịch gần đây
            </h2>
            {!loading && filteredTransactions.length > 0 && (
              <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-600">
                {filteredTransactions.length} giao dịch
              </span>
            )}
          </div>
          <div className="flex gap-1 bg-slate-100 p-1 rounded-xl shrink-0 self-start sm:self-auto">
            {[
              { value: "all", label: "Tất cả" },
              { value: "income", label: "Thu" },
              { value: "expense", label: "Chi" }
            ].map(tab => (
              <button
                key={tab.value}
                onClick={() => {
                  setActiveTab(tab.value as any);
                  setExpandedTxId(null); // Close expanded detail when switching tabs
                }}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  activeTab === tab.value
                    ? "bg-[#3E2016] text-white shadow-xs animate-fade-in"
                    : "text-slate-600 hover:text-[#3E2016] hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-sky-50/60 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5 font-semibold">Ngày</th>
                <th className="px-5 py-3.5 font-semibold">Mã GD</th>
                <th className="px-5 py-3.5 font-semibold">Loại</th>
                <th className="px-5 py-3.5 font-semibold">Hạng mục / Chi tiết</th>
                <th className="px-5 py-3.5 text-right font-semibold">Số tiền</th>
                <th className="px-5 py-3.5 text-center font-semibold w-12">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 size={22} className="animate-spin text-sky-400" />
                      <span className="text-sm">Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center gap-2">
                      <Inbox size={26} className="text-slate-300" />
                      <span className="text-sm">Chưa có giao dịch nào thuộc loại này</span>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTransactions.map((row: any, idx: number) => {
                  const isExpanded = expandedTxId === row.id;
                  return (
                    <React.Fragment key={`${row.id}-${row.date}`}>
                      <tr
                        onClick={() => setExpandedTxId(isExpanded ? null : row.id)}
                        className={`transition-colors hover:bg-sky-50/45 cursor-pointer ${
                          idx % 2 === 1 ? "bg-slate-50/20" : ""
                        } ${isExpanded ? "bg-sky-50/30" : ""}`}
                      >
                        <td className="px-5 py-4 text-slate-600 text-xs">
                          {new Date(row.date).toLocaleString("vi-VN")}
                        </td>
                        <td className="px-5 py-4 font-mono text-xs text-slate-500 font-bold">{row.id}</td>
                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${
                              row.isReturned
                                ? "bg-purple-50 text-purple-700 border-purple-200"
                                : row.type === "income"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-rose-50 text-rose-700 border-rose-200"
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                row.isReturned ? "bg-purple-500" : row.type === "income" ? "bg-emerald-500" : "bg-rose-500"
                              }`}
                            />
                            {row.isReturned ? "Đã trả hàng" : row.type === "income" ? "Thu" : "Chi"}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-700 text-xs font-medium">
                          {row.description}
                          {row.isReturned ? (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              Đã trả hàng NCC
                            </span>
                          ) : row.isPartiallyReturned ? (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                              Xuất trả 1 phần NCC
                            </span>
                          ) : row.type === "expense" && row.isCredit && Number(row.amount) === 0 ? (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Mua nợ NCC (0 đ chi)
                            </span>
                          ) : row.type === "expense" && row.isCredit && Number(row.amount) > 0 ? (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                              Trả 1 phần (Còn nợ NCC)
                            </span>
                          ) : null}
                          {row.txSubType === "debt_payment" && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] font-bold text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded border border-sky-200">
                              Trả nợ NCC
                            </span>
                          )}
                          {row.txSubType === "payroll" && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-200">
                              Lương NV
                            </span>
                          )}
                          {row.txSubType === "operational" && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              Vận hành
                            </span>
                          )}
                          {row.type === "income" && row.hasRefund && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">
                              Hoàn tiền
                            </span>
                          )}
                          {row.txSubType === "return_supplier" && (
                            <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded border border-teal-200">
                              Trả hàng NCC
                            </span>
                          )}
                        </td>
                        <td
                          className={`px-5 py-4 text-right tabular-nums`}
                        >
                          <div className={`font-black text-xs ${
                            row.isReturned 
                              ? "text-purple-700" 
                              : row.isPartiallyReturned 
                              ? "text-purple-700 font-black" 
                              : row.type === "income" 
                              ? "text-emerald-700" 
                              : Number(row.amount) === 0 
                              ? "text-slate-500 font-bold" 
                              : "text-rose-700"
                          }`}>
                            {row.isReturned 
                              ? `-${formatCurrency(Number(row.returnedAmount || row.amount))}` 
                              : row.isPartiallyReturned 
                              ? `-${formatCurrency(Number(row.returnedAmount))}` 
                              : Number(row.amount) === 0 
                              ? "0 đ" 
                              : `${row.type === "income" ? "+" : "-"}${formatCurrency(Number(row.amount))}`}
                          </div>
                          {row.isReturned && (
                            <div className="text-[9px] text-purple-600 font-bold mt-0.5">
                              (Đã xuất trả toàn bộ: -{formatCurrency(row.returnedAmount || row.originalAmount)})
                            </div>
                          )}
                          {!row.isReturned && row.isPartiallyReturned && (
                            <div className="text-[9px] text-purple-600 font-bold mt-0.5">
                              Đã xuất trả 1 phần NCC: -{formatCurrency(row.returnedAmount)} (Tổng gốc: {formatCurrency(row.originalAmount)}, Hàng giữ lại: {formatCurrency(Math.max(0, row.originalAmount - row.returnedAmount))})
                            </div>
                          )}
                          {row.type === "expense" && row.isCredit && Number(row.amount) === 0 && (
                            <div className="text-[9px] text-amber-600 font-bold mt-0.5">
                              (Mua nợ NCC: {formatCurrency(row.originalAmount || 0)} - Chi thực tế: 0 đ)
                            </div>
                          )}
                          {row.type === "expense" && row.isCredit && Number(row.amount) > 0 && (
                            <div className="text-[9px] text-amber-700 font-bold mt-0.5">
                              (Đã trả: -{formatCurrency(row.amount)}, Ghi nợ: {formatCurrency(Math.max(0, (row.originalAmount || 0) - row.amount))})
                            </div>
                          )}
                          {row.type === "income" && row.hasRefund && row.refundedTotal > 0 && (
                            <div className="text-[9px] text-red-500 font-bold mt-0.5">
                              Hoàn: -{formatCurrency(row.refundedTotal)}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-center text-slate-400">
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </td>
                      </tr>

                      {/* Accordion Expanded Detail Panel */}
                      {isExpanded && (
                        <tr className="bg-sky-50/10">
                          <td colSpan={6} className="px-6 py-4 border-t border-slate-100">
                            {row.txSubType === "return_supplier" ? (
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-teal-50/40 p-5 rounded-2xl border border-teal-100/80 animate-fade-in text-xs">
                                {/* Left: returned items list */}
                                <div className="lg:col-span-2 space-y-2">
                                  <h4 className="font-bold text-teal-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    📦 Hàng đã trả lại NCC ({row.items?.length || 0} món)
                                  </h4>
                                  <div className="overflow-hidden rounded-xl border border-teal-200 bg-white">
                                    <table className="min-w-full divide-y divide-slate-200">
                                      <thead className="bg-teal-50 text-[10px] font-bold text-teal-700 uppercase tracking-wider">
                                        <tr>
                                          <th scope="col" className="px-4 py-2 text-left w-10">#</th>
                                          <th scope="col" className="px-4 py-2 text-left">Tên hàng hóa</th>
                                          <th scope="col" className="px-4 py-2 text-right">SL trả</th>
                                          <th scope="col" className="px-4 py-2 text-right">Đơn giá</th>
                                          <th scope="col" className="px-4 py-2 text-right">Thành tiền</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-[11px] text-slate-800">
                                        {(row.items || []).map((item: any, idx: number) => (
                                          <tr key={idx} className="hover:bg-teal-50/30">
                                            <td className="px-4 py-2 text-slate-500">{idx + 1}</td>
                                            <td className="px-4 py-2">
                                              <div className="font-bold text-slate-800">{item.ingredientName}</div>
                                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">Lô: {item.batchCode}</div>
                                            </td>
                                            <td className="px-4 py-2 text-right font-bold text-teal-700">{item.quantity} {item.ingredientUnit}</td>
                                            <td className="px-4 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                                            <td className="px-4 py-2 text-right font-bold text-emerald-700">{formatCurrency(item.amount)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                                {/* Right: return info */}
                                <div className="space-y-3 flex flex-col justify-between">
                                  <div className="space-y-3">
                                    <h4 className="font-bold text-teal-800 text-xs uppercase tracking-wider mb-2">
                                      💰 Thông tin hoàn tiền
                                    </h4>
                                    <div className="bg-white p-4 rounded-xl border border-teal-200 space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">Mã phiếu trả:</span>
                                        <span className="font-mono text-teal-700 font-bold">{row.ticketCode || row.id}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">Nhà cung cấp:</span>
                                        <span className="font-bold text-slate-800">{row.supplierName || "—"}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">Số món trả:</span>
                                        <span className="font-bold">{row.items?.length || 0} món</span>
                                      </div>
                                      <div className="border-t border-dashed border-teal-200 my-2 pt-2">
                                        <div className="flex justify-between">
                                          <span className="text-slate-500 font-semibold">Tổng hoàn về:</span>
                                          <span className="font-black text-emerald-700 text-sm">{formatCurrency(row.amount)}</span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[10px] text-emerald-800 font-semibold">
                                      ✅ NCC đã hoàn trả tiền mặt / chuyển khoản cho nhà hàng
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : row.txSubType === "debt_payment" ? (
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-sky-50/50 p-4 rounded-2xl border border-sky-100 animate-fade-in text-xs">
                                <div className="space-y-1.5">
                                  <h4 className="font-bold text-sky-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    💳 Phiếu chi thanh toán công nợ NCC
                                  </h4>
                                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-slate-700">
                                    <span>Nhà cung cấp: <strong className="text-slate-900">{row.supplierName}</strong></span>
                                    <span>Hình thức: <strong className="text-slate-900">{row.method === "cash" ? "Tiền mặt" : "Chuyển khoản"}</strong></span>
                                    {row.note && <span>Ghi chú: <strong className="text-slate-900">{row.note}</strong></span>}
                                  </div>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-slate-500 font-semibold block">Số tiền đã chi trả</span>
                                  <span className="text-base font-black text-rose-600">-{formatCurrency(row.amount)}</span>
                                </div>
                              </div>
                            ) : row.txSubType === "payroll" ? (
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-purple-50/50 p-4 rounded-2xl border border-purple-100 animate-fade-in text-xs">
                                <div className="space-y-1">
                                  <h4 className="font-bold text-purple-900 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    👥 Chi trả lương nhân viên
                                  </h4>
                                  <p className="text-slate-700 font-medium">{row.description}</p>
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-slate-500 font-semibold block">Tiền lương</span>
                                  <span className="text-base font-black text-rose-600">-{formatCurrency(row.amount)}</span>
                                </div>
                              </div>
                            ) : row.txSubType === "operational" ? (
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200 animate-fade-in text-xs">
                                <div className="space-y-1">
                                  <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    ⚙️ Chi phí vận hành
                                  </h4>
                                  <p className="text-slate-700 font-medium">{row.description}</p>
                                  {row.category && <p className="text-slate-500 text-[11px]">Danh mục: <strong>{row.category}</strong></p>}
                                </div>
                                <div className="text-right">
                                  <span className="text-xs text-slate-500 font-semibold block">Số tiền</span>
                                  <span className="text-base font-black text-rose-600">-{formatCurrency(row.amount)}</span>
                                </div>
                              </div>
                            ) : row.type === "expense" ? (
                              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-50/80 p-5 rounded-2xl border border-slate-100/80 animate-fade-in text-xs">
                                {/* Left column: List of products (2 cols in large) */}
                                <div className="lg:col-span-2 space-y-2">
                                  <h4 className="font-bold text-[#3E2016] text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    🔹 Danh sách hàng hóa chi tiết ({row.items?.length || 0} món)
                                  </h4>
                                  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                                    <table className="min-w-full divide-y divide-slate-200">
                                      <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                        <tr>
                                          <th scope="col" className="px-4 py-2 text-left w-10">#</th>
                                          <th scope="col" className="px-4 py-2 text-left">Tên hàng hóa</th>
                                          <th scope="col" className="px-4 py-2 text-right">SL</th>
                                          <th scope="col" className="px-4 py-2 text-right">Giá nhập</th>
                                          <th scope="col" className="px-4 py-2 text-right">Thành tiền</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-[11px] text-[#1A1A1A]">
                                        {(row.items || []).map((item: any, idx: number) => (
                                          <tr key={idx} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-2 text-slate-500">{idx + 1}</td>
                                            <td className="px-4 py-2">
                                              <div className="font-bold text-slate-800">{item.ingredientName}</div>
                                              <div className="text-[9px] text-slate-400 font-mono mt-0.5">Lô: {item.batchCode}</div>
                                            </td>
                                            <td className="px-4 py-2 text-right font-bold">{item.quantity} {item.ingredientUnit}</td>
                                            <td className="px-4 py-2 text-right">{formatCurrency(item.unitCost)}</td>
                                            <td className="px-4 py-2 text-right font-bold text-slate-700">{formatCurrency(item.amount)}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* Right column: Summary & debt info */}
                                <div className="space-y-3 flex flex-col justify-between">
                                  <div className="space-y-3">
                                    <h4 className="font-bold text-[#3E2016] text-xs uppercase tracking-wider mb-2">
                                      📊 Thông tin phiếu nhập
                                    </h4>
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">Mã phiếu:</span>
                                        <span className="font-mono text-[#3E2016] font-bold">{row.ticketCode || row.id}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">Nhà cung cấp:</span>
                                        <span className="font-bold text-slate-800">{row.supplierName || "—"}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-slate-500 font-medium">Số món:</span>
                                        <span className="font-bold text-slate-800">{row.items?.length || 0} món ({row.items?.reduce((s: number, i: any) => s + i.quantity, 0) || 0} {row.items?.[0]?.ingredientUnit || "kg"})</span>
                                      </div>
                                      <div className="border-t border-dashed border-slate-200 my-2 pt-2 space-y-1">
                                        <div className="flex justify-between text-xs">
                                          <span className="text-slate-500 font-semibold">Tổng tiền gốc:</span>
                                          <span className={`font-black ${row.isReturned ? "line-through text-slate-400" : "text-slate-900"}`}>{formatCurrency(row.originalAmount || row.amount)}</span>
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-slate-500 font-semibold">Đã trả tiền / nợ thực tế:</span>
                                          <span className={`font-bold ${row.isReturned ? "text-purple-700" : row.isCredit ? "text-amber-700" : "text-emerald-600"}`}>
                                            {row.isReturned
                                              ? "0 đ (Đã xuất trả toàn bộ)"
                                              : row.isCredit && Number(row.paidAmount) > 0 && Math.max(0, (row.originalAmount || row.amount) - Number(row.paidAmount)) > 0
                                              ? `Đã trả: ${formatCurrency(row.paidAmount)} | Còn nợ: ${formatCurrency(Math.max(0, (row.originalAmount || row.amount) - Number(row.paidAmount)))}`
                                              : row.isCredit && (!row.paidAmount || Number(row.paidAmount) === 0)
                                              ? `${formatCurrency(Math.max(0, (row.originalAmount || row.amount) - (row.returnedAmount || 0)))} (Ghi nợ NCC)`
                                              : formatCurrency(Math.max(0, (row.originalAmount || row.amount) - (row.returnedAmount || 0)))}
                                          </span>
                                        </div>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-slate-500 font-medium">Trạng thái nợ:</span>
                                        {row.isReturned ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 font-bold border border-purple-200">
                                            <RotateCcw size={11} /> Đã xuất trả NCC (Đã xóa nợ)
                                          </span>
                                        ) : row.isPartiallyReturned ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-bold border border-indigo-200">
                                            <RotateCcw size={11} /> Đã xuất trả 1 phần NCC
                                          </span>
                                        ) : row.isCredit ? (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 font-bold border border-amber-200">
                                            <Clock size={11} /> Công nợ
                                          </span>
                                        ) : (
                                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                                            <CheckCircle2 size={11} /> Đã trả
                                          </span>
                                        )}
                                      </div>
                                      {row.isCredit && !row.isReturned && row.dueDate && (
                                        <div className="flex items-center gap-1 text-[10px] text-amber-600 font-bold bg-amber-50/50 p-1.5 rounded-lg border border-amber-100 w-fit">
                                          <Clock size={10} />
                                          <span>Hạn trả nợ: {new Date(row.dueDate).toLocaleDateString("vi-VN")}</span>
                                        </div>
                                      )}
                                      {row.proofImage && (
                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                          <span className="text-slate-500 font-medium text-[11px]">Chứng từ thanh toán:</span>
                                          <button
                                            type="button"
                                            onClick={() => setPreviewProofImage(row.proofImage)}
                                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold rounded-lg border border-sky-200 text-[10px] transition-colors cursor-pointer shadow-xs"
                                          >
                                            <Image size={11} /> Xem ảnh minh chứng
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>

                                  <div className="pt-2 flex justify-end">
                                    <button
                                      type="button"
                                      onClick={() => handlePrintWarehouse(row)}
                                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 text-[11px]"
                                    >
                                      <Printer size={13} />
                                      In hóa đơn nhập hàng
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/80 p-4 rounded-2xl border border-slate-100/80 animate-fade-in text-xs">
                                <div className="space-y-1">
                                  <h4 className="font-bold text-[#3E2016] text-xs uppercase tracking-wider mb-2 flex items-center gap-1.5">
                                    🧾 Hóa đơn thanh toán
                                  </h4>
                                  <p className="text-slate-600 font-medium">
                                    Khoản thu từ hóa đơn đặt bàn / bán hàng thực tế tại quán.
                                  </p>
                                  <div className="flex gap-4 mt-2">
                                    <span>Mã hóa đơn: <strong className="text-slate-800">#{row.orderId || row.id}</strong></span>
                                    <span>Trạng thái: <strong className="text-emerald-600">Đã thanh toán</strong></span>
                                  </div>
                                </div>
                                
                                {row.orderId && (
                                  <button
                                    type="button"
                                    onClick={() => handlePrintInvoice(Number(row.orderId))}
                                    disabled={printingId === String(row.orderId)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 text-[11px] disabled:opacity-50"
                                  >
                                    {printingId === String(row.orderId) ? (
                                      <Loader2 size={13} className="animate-spin" />
                                    ) : (
                                      <Printer size={13} />
                                    )}
                                    In / Xem hóa đơn thanh toán
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {!loading && filteredTransactions.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 px-6 py-4 gap-4 bg-slate-50/40 text-xs text-slate-600">
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-medium">Hiển thị</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                  setExpandedTxId(null);
                }}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 shadow-xs focus:border-sky-500 focus:outline-none cursor-pointer"
              >
                {[5, 10, 20, 50].map((size) => (
                  <option key={size} value={size}>
                    {size} dòng / trang
                  </option>
                ))}
              </select>
              <span className="text-slate-500">
                Hiển thị từ <strong className="text-slate-800">{(currentPage - 1) * rowsPerPage + 1}</strong> đến{" "}
                <strong className="text-slate-800">
                  {Math.min(currentPage * rowsPerPage, filteredTransactions.length)}
                </strong>{" "}
                trong tổng số <strong className="text-slate-800">{filteredTransactions.length}</strong> giao dịch
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setCurrentPage((prev) => Math.max(prev - 1, 1));
                  setExpandedTxId(null);
                }}
                disabled={currentPage === 1}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-white cursor-pointer shadow-xs disabled:cursor-not-allowed"
              >
                Trước
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((page) => {
                    if (totalPages <= 7) return true;
                    return page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1;
                  })
                  .map((page, index, array) => {
                    const showEllipsis = index > 0 && page - array[index - 1] > 1;
                    return (
                      <React.Fragment key={page}>
                        {showEllipsis && <span className="px-1 text-slate-400 font-bold">...</span>}
                        <button
                          type="button"
                          onClick={() => {
                            setCurrentPage(page);
                            setExpandedTxId(null);
                          }}
                          className={`min-w-[30px] h-[30px] rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center ${
                            currentPage === page
                              ? "bg-[#3E2016] text-white shadow-xs"
                              : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100"
                          }`}
                        >
                          {page}
                        </button>
                      </React.Fragment>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                  setExpandedTxId(null);
                }}
                disabled={currentPage === totalPages || totalPages === 0}
                className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 disabled:hover:bg-white cursor-pointer shadow-xs disabled:cursor-not-allowed"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lightbox Modal for Proof Image */}
      {previewProofImage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative max-w-3xl w-full bg-white rounded-2xl p-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 mb-3">
              <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
                <Image size={16} className="text-sky-600" /> Chứng từ thanh toán phiếu nhập
              </h3>
              <button
                type="button"
                onClick={() => setPreviewProofImage(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto flex items-center justify-center p-2 bg-slate-100 rounded-xl">
              <img src={previewProofImage} alt="Minh chứng thanh toán" className="max-h-[70vh] object-contain rounded-lg shadow-sm" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};