import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Trash2, ArrowLeft, UploadCloud, X, Check, Printer, DownloadCloud, Sparkles, AlertCircle, AlertTriangle, Upload } from "lucide-react";
import toast from "react-hot-toast";
import { getIngredientsApi, getSuppliersApi, updateInventoryQuantityApi, getInventoryTransactionsApi } from "../../../services/api";
// @ts-ignore
import * as XLSX from "xlsx";

// ====================================================================
// UNIT CONVERSION TABLES
// baseUnit (DB) → available display units + multiplier to convert back
// ====================================================================
const UNIT_CONVERSIONS: Record<string, { label: string; toBase: number }[]> = {
  kg: [
    { label: "kg", toBase: 1 },
    { label: "g", toBase: 0.001 },
  ],
  g: [
    { label: "g", toBase: 1 },
    { label: "kg", toBase: 1000 },
  ],
  lít: [
    { label: "lít", toBase: 1 },
    { label: "ml", toBase: 0.001 },
  ],
  ml: [
    { label: "ml", toBase: 1 },
    { label: "lít", toBase: 1000 },
  ],
  con: [
    { label: "con", toBase: 1 },
  ],
  bó: [
    { label: "bó", toBase: 1 },
  ],
  gói: [
    { label: "gói", toBase: 1 },
  ],
  cái: [
    { label: "cái", toBase: 1 },
  ],
  hộp: [
    { label: "hộp", toBase: 1 },
  ],
};

const getUnitOptions = (baseUnit: string): { label: string; toBase: number }[] => {
  if (!baseUnit) return [{ label: "kg", toBase: 1 }];
  const key = baseUnit.toLowerCase().trim();
  return UNIT_CONVERSIONS[key] || [{ label: baseUnit, toBase: 1 }];
};

const getMultiplier = (baseUnit: string, displayUnit: string): number => {
  const opts = getUnitOptions(baseUnit);
  const found = opts.find(o => o.label === displayUnit);
  return found ? found.toBase : 1;
};

export const normalizeUnit = (unitStr: string): string => {
  const u = unitStr.toLowerCase().trim();
  if (u === "kg" || u === "kilogam" || u === "kilo" || u === "kilogram" || u === "ký" || u === "ky") return "kg";
  if (u === "g" || u === "gram" || u === "gam") return "g";
  if (u === "lít" || u === "lit" || u === "liter" || u === "l") return "lít";
  if (u === "ml" || u === "mililit" || u === "mililiter") return "ml";
  if (u === "hộp" || u === "hop") return "hộp";
  if (u === "chai") return "chai";
  if (u === "lon") return "lon";
  if (u === "gói" || u === "goi") return "gói";
  if (u === "túi" || u === "tui") return "túi";
  if (u === "bó" || u === "bo") return "bó";
  if (u === "con") return "con";
  if (u === "quả" || u === "qua" || u === "trái" || u === "trai") return "quả";
  if (u === "củ" || u === "cu") return "củ";
  return u;
};

export const parseExcelNumber = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  const str = String(val).replace(/[^0-9.,-]/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

export const ALLOWED_UNITS = [
  "kg", "g", "lít", "lit", "ml", "bao", "hộp", "hop", "chai", "lon",
  "gói", "goi", "túi", "tui", "bó", "bo", "quả", "qua", "trái", "trai",
  "củ", "cu", "con", "khay", "bình", "binh", "hũ", "hu", "vỉ", "vi",
  "bánh", "banh", "cuộn", "cuon"
];

export const isValidDateStr = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const s = String(dateStr).trim();
  if (s === "" || s === "-" || s === "Invalid Date") return false;
  return true;
};

export const isPastDate = (dateStr?: string): boolean => {
  if (!dateStr) return false;
  const s = String(dateStr).trim();
  if (s === "" || s === "-" || s === "Invalid Date") return false;
  
  const parts = s.split("T")[0].split("-");
  if (parts.length === 3) {
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dateObj = new Date(y, m, d, 23, 59, 59);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dateObj.getTime() < today.getTime();
  }
  
  const dateObj = new Date(s);
  if (isNaN(dateObj.getTime())) return false;
  dateObj.setHours(23, 59, 59);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dateObj.getTime() < today.getTime();
};

export const isExpiryRequired = (ingredientName: string): boolean => {
  const name = ingredientName.toLowerCase().trim();
  if (!name) return false;

  // Dry spices & long shelf-life condiments explicitly exempt
  const exemptKeywords = [
    "muối", "muoi", 
    "bột canh", "bot canh", 
    "mì chính", "mi chinh", "bột ngọt", "bot ngot", 
    "đường", "duong", 
    "hạt nêm", "hat nem", 
    "tiêu", "tieu", 
    "nước mắm", "nuoc mam", 
    "dầu ăn", "dau an", 
    "gia vị", "gia vi", 
    "xì dầu", "xi dau", "nước tương", "nuoc tuong", 
    "tương ớt", "tuong ot", "tương cà", "tuong ca",
    "dầu hào", "dau hao",
    "giấm", "giam",
    "ngũ vị hương", "ngu vi huong",
    "bột tỏi", "bot toi", "bột ớt", "bot ot"
  ];

  if (exemptKeywords.some(kw => name.includes(kw))) {
    return false;
  }

  // Fresh / Perishable items (Thịt, Rau, Trái cây, Hải sản...) REQUIRED
  const requiredKeywords = [
    "thịt", "thit", "gà", "ga", "bò", "bo", "heo", "lợn", "lon", "vịt", "vit", "dê", "de", "cừu", "cuu",
    "cá", "ca", "tôm", "tom", "cua", "mực", "muc", "bào ngư", "bao ngu", "hải sản", "hai san", "sò", "ốc", "hàu", "hau",
    "rau", "củ", "cu", "quả", "qua", "trái cây", "trai cay", "hoa quả", "hoa qua", "nấm", "nam", "cam", "táo", "chuối", "dưa",
    "sữa", "sua", "trứng", "trung", "tươi", "tuoi", "bún", "bun", "phở", "pho", "giò", "gio", "chả", "cha"
  ];

  if (requiredKeywords.some(kw => name.includes(kw))) {
    return true;
  }

  return true; // Default for general food ingredients
};

// ====================================================================

interface ImportItem {
  draftTxId?: string | number;
  ingredientId: string | number;
  ingredientName: string;
  code: string;
  quantity: number;
  displayUnit: string;    // unit shown in dropdown (may differ from baseUnit)
  baseUnit: string;       // canonical unit stored in DB
  unitMultiplier: number; // displayUnit → baseUnit conversion factor
  unitCost: number;       // price per baseUnit
  batchNo: string;
  expiryDate: string;
  isNew?: boolean;        // not yet in DB, will be created on save
}

interface ImportGoodsProps {
  onBack: () => void;
  initialData?: any[];
  onAddSupplier?: () => void;
  onPrintReceipt?: (data: any) => void;
}

export const ImportGoods: React.FC<ImportGoodsProps> = ({ onBack, initialData, onAddSupplier, onPrintReceipt }) => {
  const [ingredients, setIngredients] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const [importItems, setImportItems] = useState<ImportItem[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState("");
  const [importDate, setImportDate] = useState(new Date().toISOString().slice(0, 16));
  const [note, setNote] = useState("");
  const [paymentStatus, setPaymentStatus] = useState("paid"); // "paid", "credit", "partial"
  const [paidAmount, setPaidAmount] = useState<number | string>(0);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "bank_transfer">("cash");
  const [paymentProofImage, setPaymentProofImage] = useState<string>("");
  const [isPaidAmountFocused, setIsPaidAmountFocused] = useState(false);

  const [showExcelModal, setShowExcelModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  const [existingTransactions, setExistingTransactions] = useState<any[]>([]);

  const checkDuplicateToday = (supplierName: string, ingredientName: string, currentTicketCode?: string) => {
    if (!existingTransactions || existingTransactions.length === 0) return null;
    const todayStr = new Date().toDateString();

    for (const tx of existingTransactions) {
      if (tx.type !== "import") continue;
      const txDate = new Date(tx.timestamp || tx.created_at || Date.now());
      if (txDate.toDateString() !== todayStr) continue;

      const reasonStr = String(tx.reasonOrSupplier || tx.note || "");
      const cleanSup = reasonStr
        .replace(/^\[SLIP:[^\]]+\]\s*/g, "")
        .replace(/^\[LƯU TẠM\]\s*/g, "")
        .replace(/^\[HOÀN THÀNH\]\s*/g, "")
        .replace(/^Nhập hàng từ\s*/g, "")
        .split("-")[0]
        .trim();

      const slipMatch = reasonStr.match(/\[SLIP:([^\]]+)\]/);
      const slipCode = slipMatch ? slipMatch[1] : (tx.ticketCode || "Phiếu đã có trong ngày");

      // Skip checking against the slip currently being edited
      if (currentTicketCode && slipCode === currentTicketCode) continue;

      const txIngName = String(tx.ingredientName || tx.name || "").trim().toLowerCase();
      const targetIngName = String(ingredientName || "").trim().toLowerCase();

      const isSameSupplier =
        !supplierName ||
        !cleanSup ||
        cleanSup.toLowerCase().includes(supplierName.toLowerCase()) ||
        supplierName.toLowerCase().includes(cleanSup.toLowerCase());

      const isSameIngredient = txIngName && targetIngName && txIngName === targetIngName;

      if (isSameSupplier && isSameIngredient) {
        return slipCode;
      }
    }
    return null;
  };

  // ── initial load ──────────────────────────────────────────────────
  useEffect(() => {
    getIngredientsApi().then((data: any[]) => {
      setIngredients(data);
      if (initialData && initialData.length > 0) {
        setImportItems(initialData.map((ing: any) => {
          const baseUnit = ing.unit || "kg";
          return {
            draftTxId: ing.draftTxId,
            ingredientId: ing.ingredientId || ing.id,
            ingredientName: ing.ingredientName || ing.name,
            code: ing.code || `SP${(ing.ingredientId || ing.id).toString().padStart(6, "0")}`,
            quantity: ing.quantity ?? 1,
            displayUnit: baseUnit,
            baseUnit,
            unitMultiplier: 1,
            unitCost: ing.unitCost ?? ing.unit_cost ?? 0,
            batchNo: ing.batchNo || `LOT-${ing.id || Date.now().toString().slice(-4)}`,
            expiryDate: (() => {
              if (!ing.expiryDate) return "";
              const s = String(ing.expiryDate).trim();
              if (s === "-" || s === "Invalid Date") return "";
              if (s.includes("/")) {
                const p = s.split("/");
                if (p.length === 3) return `${p[2]}-${p[1].padStart(2, "0")}-${p[0].padStart(2, "0")}`;
              }
              const clean = s.split("T")[0];
              return clean === "-" || clean === "Invalid Date" ? "" : clean;
            })(),
            isNew: false,
          };
        }));
        if (initialData[0]?.note) setNote(initialData[0].note);
      }
    }).catch(console.error);
    getSuppliersApi().then(setSuppliers).catch(console.error);
    getInventoryTransactionsApi().then((txs: any[]) => {
      setExistingTransactions(txs || []);
    }).catch(console.error);
  }, [initialData]);

  // ── close dropdown on outside click ──────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchTerm("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── handlers ─────────────────────────────────────────────────────
  const handleAddItem = (ing: any) => {
    if (importItems.some(item => String(item.ingredientId) === String(ing.id))) {
      toast.error("Mặt hàng này đã có trong danh sách nhập!", { id: "inventory-toast" });
      setSearchTerm("");
      return;
    }
    const baseUnit = ing.unit || "kg";
    setImportItems(prev => [
      ...prev,
      {
        ingredientId: ing.id,
        ingredientName: ing.name,
        code: `SP${ing.id.toString().padStart(6, "0")}`,
        quantity: 1,
        displayUnit: baseUnit,
        baseUnit,
        unitMultiplier: 1,
        unitCost: 0,
        batchNo: `LOT-${ing.id}-${Date.now().toString().slice(-6)}`,
        expiryDate: "",
        isNew: false,
      },
    ]);

    // Auto-select supplier if not yet chosen
    if (!selectedSupplier) {
      const matchingSupplier = suppliers.find((s: any) =>
        s.mainIngredients && s.mainIngredients.toLowerCase().includes(ing.name.toLowerCase())
      );
      if (matchingSupplier) {
        setSelectedSupplier(matchingSupplier.id);
        toast.success(`Đã tự động chọn nhà cung cấp: ${matchingSupplier.name}`, { id: "inventory-toast" });
      }
    }
    setSearchTerm("");
  };

  // Add brand-new ingredient not yet in DB
  const handleAddNewIngredient = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (importItems.some(item => item.ingredientName.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("Nguyên liệu này đã có trong danh sách!", { id: "inventory-toast" });
      setSearchTerm("");
      return;
    }
    const tempId = `TEMP_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setImportItems(prev => [
      ...prev,
      {
        ingredientId: tempId,
        ingredientName: trimmed,
        code: "Mới",
        quantity: 1,
        displayUnit: "kg",
        baseUnit: "kg",
        unitMultiplier: 1,
        unitCost: 0,
        batchNo: `LOT-NEW-${Date.now().toString().slice(-6)}`,
        expiryDate: "",
        isNew: true,
      },
    ]);
    toast.success(`Đã thêm nguyên liệu mới: "${trimmed}". Sẽ tự động tạo trong hệ thống khi lưu.`, { id: "inventory-toast" });
    setSearchTerm("");
  };

  const handleUpdateItem = (index: number, field: keyof ImportItem, value: any) => {
    const updated = [...importItems];
    if (field === "displayUnit") {
      const baseUnit = updated[index].baseUnit;
      const multiplier = getMultiplier(baseUnit, value as string);
      updated[index] = { ...updated[index], displayUnit: value as string, unitMultiplier: multiplier };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setImportItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setImportItems(prev => prev.filter((_, i) => i !== index));
  };

  // Actual quantity in baseUnit (what gets stored in DB)
  const getActualQty = (item: ImportItem): number => {
    const raw = item.quantity * item.unitMultiplier;
    // Round to 6 decimal places to avoid float noise
    return Math.round(raw * 1e6) / 1e6;
  };

  const totalAmount = importItems.reduce(
    (sum, item) => sum + getActualQty(item) * item.unitCost,
    0
  );

  useEffect(() => {
    if (paymentStatus === "paid") {
      setPaidAmount(totalAmount);
    } else if (paymentStatus === "credit") {
      setPaidAmount(0);
    }
  }, [totalAmount, paymentStatus]);

  const numericPaidAmount = Number(paidAmount) || 0;
  const isOverPaidAmount = paymentStatus !== "credit" && numericPaidAmount > totalAmount;

  const handleSave = async (mode: "draft" | "completed" | "save_print" = "completed") => {
    if (importItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một mặt hàng để nhập");
      return;
    }

    const currentTicket = initialData && initialData[0]?.ticketCode ? initialData[0].ticketCode : undefined;
    const currentSupName = suppliers.find((s: any) => s.id == selectedSupplier)?.name || "";

    for (const item of importItems) {
      if (item.displayUnit && !ALLOWED_UNITS.includes(item.displayUnit.toLowerCase())) {
        toast.error(`Đơn vị tính "${item.displayUnit}" của mặt hàng "${item.ingredientName}" không hợp lệ! Vui lòng chọn (kg, g, lít, ml, bao, hộp...)`, { id: "unit-val-err" });
        return;
      }
      const dupSlipCode = checkDuplicateToday(currentSupName, item.ingredientName, currentTicket);
      if (dupSlipCode) {
        toast.error(`Phiếu nhập hiện tại (chứa mặt hàng "${item.ingredientName}") bị trùng lặp dữ liệu với phiếu nhập [${dupSlipCode}] đã khởi tạo hôm nay! Hệ thống từ chối lưu trùng lặp.`, { id: "dup-save-err", duration: 6500 });
        return;
      }
    }

    for (const item of importItems) {
      if (item.expiryDate && isPastDate(item.expiryDate)) {
        toast.error(`Hạn sử dụng của mặt hàng "${item.ingredientName}" (${item.expiryDate}) không được ở trong quá khứ!`, { id: "past-exp-err" });
        return;
      }
    }

    if (mode !== "draft") {
      for (const item of importItems) {
        if (isExpiryRequired(item.ingredientName) && !isValidDateStr(item.expiryDate)) {
          toast.error(`Vui lòng nhập Hạn sử dụng cho mặt hàng tươi sống: "${item.ingredientName}"!`, { id: "expiry-val" });
          return;
        }
      }
    }

    try {
      const supplierName = suppliers.find((s: any) => s.id == selectedSupplier)?.name || "NCC khác";
      const slipCode =
        initialData && initialData[0]?.ticketCode
          ? initialData[0].ticketCode
          : `PN${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}N-${Date.now().toString().slice(-4)}`;

      const baseReason = `[SLIP:${slipCode}] Nhập hàng từ ${supplierName}`;
      const reasonOrSupplier = note ? `${baseReason} - Ghi chú: ${note}` : baseReason;

      await Promise.all(
        importItems.map(item =>
          updateInventoryQuantityApi(item.ingredientId, {
            type: "import",
            reasonType: "import",
            status: mode === "draft" ? "draft" : "completed",
            quantity: getActualQty(item),  // converted to baseUnit
            unit: item.baseUnit,
            unitCost: item.unitCost,
            supplierId: selectedSupplier || undefined,
            isCredit: paymentStatus === "credit",
            expiryDate: item.expiryDate || undefined,
            batchNo: item.batchNo,
            reasonOrSupplier,
            ingredientName: item.ingredientName,
            draftTxId: item.draftTxId,
          })
        )
      );

      if (mode === "draft") {
        toast.success("Đã lưu tạm phiếu nhập hàng!");
      } else {
        toast.success("Tạo phiếu nhập hàng thành công!");
      }

      if (mode === "save_print" && onPrintReceipt) {
        onPrintReceipt({
          title: "PHIẾU NHẬP HÀNG",
          ticketCode: slipCode,
          supplierName,
          dateStr: importDate,
          userName: "Nhân viên kho",
          items: importItems.map(i => ({
            name: i.ingredientName,
            quantity: getActualQty(i),
            unit: i.baseUnit,
            displayQty: i.quantity,
            displayUnit: i.displayUnit,
            price: i.unitCost,
            total: getActualQty(i) * i.unitCost,
          })),
          totalAmount,
          paidAmount: paymentStatus === "paid" ? totalAmount : 0,
          debtAmount: paymentStatus === "credit" ? totalAmount : 0,
          note,
        });
      }

      onBack();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Có lỗi xảy ra khi lưu phiếu nhập");
    }
  };

  const filteredIngredients = ingredients.filter(
    (ing: any) =>
      ing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `SP${ing.id.toString().padStart(6, "0")}`.includes(searchTerm)
  );

  // ── render ────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 text-slate-800">
      {/* ── Header ── */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tạo phiếu nhập hàng</h2>
            <p className="text-xs text-slate-600 font-medium">Nhập nguyên liệu từ nhà cung cấp vào kho</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowExcelModal(true)}
            className="px-3 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs mr-2"
          >
            <UploadCloud size={14} className="text-blue-600" /> Nhập từ Excel
          </button>
          <button
            type="button"
            onClick={() => handleSave("draft")}
            className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Check size={14} /> LƯU TẠM
          </button>
          <button
            type="button"
            onClick={() => handleSave("completed")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Check size={14} /> LƯU
          </button>
          <button
            type="button"
            onClick={() => handleSave("save_print")}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 cursor-pointer shadow-sm transition-all"
          >
            <Printer size={14} /> LƯU & IN
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Import table ── */}
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 min-h-[400px]">

            {/* Search bar */}
            <div ref={searchRef} className="relative w-full mb-4">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Tìm kiếm mặt hàng theo tên hoặc mã... (nhập tên mới để thêm nguyên liệu)"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm"
              />

              {searchTerm && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {/* Existing ingredients */}
                  {filteredIngredients.map((ing: any) => (
                    <div
                      key={ing.id}
                      onClick={() => handleAddItem(ing)}
                      className="p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{ing.name}</div>
                        <div className="text-xs text-slate-500">
                          Đơn vị chuẩn: {ing.unit}
                        </div>
                      </div>
                      <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Tồn: {ing.stock} {ing.unit}
                      </div>
                    </div>
                  ))}

                  {/* Add new ingredient button */}
                  <div
                    onClick={() => handleAddNewIngredient(searchTerm)}
                    className="p-3 hover:bg-emerald-50 cursor-pointer flex items-center gap-2 text-emerald-700 font-bold"
                  >
                    <div className="w-6 h-6 bg-emerald-600 text-white rounded-full flex items-center justify-center flex-shrink-0 shadow-sm">
                      <Plus size={13} />
                    </div>
                    <span className="text-sm">
                      Thêm nguyên liệu mới:{" "}
                      <span className="underline">"{searchTerm}"</span>
                    </span>
                    <span className="ml-auto text-[10px] text-emerald-600 bg-emerald-100 border border-emerald-200 px-1.5 py-0.5 rounded font-bold">
                      Tự động tạo
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Import items table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase border-y border-slate-200">
                  <tr>
                    <th className="px-3 py-3 w-8">#</th>
                    <th className="px-3 py-3">Hàng hoá</th>
                    <th className="px-3 py-3 w-44">Số lượng & Đơn vị</th>
                    <th className="px-3 py-3 w-36">Giá nhập</th>
                    <th className="px-3 py-3 w-32">Thành tiền</th>
                    <th className="px-3 py-3 w-32">Hạn sử dụng</th>
                    <th className="px-3 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {importItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-slate-500 font-medium">
                        Chưa có mặt hàng nào. Vui lòng tìm và chọn mặt hàng để nhập.
                      </td>
                    </tr>
                  ) : (
                    importItems.map((item, idx) => {
                      const unitOptions = getUnitOptions(item.baseUnit);
                      const actualQty = getActualQty(item);
                      const isDifferentUnit = item.displayUnit !== item.baseUnit;

                      return (
                        <tr
                          key={idx}
                          className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                            item.isNew ? "bg-emerald-50/30" : ""
                          }`}
                        >
                          <td className="px-3 py-3 font-medium text-slate-500">{idx + 1}</td>

                          {/* Name + badges */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-bold text-slate-800">{item.ingredientName}</span>
                              {item.isNew && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold border border-emerald-200">
                                  <Sparkles size={9} /> Mới
                                </span>
                              )}
                            </div>
                            {item.isNew && (
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                Sẽ tự tạo nguyên liệu khi lưu
                              </div>
                            )}
                            {isDifferentUnit && (
                              <div className="text-[10px] text-amber-600 font-semibold mt-0.5 flex items-center gap-0.5">
                                <AlertCircle size={9} />
                                ≈ {actualQty % 1 === 0 ? actualQty : actualQty.toFixed(3)} {item.baseUnit} (quy đổi)
                              </div>
                            )}
                          </td>

                          {/* Quantity + Unit dropdown */}
                          <td className="px-3 py-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min={0}
                                step="any"
                                value={item.quantity}
                                onChange={e =>
                                  handleUpdateItem(idx, "quantity", Number(e.target.value))
                                }
                                className="w-16 p-1.5 border border-slate-300 rounded text-center font-semibold focus:border-blue-500 outline-none text-sm"
                              />
                              <select
                                value={item.displayUnit}
                                onChange={e =>
                                  handleUpdateItem(idx, "displayUnit", e.target.value)
                                }
                                className="p-1.5 border border-blue-200 rounded text-xs font-bold focus:border-blue-500 outline-none bg-blue-50 text-blue-700 cursor-pointer"
                                title={`Đơn vị gốc trong kho: ${item.baseUnit}`}
                              >
                                {unitOptions.map(opt => (
                                  <option key={opt.label} value={opt.label}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* Price per base unit */}
                          <td className="px-3 py-3">
                            <div className="flex flex-col">
                              <input
                                type="number"
                                min={0}
                                value={item.unitCost}
                                onChange={e =>
                                  handleUpdateItem(idx, "unitCost", Number(e.target.value))
                                }
                                className="w-24 p-1.5 border border-slate-300 rounded text-right font-semibold focus:border-blue-500 outline-none text-sm"
                              />
                              <span className="text-[9px] text-slate-400 text-right mt-0.5">
                                /{item.baseUnit}
                              </span>
                            </div>
                          </td>

                          {/* Total */}
                          <td className="px-3 py-3 font-bold text-right text-admin-primary whitespace-nowrap">
                            {(actualQty * item.unitCost).toLocaleString("vi-VN")}
                          </td>

                          {/* Expiry date */}
                          <td className="px-3 py-3">
                            {(() => {
                              const todayISO = new Date().toISOString().split("T")[0];
                              const isReq = isExpiryRequired(item.ingredientName);
                              const hasValidDate = isValidDateStr(item.expiryDate);
                              const isPast = isPastDate(item.expiryDate);
                              const isMissing = (isReq && !hasValidDate) || isPast;
                              return (
                                <div className="flex flex-col gap-0.5">
                                  <input
                                    type="date"
                                    min={todayISO}
                                    value={hasValidDate ? item.expiryDate : ""}
                                    onChange={e => handleUpdateItem(idx, "expiryDate", e.target.value)}
                                    className={`w-32 p-1.5 border rounded font-semibold focus:border-blue-500 outline-none text-xs ${
                                      isMissing ? "border-rose-400 bg-rose-50/50 text-rose-700 font-bold" : "border-slate-300"
                                    }`}
                                  />
                                  {isPast ? (
                                    <span className="text-[9px] font-bold text-rose-500 animate-pulse">* HSD không được ở quá khứ</span>
                                  ) : isReq ? (
                                    <span className={`text-[9px] font-bold ${isMissing ? "text-rose-500" : "text-emerald-600"}`}>
                                      {isMissing ? "* Bắt buộc HSD" : "✓ Có HSD"}
                                    </span>
                                  ) : (
                                    <span className="text-[9px] text-slate-400">Tùy chọn</span>
                                  )}
                                </div>
                              );
                            })()}
                          </td>

                          {/* Remove */}
                          <td className="px-3 py-3 text-center">
                            <button
                              onClick={() => handleRemoveItem(idx)}
                              className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 p-1.5 rounded cursor-pointer transition-colors"
                            >
                              <Trash2 size={15} />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* New-ingredient notice */}
            {importItems.some(i => i.isNew) && (
              <div className="mt-3 flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <Sparkles size={13} />
                <span>
                  Có <strong>{importItems.filter(i => i.isNew).length}</strong> nguyên liệu mới sẽ được tự động thêm vào hệ thống khi bạn nhấn <strong>Lưu</strong>.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: Info panel ── */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
            <h3 className="font-black text-slate-800 mb-4 border-b pb-2">Thông tin nhập hàng</h3>
            <div className="flex flex-col gap-4">

              {/* Supplier selector */}
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nhà cung cấp</label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <select
                      value={selectedSupplier}
                      onChange={e => setSelectedSupplier(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-semibold cursor-pointer"
                    >
                      <option value="">Chọn nhà cung cấp...</option>
                      {suppliers.map((s: any) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>

                    {/* Supplier ingredients display */}
                    {selectedSupplier && (
                      <div className="mt-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="font-bold text-slate-600 block mb-1">
                          Nguyên liệu của NCC này:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {(suppliers.find((s: any) => s.id == selectedSupplier)?.mainIngredients || "")
                            .split(",")
                            .map((ing: string, i: number) =>
                              ing.trim() ? (
                                <button
                                  type="button"
                                  key={i}
                                  onClick={() => {
                                    const ingName = ing.trim();
                                    if (!ingName) return;
                                    const found = ingredients.find(
                                      (x: any) => x.name.toLowerCase() === ingName.toLowerCase()
                                    );
                                    if (found) {
                                      handleAddItem(found);
                                    } else {
                                      handleAddNewIngredient(ingName);
                                    }
                                  }}
                                  className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-1.5 py-0.5 rounded font-semibold border border-blue-200 cursor-pointer transition-colors"
                                  title="Click để thêm món này vào bảng nhập"
                                >
                                  + {ing.trim()}
                                </button>
                              ) : null
                            )}
                          {!(suppliers.find((s: any) => s.id == selectedSupplier)?.mainIngredients) && (
                            <span className="text-slate-400 italic">Chưa có thông tin nguyên liệu</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {onAddSupplier && (
                    <button
                      type="button"
                      onClick={onAddSupplier}
                      className="p-2 bg-blue-50 text-blue-600 rounded border border-blue-200 hover:bg-blue-100 transition-colors"
                      title="Thêm nhà cung cấp mới"
                    >
                      <Plus size={20} />
                    </button>
                  )}
                </div>
              </div>

              {/* Import date */}
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Ngày nhập</label>
                <input
                  type="datetime-local"
                  value={importDate}
                  onChange={e => setImportDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-semibold cursor-pointer"
                />
              </div>

              {/* Note */}
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Ghi chú</label>
                <textarea
                  rows={3}
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm resize-none"
                  placeholder="Ghi chú (tùy chọn)"
                />
              </div>
            </div>

            <h3 className="font-black text-slate-800 mt-6 mb-4 border-b pb-2">Thông tin thanh toán</h3>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-600">Tổng cộng</span>
                <span className="text-admin-primary text-lg font-black">
                  {totalAmount.toLocaleString("vi-VN")} ₫
                </span>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Trạng thái thanh toán</label>
                <select
                  value={paymentStatus}
                  onChange={e => {
                    const val = e.target.value;
                    setPaymentStatus(val);
                    if (val === "paid") {
                      setPaidAmount(totalAmount);
                    } else if (val === "credit") {
                      setPaidAmount(0);
                    }
                  }}
                  className={`w-full p-2 border rounded-xl outline-none text-xs font-bold cursor-pointer ${
                    paymentStatus === "paid"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : paymentStatus === "partial"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200"
                  }`}
                >
                  <option value="paid">Đã thanh toán đủ (Tiền mặt / Chuyển khoản)</option>
                  <option value="partial">Thanh toán 1 phần (Trả trước 1 số tiền)</option>
                  <option value="credit">Công nợ (Ghi nợ NCC toàn bộ)</option>
                </select>
              </div>

              {paymentStatus !== "credit" && (
                <>
                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">
                      Số tiền thanh toán ngay <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={isPaidAmountFocused ? paidAmount : (paidAmount === "" ? "" : Number(paidAmount).toLocaleString("vi-VN"))}
                        onFocus={() => setIsPaidAmountFocused(true)}
                        onBlur={() => setIsPaidAmountFocused(false)}
                        onChange={(e) => {
                          const rawVal = e.target.value;
                          const digits = rawVal.replace(/\D/g, "");
                          setPaidAmount(digits === "" ? "" : Number(digits));
                        }}
                        className={`w-full p-2 pl-7 border rounded-xl font-bold text-xs outline-none transition-all ${
                          isOverPaidAmount
                            ? "border-rose-500 bg-rose-50 text-rose-700 focus:border-rose-600"
                            : "border-slate-300 focus:border-blue-500 text-slate-800"
                        }`}
                        placeholder="Nhập số tiền thanh toán..."
                      />
                      <span className="absolute left-2.5 top-2 text-slate-400 font-bold text-xs">₫</span>
                    </div>

                    {paidAmount !== "" && !isNaN(numericPaidAmount) && (
                      <div className="mt-1 text-[11px] font-bold text-sky-600">
                        Số tiền nhập: {Number(paidAmount).toLocaleString("vi-VN")} ₫
                      </div>
                    )}

                    {isOverPaidAmount ? (
                      <div className="mt-1 text-[11px] font-extrabold text-rose-600 flex items-center gap-1 p-1.5 bg-rose-50 rounded-lg border border-rose-200">
                        <AlertTriangle size={13} className="shrink-0" />
                        <span>Không được nhập vượt quá tổng cộng ({totalAmount.toLocaleString("vi-VN")} ₫)!</span>
                      </div>
                    ) : (
                      <div className="mt-1 text-[11px] font-bold text-slate-500 flex justify-between">
                        <span>Ghi nợ NCC còn lại:</span>
                        <span className={totalAmount - numericPaidAmount > 0 ? "text-rose-600 font-black" : "text-emerald-600 font-black"}>
                          {Math.max(0, totalAmount - numericPaidAmount).toLocaleString("vi-VN")} ₫
                        </span>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Hình thức thanh toán</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value as any)}
                      className="w-full p-2 border border-slate-300 rounded-xl font-bold text-xs bg-white text-slate-700 outline-none cursor-pointer"
                    >
                      <option value="cash">Tiền mặt</option>
                      <option value="bank_transfer">Chuyển khoản</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1">Minh chứng thanh toán / Hóa đơn</label>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          accept="image/*"
                          id="import-proof-upload"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 5 * 1024 * 1024) {
                                toast.error("Dung lượng ảnh không được vượt quá 5MB");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setPaymentProofImage(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                        />
                        <label
                          htmlFor="import-proof-upload"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-300 shadow-2xs"
                        >
                          <Upload size={13} className="text-slate-600" />
                          {paymentProofImage ? "Thay ảnh minh chứng khác" : "Tải ảnh hóa đơn/chuyển khoản"}
                        </label>
                        {paymentProofImage && (
                          <button
                            type="button"
                            onClick={() => setPaymentProofImage("")}
                            className="px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg font-bold text-xs transition-colors border border-rose-200"
                          >
                            Xóa ảnh
                          </button>
                        )}
                      </div>

                      {paymentProofImage && (
                        <div className="relative mt-1 rounded-xl border-2 border-slate-200 bg-slate-50 p-2 shadow-xs">
                          <img
                            src={paymentProofImage}
                            alt="Minh chứng hóa đơn"
                            className="max-h-40 w-full object-contain rounded-lg bg-white"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Excel import modal ── */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-800">Nhập từ Excel</h3>
              <button
                onClick={() => setShowExcelModal(false)}
                className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              {/* Notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 shadow-sm">
                <h4 className="text-sm font-black text-rose-600 mb-2 underline">Lưu ý quan trọng:</h4>
                <ul className="text-xs text-rose-700 font-medium space-y-1.5 list-none">
                  <li>- Tối đa <span className="font-bold">500</span> hàng hóa mỗi lần nhập.</li>
                  <li>
                    - File Excel cần có cột <span className="font-bold">Đơn vị</span> (g, kg, lạng, lít, ml, con...) để hệ thống quy đổi đúng đơn vị kho.
                  </li>
                  <li>
                    - Nếu nguyên liệu <span className="font-bold">chưa có trong hệ thống</span>, hệ thống sẽ{" "}
                    <span className="font-bold">tự động tạo mới</span> và liên kết với nhà cung cấp đã chọn.
                  </li>
                  <li>- Giá nhập phải lớn hơn hoặc bằng 0.</li>
                  <li>- Mỗi hàng hóa chỉ được liệt kê ở 1 dòng duy nhất.</li>
                </ul>
              </div>

              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = evt => {
                    try {
                      const bstr = evt.target?.result;
                      const wb = XLSX.read(bstr, { type: "binary" });
                      const wsname = wb.SheetNames[0];
                      const ws = wb.Sheets[wsname];
                      const data: any[] = XLSX.utils.sheet_to_json(ws);

                      const newItems: ImportItem[] = [];
                      let autoSupplierId = "";

                      let rowIndex = 1;
                      for (const row of data) {
                        rowIndex++;
                        // Auto-detect supplier from Excel
                        const supplierNameInRow =
                          row["Nhà cung cấp"] || row["Supplier"] || row.supplier || "";
                        if (supplierNameInRow && !autoSupplierId) {
                          const matchedSup = suppliers.find(
                            (s: any) =>
                              s.name.toLowerCase().includes(supplierNameInRow.toLowerCase()) ||
                              supplierNameInRow.toLowerCase().includes(s.name.toLowerCase())
                          );
                          if (matchedSup) autoSupplierId = matchedSup.id;
                        }

                        const name: string =
                          row["Tên hàng"] ||
                          row["Tên nguyên liệu"] ||
                          row["Tên"] ||
                          row.Name ||
                          row.name ||
                          "";
                        if (!name.trim()) continue;

                        // Unit from Excel column
                        const rawExcelUnit: string = (
                          row["Đơn vị"] ||
                          row["Unit"] ||
                          row.unit ||
                          ""
                        )
                          .toString()
                          .trim();
                        const excelUnit = normalizeUnit(rawExcelUnit);

                        // Strict Unit Validation: Reject garbage units like "ádasdasdsa"
                        if (excelUnit && !ALLOWED_UNITS.includes(excelUnit)) {
                          toast.error(`Dòng ${rowIndex}: Đơn vị tính "${rawExcelUnit}" của "${name}" không hợp lệ! Vui lòng nhập (kg, g, lít, ml, bao, hộp, chai...)`, { id: "excel-unit-err" });
                          if (fileInputRef.current) fileInputRef.current.value = "";
                          return;
                        }

                        // Strict Duplicate Import Check: Block re-importing same ingredient today
                        const currentTicket = initialData && initialData[0]?.ticketCode ? initialData[0].ticketCode : undefined;
                        const targetSup = supplierNameInRow || (suppliers.find((s: any) => s.id == selectedSupplier)?.name || "");
                        const dupSlipCode = checkDuplicateToday(targetSup, name, currentTicket);

                        if (dupSlipCode) {
                          toast.error(`File Excel này bị trùng lặp dữ liệu với phiếu nhập [${dupSlipCode}] đã khởi tạo hôm nay! Hệ thống từ chối nhập lặp lại.`, { id: "dup-excel-err", duration: 6500 });
                          if (fileInputRef.current) fileInputRef.current.value = "";
                          return;
                        }

                        // Find existing ingredient
                        const found = ingredients.find(
                          (i: any) => i.name.toLowerCase() === name.toLowerCase()
                        );

                        let ingredientId: string | number;
                        let baseUnit: string;
                        let isNew = false;

                        if (found) {
                          ingredientId = found.id;
                          baseUnit = found.unit || "kg";
                        } else {
                          ingredientId = `TEMP_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                          baseUnit = excelUnit || "kg";
                          isNew = true;
                        }

                        // Determine display unit & multiplier
                        let displayUnit = excelUnit || baseUnit;
                        const opts = getUnitOptions(baseUnit);
                        const matchedOpt = opts.find(o => o.label === displayUnit);
                        const unitMultiplier = matchedOpt ? matchedOpt.toBase : 1;
                        if (!matchedOpt) displayUnit = baseUnit; // fallback to base

                        // Parse expiry date
                        const expiryDate = (() => {
                          const raw = row["Ngày hết hạn"] || row["Hạn sử dụng"] || row.Expiry || "";
                          if (!raw) return "";
                          if (typeof raw === "number") {
                            const d = new Date((raw - (25567 + 2)) * 86400 * 1000);
                            return d.toISOString().split("T")[0];
                          }
                          const s = String(raw).trim();
                          const parts = s.split("/");
                          if (parts.length === 3)
                            return `${parts[2]}-${parts[1].padStart(2, "0")}-${parts[0].padStart(2, "0")}`;
                          return s.split("T")[0];
                        })();

                        if (expiryDate && isPastDate(expiryDate)) {
                          toast.error(`Dòng ${rowIndex}: Hạn sử dụng (${expiryDate}) của mặt hàng "${name}" không được ở trong quá khứ!`, { id: "excel-past-err" });
                          if (fileInputRef.current) fileInputRef.current.value = "";
                          return;
                        }

                        const rawBatch = row["Số lô"] || row.Batch || row["Mã lô"] || row["Mã Lô"];
                        const hasExplicitBatch = !!(rawBatch && String(rawBatch).trim() !== "");
                        const batchVal = hasExplicitBatch
                          ? String(rawBatch).trim()
                          : `LOT-EXCEL-${Date.now().toString().slice(-4)}${String(rowIndex).padStart(2, "0")}`;

                        if (hasExplicitBatch && newItems.some(item => item.batchNo === batchVal)) {
                          toast.error(`Dòng ${rowIndex}: Cảnh báo trùng lặp mã lô "${batchVal}" của mặt hàng "${name}" trong file Excel!`, { id: `excel-batch-dup-${rowIndex}` });
                        }

                        newItems.push({
                          ingredientId,
                          ingredientName: name,
                          code: found ? `SP${found.id.toString().padStart(6, "0")}` : "Mới",
                          quantity: parseExcelNumber(
                            row["Số lượng"] || row.Quantity || row.quantity || 1
                          ),
                          displayUnit,
                          baseUnit,
                          unitMultiplier,
                          unitCost: parseExcelNumber(row["Đơn giá"] || row.Price || row.price || 0),
                          batchNo: batchVal,
                          expiryDate,
                          isNew,
                        });
                      }

                      if (autoSupplierId && !selectedSupplier) {
                        setSelectedSupplier(autoSupplierId);
                      }

                      const newCount = newItems.filter(i => i.isNew).length;
                      setImportItems(newItems);
                      toast.success(
                        `Đã tải ${newItems.length} mặt hàng từ Excel` +
                          (newCount > 0
                            ? ` (${newCount} nguyên liệu mới sẽ được tạo tự động)`
                            : "") +
                          "!"
                      );
                      setShowExcelModal(false);
                    } catch (err) {
                      toast.error("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
                      console.error(err);
                    }
                  };
                  reader.readAsBinaryString(file);
                }}
              />

              <div className="flex flex-col gap-3">
                {/* Drop zone */}
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors"
                >
                  <UploadCloud size={40} className="text-slate-400 mb-2" />
                  <p className="text-sm font-bold text-slate-700">
                    Kéo thả hoặc click để chọn file (.xlsx, .csv)
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Tự động nhận diện NCC · Hàng hoá · Đơn vị · Nguyên liệu mới
                  </p>
                </div>

                {/* Download sample */}
                <div className="flex justify-between items-center bg-blue-50 p-3 rounded-xl border border-blue-100 text-xs">
                  <span className="font-semibold text-blue-900">Chưa có file mẫu nhập hàng?</span>
                  <button
                    type="button"
                    onClick={() => {
                      const supObj = suppliers.find((s: any) => s.id == selectedSupplier);
                      const supName = supObj ? supObj.name : "Nhà phân phối Hải sản XYZ";
                      const sampleData = [
                        {
                          "Nhà cung cấp": supName,
                          "Tên nguyên liệu": "Cá hồi Sapa tươi",
                          "Số lượng": 12,
                          "Đơn vị": "kg",
                          "Đơn giá": 300000,
                          "Ngày hết hạn": "2026-08-15",
                        },
                        {
                          "Nhà cung cấp": supName,
                          "Tên nguyên liệu": "Tôm sú tươi",
                          "Số lượng": 20,
                          "Đơn vị": "kg",
                          "Đơn giá": 300000,
                          "Ngày hết hạn": "2026-08-12",
                        },
                        {
                          "Nhà cung cấp": supName,
                          "Tên nguyên liệu": "Mực lá đại",
                          "Số lượng": 15,
                          "Đơn vị": "kg",
                          "Đơn giá": 200000,
                          "Ngày hết hạn": "2026-08-18",
                        },
                        {
                          "Nhà cung cấp": supName,
                          "Tên nguyên liệu": "Cua Ca Mau",
                          "Số lượng": 8,
                          "Đơn vị": "kg",
                          "Đơn giá": 500000,
                          "Ngày hết hạn": "2026-08-10",
                        },
                        {
                          "Nhà cung cấp": supName,
                          "Tên nguyên liệu": "Bào ngư Hàn Quốc",
                          "Số lượng": 5,
                          "Đơn vị": "kg",
                          "Đơn giá": 800000,
                          "Ngày hết hạn": "2026-08-25",
                        },
                      ];
                      const ws = XLSX.utils.json_to_sheet(sampleData);
                      ws['!cols'] = [
                        { wch: 30 },
                        { wch: 25 },
                        { wch: 12 },
                        { wch: 10 },
                        { wch: 15 },
                        { wch: 15 },
                      ];
                      const wbOut = XLSX.utils.book_new();
                      XLSX.utils.book_append_sheet(wbOut, ws, "NhapHang");
                      XLSX.writeFile(
                        wbOut,
                        `Mau_Nhap_Hang_${supName.replace(/\s+/g, "_")}.xlsx`
                      );
                      toast.success(`Đã tải file Excel mẫu chuẩn (đơn vị kg) cho ${supName}!`, { id: "inventory-toast" });
                    }}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <DownloadCloud size={14} /> Tải file Excel mẫu
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
