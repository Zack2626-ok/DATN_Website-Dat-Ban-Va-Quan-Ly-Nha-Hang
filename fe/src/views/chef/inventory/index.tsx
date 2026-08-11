import React, { useState, useMemo, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setIngredientStockDirect } from "../../../store/inventorySlice";
import { syncMenuWithIngredients } from "../../../store/menuSlice";
import { getIngredientsApi, getInventoryTransactionsApi, createIngredientApi, updateInventoryQuantityApi, deleteInventoryTransactionApi, uploadInventoryExcelApi, getSuppliersApi, addSupplierApi, updateSupplierApi, deleteSupplierApi, getIngredientBatchesApi, wasteExpiredBatchesApi, paySupplierDebtApi, getAllBatchesApi, submitStockCheckApi } from "../../../services/api";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import * as XLSX from "xlsx";
import { ImportGoods } from "./ImportGoods";
import { ReturnGoods } from "./ReturnGoods";
import { InventoryCheck } from "./InventoryCheck";
import {
  AlertTriangle,
  Plus,
  Minus,
  Search,
  Trash2,
  Layers,
  Eye,
  Truck,
  ClipboardCheck,
  CalendarRange,
  PieChart,
  ArrowUpRight,
  FileSpreadsheet,
  X,
  Check,
  Info,
  UploadCloud,
  DownloadCloud,
  FileText,
  Printer,
  Pencil,
  CheckCircle,
  Filter,
  ChevronDown,
  ChevronRight,
  Package,
  DollarSign,
  CreditCard,
  Lock
} from "lucide-react";

// Types for local interactive states
interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
}

interface StockTransaction {
  id: string;
  type: "import" | "export" | "adjust";
  ingredientId?: string | number;
  ingredientName: string;
  quantity: number;
  unit: string;
  reasonOrSupplier: string;
  timestamp: string;
  batchNo?: string;
  expiryDate?: string;
  unit_cost?: number;
  note?: string;
  reasonType?: string;
  isCredit?: boolean | number;
  is_credit?: boolean | number;
  supplierId?: number;
}

export const InventoryControl: React.FC = () => {
  const dispatch = useAppDispatch();
  const globalSearchQuery = useAppSelector((state) => state.ui.searchQuery);

  const [reduxIngredients, setReduxIngredients] = useState<any[]>([]);

  useEffect(() => {
    getIngredientsApi()
      .then((data) => setReduxIngredients(data))
      .catch((err) => console.error("Failed to load ingredients", err));
  }, []);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"ingredients" | "categories_suppliers" | "import_history" | "return_history" | "stocktake" | "expiry" | "reports">("ingredients");
  const [importSearch, setImportSearch] = useState("");
  const [importDateFilter, setImportDateFilter] = useState("30days");
  const [returnSearch, setReturnSearch] = useState("");
  const [returnDateFilter, setReturnDateFilter] = useState("30days");
  const [currentView, setCurrentView] = useState<"main" | "importGoods" | "returnGoods" | "inventoryCheck">("main");
  const [selectedDraft, setSelectedDraft] = useState<any>(null);
  const [initialImportData, setInitialImportData] = useState<any[] | null>(null);

  // Local Search & Category filters for Ingredient Tab
  const [ingSearch, setIngSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all"); // all, low, normal
  const [expiryFilter, setExpiryFilter] = useState("all"); // all, expired, near

  // Local Mock Data States (so users can add/delete/update for rich demo)
  const [categories, setCategories] = useState<Category[]>([
    { id: "c1", name: "Hải sản tươi sống", code: "HAISAN", description: "Các loại cua, cá, tôm, sò biển tươi" },
    { id: "c2", name: "Thịt & Gia cầm", code: "THIT", description: "Thịt heo, bò, gà sạch nhập trong ngày" },
    { id: "c3", name: "Nấm & Rau củ", code: "RAUNAM", description: "Rau sạch Đà Lạt và các loại nấm đùi gà, nấm linh chi" },
    { id: "c4", name: "Gia vị & Hàng khô", code: "GIAVI", description: "Các loại nước xốt, muối tiêu, dầu ăn" }
  ]);

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  const [expiryBatches, setExpiryBatches] = useState<any[]>([]);

  const fetchAllBatchesData = async () => {
    try {
      const data = await getAllBatchesApi();
      const mapped = data.map((b: any) => ({
        id: b.id,
        ingredientName: b.ingredientName,
        quantity: b.quantity,
        unit: b.unit,
        batchNo: b.batchNo,
        unitCost: Number(b.unitCost || b.unit_cost || 0),
        expiryDate: b.expiryDate ? b.expiryDate.split("T")[0] : ""
      }));
      setExpiryBatches(mapped);
    } catch (err) {
      console.error("Failed to load batches", err);
    }
  };

  useEffect(() => {
    fetchAllBatchesData();
  }, []);

  const [transactions, setTransactions] = useState<StockTransaction[]>([]);

  useEffect(() => {
    getInventoryTransactionsApi()
      .then((data) => setTransactions(data))
      .catch((err) => console.error("Failed to load transactions", err));

    getSuppliersApi()
      .then((data) => setSuppliers(data))
      .catch((err) => console.error("Failed to load suppliers", err));
  }, []);

  // Modals / Input States
  const [showAddIngModal, setShowAddIngModal] = useState(false);
  const [newIngForm, setNewIngForm] = useState({ name: "", category: "Thịt & Gia cầm", stock: 10, unit: "kg", threshold: 2.0 });
  const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});
  const [batchData, setBatchData] = useState<Record<string, any[]>>({});
  const [selectedIngredients, setSelectedIngredients] = useState<string[]>([]);
  const [returnBatchData, setReturnBatchData] = useState<any>(null);
  const [returnQty, setReturnQty] = useState<number | "">("");
  const [returnNote, setReturnNote] = useState("");
  const [printReturnData, setPrintReturnData] = useState<any>(null);
  const [showReturnReceiptModal, setShowReturnReceiptModal] = useState<boolean>(false);

  // Sub tab for Xuất kho (Hàng trả NCC vs Trừ kho tự động)
  const [returnSubTab, setReturnSubTab] = useState<"supplier_return" | "auto_deduction">("supplier_return");

  const [stocktakeValues, setStocktakeValues] = useState<Record<string, string>>({});
  // Printable Stocktake Receipt state (Matching Image 5)
  const [printStocktakeData, setPrintStocktakeData] = useState<any>(null);
  const [showStocktakePrintModal, setShowStocktakePrintModal] = useState<boolean>(false);

  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [showAlertsPanel, setShowAlertsPanel] = useState(false);

  // Debt Payment State
  const [showPayDebtModal, setShowPayDebtModal] = useState(false);
  const [payingSupplier, setPayingSupplier] = useState<any>(null);
  const [debtAmount, setDebtAmount] = useState<number | "">("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");

  const handlePayDebt = async () => {
    if (!payingSupplier || !debtAmount || Number(debtAmount) <= 0) {
      toast.error("Vui lòng nhập số tiền thanh toán hợp lệ!");
      return;
    }
    try {
      await paySupplierDebtApi(payingSupplier.id, {
        amount: Number(debtAmount),
        note: paymentNote,
        paymentMethod: paymentMethod
      });
      toast.success(`Thanh toán thành công ${Number(debtAmount).toLocaleString()} ₫ cho ${payingSupplier.name}`);
      setShowPayDebtModal(false);
      setPayingSupplier(null);
      setDebtAmount("");
      setPaymentNote("");
      // Refresh suppliers
      const data = await getSuppliersApi();
      setSuppliers(data);
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Lỗi khi thanh toán công nợ");
    }
  };

  // Unified Import File Modal State
  const [showImportFileModal, setShowImportFileModal] = useState(false);
  const [importFileTarget, setImportFileTarget] = useState<"ingredients" | "categories" | "suppliers" | "transactions" | "stocktake" | "expiry">("ingredients");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFileError, setImportFileError] = useState<string | null>(null);

  // Unit conversion helper for mass (kg/g) and volume (lit/ml)
  const getUnitConversion = (baseUnit: string, selectedUnit?: string) => {
    const norm = (baseUnit || "kg").trim().toLowerCase();

    if (norm === "kg" || norm === "kilogram" || norm === "kilo") {
      const unitOptions = [
        { key: "kg", label: "kg", factor: 1 },
        { key: "g", label: "gam (g)", factor: 0.001 }
      ];
      const active = unitOptions.find(u => u.key === selectedUnit) || unitOptions[0];
      return { unitOptions, activeUnit: active.key, factor: active.factor, baseUnitName: "kg" };
    }

    if (norm === "l" || norm === "lit" || norm === "lít") {
      const unitOptions = [
        { key: "lit", label: "lít", factor: 1 },
        { key: "ml", label: "ml", factor: 0.001 }
      ];
      const active = unitOptions.find(u => u.key === selectedUnit) || unitOptions[0];
      return { unitOptions, activeUnit: active.key, factor: active.factor, baseUnitName: "lít" };
    }

    if (norm === "g" || norm === "gam" || norm === "gram") {
      const unitOptions = [
        { key: "g", label: "gam (g)", factor: 1 },
        { key: "kg", label: "kg", factor: 1000 }
      ];
      const active = unitOptions.find(u => u.key === selectedUnit) || unitOptions[0];
      return { unitOptions, activeUnit: active.key, factor: active.factor, baseUnitName: "g" };
    }

    return {
      unitOptions: [{ key: baseUnit, label: baseUnit, factor: 1 }],
      activeUnit: baseUnit,
      factor: 1,
      baseUnitName: baseUnit
    };
  };

  // Waste / Spoiled goods disposal modal state
  const [showWasteModal, setShowWasteModal] = useState(false);
  const [wasteForm, setWasteForm] = useState<{
    ingredientId: string;
    batchNo: string;
    batchStock?: number;
    quantity: number;
    wasteUnit?: string;
    reason: string;
    note: string;
  }>({
    ingredientId: "",
    batchNo: "",
    batchStock: 0,
    quantity: 1,
    wasteUnit: "",
    reason: "Ôi thiu / Mốc",
    note: ""
  });

  const handleExportBlankCheckSheet = () => {
    const nowStr = new Date().toLocaleString("vi-VN");
    const data: any[][] = [
      ["PHIẾU KIỂM KÊ CÂN ĐỐI TỒN KHO"],
      [`Ngày xuất: ${nowStr}`],
      [],
      ["Mã NL", "Tên nguyên liệu", "Tồn hệ thống", "Thực tế kiểm đếm", "Đơn vị", "Chênh lệch"]
    ];

    reduxIngredients.forEach((ing: any) => {
      const code = `SP${ing.id.toString().padStart(6, '0')}`;
      data.push([
        code,
        ing.name,
        ing.stock,
        "", // Column left empty for physical counting
        ing.unit,
        ""  // Column left empty for variance
      ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws["!cols"] = [
      { wch: 12 },
      { wch: 30 },
      { wch: 15 },
      { wch: 22 },
      { wch: 10 },
      { wch: 15 }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "PhieuKiemKho");
    XLSX.writeFile(wb, `PHIEU_KIEM_KE_CAN_DOI_TON_KHO_${Date.now()}.xlsx`);
    toast.success("Đã xuất file Excel phiếu kiểm kho trống thành công!");
  };

  const handleWasteSubmit = async () => {
    const ingId = Number(wasteForm.ingredientId);
    const selectedIng = reduxIngredients.find((i: any) => Number(i.id) === ingId);
    const baseUnit = selectedIng?.unit || "kg";
    const conv = getUnitConversion(baseUnit, wasteForm.wasteUnit);
    const baseQuantity = Number(wasteForm.quantity || 0) * conv.factor;

    if (!wasteForm.ingredientId || baseQuantity <= 0) {
      toast.error("Vui lòng chọn nguyên liệu và nhập số lượng xuất hủy hợp lệ.");
      return;
    }

    if (wasteForm.reason === "Khác" && !wasteForm.note.trim()) {
      toast.error("Vui lòng nhập lý do tiêu hủy cụ thể.");
      return;
    }

    // Validate quantity against current batch stock or total ingredient stock
    const batchObj = expiryBatches.find(b => b.batchNo === wasteForm.batchNo);
    const currentBatchStock = wasteForm.batchNo
      ? (batchObj ? Number(batchObj.quantity) : (wasteForm.batchStock || 0))
      : (selectedIng ? Number(selectedIng.stock) : 0);

    if (currentBatchStock > 0 && baseQuantity > currentBatchStock) {
      const displayInput = conv.activeUnit !== conv.baseUnitName 
        ? `${wasteForm.quantity} ${conv.activeUnit} (${baseQuantity} ${conv.baseUnitName})`
        : `${wasteForm.quantity} ${conv.baseUnitName}`;
      toast.error(
        `Số lượng xuất hủy (${displayInput}) không được lớn hơn số lượng tồn hiện tại của lô (${currentBatchStock} ${conv.baseUnitName}).`
      );
      return;
    }

    const confirmMsg = "Nếu bạn tiêu hủy hệ thống sẽ trừ vào nguyên liệu chính và giá trừ sẽ lấy số tiền nhập gần nhất để trừ, bạn chắc chứ?";
    if (!window.confirm(confirmMsg)) {
      return;
    }
    
    // Determine unit cost: prioritize specific batch unit_cost if batchNo is specified
    let batchUnitCost = Number(batchObj?.unitCost || 0);
    if (!batchUnitCost && wasteForm.batchNo) {
      const batchTx = transactions.find(
        (t: any) =>
          t.type === "import" &&
          (t.batchNo === wasteForm.batchNo || (t.reasonOrSupplier && t.reasonOrSupplier.includes(wasteForm.batchNo))) &&
          Number(t.unit_cost || (t as any).unitCost || 0) > 0
      );
      if (batchTx) {
        batchUnitCost = Number(batchTx.unit_cost || (batchTx as any).unitCost || 0);
      }
    }

    const recentImport = transactions.find(
      (t: any) =>
        (Number(t.ingredientId) === ingId || (t.ingredientName && selectedIng?.name && t.ingredientName.trim().toLowerCase() === selectedIng.name.trim().toLowerCase())) &&
        t.type === "import" &&
        Number(t.unit_cost || (t as any).unitCost || 0) > 0
    );
    const latestUnitCost = batchUnitCost > 0
      ? batchUnitCost
      : Number(recentImport?.unit_cost || (recentImport as any)?.unitCost || selectedIng?.unitCost || selectedIng?.cost || 0);

    try {
      const loadingToast = toast.loading("Đang ghi nhận xuất hủy kho...");
      const slipCode = `EX${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, "0")}${String(new Date().getDate()).padStart(2, "0")}-${Date.now().toString().slice(-4)}`;
      const reasonText = wasteForm.reason === "Khác"
        ? wasteForm.note.trim()
        : (wasteForm.note.trim() ? `${wasteForm.reason}: ${wasteForm.note.trim()}` : wasteForm.reason);

      const displayQtyText = conv.activeUnit !== conv.baseUnitName
        ? `${wasteForm.quantity} ${conv.activeUnit} (${baseQuantity} ${conv.baseUnitName})`
        : `${wasteForm.quantity} ${conv.baseUnitName}`;

      await updateInventoryQuantityApi(ingId, {
        quantity: baseQuantity,
        type: "export",
        reasonType: "waste",
        batchNo: wasteForm.batchNo || undefined,
        unitCost: latestUnitCost,
        reasonOrSupplier: `[SLIP:${slipCode}] Xuất hủy ${wasteForm.batchNo ? `lô ${wasteForm.batchNo}` : "hàng hỏng"} (${displayQtyText}): ${reasonText}`,
        note: `[XUẤT HỦY HỎNG] [${displayQtyText}] ${reasonText}`
      });

      toast.success(`Đã xuất hủy ${displayQtyText} ${selectedIng?.name || ""} thành công!`, { id: loadingToast });
      setShowWasteModal(false);
      setWasteForm({ ingredientId: "", batchNo: "", quantity: 1, wasteUnit: "", reason: "Ôi thiu / Mốc", note: "" });

      // Refresh inventory & transactions & batches
      const [ingRes, txRes] = await Promise.all([
        getIngredientsApi(),
        getInventoryTransactionsApi()
      ]);
      setReduxIngredients(ingRes);
      setTransactions(txRes);
      fetchAllBatchesData();
    } catch (err: any) {
      console.error("Lỗi xuất hủy hàng hỏng:", err);
      toast.error("Xuất hủy thất bại: " + (err?.response?.data?.message || err?.message || "Có lỗi xảy ra"));
    }
  };

  const handleDeleteWasteTransaction = async (txId: string) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa bản ghi lịch sử tiêu hủy này không?")) {
      return;
    }
    try {
      const loadingToast = toast.loading("Đang xóa bản ghi tiêu hủy...");
      await deleteInventoryTransactionApi(txId);
      toast.success("Đã xóa bản ghi lịch sử tiêu hủy thành công!", { id: loadingToast });

      const [ingRes, txRes] = await Promise.all([
        getIngredientsApi(),
        getInventoryTransactionsApi()
      ]);
      setReduxIngredients(ingRes);
      setTransactions(txRes);
      fetchAllBatchesData();
    } catch (err: any) {
      console.error("Lỗi xóa bản ghi tiêu hủy:", err);
      toast.error(err?.response?.data?.message || "Không thể xóa bản ghi tiêu hủy.");
    }
  };

  // New Expiry Batch manual modal state
  const [showAddExpiryModal, setShowAddExpiryModal] = useState(false);
  const [newExpiryForm, setNewExpiryForm] = useState({
    ingredientName: reduxIngredients[0]?.name || "Trứng cá tầm",
    quantity: 10,
    unit: "kg",
    batchNo: "",
    expiryDate: ""
  });
  const [transactionForm, setTransactionForm] = useState({
    type: "import" as "import" | "export",
    ingredientId: reduxIngredients[0]?.id || "",
    quantity: 1,
    reasonOrSupplier: ""
  });
  const [importExportMode, setImportExportMode] = useState<"manual" | "file">("manual");
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({ name: "", contact: "", phone: "", address: "", mainIngredients: "" });

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({ name: "", code: "", description: "" });



  // Helper to sync menu status with Redux ingredients stock
  const triggerInventoryMenuSync = (currentIngredients = reduxIngredients) => {
    const stocks: { [name: string]: number } = {};
    currentIngredients.forEach((ing) => {
      stocks[ing.name] = ing.stock;
    });
    dispatch(syncMenuWithIngredients(stocks));
  };

  // Modify stock directly (updates Redux + triggers Sync)
  const handleModifyStockDirect = (id: string, newStock: number) => {
    const updatedStock = Math.max(0, newStock);
    dispatch(setIngredientStockDirect({ id, stock: updatedStock }));

    // Update expiry batches quantity if it matches
    const ing = reduxIngredients.find(i => i.id === id);
    if (ing) {
      const updatedIngs = reduxIngredients.map(i => i.id === id ? { ...i, stock: updatedStock } : i);
      triggerInventoryMenuSync(updatedIngs);
    }
  };

  // Maps ingredient name to category group
  const getIngredientCategory = (name: string): string => {
    const lower = name.toLowerCase();
    if (lower.includes("hải sản") || lower.includes("cá") || lower.includes("tôm") || lower.includes("cua")) return "Hải sản tươi sống";
    if (lower.includes("bò") || lower.includes("heo") || lower.includes("gà") || lower.includes("sườn")) return "Thịt & Gia cầm";
    if (lower.includes("nấm") || lower.includes("rau") || lower.includes("củ") || lower.includes("quả")) return "Nấm & Rau củ";
    return "Gia vị & Hàng khô";
  };

  const removeVietnameseAccents = (str: string): string => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/đ/g, "d")
      .replace(/Đ/g, "D")
      .replace(/[^a-zA-Z0-9\s\-\_\|\:\,\.\/\(\)]/g, "");
  };

  // Filter ingredients combining Redux State and Filters
  const filteredIngredients = useMemo(() => {
    return reduxIngredients.filter((ing) => {
      // 1. Text Search (Local Search Bar or Main Top Navbar Search)
      const query = (ingSearch || globalSearchQuery || "").toLowerCase();
      const matchesSearch = ing.name.toLowerCase().includes(query);

      // 2. Category Filter
      const cat = getIngredientCategory(ing.name);
      const matchesCategory = selectedCategoryFilter === "all" || cat === selectedCategoryFilter;

      // 3. Stock Level Filter
      const isLow = ing.stock <= ing.threshold;
      const matchesStatus = stockStatusFilter === "all" ||
        (stockStatusFilter === "low" && isLow) ||
        (stockStatusFilter === "normal" && !isLow);

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [reduxIngredients, ingSearch, globalSearchQuery, selectedCategoryFilter, stockStatusFilter]);

  // Form Submissions
  const handleAddIngredient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngForm.name) return;

    try {
      await createIngredientApi({
        name: newIngForm.name,
        stock: newIngForm.stock,
        unit: newIngForm.unit,
        threshold: newIngForm.threshold
      });
      toast.success("Thêm nguyên liệu thành công");
      getIngredientsApi().then((data) => setReduxIngredients(data));
      getInventoryTransactionsApi().then(data => setTransactions(data));

      // triggerInventoryMenuSync();
      setShowAddIngModal(false);
      setNewIngForm({ name: "", category: "Thịt & Gia cầm", stock: 10, unit: "kg", threshold: 2.0 });
    } catch (error) {
      toast.error("Lỗi thêm nguyên liệu");
      console.error(error);
    }
  };

  const handlePostTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const ing = reduxIngredients.find((i) => i.id === transactionForm.ingredientId);
    if (!ing) return;

    try {
      await updateInventoryQuantityApi(ing.id, {
        quantity: transactionForm.quantity,
        type: transactionForm.type,
        reasonOrSupplier: transactionForm.reasonOrSupplier
      });
      toast.success("Cập nhật kho thành công");
      getIngredientsApi().then((data) => setReduxIngredients(data));
      getInventoryTransactionsApi().then(data => setTransactions(data));

      setShowImportExportModal(false);
      setTransactionForm({
        type: "import",
        ingredientId: reduxIngredients[0]?.id || "",
        quantity: 1,
        reasonOrSupplier: ""
      });
    } catch (error) {
      toast.error("Lỗi cập nhật kho");
      console.error(error);
    }
  };

  const fetchSuppliersData = async () => {
    try {
      const data = await getSuppliersApi();
      setSuppliers(data);
    } catch (err) {
      console.error("Failed to load suppliers", err);
    }
  };

  const handleSaveSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierForm.name) return;

    try {
      await addSupplierApi(newSupplierForm);
      toast.success("Thêm nhà cung cấp thành công!");
      fetchSuppliersData();
      setShowAddSupplierModal(false);
      setNewSupplierForm({ name: "", contact: "", phone: "", address: "", mainIngredients: "" });
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi thêm nhà cung cấp");
    }
  };

  const handleUpdateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSupplier || !editingSupplier.name) return;

    try {
      await updateSupplierApi(editingSupplier.id, editingSupplier);
      toast.success("Cập nhật nhà cung cấp thành công!");
      fetchSuppliersData();
      setShowEditSupplierModal(false);
      setEditingSupplier(null);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi cập nhật nhà cung cấp");
    }
  };

  const handleDeleteSupplier = async (id: string | number) => {
    if (!window.confirm("Bạn có chắc muốn xóa nhà cung cấp này?")) return;
    try {
      await deleteSupplierApi(id);
      toast.success("Xóa nhà cung cấp thành công!");
      fetchSuppliersData();
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Lỗi khi xóa nhà cung cấp");
    }
  };

  const handleSaveCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryForm.name) return;
    setCategories([
      ...categories,
      {
        id: `c_${Date.now()}`,
        ...newCategoryForm
      }
    ]);
    setShowAddCategoryModal(false);
    setNewCategoryForm({ name: "", code: "", description: "" });
  };

  const handlePostExpiryBatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpiryForm.ingredientName || !newExpiryForm.batchNo || !newExpiryForm.expiryDate) return;

    setExpiryBatches([
      ...expiryBatches,
      {
        id: `b_${Date.now()}`,
        ingredientName: newExpiryForm.ingredientName,
        quantity: Number(newExpiryForm.quantity),
        unit: newExpiryForm.unit,
        batchNo: newExpiryForm.batchNo,
        expiryDate: newExpiryForm.expiryDate
      }
    ]);

    // Log transaction
    setTransactions([
      {
        id: `t_${Date.now()}`,
        type: "import",
        ingredientName: newExpiryForm.ingredientName,
        quantity: Number(newExpiryForm.quantity),
        unit: newExpiryForm.unit,
        reasonOrSupplier: `Ghi nhận lô hàng mới (${newExpiryForm.batchNo})`,
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 16)
      },
      ...transactions
    ]);

    // Update ingredients stock
    const ing = reduxIngredients.find(i => i.name === newExpiryForm.ingredientName);
    if (ing) {
      handleModifyStockDirect(ing.id as string, ing.stock + Number(newExpiryForm.quantity));
    }

    setShowAddExpiryModal(false);
    toast.success("Thêm lô hàng mới thành công!");
  };

  const handlePostImportFile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importFile) return;

    // Simulate import based on target
    const fileName = importFile.name;

    switch (importFileTarget) {
      case "ingredients":
        // Mock import 2 ingredients
        const id1 = `i_imp_${Date.now()}_1`;
        const id2 = `i_imp_${Date.now()}_2`;
        reduxIngredients.push(
          { id: id1, name: "Thịt vịt bầu", stock: 15, unit: "kg", threshold: 3.0 },
          { id: id2, name: "Nước cốt dừa", stock: 8, unit: "l", threshold: 2.0 }
        );
        toast.success(`Đã nhập thành công 2 nguyên liệu mới từ file ${fileName}`);
        break;
      case "categories":
        setCategories([
          ...categories,
          { id: `c_imp_1`, name: "Đồ uống có cồn", code: "RUOUBIA", description: "Các loại rượu, bia nhập khẩu" },
          { id: `c_imp_2`, name: "Rau thơm & gia vị tươi", code: "RAUTHOM", description: "Hành, tỏi, ớt, rau thơm các loại" }
        ]);
        toast.success(`Đã nhập thành công 2 danh mục mới từ file ${fileName}`);
        break;
      case "suppliers":
        setSuppliers([
          ...suppliers,
          { id: `s_imp_1`, name: "Tổng kho Thực phẩm Hùng Cường", contact: "A. Cường", phone: "0967 888 999", address: "Hoàng Mai, Hà Nội", mainIngredients: "Thịt vịt, Nước cốt dừa" }
        ]);
        toast.success(`Đã nhập thành công nhà cung cấp mới từ file ${fileName}`);
        break;
      case "transactions":
        setTransactions([
          { id: `t_imp_1`, type: "import", ingredientName: "Cá hồi", quantity: 20, unit: "kg", reasonOrSupplier: `Nhập lô lớn từ file ${fileName}`, timestamp: new Date().toISOString().replace("T", " ").slice(0, 16) },
          { id: `t_imp_2`, type: "export", ingredientName: "Thịt bò Mỹ", quantity: 3, unit: "kg", reasonOrSupplier: `Xuất hao hụt từ file ${fileName}`, timestamp: new Date().toISOString().replace("T", " ").slice(0, 16) },
          ...transactions
        ]);
        toast.success(`Đã nạp thành công 2 giao dịch lịch sử từ file ${fileName}`);
        break;
      case "stocktake":
        toast.success(`Đã nhập dữ liệu thực tế kiểm kê từ file ${fileName}.`);
        break;
      case "expiry":
        setExpiryBatches([
          ...expiryBatches,
          { id: `b_imp_1`, ingredientName: "Cá hồi", quantity: 12.0, unit: "kg", batchNo: "LOT-CAH-IMP", expiryDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0] }
        ]);
        toast.success(`Đã nạp lô hàng hạn sử dụng mới từ file ${fileName}`);
        break;
    }

    setShowImportFileModal(false);
    setImportFile(null);
  };


  const handleReturnBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!returnBatchData || !returnQty || !returnNote) return;

    try {
      await updateInventoryQuantityApi(returnBatchData.ingId, {
        quantity: returnQty,
        type: "return_supplier",
        batchNo: returnBatchData.batchNo,
        reasonOrSupplier: returnNote
      });
      alert("Trả hàng thành công!");
      
      // Setup data for printing before resetting the form
      setPrintReturnData({
        ...returnBatchData,
        qty: returnQty,
        note: returnNote,
        date: new Date().toLocaleString("vi-VN")
      });

      setReturnBatchData(null);
      setReturnQty("");
      setReturnNote("");

      // Reload
      const ingBatches = await getIngredientBatchesApi(returnBatchData.ingId);
      setBatchData(prev => ({ ...prev, [returnBatchData.ingId]: ingBatches }));
      
      const [ingRes, txRes] = await Promise.all([
        getIngredientsApi(),
        getInventoryTransactionsApi()
      ]);
      setReduxIngredients(ingRes);
      setTransactions(txRes);
      fetchAllBatchesData();
    } catch (err: any) {
      alert("Lỗi khi trả hàng: " + (err.response?.data?.message || err.message));
    }
  };

  const handleToggleRow = async (ing: any) => {
    const isExpanded = expandedRows[ing.id];
    if (isExpanded) {
      setExpandedRows(prev => ({ ...prev, [ing.id]: false }));
    } else {
      setExpandedRows(prev => ({ ...prev, [ing.id]: true }));
      if (!batchData[ing.id]) {
        try {
          const data = await getIngredientBatchesApi(ing.id);
          setBatchData(prev => ({ ...prev, [ing.id]: data }));
        } catch (e: any) {
          toast.error("Không thể tải danh sách lô hàng");
        }
      }
    }
  };

  const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIngredients(filteredIngredients.map(ing => ing.id));
    } else {
      setSelectedIngredients([]);
    }
  };

  const handleToggleSelectIngredient = (id: string) => {
    setSelectedIngredients(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleWasteExpiredBatches = async () => {
    if (!window.confirm("Bạn có chắc chắn muốn hủy TOÀN BỘ các lô hàng đã hết hạn trong kho? Hành động này không thể hoàn tác.")) return;
    try {
      const res = await wasteExpiredBatchesApi();
      if (res && res.count > 0) {
        toast.success(`Đã hủy thành công ${res.count} lô hàng hết hạn!`);
        getIngredientsApi().then(data => setReduxIngredients(data));
        getInventoryTransactionsApi().then(data => setTransactions(data));
      } else {
        toast.success("Không có lô hàng nào hết hạn cần hủy.");
      }
    } catch (e: any) {
      toast.error("Lỗi khi hủy hàng hết hạn");
    }
  };

  // Shared Export to Excel Helper
  const handleExportExcelShared = (title: string, headers: string[], rows: string[][], filename: string) => {
    toast.success("Đang xuất dữ liệu Excel...");
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta charset="utf-8"/>
        <style>
          body { font-family: 'Segoe UI', sans-serif; }
          table { border-collapse: collapse; width: 100%; }
          th { background-color: #1e3a8a; color: white; font-weight: bold; padding: 8px 12px; border: 1px solid #cbd5e1; }
          td { padding: 8px 12px; border: 1px solid #e2e8f0; }
          .title { font-size: 16pt; font-weight: bold; }
        </style>
      </head>
      <body>
        <table>
          <tr><td colspan="${headers.length}" class="title" style="border: none;">${title}</td></tr>
          <tr><td colspan="${headers.length}" style="border: none; font-size: 9pt;">Ngày xuất: ${new Date().toLocaleString("vi-VN")}</td></tr>
          <tr><td colspan="${headers.length}" style="border: none; height: 10px;"></td></tr>
        </table>
        <table>
          <thead>
            <tr>
              ${headers.map(h => `<th>${h}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map((row, idx) => `
              <tr style="${idx % 2 === 1 ? 'background-color: #f8fafc;' : ''}">
                ${row.map(cell => `<td>${cell}</td>`).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${filename}.xls`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Tải file Excel thành công!");
  };

  // Shared Export to PDF Helper
  const handleExportPdfShared = (title: string, headers: string[], colX: number[], rows: string[][], filename: string) => {
    toast.success("Đang xuất dữ liệu PDF...");
    try {
      const doc = new jsPDF();
      doc.setProperties({ title });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text(removeVietnameseAccents(title), 105, 20, { align: "center" });
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Ngay xuat: ${new Date().toLocaleDateString("vi-VN")} ${new Date().toLocaleTimeString("vi-VN")}`, 105, 27, { align: "center" });
      doc.setDrawColor(200, 200, 200);
      doc.line(15, 30, 195, 30);

      // Draw Headers
      doc.setFillColor(30, 58, 138);
      doc.rect(15, 35, 180, 8, "F");
      doc.setFontSize(8);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      headers.forEach((h, idx) => {
        doc.text(removeVietnameseAccents(h), colX[idx], 40);
      });

      // Draw Rows
      doc.setTextColor(15, 23, 42);
      let y = 49;
      rows.forEach((row, idx) => {
        if (y > 275) {
          doc.addPage();
          doc.setFillColor(30, 58, 138);
          doc.rect(15, 15, 180, 8, "F");
          doc.setFontSize(8);
          doc.setTextColor(255, 255, 255);
          headers.forEach((h, hidx) => {
            doc.text(removeVietnameseAccents(h), colX[hidx], 20);
          });
          y = 28;
        }

        if (idx % 2 === 1) {
          doc.setFillColor(248, 250, 252);
          doc.rect(15, y - 4, 180, 6, "F");
        }

        doc.setDrawColor(241, 245, 249);
        doc.line(15, y + 2, 195, y + 2);

        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);

        row.forEach((cell, cidx) => {
          doc.text(removeVietnameseAccents(cell), colX[cidx], y);
        });

        y += 8;
      });

      doc.save(`${filename}.pdf`);
      toast.success("Tải file PDF thành công!");
    } catch (e) {
      console.error(e);
      toast.error("Không thể tạo file PDF");
    }
  };

  // Perform Stocktake adjustment
  // @ts-ignore
  const handleApplyStocktake = async () => {
    let changed = false;

    for (const ing of reduxIngredients) {
      const val = stocktakeValues[ing.id];
      if (val !== undefined && val.trim() !== "") {
        const actualQty = Number(val);
        const discrepancy = actualQty - ing.stock;

        if (discrepancy !== 0) {
          try {
            await updateInventoryQuantityApi(ing.id, {
              quantity: Math.abs(discrepancy),
              type: discrepancy > 0 ? "import" : "adjust",
              reasonOrSupplier: `Cân đối kiểm kê thực tế (${discrepancy > 0 ? "+" : ""}${discrepancy.toFixed(1)} ${ing.unit})`
            });
            changed = true;
          } catch (e) {
            console.error("Lỗi cập nhật", e);
          }
        }
      }
    }

    if (changed) {
      getIngredientsApi().then((data) => setReduxIngredients(data));
      getInventoryTransactionsApi().then(data => setTransactions(data));
      setStocktakeValues({});
      toast.success("✅ Cân đối kho thành công! Số lượng thực tế đã được cập nhật.");
    } else {
      toast.error("Chưa có số lượng kiểm kê thực tế nào được nhập hoặc không có chênh lệch.");
    }
  };


  // Check how many days until expiry
  const getExpiryLabel = (expiryDateStr: string) => {
    if (!expiryDateStr || expiryDateStr === "N/A" || expiryDateStr === "") {
      return { text: "Không có hạn", status: "good" };
    }
    const diffTime = new Date(expiryDateStr).getTime() - new Date().getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `Đã hết hạn (${Math.abs(diffDays)} ngày)`, status: "expired" };
    }
    if (diffDays === 0) {
      return { text: "Hết hạn hôm nay", status: "near" };
    }
    if (diffDays <= 3) {
      return { text: `Sắp hết hạn (${diffDays} ngày)`, status: "near" };
    }
    return { text: `Còn lại ${diffDays} ngày`, status: "good" };
  };

  // Calculate reports stats
  const reportsStats = useMemo(() => {
    const totalIngredients = reduxIngredients.length;
    const lowStockCount = reduxIngredients.filter((i) => i.stock <= i.threshold).length;

    let expiredCount = 0;
    let nearExpiryCount = 0;
    expiryBatches.forEach((b) => {
      const label = getExpiryLabel(b.expiryDate);
      if (label.status === "expired") expiredCount++;
      if (label.status === "near") nearExpiryCount++;
    });

    return { totalIngredients, lowStockCount, expiredCount, nearExpiryCount };
  }, [reduxIngredients, expiryBatches]);

  // Dynamic Category distribution (by count of items)
  const categoryDistribution = useMemo(() => {
    const counts: Record<string, number> = {
      "Hải sản tươi sống": 0,
      "Thịt & Gia cầm": 0,
      "Nấm & Rau củ": 0,
      "Gia vị & Hàng khô": 0,
    };
    reduxIngredients.forEach(ing => {
      const cat = getIngredientCategory(ing.name);
      if (counts[cat] !== undefined) {
        counts[cat]++;
      }
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;

    let currentOffset = 0;
    const circumference = 2 * Math.PI * 40; // ~251.3

    const colors: Record<string, string> = {
      "Hải sản tươi sống": "#0f62fe",
      "Thịt & Gia cầm": "#f59e0b",
      "Nấm & Rau củ": "#10b981",
      "Gia vị & Hàng khô": "#6366f1",
    };

    return Object.entries(counts).map(([name, count]) => {
      const percentage = Math.round((count / total) * 100);
      const strokeLength = (percentage / 100) * circumference;
      const strokeDasharray = `${strokeLength.toFixed(1)} ${circumference.toFixed(1)}`;
      const strokeDashoffset = -currentOffset;
      currentOffset += strokeLength;

      return {
        name,
        count,
        percentage,
        strokeDasharray,
        strokeDashoffset: strokeDashoffset.toFixed(1),
        color: colors[name] || "#ccc",
      };
    });
  }, [reduxIngredients]);

  // Dynamic Movement Statistics (Waste, Processing, Expiry)
  const dynamicMovementStats = useMemo(() => {
    let totalImportedG = 0;
    let totalProcessedG = 0;
    let totalDestroyedG = 0;
    let totalAdjustedG = 0;

    transactions.forEach((tx) => {
      const qtyG = tx.unit.toLowerCase() === "g" ? tx.quantity : tx.quantity * 1000;
      if (tx.type === "import") {
        totalImportedG += qtyG;
      } else if (tx.type === "export") {
        if (tx.reasonOrSupplier.toLowerCase().includes("tiêu hủy")) {
          totalDestroyedG += qtyG;
        } else {
          totalProcessedG += qtyG;
        }
      } else if (tx.type === "adjust") {
        totalAdjustedG += Math.abs(qtyG);
      }
    });

    const totalVolume = totalImportedG + totalProcessedG + totalDestroyedG + totalAdjustedG || 1;

    // Use absolute values for presentation, fallback to defaults if zero to avoid empty graphs in demo
    const processedPercent = totalProcessedG > 0 ? (totalProcessedG / totalVolume) * 100 : 72.4;
    const destroyedPercent = totalDestroyedG > 0 ? (totalDestroyedG / totalVolume) * 100 : 4.1;
    const adjustedPercent = totalAdjustedG > 0 ? (totalAdjustedG / totalVolume) * 100 : 2.5;

    return {
      processedPercent: Number(processedPercent.toFixed(1)),
      destroyedPercent: Number(destroyedPercent.toFixed(1)),
      adjustedPercent: Number(adjustedPercent.toFixed(1)),
    };
  }, [transactions]);

  const filteredImportTransactions = useMemo(() => {
    let result = transactions.filter(t => t.type === "import");
    const now = new Date();
    if (importDateFilter === "today") {
      const today = new Date().toDateString();
      result = result.filter(t => new Date(t.timestamp).toDateString() === today);
    } else if (importDateFilter === "7days") {
      result = result.filter(t => (now.getTime() - new Date(t.timestamp).getTime()) <= 7 * 24 * 60 * 60 * 1000);
    } else if (importDateFilter === "30days") {
      result = result.filter(t => (now.getTime() - new Date(t.timestamp).getTime()) <= 30 * 24 * 60 * 60 * 1000);
    }

    if (importSearch.trim()) {
      const q = importSearch.toLowerCase();
      result = result.filter(t => 
        (t.ingredientName && t.ingredientName.toLowerCase().includes(q)) ||
        (t.reasonOrSupplier && t.reasonOrSupplier.toLowerCase().includes(q)) ||
        (t.batchNo && t.batchNo.toLowerCase().includes(q)) ||
        (t.id && t.id.toString().includes(q))
      );
    }

    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return result;
  }, [transactions, importDateFilter, importSearch]);

  // Phân loại: 1. Hàng xuất trả NCC (chỉ có lý do return_supplier hoặc trả hàng)
  const filteredReturnTransactions = useMemo(() => {
    let result = transactions.filter(t => 
      t.type === "export" && (
        t.reasonType === "return_supplier" || 
        t.reasonOrSupplier?.toLowerCase().includes("trả") || 
        t.reasonOrSupplier?.toLowerCase().includes("ncc")
      )
    );
    const now = new Date();
    if (returnDateFilter === "today") {
      const today = new Date().toDateString();
      result = result.filter(t => new Date(t.timestamp).toDateString() === today);
    } else if (returnDateFilter === "7days") {
      result = result.filter(t => (now.getTime() - new Date(t.timestamp).getTime()) <= 7 * 24 * 60 * 60 * 1000);
    } else if (returnDateFilter === "30days") {
      result = result.filter(t => (now.getTime() - new Date(t.timestamp).getTime()) <= 30 * 24 * 60 * 60 * 1000);
    }

    if (returnSearch.trim()) {
      const q = returnSearch.toLowerCase();
      result = result.filter(t => 
        (t.ingredientName && t.ingredientName.toLowerCase().includes(q)) ||
        (t.reasonOrSupplier && t.reasonOrSupplier.toLowerCase().includes(q)) ||
        (t.batchNo && t.batchNo.toLowerCase().includes(q)) ||
        (t.id && t.id.toString().includes(q))
      );
    }

    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return result;
  }, [transactions, returnDateFilter, returnSearch]);

  // Phân loại: 2. Lịch sử trừ kho tự động (Bếp nấu món, Tiêu hủy, Hao hụt, Nội bộ)
  const filteredAutoDeductionTransactions = useMemo(() => {
    let result = transactions.filter(t => 
      t.type === "export" && 
      t.reasonType !== "return_supplier" && 
      !t.reasonOrSupplier?.toLowerCase().includes("trả ncc") &&
      !t.reasonOrSupplier?.toLowerCase().includes("trả lại ncc")
    );
    const now = new Date();
    if (returnDateFilter === "today") {
      const today = new Date().toDateString();
      result = result.filter(t => new Date(t.timestamp).toDateString() === today);
    } else if (returnDateFilter === "7days") {
      result = result.filter(t => (now.getTime() - new Date(t.timestamp).getTime()) <= 7 * 24 * 60 * 60 * 1000);
    } else if (returnDateFilter === "30days") {
      result = result.filter(t => (now.getTime() - new Date(t.timestamp).getTime()) <= 30 * 24 * 60 * 60 * 1000);
    }

    if (returnSearch.trim()) {
      const q = returnSearch.toLowerCase();
      result = result.filter(t => 
        (t.ingredientName && t.ingredientName.toLowerCase().includes(q)) ||
        (t.reasonOrSupplier && t.reasonOrSupplier.toLowerCase().includes(q)) ||
        (t.batchNo && t.batchNo.toLowerCase().includes(q)) ||
        (t.id && t.id.toString().includes(q))
      );
    }

    result.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    return result;
  }, [transactions, returnDateFilter, returnSearch]);

  // Tổng hợp số lượng nguyên liệu bị trừ kho tự động (Matching Image 2)
  const summaryDeductedIngredients = useMemo(() => {
    const summaryMap: Record<string, { code: string; name: string; systemStock: number; totalDeducted: number; unit: string; reason: string }> = {};
    
    filteredAutoDeductionTransactions.forEach((tx) => {
      const name = tx.ingredientName || "Nguyên liệu";
      if (!summaryMap[name]) {
        const matchIng = reduxIngredients.find(i => i.name === name);
        summaryMap[name] = {
          code: matchIng ? `SP${matchIng.id.toString().padStart(6, '0')}` : `SP000000`,
          name,
          systemStock: matchIng ? matchIng.stock : 0,
          totalDeducted: 0,
          unit: tx.unit || "kg",
          reason: tx.reasonType || tx.reasonOrSupplier || "sale_deduction"
        };
      }
      summaryMap[name].totalDeducted += Math.abs(Number(tx.quantity) || 0);
    });

    return Object.values(summaryMap);
  }, [filteredAutoDeductionTransactions, reduxIngredients]);

  // Xuất file Excel định dạng theo Ảnh 2
  const handleExportAutoDeductionExcel = () => {
    try {
      const excelRows = summaryDeductedIngredients.map((item) => ({
        "Mã hàng hóa": item.code,
        "Tên hàng hóa": item.name,
        "Tồn hệ thống": item.systemStock,
        "Tồn thực tế Serial": 0,
        "Lý do": item.reason
      }));

      const worksheet = XLSX.utils.json_to_sheet(excelRows);

      // Auto-fit columns dynamically based on content length
      if (excelRows.length > 0) {
        const colKeys = Object.keys(excelRows[0]);
        worksheet["!cols"] = colKeys.map(key => {
          let maxLen = key.length;
          excelRows.forEach(r => {
            const val = r[key as keyof typeof r];
            if (val !== undefined && val !== null) {
              const strLen = String(val).length;
              if (strLen > maxLen) maxLen = strLen;
            }
          });
          return { wch: Math.min(Math.max(maxLen + 4, 12), 45) };
        });
      }

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "TongHopTruKho");
      XLSX.writeFile(workbook, `TongHop_TruKho_TuDong_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Đã xuất file Excel tổng hợp trừ kho tự động!");
    } catch (err) {
      console.error("Export Excel error", err);
      toast.error("Không thể xuất file Excel!");
    }
  };

  const renderReturnReceiptModal = () => {
    if (!showReturnReceiptModal || !printReturnData) return null;
    const d = printReturnData;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[92vh]">
          <button
            onClick={() => setShowReturnReceiptModal(false)}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer print:hidden"
          >
            <X size={20} />
          </button>
          
          <div className="p-4 text-slate-900 text-xs font-sans bg-white">
            <div className="flex justify-between items-start mb-4 border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">PHIẾU XUẤT TRẢ HÀNG KHÁCH / NCC</h3>
                <p className="text-xs font-bold text-slate-600">Mã phiếu: {d.code || "PXK001"}</p>
                <p className="text-[11px] text-slate-500">Ngày: {d.date ? new Date(d.date).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN')}</p>
              </div>
              <div className="text-right">
                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${d.isDraft ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}`}>
                  {d.isDraft ? 'Lưu tạm' : 'Hoàn thành'}
                </span>
              </div>
            </div>

            <div className="mb-4 text-xs font-semibold text-slate-700">
              <p><span className="font-extrabold">Nhà cung cấp / Đối tượng:</span> {d.supplier || "Nhà cung cấp"}</p>
              <p><span className="font-extrabold">Ghi chú / Lý do:</span> {d.note || "Không có"}</p>
            </div>

            <table className="w-full border-collapse border border-slate-300 text-xs mb-4">
              <thead>
                <tr className="bg-slate-100 font-extrabold text-slate-800 border-b border-slate-300">
                  <th className="border border-slate-300 px-3 py-2 text-left">Tên nguyên liệu</th>
                  <th className="border border-slate-300 px-3 py-2 text-center">Số lượng</th>
                  <th className="border border-slate-300 px-3 py-2 text-right">Đơn giá</th>
                  <th className="border border-slate-300 px-3 py-2 text-right">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {d.items && d.items.length > 0 ? (
                  d.items.map((it: any, idx: number) => (
                    <tr key={idx} className="border-b border-slate-200">
                      <td className="border border-slate-300 px-3 py-2 font-bold text-slate-800">{it.name}</td>
                      <td className="border border-slate-300 px-3 py-2 text-center font-extrabold text-rose-600">{it.quantity}</td>
                      <td className="border border-slate-300 px-3 py-2 text-right">{(it.price || 0).toLocaleString()} ₫</td>
                      <td className="border border-slate-300 px-3 py-2 text-right font-black">{(it.total || 0).toLocaleString()} ₫</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="border border-slate-300 px-3 py-3 text-center text-slate-400">Không có dữ liệu</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-end gap-3 print:hidden border-t border-slate-200 pt-3">
              <button
                type="button"
                onClick={() => setShowReturnReceiptModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Printer size={14} /> In phiếu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPrintStocktakeModal = () => {
    if (!showStocktakePrintModal || !printStocktakeData) return null;
    const d = printStocktakeData;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl border border-slate-200 max-w-3xl w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[92vh]">
          <button
            onClick={() => setShowStocktakePrintModal(false)}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer print:hidden"
          >
            <X size={20} />
          </button>
          
          {/* Printable Layout matching Image 5 */}
          <div className="p-6 text-slate-900 text-xs font-sans bg-white" id="printable-stocktake">
            <div className="flex justify-between items-start mb-6 border-b border-slate-200 pb-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-800">{d.creator || "Toàn Bảo"}</h3>
                <p className="text-[11px] text-slate-600 font-medium">Chi nhánh: {d.branch || "Toàn Bảo"}</p>
                <p className="text-[11px] text-slate-600 font-medium">Địa chỉ: Nhà hàng BISTRO</p>
                <p className="text-[11px] text-slate-600 font-medium">Điện thoại: 0386636706</p>
              </div>
              <div className="text-right text-[11px] text-slate-500">
                <p className="font-semibold">Phần mềm quản lý bán hàng BISTRO</p>
                <p>{d.printTime || new Date().toLocaleString("vi-VN")}</p>
              </div>
            </div>

            <div className="text-center mb-6">
              <h1 className="text-xl font-black uppercase tracking-wider text-slate-900">PHIẾU KIỂM KÊ</h1>
              <p className="text-sm font-bold text-slate-700 mt-1">{d.ticketCode || "PKK000002"}</p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold mb-6 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div>
                <div><span className="font-extrabold">Ngày tạo:</span> {d.createdDate || d.date || new Date().toLocaleString("vi-VN")}</div>
                <div><span className="font-extrabold">Người lập:</span> {d.creator || "Toàn Bảo"}</div>
              </div>
              <div>
                <div><span className="font-extrabold">Ngày duyệt:</span> {d.approvedDate || new Date().toLocaleString("vi-VN")}</div>
                <div><span className="font-extrabold">Người duyệt:</span> {d.approver || "Toàn Bảo"}</div>
              </div>
            </div>

            <table className="w-full border-collapse border border-slate-900 text-xs mb-6">
              <thead>
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-b border-slate-900 text-center">
                  <th className="border border-slate-900 px-3 py-2 text-left">Tên nguyên liệu</th>
                  <th className="border border-slate-900 px-3 py-2 text-center w-24">Tồn trên máy</th>
                  <th className="border border-slate-900 px-3 py-2 text-center w-24">Thực tế đếm</th>
                  <th className="border border-slate-900 px-3 py-2 text-center w-32">Số lượng lệch (Hao hụt)</th>
                  <th className="border border-slate-900 px-3 py-2 text-right w-28">Giá nhập gần nhất</th>
                  <th className="border border-slate-900 px-3 py-2 text-right w-36">Giá trị hao hụt (VND)</th>
                </tr>
              </thead>
              <tbody>
                {d.items && d.items.length > 0 ? (
                  (() => {
                    let totalLossSum = 0;
                    const rows = d.items.map((it: any, idx: number) => {
                      const ingObj = reduxIngredients.find((i: any) => Number(i.id) === Number(it.ingredientId) || i.name === (it.ingredientName || it.name));
                      const sys = Number(it.systemStock ?? it.system ?? 0);
                      const act = Number(it.actualStock ?? it.actual ?? 0);
                      const diff = act - sys;
                      const unitCost = Number(it.unitCost || ingObj?.unitCost || ingObj?.cost || 200000);
                      const absDiff = Math.abs(diff);
                      const lossVal = diff < 0 ? absDiff * unitCost : 0;
                      totalLossSum += lossVal;

                      return (
                        <tr key={idx} className="border-b border-slate-400">
                          <td className="border border-slate-900 px-3 py-2 font-extrabold text-slate-800">
                            {it.ingredientName || it.name}
                          </td>
                          <td className="border border-slate-900 px-3 py-2 text-center font-bold text-slate-700">
                            {sys} {it.unit || ingObj?.unit || "kg"}
                          </td>
                          <td className="border border-slate-900 px-3 py-2 text-center font-black text-blue-600">
                            {act} {it.unit || ingObj?.unit || "kg"}
                          </td>
                          <td className={`border border-slate-900 px-3 py-2 text-center font-black ${diff < 0 ? 'text-rose-600' : diff > 0 ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {diff === 0 ? "0" : `${diff > 0 ? "+" : ""}${diff} ${it.unit || ingObj?.unit || "kg"}`}
                          </td>
                          <td className="border border-slate-900 px-3 py-2 text-right font-medium text-slate-700">
                            {unitCost.toLocaleString("vi-VN")} đ
                          </td>
                          <td className="border border-slate-900 px-3 py-2 text-right font-extrabold text-slate-900">
                            {lossVal > 0 ? (
                              <span>{lossVal.toLocaleString("vi-VN")} đ <em className="text-[10px] text-slate-500 font-normal">({absDiff} {it.unit || "kg"} x {Math.round(unitCost/1000)}k)</em></span>
                            ) : (
                              "0 đ"
                            )}
                          </td>
                        </tr>
                      );
                    });

                    return (
                      <>
                        {rows}
                        <tr className="bg-slate-100 font-black text-sm border-t-2 border-slate-900">
                          <td colSpan={5} className="border border-slate-900 px-3 py-3 uppercase tracking-wider">
                            TỔNG CỘNG TỔN THẤT HAO HỤT
                          </td>
                          <td className="border border-slate-900 px-3 py-3 text-right text-rose-600 font-black">
                            {totalLossSum.toLocaleString("vi-VN")} đ
                          </td>
                        </tr>
                      </>
                    );
                  })()
                ) : (
                  <tr>
                    <td colSpan={6} className="border border-slate-900 px-2 py-4 text-center text-slate-500 italic">Không có chi tiết hàng hóa kiểm kê</td>
                  </tr>
                )}
              </tbody>
            </table>

            <div className="flex justify-between items-center text-xs font-bold text-slate-800 mb-6">
              <div>Ghi chú: <span className="font-normal italic">{d.note || "Không có ghi chú"}</span></div>
              <div className="text-sm font-black">Tổng số lượng: <span className="text-blue-600">{d.items?.length || 0}</span></div>
            </div>

            <div className="flex justify-end gap-3 print:hidden border-t border-slate-200 pt-4">
              <button
                type="button"
                onClick={() => setShowStocktakePrintModal(false)}
                className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-xs hover:bg-slate-50 cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-xs hover:bg-blue-700 cursor-pointer flex items-center gap-1.5 shadow-md shadow-blue-600/20"
              >
                <Printer size={14} /> In phiếu
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderAddSupplierModal = () => {
    if (!showAddSupplierModal) return null;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
          <button
            onClick={() => setShowAddSupplierModal(false)}
            className="absolute right-4 top-4 p-1 rounded-lg text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
          <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">Thêm Nhà cung cấp mới</h3>
          <form onSubmit={handleSaveSupplier} className="flex flex-col gap-4 text-xs">
            <div className="flex flex-col gap-1.5">
              <label className="font-extrabold text-slate-700">Tên nhà cung cấp</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Công ty Nông sản sạch..."
                value={newSupplierForm.name}
                onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-extrabold text-slate-700">Người liên hệ</label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: A. Bình"
                  value={newSupplierForm.contact}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, contact: e.target.value })}
                  className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="font-extrabold text-slate-700">Số điện thoại</label>
                <input
                  type="text"
                  required
                  placeholder="SĐT liên hệ"
                  value={newSupplierForm.phone}
                  onChange={(e) => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })}
                  className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-extrabold text-slate-700">Địa chỉ</label>
              <input
                type="text"
                required
                placeholder="Địa chỉ văn phòng / kho bãi"
                value={newSupplierForm.address}
                onChange={(e) => setNewSupplierForm({ ...newSupplierForm, address: e.target.value })}
                className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="font-extrabold text-slate-700">Nguyên liệu chính cung cấp</label>
              <input
                type="text"
                required
                placeholder="Ví dụ: Rau củ, Nấm tươi (phân cách bằng dấu phẩy)"
                value={newSupplierForm.mainIngredients}
                onChange={(e) => setNewSupplierForm({ ...newSupplierForm, mainIngredients: e.target.value })}
                className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
              />
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 justify-end">
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold cursor-pointer"
              >
                Xác nhận
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  const [printReceiptData, setPrintReceiptData] = useState<any>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);
  const [expandedTxId, setExpandedTxId] = useState<string | null>(null);

  const groupedImportSlips = useMemo(() => {
    const groups: { [key: string]: any } = {};

    filteredImportTransactions.forEach((tx) => {
      const reasonStr = tx.reasonOrSupplier || "";
      const parts = reasonStr.split(" - Ghi chú: ");
      const rawSupplierText = parts[0] || "Khác";
      const cleanSupplier = rawSupplierText
        .replace(/\[SLIP:[^\]]+\]\s*/g, "")
        .replace("[LƯU TẠM] ", "")
        .replace("[HOÀN THÀNH] ", "")
        .replace("Nhập hàng từ ", "")
        .trim() || "Nhà cung cấp";
      
      const isDraft = reasonStr.includes("[LƯU TẠM]") || (tx as any).status === "draft" || (tx as any).note?.includes("[LƯU TẠM]");
      const isCompleted = reasonStr.includes("[HOÀN THÀNH]") || (tx as any).note?.includes("[HOÀN THÀNH]");
      const isCreditTx = Boolean(tx.isCredit || (tx as any).is_credit || reasonStr.includes("Công nợ") || reasonStr.includes("chịu"));
      
      const slipMatch = reasonStr.match(/\[SLIP:([^\]]+)\]/);
      const dateMinuteStr = new Date(tx.timestamp).toISOString().slice(0, 16);
      const groupKey = slipMatch ? slipMatch[1] : `${dateMinuteStr}_${cleanSupplier}_${isDraft ? 'draft' : isCompleted ? 'completed' : 'done'}`;
      const ticketCode = slipMatch ? slipMatch[1] : `PN${new Date(tx.timestamp).getFullYear()}${String(new Date(tx.timestamp).getMonth() + 1).padStart(2, '0')}${String(new Date(tx.timestamp).getDate()).padStart(2, '0')}-${String(tx.id).slice(-4)}`;

      const qty = Math.abs(Number(tx.quantity) || 0);
      const price = Number(tx.unit_cost) || 0;
      const total = qty * price;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          ticketCode,
          timestamp: tx.timestamp,
          supplierName: cleanSupplier,
          userName: "Nhân viên kho",
          isDraft,
          isCompleted,
          isCredit: isCreditTx,
          note: parts[1] || "",
          items: [],
          totalAmount: 0,
          paidAmount: 0,
          debtAmount: 0,
          rawTxList: []
        };
      }

      const matchIng = reduxIngredients.find((i: any) => i.name === tx.ingredientName);
      const ingredientId = tx.ingredientId || (tx as any).ingredient_id || (matchIng ? matchIng.id : tx.id);
      const ingredientCode = matchIng ? (matchIng.code || matchIng.itemCode) : `SP${String(ingredientId).padStart(6, '0')}`;

      groups[groupKey].rawTxList.push(tx);
      groups[groupKey].items.push({
        draftTxId: tx.id,
        ingredientId,
        ingredientName: tx.ingredientName,
        code: ingredientCode,
        unit: tx.unit || "kg",
        quantity: qty,
        unitCost: price,
        total: total,
        batchNo: tx.batchNo || "-",
        expiryDate: tx.expiryDate ? new Date(tx.expiryDate).toLocaleDateString("vi-VN") : "-"
      });

      groups[groupKey].totalAmount += total;
      groups[groupKey].paidAmount += isCreditTx ? 0 : total;
      groups[groupKey].debtAmount += isCreditTx ? total : 0;
    });

    return Object.values(groups);
  }, [filteredImportTransactions, reduxIngredients]);

  const groupedReturnSlips = useMemo(() => {
    const groups: { [key: string]: any } = {};

    filteredReturnTransactions.forEach((tx) => {
      const reasonStr = tx.reasonOrSupplier || "";
      const parts = reasonStr.split(" - Ghi chú: ");
      const rawSupplierText = parts[0] || "Khác";
      const cleanSupplier = rawSupplierText
        .replace(/\[SLIP:[^\]]+\]\s*/g, "")
        .replace("[LƯU TẠM] ", "")
        .replace("[HOÀN THÀNH] ", "")
        .replace("Trả hàng cho ", "")
        .replace(" - Trừ công nợ", "")
        .replace(" - Trừ nợ NCC", "")
        .trim() || "Nhà cung cấp";
      
      const isDraft = reasonStr.includes("[LƯU TẠM]") || (tx as any).status === "draft" || (tx as any).note?.includes("[LƯU TẠM]");
      const isCompleted = reasonStr.includes("[HOÀN THÀNH]") || (tx as any).note?.includes("[HOÀN THÀNH]");
      const isCreditTx = Boolean(tx.isCredit || (tx as any).is_credit || reasonStr.toLowerCase().includes("công nợ") || reasonStr.toLowerCase().includes("trừ nợ"));
      
      const slipMatch = reasonStr.match(/\[SLIP:([^\]]+)\]/);
      const dateMinuteStr = new Date(tx.timestamp).toISOString().slice(0, 16);
      const groupKey = slipMatch ? slipMatch[1] : `${dateMinuteStr}_${cleanSupplier}_${isDraft ? 'draft' : isCompleted ? 'completed' : 'done'}`;
      const ticketCode = slipMatch ? slipMatch[1] : `TXT${new Date(tx.timestamp).getFullYear()}${String(new Date(tx.timestamp).getMonth() + 1).padStart(2, '0')}${String(new Date(tx.timestamp).getDate()).padStart(2, '0')}-${String(tx.id).slice(-4)}`;

      const qty = Math.abs(Number(tx.quantity) || 0);
      const price = Number(tx.unit_cost) || 0;
      const total = qty * price;

      if (!groups[groupKey]) {
        groups[groupKey] = {
          id: groupKey,
          ticketCode,
          timestamp: tx.timestamp,
          supplierName: cleanSupplier,
          userName: "Quản trị viên",
          isDraft,
          isCompleted,
          isCredit: isCreditTx,
          note: parts[1] || "",
          items: [],
          totalAmount: 0,
          paidAmount: 0,
          debtAmount: 0,
          rawTxList: []
        };
      }

      const matchIng = reduxIngredients.find((i: any) => i.name === tx.ingredientName);
      const ingredientId = tx.ingredientId || (tx as any).ingredient_id || (matchIng ? matchIng.id : tx.id);
      const ingredientCode = matchIng ? (matchIng.code || matchIng.itemCode) : `SP${String(ingredientId).padStart(6, '0')}`;

      groups[groupKey].rawTxList.push(tx);
      groups[groupKey].items.push({
        draftTxId: tx.id,
        ingredientId,
        ingredientName: tx.ingredientName,
        code: ingredientCode,
        unit: tx.unit || "kg",
        quantity: qty,
        unitCost: price,
        total: total,
        batchNo: tx.batchNo || "-",
        expiryDate: tx.expiryDate ? new Date(tx.expiryDate).toLocaleDateString("vi-VN") : "-"
      });

      groups[groupKey].isCredit = groups[groupKey].isCredit || isCreditTx;
      groups[groupKey].totalAmount += total;
      groups[groupKey].paidAmount += isCreditTx ? 0 : total;
      groups[groupKey].debtAmount += isCreditTx ? total : 0;
    });

    return Object.values(groups);
  }, [filteredReturnTransactions]);

  useEffect(() => {
    if (showPrintModal && printReceiptData) {
      const timer = setTimeout(() => {
        window.print();
        setShowPrintModal(false);
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [showPrintModal, printReceiptData]);

  const renderPrintModal = () => {
    if (!printReceiptData) return null;
    const d = printReceiptData;
    const totalItemsQty = d.items ? d.items.reduce((sum: number, i: any) => sum + (Number(i.quantity) || 0), 0) : 0;
    const isReturn = d.title === "PHIẾU XUẤT TRẢ";

    return (
      <div id="sunolike-print-area" className="hidden print:block text-black bg-white font-sans text-xs">
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #sunolike-print-area, #sunolike-print-area * {
              visibility: visible !important;
            }
            #sunolike-print-area {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              padding: 20px !important;
              background: white !important;
              color: black !important;
              display: block !important;
            }
          }
        `}</style>

        {/* Top Header matching Image 2 */}
        <div className="text-center text-[10px] text-black font-normal mb-6">
          Phần mềm quản lý bán hàng BISTRO
        </div>

        {/* Document Title & Ticket Code matching Image 2 */}
        <div className="text-center mb-6">
          <h2 className="text-base font-bold uppercase tracking-wider text-black">
            {isReturn ? "PHIẾU XUẤT TRẢ" : "HOÁ ĐƠN NHẬP HÀNG"}
          </h2>
          <div className="text-xs font-bold text-black mt-0.5">
            {d.ticketCode || "TN202681231311"}
          </div>
        </div>

        {/* Metadata info section matching Image 2 */}
        <div className="mb-4 text-xs font-semibold text-black space-y-0.5">
          <div><span className="font-bold">Nhà cung cấp:</span> {d.supplierName || "(không nhập)"}</div>
          <div><span className="font-bold">{isReturn ? "Ngày xuất trả:" : "Ngày nhập:"}</span> {d.dateStr || new Date().toLocaleString("vi-VN")}</div>
          <div><span className="font-bold">{isReturn ? "Người xuất:" : "Người nhập:"}</span> {d.userName || "Quản trị viên"}</div>
        </div>

        {/* Table matching Image 2 */}
        <table className="w-full border-collapse border border-black text-xs mb-4">
          <thead>
            <tr className="border-b border-black">
              <th className="border border-black px-2 py-1 text-center w-10 font-bold">STT</th>
              <th className="border border-black px-2 py-1 text-left font-bold">Hàng hóa</th>
              <th className="border border-black px-2 py-1 text-center w-14 font-bold">SL</th>
              <th className="border border-black px-2 py-1 text-right w-24 font-bold">{isReturn ? "Giá trả" : "Đơn giá"}</th>
              <th className="border border-black px-2 py-1 text-right w-28 font-bold">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {d.items && d.items.length > 0 ? (
              d.items.map((it: any, idx: number) => (
                <tr key={idx} className="border-b border-black">
                  <td className="border border-black px-2 py-1 text-center font-bold">{idx + 1}</td>
                  <td className="border border-black px-2 py-1 font-bold">{it.name}</td>
                  <td className="border border-black px-2 py-1 text-center font-bold">{it.quantity}</td>
                  <td className="border border-black px-2 py-1 text-right font-normal">{(it.price || 0).toLocaleString("vi-VN")}</td>
                  <td className="border border-black px-2 py-1 text-right font-bold">{(it.total || 0).toLocaleString("vi-VN")}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="border border-black px-2 py-3 text-center italic">Không có danh sách mặt hàng</td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Summary Breakdown matching Image 2 */}
        <div className="flex justify-between items-start text-xs text-black font-semibold mb-6">
          <div>
            {d.note && (
              <div>
                <div className="font-bold">Ghi chú:</div>
                <div className="font-normal">{d.note}</div>
              </div>
            )}
          </div>
          <div className="text-right space-y-0.5">
            <div>Tổng số lượng: <span className="font-bold ml-8">{totalItemsQty}</span></div>
            {isReturn ? (
              <>
                <div>Tổng giá trị xuất trả: <span className="font-bold ml-8">{Number(d.totalAmount || 0).toLocaleString("vi-VN")}</span></div>
                {d.isCredit || Number(d.debtAmount) > 0 || d.paymentStatus === "deduct_credit" ? (
                  <>
                    <div>Hình thức hoàn tiền: <span className="font-bold ml-4">Giảm trừ Công nợ NCC</span></div>
                    <div>Giảm trừ nợ: <span className="font-bold ml-8">{Number(d.debtAmount || d.totalAmount || 0).toLocaleString("vi-VN")}</span></div>
                  </>
                ) : (
                  <>
                    <div>Hình thức hoàn tiền: <span className="font-bold ml-4">NCC hoàn tiền mặt / CK</span></div>
                    <div>Đã nhận hoàn lại: <span className="font-bold ml-8">{Number(d.paidAmount || d.totalAmount || 0).toLocaleString("vi-VN")}</span></div>
                  </>
                )}
              </>
            ) : (
              <>
                <div>Tổng thanh toán: <span className="font-bold ml-8">{Number(d.totalAmount || 0).toLocaleString("vi-VN")}</span></div>
                <div>Đã thanh toán: <span className="font-bold ml-8">{Number(d.paidAmount || 0).toLocaleString("vi-VN")}</span></div>
                {Number(d.debtAmount || 0) > 0 && (
                  <div>Còn nợ: <span className="font-bold ml-8">{Number(d.debtAmount || 0).toLocaleString("vi-VN")}</span></div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (currentView === "importGoods") {
    return (
      <>
        <ImportGoods 
          onBack={() => { 
            setCurrentView("main"); 
            setInitialImportData(null); 
            getIngredientsApi().then(setReduxIngredients).catch(console.error);
            getSuppliersApi().then(setSuppliers).catch(console.error);
            getInventoryTransactionsApi().then(setTransactions).catch(console.error);
            fetchAllBatchesData();
          }} 
          initialData={initialImportData || undefined} 
          onAddSupplier={() => setShowAddSupplierModal(true)}
          onPrintReceipt={(data) => {
            setPrintReceiptData(data);
            setShowPrintModal(true);
          }}
        />
        {renderAddSupplierModal()}
        {renderPrintModal()}
      </>
    );
  }
  
  if (currentView === "returnGoods") {
    return (
      <>
        <ReturnGoods 
          onBack={() => {
            setCurrentView("main");
            setReturnBatchData(null);
            getIngredientsApi().then(setReduxIngredients).catch(console.error);
            getInventoryTransactionsApi().then(setTransactions).catch(console.error);
            fetchAllBatchesData();
          }} 
          initialReturnData={returnBatchData}
          onPrintReceipt={(data) => {
            setPrintReceiptData(data);
            setShowPrintModal(true);
          }}
        />
        {renderPrintModal()}
      </>
    );
  }

  if (currentView === "inventoryCheck") {
    return <InventoryCheck onBack={() => {
      setCurrentView("main");
      getIngredientsApi().then(setReduxIngredients).catch(console.error);
      getInventoryTransactionsApi().then(setTransactions).catch(console.error);
      fetchAllBatchesData();
    }} draftData={selectedDraft} />;
  }

  const lowStockCount = reduxIngredients.filter((ing) => ing.stock <= ing.threshold).length;
  const expiryAlertBatches = expiryBatches.filter((b) => getExpiryLabel(b.expiryDate).status !== "good");
  const expiryAlertCount = expiryAlertBatches.length;
  const alertCount = (lowStockCount > 0 ? 1 : 0) + (expiryAlertCount > 0 ? 1 : 0);

  return (
    <div className="w-full flex flex-col gap-6 animate-in fade-in duration-300 text-slate-800">

      {/* 1. Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-slate-200 gap-4 print-hide">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Layers className="text-admin-primary" size={24} />
            Hệ thống Quản lý Kho Nguyên liệu
          </h2>
          <p className="text-xs text-slate-700 font-medium mt-1">
            Quản lý nguyên liệu, nhà cung cấp, nhập xuất kho, kiểm kê và theo dõi hạn sử dụng thời gian thực.
          </p>
        </div>

        {alertCount > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowAlertsPanel(!showAlertsPanel)}
              className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl font-black text-xs hover:bg-rose-100 transition-colors shadow-sm cursor-pointer"
            >
              <AlertTriangle size={16} className={showAlertsPanel ? "" : "animate-pulse"} />
              Cảnh báo hệ thống ({alertCount})
            </button>
            
            {showAlertsPanel && (
              <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border border-slate-200 z-50 p-4 flex flex-col gap-3 animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="font-black text-slate-800 text-sm">Trung tâm cảnh báo</h4>
                  <button onClick={() => setShowAlertsPanel(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X size={16} />
                  </button>
                </div>
                
                {lowStockCount > 0 && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3 flex flex-col gap-1 text-xs">
                    <p className="font-extrabold text-rose-900 flex items-center gap-1.5"><AlertTriangle size={14}/> TỒN KHO THẤP!</p>
                    <p className="text-[11px] text-rose-700 font-medium">
                      Có {lowStockCount} nguyên liệu sắp hết hàng. Vui lòng kiểm tra và lên đơn nhập.
                    </p>
                  </div>
                )}

                {expiryAlertCount > 0 && (
                  <div className="bg-amber-50 border border-amber-250 text-amber-800 rounded-lg p-3 flex flex-col gap-1 text-xs">
                    <p className="font-extrabold text-amber-900 flex items-center gap-1.5"><CalendarRange size={14}/> HẠN SỬ DỤNG!</p>
                    <p className="text-[11px] text-amber-700 font-medium">
                      Có {expiryAlertCount} nguyên liệu đã hết hoặc cận hạn. Hãy ưu tiên tiêu hủy hoặc sử dụng.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 p-1 rounded-xl gap-1 print-hide">
        {[
          { id: "ingredients", label: "Nguyên liệu", icon: <Layers size={14} /> },
          { id: "categories_suppliers", label: "Danh mục & NCC", icon: <Truck size={14} /> },
          { id: "import_history", label: "Nhập hàng", icon: <DownloadCloud size={14} /> },
          { id: "return_history", label: "Xuất trả NCC", icon: <UploadCloud size={14} /> },
          { id: "stocktake", label: "Kiểm kê", icon: <ClipboardCheck size={14} /> },
          { id: "expiry", label: "Hạn sử dụng", icon: <CalendarRange size={14} /> },
          { id: "reports", label: "Báo cáo tồn kho", icon: <PieChart size={14} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold cursor-pointer transition-all duration-200 ${activeTab === tab.id
              ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
              : "text-slate-700 hover:text-slate-800 hover:bg-white/40"
              }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Tab Contents */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 min-h-[800px]">

        {/* Tab 1: Nguyên liệu */}
        {activeTab === "ingredients" && (
          <div className="flex flex-col gap-4">
            {/* Category Pills Navigation */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide print-hide">
              <button
                onClick={() => setSelectedCategoryFilter("all")}
                className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                  selectedCategoryFilter === "all"
                    ? "bg-slate-800 text-white shadow-md"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                }`}
              >
                Tất cả danh mục
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategoryFilter(c.name)}
                  className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                    selectedCategoryFilter === c.name
                      ? "bg-blue-600 text-white shadow-md border border-blue-600"
                      : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300"
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-white p-2 rounded-xl border border-slate-200 shadow-sm print-hide">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm kiếm nguyên liệu..."
                  value={ingSearch}
                  onChange={(e) => setIngSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-sm bg-slate-50 border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all font-medium"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value)}
                  className="px-4 py-2 text-sm bg-slate-50 border-transparent rounded-lg focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-50 font-semibold cursor-pointer text-slate-700 transition-all hover:bg-slate-100"
                >
                  <option value="all">Tất cả mức tồn</option>
                  <option value="low">Tồn kho thấp</option>
                  <option value="normal">Bình thường</option>
                </select>

                <button
                  onClick={handleExportBlankCheckSheet}
                  className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Xuất file Excel danh sách nguyên liệu với cột Thực tế để trống cho nhân viên đếm bằng tay"
                >
                  <FileSpreadsheet size={15} className="text-emerald-600" /> In phiếu kiểm kho
                </button>

                <button
                  onClick={() => setShowWasteModal(true)}
                  className="px-3.5 py-2 bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Ghi nhận tiêu hủy nguyên liệu/lô hàng bị hỏng, mốc, ôi thiu"
                >
                  <Trash2 size={15} className="text-rose-600" /> Xuất hủy hàng hỏng
                </button>

                <button
                  onClick={() => setShowAddIngModal(true)}
                  className="px-3.5 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Plus size={15} /> Thêm nguyên liệu
                </button>
              </div>
            </div>

            {/* Ingredients Table */}
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-inner relative">
              {selectedIngredients.length > 0 && (
                <div className="absolute top-0 left-0 right-0 z-10 bg-blue-600 px-4 py-2 flex items-center justify-between text-white shadow-md animate-in slide-in-from-top-2">
                  <div className="text-xs font-bold">
                    Đã chọn {selectedIngredients.length} mặt hàng
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setCurrentView("importGoods");
                        setSelectedIngredients([]);
                      }}
                      className="px-3 py-1 bg-white text-blue-700 rounded text-[10px] font-black uppercase shadow-xs hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      Nhập hàng
                    </button>

                    <button
                      onClick={() => {
                        setSelectedDraft(null);
                        setCurrentView("inventoryCheck");
                        setSelectedIngredients([]);
                      }}
                      className="px-3 py-1 bg-white text-blue-700 rounded text-[10px] font-black uppercase shadow-xs hover:bg-blue-50 transition-colors cursor-pointer"
                    >
                      Kiểm kê
                    </button>
                    <button
                      onClick={() => setSelectedIngredients([])}
                      className="p-1 hover:bg-blue-700 rounded cursor-pointer"
                      title="Bỏ chọn"
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              )}
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-4 py-3 text-left w-10">
                      <input 
                        type="checkbox" 
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        checked={filteredIngredients.length > 0 && selectedIngredients.length === filteredIngredients.length}
                        onChange={handleToggleSelectAll}
                      />
                    </th>
                    <th scope="col" className="px-5 py-3 text-left">Nguyên liệu</th>
                    <th scope="col" className="px-5 py-3 text-left">Danh mục</th>
                    <th scope="col" className="px-5 py-3 text-center">Tồn kho hiện tại</th>
                    <th scope="col" className="px-5 py-3 text-center">Tình trạng</th>
                    <th scope="col" className="px-5 py-3 text-right">Điều chỉnh nhanh</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-xs font-semibold text-slate-700">
                  {filteredIngredients.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-600 italic">
                        Không tìm thấy nguyên liệu nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    filteredIngredients.map((ing) => {
                      const isLow = Number(ing.stock) <= Number(ing.threshold);
                      const hasExpired = expiryBatches.some(b => b.ingredientName === ing.name && getExpiryLabel(b.expiryDate).status === "expired");
                      const hasNear = expiryBatches.some(b => b.ingredientName === ing.name && getExpiryLabel(b.expiryDate).status === "near");
                      const percentage = Math.min(100, Math.max(0, (Number(ing.stock) / (Number(ing.threshold) * 3)) * 100));
                      const isExpanded = expandedRows[ing.id];
                      const batches = batchData[ing.id] || [];

                      return (
                        <React.Fragment key={ing.id}>
                          <tr 
                            onClick={() => handleToggleRow(ing)}
                            className={`hover:bg-slate-50/50 transition-colors cursor-pointer ${isExpanded ? "bg-slate-50/50" : ""} ${selectedIngredients.includes(ing.id) ? "bg-blue-50/30" : ""}`}
                          >
                            <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                              <input 
                                type="checkbox" 
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                                checked={selectedIngredients.includes(ing.id)}
                                onChange={() => handleToggleSelectIngredient(ing.id)}
                              />
                            </td>
                            <td className="px-5 py-4">
                              <span className="font-extrabold text-slate-900">{ing.name}</span>
                            </td>
                            <td className="px-5 py-4">
                              <span className="px-2 py-0.5 bg-slate-100 border border-slate-200/60 rounded-md text-[9px] font-extrabold text-slate-600">
                                {getIngredientCategory(ing.name)}
                              </span>
                            </td>
                            <td className="px-5 py-4">
                              <div className="flex flex-col gap-1 w-32 mx-auto md:mx-0">
                                <span className={`font-black text-center md:text-left ${isLow ? "text-rose-600" : "text-admin-primary"}`}>
                                  {Number(ing.stock).toFixed(ing.unit === "kg" ? 1 : 0)} {ing.unit}
                                </span>
                                <div className="w-full bg-slate-100 rounded-full h-1.5 border border-slate-200/50">
                                  <div
                                    className={`h-full rounded-full ${isLow ? "bg-rose-500" : "bg-blue-600"}`}
                                    style={{ width: `${percentage}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4 text-center">
                              {hasExpired ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-250 animate-pulse uppercase">
                                  <AlertTriangle size={10} /> CÓ LÔ HẾT HẠN
                                </span>
                              ) : hasNear ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-250 uppercase">
                                  <AlertTriangle size={10} /> CÓ LÔ CẬN HẠN
                                </span>
                              ) : isLow ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-250 animate-pulse uppercase">
                                  <AlertTriangle size={10} /> TỒN THẤP
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250 uppercase">
                                  <Check size={10} /> AN TOÀN
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                               <div className="flex justify-end gap-1.5 items-center">
                                <button
                                  onClick={() => handleToggleRow(ing)}
                                  className={`px-2 py-1 rounded border text-[10px] font-extrabold cursor-pointer transition-colors flex items-center gap-1 ${isExpanded ? "bg-slate-200 border-slate-300 text-slate-700" : "bg-blue-50 border-blue-200 text-blue-600 hover:bg-blue-100"}`}
                                  title={isExpanded ? "Đóng danh sách lô" : "Xem chi tiết lô"}
                                >
                                  {isExpanded ? <Minus size={10} /> : <Eye size={10} />}
                                  {isExpanded ? "Đóng Lô" : "Xem Lô"}
                                </button>
                              </div>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-slate-50 border-b border-slate-200">
                              <td colSpan={6} className="p-0">
                                <div className="p-4 bg-white/50 border-y border-slate-200/60 shadow-inner">
                                  <div className="flex items-center gap-2 mb-3">
                                    <Layers size={14} className="text-blue-600" />
                                    <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                                      Danh sách Lô hàng: {ing.name}
                                    </span>
                                  </div>
                                  
                                  {batches.length > 0 ? (
                                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                                      <table className="min-w-full divide-y divide-slate-200">
                                        <thead className="bg-slate-100/80">
                                          <tr>
                                            <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-600 uppercase">Mã Lô</th>
                                            <th className="px-4 py-2 text-center text-[10px] font-bold text-slate-600 uppercase">Tồn lô</th>
                                            <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-600 uppercase">Ngày nhập</th>
                                            <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-600 uppercase">Nhà cung cấp</th>
                                            <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-600 uppercase">Hạn sử dụng</th>
                                            <th className="px-4 py-2 text-left text-[10px] font-bold text-slate-600 uppercase">Trạng thái</th>
                                            <th className="px-4 py-2 text-right text-[10px] font-bold text-slate-600 uppercase">Thao tác</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 bg-white">
                                          {batches.map((b: any) => {
                                            const label = getExpiryLabel(b.expiry_date);
                                            return (
                                              <tr key={b.id} className="hover:bg-slate-50">
                                                <td className="px-4 py-2 font-bold text-slate-800 text-[11px]">{b.batch_code}</td>
                                                <td className="px-4 py-2 text-center font-bold text-admin-primary text-[11px]">
                                                  {Number(b.remaining_quantity).toFixed(ing.unit === "kg" ? 1 : 0)} {ing.unit}
                                                </td>
                                                <td className="px-4 py-2 text-[11px] text-slate-700">
                                                  {new Date(b.created_at).toLocaleDateString("vi-VN")}
                                                </td>
                                                <td className="px-4 py-2 text-[11px] text-slate-700 font-medium">
                                                  {b.supplierName || "-"}
                                                </td>
                                                <td className="px-4 py-2 text-[11px] text-slate-700">
                                                  {b.expiry_date ? new Date(b.expiry_date).toLocaleDateString("vi-VN") : "N/A"}
                                                </td>
                                                <td className="px-4 py-2 text-[11px]">
                                                  {label.status === "expired" ? (
                                                    <span className="text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{label.text}</span>
                                                  ) : label.status === "near" ? (
                                                    <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">{label.text}</span>
                                                  ) : (
                                                    <span className="text-emerald-600 font-bold">{label.text}</span>
                                                  )}
                                                </td>
                                                <td className="px-4 py-2 text-right">
                                                  {Number(b.remaining_quantity) > 0 && (
                                                    <button
                                                      type="button"
                                                      onClick={(e) => {
                                                        e.stopPropagation();
                                                        setWasteForm({
                                                          ingredientId: String(ing.id),
                                                          batchNo: b.batch_code,
                                                          quantity: Number(b.remaining_quantity),
                                                          reason: "Ôi thiu / Mốc",
                                                          note: `Xuất hủy lô ${b.batch_code}`
                                                        });
                                                        setShowWasteModal(true);
                                                      }}
                                                      className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-[10px] font-extrabold uppercase rounded border border-rose-200 transition-colors inline-flex items-center gap-1 cursor-pointer"
                                                    >
                                                      <Trash2 size={11} /> Xuất hủy hỏng
                                                    </button>
                                                  )}
                                                </td>
                                              </tr>
                                            );
                                          })}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <div className="text-center py-8 text-xs font-bold text-slate-500 bg-slate-50 border border-dashed border-slate-300 rounded-lg">
                                      <div className="flex flex-col items-center justify-center gap-2">
                                        <Layers size={24} className="text-slate-300" />
                                        <span>Không còn hàng nào trong kho</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
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

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-2.5 items-start text-xs font-semibold text-blue-800 shadow-inner mt-2">
              <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
              <div>
                <p className="font-extrabold text-blue-900">Liên kết thực tế Menu / Bàn ăn</p>
                <p className="text-[11px] text-blue-700 font-medium mt-0.5 leading-relaxed">
                  Hệ thống kiểm soát tồn kho được liên kết chặt chẽ với Thực đơn bán hàng. Ví dụ, khi lượng tồn kho của <strong>Cá hồi</strong> hoặc <strong>Trứng cá tầm</strong> về 0, hệ thống sẽ tự động cập nhật và ẩn/báo "Hết hàng" đối với các món <em>Cá hồi sốt chanh</em> hay <em>Gỏi hải sản</em> ngoài trang Gọi món của Nhân viên và Khách hàng ngay lập tức.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Danh mục & Nhà cung cấp */}
        {activeTab === "categories_suppliers" && (
          <div className="flex flex-col gap-5">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-black text-slate-650 uppercase tracking-wider flex items-center gap-1.5">
                <Truck size={14} className="text-admin-primary" /> Thao tác danh mục & Nhà cung cấp
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowAddSupplierModal(true)}
                  className="px-3 py-1.5 bg-linear-to-r from-blue-600 to-indigo-655 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  <Plus size={12} /> Thêm nhà cung cấp
                </button>
                <button
                  onClick={() => {
                    setImportFileTarget("suppliers");
                    setImportFile(null);
                    setImportFileError(null);
                    setShowImportFileModal(true);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer hover:bg-slate-50 shadow-2xs"
                >
                  <UploadCloud size={12} className="text-blue-600" /> Nhập từ file
                </button>
                <button
                  onClick={() => {
                    const headers = ["Ten nha cung cap", "Nguoi lien he", "SDT", "Dia chi", "Nguyen lieu cung cap"];
                    const colX = [15, 60, 95, 125, 165];
                    const rows = suppliers.map(s => [
                      s.name,
                      s.contact,
                      s.phone,
                      s.address,
                      s.mainIngredients
                    ]);
                    handleExportPdfShared("DANH SACH NHA CUNG CAP", headers, colX, rows, `Danh_Sach_Nha_Cung_Cap_${Date.now()}`);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer hover:bg-slate-50 shadow-2xs"
                >
                  <FileText size={12} className="text-red-500" /> Xuất PDF
                </button>
                <button
                  onClick={() => {
                    const headers = ["Tên nhà cung cấp", "Người liên hệ", "Số điện thoại", "Địa chỉ", "Nguyên liệu chính"];
                    const rows = suppliers.map(s => [
                      s.name,
                      s.contact,
                      s.phone,
                      s.address,
                      s.mainIngredients
                    ]);
                    handleExportExcelShared("DANH SÁCH NHÀ CUNG CẤP", headers, rows, `Danh_Sach_Nha_Cung_Cap_${Date.now()}`);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer hover:bg-slate-50 shadow-2xs"
                >
                  <FileSpreadsheet size={12} className="text-emerald-600" /> Xuất Excel
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Left Box: Danh mục nguyên liệu */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Danh mục nguyên liệu</span>
                  <button
                    onClick={() => setShowAddCategoryModal(true)}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-blue-700 hover:text-blue-850 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Plus size={10} /> Thêm danh mục
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {categories.map((c) => (
                    <div key={c.id} className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs text-slate-800">{c.name}</span>
                          <span className="text-[9px] font-bold bg-slate-200/70 text-slate-600 px-1.5 py-0.2 rounded uppercase">
                            {c.code}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-600 font-medium mt-1 leading-snug">{c.description}</p>
                      </div>
                      <button
                        onClick={() => setCategories(categories.filter((cat) => cat.id !== c.id))}
                        className="p-1 hover:bg-rose-50 rounded text-slate-600 hover:text-rose-600 cursor-pointer"
                        title="Xóa danh mục"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right Box: Nhà cung cấp */}
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                  <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Danh sách Nhà cung cấp</span>
                  <button
                    onClick={() => setShowAddSupplierModal(true)}
                    className="px-2 py-1 bg-white hover:bg-slate-50 border border-slate-200 text-blue-700 hover:text-blue-850 rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1 shadow-2xs cursor-pointer"
                  >
                    <Plus size={10} /> Thêm nhà cung cấp
                  </button>
                </div>

                <div className="flex flex-col gap-2.5">
                  {suppliers.map((s) => (
                    <div key={s.id} className="bg-slate-50 border border-slate-200/60 p-3 rounded-xl hover:shadow-xs transition-shadow">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-extrabold text-[13px] text-slate-900">{s.name}</span>
                          <div className="text-[11px] text-slate-700 font-bold mt-1">
                            Liên hệ: {s.contact || "N/A"} | SĐT: {s.phone || "N/A"}
                          </div>
                          <div className="text-[11px] text-slate-600 font-bold mt-0.5">
                            Địa chỉ: {s.address || "N/A"}
                          </div>
                          {Number(s.total_debt) > 0 && (
                            <div className="text-[11px] font-bold mt-2">
                              Công nợ: <span className="text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">{Number(s.total_debt).toLocaleString()} ₫</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1">
                          {Number(s.total_debt) > 0 && (
                            <button
                              onClick={() => {
                                setPayingSupplier(s);
                                setDebtAmount(Number(s.total_debt));
                                setShowPayDebtModal(true);
                              }}
                              className="p-1 hover:bg-emerald-50 rounded text-slate-600 hover:text-emerald-600 cursor-pointer text-[10px] font-bold flex items-center gap-1 border border-transparent hover:border-emerald-200"
                              title="Thanh toán công nợ"
                            >
                              Trả nợ
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setEditingSupplier(s);
                              setShowEditSupplierModal(true);
                            }}
                            className="p-1 hover:bg-blue-50 rounded text-slate-600 hover:text-blue-600 cursor-pointer"
                            title="Sửa nhà cung cấp"
                          >
                            <Pencil size={11} />
                          </button>
                          <button
                            onClick={() => handleDeleteSupplier(s.id)}
                            className="p-1 hover:bg-rose-50 rounded text-slate-600 hover:text-rose-600 cursor-pointer"
                            title="Xóa nhà cung cấp"
                          >
                            <Trash2 size={11} />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-200/50 flex flex-wrap gap-1 items-center">
                        <span className="text-[10px] font-extrabold text-slate-600">Nguyên liệu chính:</span>
                        {(s.mainIngredients || "").split(",").map((ingStr: string, index: number) => {
                          const ingName = ingStr.trim();
                          if (!ingName) return null;
                          return (
                            <span 
                              key={index} 
                              className="text-[9px] font-black px-1.5 py-0.5 rounded border text-blue-700 bg-blue-50 border-blue-200/40"
                            >
                              {ingName}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
        {activeTab === "import_history" && (
          <div className="flex flex-col gap-4">
            {/* Header & Filter Bar matching Image 2 */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative min-w-[240px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nhập mã phiếu, tên nguyên liệu..."
                    value={importSearch}
                    onChange={(e) => setImportSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-slate-50/50"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Filter size={14} className="text-slate-400" />
                  <span>Thời gian:</span>
                  <select
                    value={importDateFilter}
                    onChange={(e) => setImportDateFilter(e.target.value)}
                    className="border border-slate-250 rounded-xl p-1.5 text-xs font-bold outline-none cursor-pointer hover:border-slate-300 bg-white"
                  >
                    <option value="today">Hôm nay</option>
                    <option value="7days">7 ngày qua</option>
                    <option value="30days">30 ngày gần đây</option>
                    <option value="all">Tất cả thời gian</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentView("importGoods")}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
                >
                  <Plus size={16} /> + Nhập hàng
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-700 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-left">Mã phiếu</th>
                    <th scope="col" className="px-5 py-3 text-left">Ngày nhập</th>
                    <th scope="col" className="px-5 py-3 text-left">Nhà cung cấp</th>
                    <th scope="col" className="px-5 py-3 text-left">Nguyên liệu nhập</th>
                    <th scope="col" className="px-5 py-3 text-center">Số lượng</th>
                    <th scope="col" className="px-5 py-3 text-left">Hạn sử dụng</th>
                    <th scope="col" className="px-5 py-3 text-center">Trạng thái</th>
                    <th scope="col" className="px-5 py-3 text-center">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-xs font-semibold text-slate-700">
                  {groupedImportSlips.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-medium">
                        Không tìm thấy phiếu nhập hàng nào.
                      </td>
                    </tr>
                  ) : (
                    groupedImportSlips.map((slip: any) => {
                      const firstItem = slip.items[0];
                      const totalItemsCount = slip.items.length;
                      const totalQtyVal = slip.items.reduce((s: number, i: any) => s + i.quantity, 0);
                      const displayIngName = totalItemsCount > 1 
                        ? `${firstItem.ingredientName} (+${totalItemsCount - 1} mặt hàng khác)`
                        : firstItem.ingredientName;
                      const displayExpiry = firstItem.expiryDate || "-";

                      const handleOpenSlip = () => {
                        if (slip.isDraft) {
                          setInitialImportData(slip.items.map((it: any) => {
                            const matchIng = reduxIngredients.find(i => i.name === it.ingredientName);
                            return {
                              ticketCode: slip.ticketCode,
                              draftTxId: it.draftTxId,
                              ingredientId: matchIng ? matchIng.id : it.ingredientId,
                              ingredientName: it.ingredientName,
                              code: it.code,
                              quantity: it.quantity,
                              unitCost: it.unitCost,
                              batchNo: it.batchNo,
                              expiryDate: it.expiryDate,
                              note: slip.note,
                              isCredit: slip.isCredit,
                              supplierId: suppliers.find(s => s.name === slip.supplierName)?.id
                            };
                          }));
                          setCurrentView("importGoods");
                        } else {
                          setPrintReceiptData({
                            title: "PHIẾU NHẬP HÀNG",
                            ticketCode: slip.ticketCode,
                            supplierName: slip.supplierName,
                            dateStr: new Date(slip.timestamp).toLocaleString("vi-VN"),
                            userName: slip.userName,
                            isDraft: false,
                            items: slip.items.map((i: any) => ({
                              name: i.ingredientName,
                              quantity: i.quantity,
                              price: i.unitCost,
                              total: i.total
                            })),
                            totalAmount: slip.totalAmount,
                            paidAmount: slip.paidAmount,
                            debtAmount: slip.debtAmount,
                            note: slip.note
                          });
                          setShowPrintModal(true);
                        }
                      };
                      return (
                        <React.Fragment key={slip.id}>
                          <tr 
                            onClick={() => setExpandedTxId(expandedTxId === slip.id ? null : slip.id)}
                            className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                          >
                            <td className="px-5 py-3 font-extrabold text-blue-600 whitespace-nowrap flex items-center gap-1.5">
                              {expandedTxId === slip.id ? <ChevronDown size={14} className="text-blue-600" /> : <ChevronRight size={14} className="text-slate-400" />}
                              {slip.ticketCode}
                            </td>
                            <td className="px-5 py-3 text-slate-600 font-medium whitespace-nowrap">
                              {new Date(slip.timestamp).toLocaleString("vi-VN", {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                              })}
                            </td>
                            <td className="px-5 py-3 text-slate-800 font-bold">{slip.supplierName}</td>
                            <td className="px-5 py-3 font-extrabold text-slate-800">{displayIngName}</td>
                            <td className="px-5 py-3 text-center">
                              <span className="font-black text-blue-600">
                                {totalItemsCount > 1 ? `${totalItemsCount} món (${totalQtyVal} ${firstItem.unit})` : `+${totalQtyVal} ${firstItem.unit}`}
                              </span>
                            </td>
                            <td className="px-5 py-3 font-semibold text-slate-700">{displayExpiry}</td>
                            <td className="px-5 py-3 text-center">
                              {slip.isDraft ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                  LƯU TẠM
                                </span>
                              ) : (slip.isReturned || transactions.some(t => t.type === "export" && (t.reasonType === "return_supplier" || t.reasonType === "return_to_supplier" || t.reasonOrSupplier?.toLowerCase().includes("trả")) && (t.reasonOrSupplier?.includes(slip.ticketCode) || t.note?.includes(slip.ticketCode)))) ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-50 text-purple-800 border border-purple-200">
                                  XUẤT TRẢ NCC
                                </span>
                              ) : slip.isCompleted ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  HOÀN THÀNH
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-blue-50 text-blue-800 border border-blue-200">
                                  ĐÃ NHẬP HÀNG
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                {!slip.isDraft && slip.isCompleted && (
                                  <button
                                    onClick={async (e) => {
                                      e.stopPropagation();
                                      if (!window.confirm("Tất cả nguyên liệu sẽ được cộng vào bên trong kho, bạn chắc chứ?")) return;
                                      try {
                                        await Promise.all(slip.items.map((item: any) => 
                                          updateInventoryQuantityApi(item.ingredientId, {
                                            type: "import",
                                            status: "imported",
                                            quantity: item.quantity,
                                            unitCost: item.unitCost,
                                            supplierId: suppliers.find(s => s.name === slip.supplierName)?.id || undefined,
                                            isCredit: slip.isCredit,
                                            expiryDate: item.expiryDate && item.expiryDate !== "-" ? new Date(item.expiryDate.split('/').reverse().join('-')) : undefined,
                                            batchNo: item.batchNo,
                                            reasonOrSupplier: `[SLIP:${slip.ticketCode}] Nhập hàng từ ${slip.supplierName}` + (slip.note ? ` - Ghi chú: ${slip.note}` : ''),
                                            ingredientName: item.ingredientName,
                                            draftTxId: item.draftTxId
                                          })
                                        ));
                                         toast.success("Đã xác nhận nhập kho thành công!");
                                         getIngredientsApi().then(setReduxIngredients);
                                         getSuppliersApi().then(setSuppliers);
                                         getInventoryTransactionsApi().then(setTransactions);
                                       } catch (error: any) {
                                         toast.error(error?.response?.data?.message || "Lỗi khi nhập kho");
                                    }}}
                                    className="p-1.5 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-bold text-[11px] transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                    title="Xác nhận nhập vào kho"
                                  >
                                    <Check size={14} /> Nhập kho
                                  </button>
                                )}
                                {slip.isDraft && (
                                  <>
                                    <button
                                      className="p-1.5 hover:bg-amber-100 rounded-lg text-amber-700 transition-colors cursor-pointer"
                                      title="Chỉnh sửa phiếu lưu tạm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenSlip();
                                      }}
                                    >
                                      <Pencil size={15} />
                                    </button>
                                    <button
                                      className="p-1.5 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors cursor-pointer"
                                      title="Xóa phiếu lưu tạm"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!window.confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn phiếu lưu tạm "${slip.ticketCode}" không?\n\nHành động này không thể hoàn tác.`)) return;
                                        try {
                                          await Promise.all(
                                            slip.items.map((it: any) =>
                                              it.draftTxId ? deleteInventoryTransactionApi(it.draftTxId) : Promise.resolve()
                                            )
                                          );
                                          toast.success(`Đã xóa phiếu lưu tạm "${slip.ticketCode}" thành công!`, { id: "inventory-toast" });
                                          getInventoryTransactionsApi().then(setTransactions);
                                        } catch (err: any) {
                                          toast.error(err?.response?.data?.message || "Lỗi khi xóa phiếu lưu tạm", { id: "inventory-toast" });
                                        }
                                      }}
                                    >
                                      <Trash2 size={15} />
                                    </button>
                                  </>
                                )}
                                <button
                                  className="p-1 hover:bg-rose-100 rounded-lg text-rose-600 transition-colors cursor-pointer flex items-center gap-1 font-bold text-[11px]"
                                  title="Xuất trả nhà cung cấp"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    const suppObj = suppliers.find((s: any) => s.name === slip.supplierName);
                                    setReturnBatchData({
                                      supplierId: suppObj ? suppObj.id : undefined,
                                      supplierName: slip.supplierName,
                                      note: `Trả hàng cho phiếu ${slip.ticketCode}`,
                                      items: slip.items.map((it: any) => ({
                                        ingredientId: it.ingredientId,
                                        ingredientName: it.ingredientName,
                                        code: it.code,
                                        quantity: it.quantity,
                                        unitCost: it.unitCost,
                                        batchNo: it.batchNo,
                                        unit: it.unit
                                      }))
                                    });
                                    setCurrentView("returnGoods");
                                  }}
                                >
                                  <Truck size={14} /> Trả hàng
                                </button>
                                <button
                                  className="p-1 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors cursor-pointer"
                                  title="In phiếu"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setPrintReceiptData({
                                      title: "PHIẾU NHẬP HÀNG",
                                      ticketCode: slip.ticketCode,
                                      supplierName: slip.supplierName,
                                      dateStr: new Date(slip.timestamp).toLocaleString("vi-VN"),
                                      userName: slip.userName,
                                      isDraft: slip.isDraft,
                                      items: slip.items.map((i: any) => ({
                                        name: i.ingredientName,
                                        quantity: i.quantity,
                                        price: i.unitCost,
                                        total: i.total
                                      })),
                                      totalAmount: slip.totalAmount,
                                      paidAmount: slip.paidAmount,
                                      debtAmount: slip.debtAmount,
                                      note: slip.note
                                    });
                                    setShowPrintModal(true);
                                  }}
                                >
                                  <Printer size={15} />
                                </button>
                              </div>
                            </td>
                          </tr>

                          {/* Accordion Expandable Detail Row matching Image 2 */}
                          {expandedTxId === slip.id && (
                            <tr className="bg-slate-50/90 border-b-2 border-slate-300">
                              <td colSpan={8} className="p-4">
                                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
                                  {/* Left: Items Table */}
                                  <div className="lg:col-span-2">
                                    <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                      <span className="w-2 h-2 rounded-full bg-blue-600"></span> Danh sách hàng hóa chi tiết ({slip.items.length} món)
                                    </h4>
                                    <table className="w-full border-collapse border border-slate-200 text-xs">
                                      <thead>
                                        <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                                          <th className="p-2 text-center w-8">#</th>
                                          <th className="p-2 text-left">Tên hàng hoá</th>
                                          <th className="p-2 text-center w-16">SL</th>
                                          <th className="p-2 text-right w-24">Giá nhập</th>
                                          <th className="p-2 text-right w-28">Thành tiền</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {slip.items.map((it: any, idx: number) => (
                                          <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                            <td className="p-2 text-center font-bold">{idx + 1}</td>
                                            <td className="p-2">
                                              <div className="font-bold text-slate-800">{it.ingredientName}</div>
                                               <div className="text-[10px] text-slate-400">Mã lô: {it.batchNo || it.code || ""}</div>
                                            </td>
                                            <td className="p-2 text-center font-bold text-blue-700">{it.quantity} {it.unit}</td>
                                            <td className="p-2 text-right">{it.unitCost.toLocaleString("vi-VN")} đ</td>
                                            <td className="p-2 text-right font-bold text-slate-900">{it.total.toLocaleString("vi-VN")} đ</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>

                                  {/* Right: Summary Breakdown */}
                                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center space-y-3">
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-slate-600 font-semibold">
                                      <span className="flex items-center gap-1.5"><Package size={14} className="text-slate-500" /> Số món:</span>
                                      <span className="font-bold text-slate-900">{slip.items.length} món ({totalQtyVal} {firstItem.unit})</span>
                                    </div>
                                    <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-slate-600 font-semibold">
                                      <span className="flex items-center gap-1.5"><DollarSign size={14} className="text-slate-500" /> Tổng tiền:</span>
                                      <span className="font-extrabold text-slate-900 text-sm">{slip.totalAmount.toLocaleString("vi-VN")} đ</span>
                                    </div>
                                    <div className="flex justify-between items-center text-slate-600 font-semibold">
                                      <span className="flex items-center gap-1.5"><CreditCard size={14} className="text-slate-500" /> Đã trả:</span>
                                      <span className={`font-extrabold text-sm ${slip.isCredit ? 'text-rose-600' : 'text-emerald-700'}`}>
                                        {slip.paidAmount.toLocaleString("vi-VN")} đ {slip.isCredit && "(Ghi nợ NCC)"}
                                      </span>
                                    </div>
                                    {slip.isDraft && (
                                      <div className="pt-2 border-t border-slate-200 text-right">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenSlip();
                                          }}
                                          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-xs shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1"
                                        >
                                          <Pencil size={13} /> Chỉnh sửa phiếu lưu tạm
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </div>
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

            {/* Footer summary matching POS/KiotViet */}
            <div className="flex justify-between items-center bg-slate-50 px-4 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-700">
              <div>
                Tổng số phiếu nhập: <span className="text-blue-600 font-extrabold">{filteredImportTransactions.length}</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 4: Xuất trả NCC & Trừ kho tự động */}
        {activeTab === "return_history" && (
          <div className="flex flex-col gap-4">
            {/* Sub-tab selection bar */}
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
              <button
                onClick={() => setReturnSubTab("supplier_return")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  returnSubTab === "supplier_return"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Truck size={15} /> 📦 Hàng xuất trả nhà cung cấp ({filteredReturnTransactions.length})
              </button>
              <button
                onClick={() => setReturnSubTab("auto_deduction")}
                className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer ${
                  returnSubTab === "auto_deduction"
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                <Layers size={15} /> 📜 Lịch sử trừ kho tự động & Tiêu hủy ({filteredAutoDeductionTransactions.length})
              </button>
            </div>

            {/* Header & Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex flex-wrap items-center gap-3 flex-1">
                <div className="relative min-w-[240px]">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Nhập mã phiếu, nguyên liệu..."
                    value={returnSearch}
                    onChange={(e) => setReturnSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 border border-slate-250 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500 bg-slate-50/50"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                  <Filter size={14} className="text-slate-400" />
                  <span>Thời gian:</span>
                  <select
                    value={returnDateFilter}
                    onChange={(e) => setReturnDateFilter(e.target.value)}
                    className="border border-slate-250 rounded-xl p-1.5 text-xs font-bold outline-none cursor-pointer hover:border-slate-300 bg-white"
                  >
                    <option value="today">Hôm nay</option>
                    <option value="7days">7 ngày qua</option>
                    <option value="30days">30 ngày gần đây</option>
                    <option value="all">Tất cả thời gian</option>
                  </select>
                </div>
              </div>

              {returnSubTab === "supplier_return" ? (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentView("returnGoods")}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 active:scale-95 cursor-pointer"
                  >
                    <Plus size={16} /> + Xuất trả
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleExportAutoDeductionExcel}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/20 active:scale-95 cursor-pointer"
                  >
                    <FileSpreadsheet size={16} /> 📥 Xuất Excel tổng hợp
                  </button>
                </div>
              )}
            </div>

            {returnSubTab === "supplier_return" ? (
              /* Table: Xuất trả NCC */
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-5 py-3 text-left">Mã phiếu</th>
                      <th scope="col" className="px-5 py-3 text-left">Ngày trả</th>
                      <th scope="col" className="px-5 py-3 text-left">Nhà cung cấp</th>
                      <th scope="col" className="px-5 py-3 text-left">Nguyên liệu trả</th>
                      <th scope="col" className="px-5 py-3 text-center">Số lượng trả</th>
                      <th scope="col" className="px-5 py-3 text-right">Tổng tiền</th>
                      <th scope="col" className="px-5 py-3 text-center">Trạng thái</th>
                      <th scope="col" className="px-5 py-3 text-left">Lý do / Chi tiết</th>
                      <th scope="col" className="px-5 py-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 text-xs font-semibold text-slate-700">
                    {groupedReturnSlips.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-5 py-8 text-center text-slate-400 font-medium">
                          Không tìm thấy phiếu xuất trả nhà cung cấp nào.
                        </td>
                      </tr>
                    ) : (
                      groupedReturnSlips.map((slip: any) => {
                        const firstItem = slip.items[0];
                        const totalItemsCount = slip.items.length;
                        const totalQtyVal = slip.items.reduce((s: number, i: any) => s + i.quantity, 0);
                        const displayIngName = totalItemsCount > 1 
                          ? `${firstItem.ingredientName} (+${totalItemsCount - 1} mặt hàng khác)`
                          : firstItem.ingredientName;

                        const handleOpenReturnSlip = () => {
                          if (slip.isDraft) {
                            setReturnBatchData({
                              ticketCode: slip.ticketCode,
                              draftTxId: firstItem.draftTxId,
                              items: slip.items.map((it: any) => {
                                const matchIng = reduxIngredients.find(i => i.name === it.ingredientName);
                                return {
                                  draftTxId: it.draftTxId,
                                  ingredientId: matchIng ? matchIng.id : it.ingredientId,
                                  ingredientName: it.ingredientName,
                                  code: it.code,
                                  quantity: it.quantity,
                                  unitCost: it.unitCost,
                                  batchNo: it.batchNo,
                                  unit: it.unit
                                };
                              }),
                              note: slip.note,
                              isCredit: slip.isCredit,
                              supplierId: suppliers.find(s => s.name === slip.supplierName)?.id
                            });
                            setCurrentView("returnGoods");
                          } else {
                            setPrintReceiptData({
                              title: "PHIẾU XUẤT TRẢ",
                              ticketCode: slip.ticketCode,
                              supplierName: slip.supplierName,
                              dateStr: new Date(slip.timestamp).toLocaleString("vi-VN"),
                              userName: slip.userName,
                              isDraft: false,
                              items: slip.items.map((i: any) => ({
                                name: i.ingredientName,
                                quantity: i.quantity,
                                price: i.unitCost,
                                total: i.total
                              })),
                              totalAmount: slip.totalAmount,
                              paidAmount: slip.paidAmount,
                              debtAmount: slip.debtAmount,
                              note: slip.note
                            });
                            setShowPrintModal(true);
                          }
                        };

                        return (
                          <React.Fragment key={slip.id}>
                            <tr 
                              onClick={() => setExpandedTxId(expandedTxId === slip.id ? null : slip.id)}
                              className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                            >
                              <td className="px-5 py-3 font-extrabold text-blue-600 whitespace-nowrap flex items-center gap-1.5">
                                {expandedTxId === slip.id ? <ChevronDown size={14} className="text-blue-600" /> : <ChevronRight size={14} className="text-slate-400" />}
                                {slip.ticketCode}
                              </td>
                              <td className="px-5 py-3 text-slate-600 font-medium whitespace-nowrap">
                                {new Date(slip.timestamp).toLocaleString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </td>
                              <td className="px-5 py-3 text-slate-800 font-bold">{slip.supplierName}</td>
                              <td className="px-5 py-3 font-extrabold text-slate-800">{displayIngName}</td>
                              <td className="px-5 py-3 text-center">
                                <span className="font-black text-rose-600">
                                  {totalItemsCount > 1 ? `${totalItemsCount} món (-${totalQtyVal} ${firstItem.unit})` : `-${totalQtyVal} ${firstItem.unit}`}
                                </span>
                              </td>
                              <td className="px-5 py-3 text-right whitespace-nowrap">
                                <div className="font-extrabold text-slate-900">
                                  {slip.totalAmount.toLocaleString("vi-VN")} đ
                                </div>
                                {slip.isCredit ? (
                                  <div className="text-[10px] text-rose-600 font-bold">
                                    (nợ: {slip.totalAmount.toLocaleString("vi-VN")} đ)
                                  </div>
                                ) : null}
                              </td>
                              <td className="px-5 py-3 text-center">
                                {slip.isDraft ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-50 text-amber-800 border border-amber-200">
                                    Lưu tạm / Chờ xuất
                                  </span>
                                ) : slip.isCompleted ? (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                                    HOÀN THÀNH
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-purple-50 text-purple-800 border border-purple-200">
                                    ĐÃ TRẢ HÀNG
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-slate-600 font-medium max-w-[200px] truncate">{slip.note || "-"}</td>
                              <td className="px-5 py-3 text-center relative">
                                <div className="flex items-center justify-center gap-2">
                                  {(slip.isDraft || slip.isCompleted) && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (!window.confirm("Nguyên liệu sẽ bị trừ khỏi kho, bạn chắc chứ?")) return;
                                        try {
                                          await Promise.all(slip.items.map((item: any) => 
                                            updateInventoryQuantityApi(item.ingredientId, {
                                              type: "export",
                                              status: "imported",
                                              reasonType: "return_to_supplier",
                                              quantity: item.quantity,
                                              unitCost: item.unitCost,
                                              supplierId: suppliers.find(s => s.name === slip.supplierName)?.id || undefined,
                                              isCredit: slip.isCredit,
                                              batchNo: item.batchNo,
                                              reasonOrSupplier: `[SLIP:${slip.ticketCode}] Trả hàng cho ${slip.supplierName}` + (slip.isCredit ? " - Trừ công nợ" : "") + (slip.note ? ` - Ghi chú: ${slip.note}` : ''),
                                              ingredientName: item.ingredientName,
                                              draftTxId: item.draftTxId
                                            })
                                          ));
                                          toast.success("Đã xác nhận trả hàng thành công!");
                                          getIngredientsApi().then(setReduxIngredients);
                                          getInventoryTransactionsApi().then(setTransactions);
                                        } catch (error: any) {
                                          toast.error(error?.response?.data?.message || "Lỗi khi xác nhận trả hàng");
                                        }
                                      }}
                                      className="p-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[11px] rounded-lg transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                                      title="Xác nhận đã trả hàng"
                                    >
                                      <Check size={14} /> Đã trả hàng
                                    </button>
                                  )}
                                  {slip.isDraft && (
                                    <button
                                      className="p-1 hover:bg-amber-100 rounded-lg text-amber-700 transition-colors cursor-pointer"
                                      title="Chỉnh sửa phiếu lưu tạm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleOpenReturnSlip();
                                      }}
                                    >
                                      <Pencil size={15} />
                                    </button>
                                  )}
                                  <button
                                    className="p-1 hover:bg-blue-100 rounded-lg text-blue-700 transition-colors cursor-pointer"
                                    title="In phiếu"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPrintReceiptData({
                                        title: "PHIẾU XUẤT TRẢ",
                                        ticketCode: slip.ticketCode,
                                        supplierName: slip.supplierName,
                                        dateStr: new Date(slip.timestamp).toLocaleString("vi-VN"),
                                        userName: slip.userName,
                                        isDraft: slip.isDraft,
                                        items: slip.items.map((i: any) => ({
                                          name: i.ingredientName,
                                          quantity: i.quantity,
                                          price: i.unitCost,
                                          total: i.total
                                        })),
                                        totalAmount: slip.totalAmount,
                                        paidAmount: slip.paidAmount,
                                        debtAmount: slip.debtAmount,
                                        note: slip.note
                                      });
                                      setShowPrintModal(true);
                                    }}
                                  >
                                    <Printer size={15} />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Accordion Expandable Detail Row for Return Slip */}
                            {expandedTxId === slip.id && (
                              <tr className="bg-slate-50/90 border-b-2 border-slate-300">
                                <td colSpan={9} className="p-4">
                                  <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs grid grid-cols-1 lg:grid-cols-3 gap-6 text-xs">
                                    <div className="lg:col-span-2">
                                      <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-rose-600"></span> Danh sách hàng xuất trả chi tiết ({slip.items.length} món)
                                      </h4>
                                      <table className="w-full border-collapse border border-slate-200 text-xs">
                                        <thead>
                                          <tr className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                                            <th className="p-2 text-center w-8">#</th>
                                            <th className="p-2 text-left">Tên hàng hoá</th>
                                            <th className="p-2 text-center w-16">SL trả</th>
                                            <th className="p-2 text-right w-24">Giá trả</th>
                                            <th className="p-2 text-right w-28">Thành tiền</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {slip.items.map((it: any, idx: number) => (
                                            <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                                              <td className="p-2 text-center font-bold">{idx + 1}</td>
                                              <td className="p-2">
                                                <div className="font-bold text-slate-800">{it.ingredientName}</div>
                                                <div className="text-[10px] text-slate-400">Mã lô: {it.batchNo || it.code || ""}</div>
                                              </td>
                                              <td className="p-2 text-center font-bold text-rose-700">{it.quantity} {it.unit}</td>
                                              <td className="p-2 text-right">{it.unitCost.toLocaleString("vi-VN")} đ</td>
                                              <td className="p-2 text-right font-bold text-slate-900">{it.total.toLocaleString("vi-VN")} đ</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-center space-y-3">
                                      <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-slate-600 font-semibold">
                                        <span className="flex items-center gap-1.5"><Package size={14} className="text-slate-500" /> Số món:</span>
                                        <span className="font-bold text-slate-900">{slip.items.length} món ({totalQtyVal} {firstItem.unit})</span>
                                      </div>
                                      <div className="flex justify-between items-center pb-2 border-b border-slate-200 text-slate-600 font-semibold">
                                        <span className="flex items-center gap-1.5"><DollarSign size={14} className="text-slate-500" /> Tổng giá trị:</span>
                                        <span className="font-extrabold text-slate-900 text-sm">{slip.totalAmount.toLocaleString("vi-VN")} đ</span>
                                      </div>
                                    </div>
                                  </div>
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
            ) : (
              /* Subtab: Lịch sử trừ kho tự động & Tiêu hủy */
              <div className="flex flex-col gap-4">
                {/* Summary Table aggregated by Ingredient */}
                <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet size={16} className="text-emerald-600" /> Bảng Tổng Hợp Nguyên Liệu Bị Trừ Kho
                    </h4>
                    <button
                      onClick={handleExportAutoDeductionExcel}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors cursor-pointer shadow-sm flex items-center gap-1"
                    >
                      <DownloadCloud size={14} /> Tải file Excel (.xlsx)
                    </button>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-emerald-200 bg-white shadow-2xs">
                    <table className="w-full text-xs font-semibold text-slate-700 border-collapse">
                      <thead className="bg-emerald-100/70 text-[11px] font-black text-emerald-900 uppercase">
                        <tr>
                          <th className="px-4 py-2.5 text-left border-b border-emerald-200">Mã hàng hóa</th>
                          <th className="px-4 py-2.5 text-left border-b border-emerald-200">Tên hàng hóa</th>
                          <th className="px-4 py-2.5 text-center border-b border-emerald-200">Tồn hệ thống</th>
                          <th className="px-4 py-2.5 text-center border-b border-emerald-200">Tồn thực tế Serial</th>
                          <th className="px-4 py-2.5 text-center border-b border-emerald-200">Tổng SL bị trừ</th>
                          <th className="px-4 py-2.5 text-left border-b border-emerald-200">Lý do</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-100">
                        {summaryDeductedIngredients.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-400 italic">Chưa có dữ liệu trừ kho tự động</td>
                          </tr>
                        ) : (
                          summaryDeductedIngredients.map((item, idx) => (
                            <tr key={idx} className="hover:bg-emerald-50/40">
                              <td className="px-4 py-2 font-mono font-extrabold text-blue-600">{item.code}</td>
                              <td className="px-4 py-2 font-extrabold text-slate-800">{item.name}</td>
                              <td className="px-4 py-2 text-center font-bold">{item.systemStock}</td>
                              <td className="px-4 py-2 text-center font-bold text-slate-400">0</td>
                              <td className="px-4 py-2 text-center font-black text-rose-600">-{item.totalDeducted.toLocaleString('vi-VN')} {item.unit}</td>
                              <td className="px-4 py-2 text-slate-600 font-medium">{item.reason}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Log Table for Individual Auto Deduction Transactions */}
                <div className="overflow-x-auto border border-slate-200/80 rounded-xl bg-white shadow-2xs">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-700 uppercase tracking-wider">
                      <tr>
                        <th scope="col" className="px-5 py-3 text-left">Mã phiếu</th>
                        <th scope="col" className="px-5 py-3 text-left">Ngày trừ</th>
                        <th scope="col" className="px-5 py-3 text-left">Nhà cung cấp / Nguồn</th>
                        <th scope="col" className="px-5 py-3 text-left">Nguyên liệu bị trừ</th>
                        <th scope="col" className="px-5 py-3 text-center">Số lượng trừ</th>
                        <th scope="col" className="px-5 py-3 text-left">Mã lô (Batch)</th>
                        <th scope="col" className="px-5 py-3 text-left">Lý do / Chi tiết</th>
                        <th scope="col" className="px-5 py-3 text-center">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-slate-200 text-xs font-semibold text-slate-700">
                      {filteredAutoDeductionTransactions.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="px-5 py-8 text-center text-slate-400 font-medium">
                            Không tìm thấy dữ liệu trừ kho tự động nào.
                          </td>
                        </tr>
                      ) : (
                        filteredAutoDeductionTransactions.map((tx) => {
                          const codeStr = `TXT${new Date(tx.timestamp).getFullYear()}${String(new Date(tx.timestamp).getMonth() + 1).padStart(2, '0')}${String(new Date(tx.timestamp).getDate()).padStart(2, '0')}UT-${String(tx.id).slice(-4)}`;
                          return (
                            <tr key={tx.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="px-5 py-3 font-extrabold text-blue-600 whitespace-nowrap">{codeStr}</td>
                              <td className="px-5 py-3 text-slate-600 font-medium whitespace-nowrap">
                                {new Date(tx.timestamp).toLocaleString("vi-VN", {
                                  day: "2-digit",
                                  month: "2-digit",
                                  year: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </td>
                              <td className="px-5 py-3 text-slate-800 font-bold">{tx.reasonOrSupplier || "Trừ kho tự động theo FEFO"}</td>
                              <td className="px-5 py-3 font-extrabold text-slate-800">{tx.ingredientName}</td>
                              <td className="px-5 py-3 text-center">
                                <span className="font-black text-rose-600">
                                  -{Math.abs(Number(tx.quantity)).toLocaleString("vi-VN")} {tx.unit}
                                </span>
                              </td>
                              <td className="px-5 py-3 font-semibold text-slate-700">{tx.batchNo || "-"}</td>
                              <td className="px-5 py-3 text-slate-600 font-medium">{tx.reasonType || "sale_deduction"}</td>
                              <td className="px-5 py-3 text-center">
                                <button
                                  onClick={() => {
                                    setPrintReturnData({
                                      code: codeStr,
                                      date: tx.timestamp,
                                      supplier: tx.reasonOrSupplier || "Trừ kho tự động",
                                      items: [{ name: tx.ingredientName, quantity: Math.abs(tx.quantity), price: 0, total: 0 }],
                                      totalAmount: 0,
                                      paidAmount: 0,
                                      note: tx.reasonType || "sale_deduction",
                                      isDraft: false,
                                    });
                                    setShowReturnReceiptModal(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                  title="In phiếu"
                                >
                                  <Printer size={15} />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Kiểm kê kho (Giao diện chuẩn & In phiếu) */}
        {activeTab === "stocktake" && (
          <div className="flex flex-col gap-5">
            {/* Right Main Area */}
            <div className="flex flex-col gap-4">
              {/* Header Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 border border-slate-250 px-3 py-1.5 rounded-xl text-xs font-extrabold text-slate-700 bg-slate-50">
                    <CalendarRange size={14} className="text-slate-400" />
                    <span>30 ngày gần đây</span>
                    <span className="text-slate-400 font-normal">| {new Date().toLocaleDateString('vi-VN')}</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedDraft(null);
                    setCurrentView("inventoryCheck");
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all shadow-md shadow-blue-600/20 cursor-pointer active:scale-95"
                >
                  <Plus size={16} /> + TẠO PHIẾU KIỂM KÊ MỚI
                </button>
                <button
                  onClick={() => {
                    const headers = ["Ten nguyen lieu", "Ton he thong", "Thuc te kiem dem", "Don vi", "Chenh lech"];
                    const colX = [15, 60, 100, 135, 150];
                    const rows = reduxIngredients.map(ing => {
                      const actualStr = stocktakeValues[ing.id];
                      const actualQty = actualStr !== undefined && actualStr.trim() !== "" ? Number(actualStr) : ing.stock;
                      const diff = actualQty - ing.stock;
                      const diffText = diff === 0 ? "Khop kho" : `${diff > 0 ? "+" : ""}${diff} ${ing.unit}`;
                      return [
                        ing.name,
                        ing.stock.toString(),
                        actualQty.toString(),
                        ing.unit,
                        diffText
                      ];
                    });
                    handleExportPdfShared("PHIEU KIEM KE CAN DOI TON KHO", headers, colX, rows, `Bieu_Mau_Kiem_Ke_${Date.now()}`);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer hover:bg-slate-50 shadow-2xs"
                >
                  <FileText size={12} className="text-red-500" /> Xuất PDF
                </button>
                <button
                  onClick={() => {
                    const headers = ["Tên nguyên liệu", "Tồn hệ thống", "Thực tế kiểm đếm", "Đơn vị", "Chênh lệch"];
                    const rows = reduxIngredients.map(ing => {
                      const actualStr = stocktakeValues[ing.id];
                      const actualQty = actualStr !== undefined && actualStr.trim() !== "" ? Number(actualStr) : ing.stock;
                      const diff = actualQty - ing.stock;
                      const diffText = diff === 0 ? "Khớp kho" : `${diff > 0 ? "+" : ""}${diff} ${ing.unit}`;
                      return [
                        ing.name,
                        ing.stock.toString(),
                        actualQty.toString(),
                        ing.unit,
                        diffText
                      ];
                    });
                    handleExportExcelShared("PHIẾU KIỂM KÊ CÂN ĐỐI TỒN KHO", headers, rows, `Bieu_Mau_Kiem_Ke_${Date.now()}`);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer hover:bg-slate-50 shadow-2xs"
                >
                  <FileSpreadsheet size={12} className="text-emerald-600" /> Xuất Excel
                </button>
              </div>
            </div>

            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Phiên Kiểm kê kho & Cân đối dữ liệu</span>
                <p className="text-[10px] text-slate-600 font-semibold mt-1">Nhập số lượng thực kiểm đếm được tại bếp để tính chênh lệch hao hụt thực tế.</p>
              </div>
            </div>

            {/* Main POS Table */}
            <div className="overflow-x-auto border border-slate-200/80 rounded-2xl bg-white shadow-2xs">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-[11px] font-black text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-5 py-3 text-left">Mã phiếu</th>
                      <th scope="col" className="px-5 py-3 text-center">SL hàng</th>
                      <th scope="col" className="px-5 py-3 text-center">Trạng thái</th>
                      <th scope="col" className="px-5 py-3 text-center">Ngày</th>
                      <th scope="col" className="px-5 py-3 text-center">Bởi</th>
                      <th scope="col" className="px-5 py-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 text-xs font-semibold text-slate-700">
                    {(() => {
                      const drafts = JSON.parse(localStorage.getItem("inventory_drafts") || "[]");
                      const history = JSON.parse(localStorage.getItem("inventory_history") || "[]");
                      const list = [...drafts, ...history];
                      return list.map((item: any) => {
                        const isDraft = item.status === "draft" || item.status === "pending";
                        const ticketCode = item.ticketCode || item.ticketName || `PKK${item.id.toString().padStart(6, '0')}`;
                        const count = item.items ? item.items.length : 0;
                        const dateStr = item.date ? (new Date(item.date).toString() !== "Invalid Date" ? new Date(item.date).toLocaleDateString('vi-VN') : item.date) : "(Chưa có)";
                        const creatorStr = item.creator || "(Chưa có)";

                        return (
                          <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                            <td className="px-5 py-3.5">
                              <button
                                onClick={() => {
                                  setSelectedDraft(item);
                                  setCurrentView("inventoryCheck");
                                }}
                                className="font-extrabold text-blue-600 hover:underline cursor-pointer"
                              >
                                {ticketCode}
                              </button>
                            </td>
                            <td className="px-5 py-3.5 text-center font-bold text-slate-800">{count}</td>
                            <td className="px-5 py-3.5 text-center">
                              {isDraft ? (
                                <span className="inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black uppercase border border-amber-300">
                                  Đang kiểm
                                </span>
                              ) : (
                                <span className="inline-block px-3 py-1 rounded-full bg-blue-500 text-white text-[10px] font-black uppercase border border-blue-600">
                                  Hoàn thành
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3.5 text-center text-slate-600 font-semibold">{dateStr}</td>
                            <td className="px-5 py-3.5 text-center text-slate-700 font-bold">{creatorStr}</td>
                            <td className="px-5 py-3.5 text-center">
                              <div className="flex items-center justify-center gap-3">
                                {isDraft && (
                                  <>
                                    <button
                                      onClick={async () => {
                                        if (!window.confirm("Số lượng của phiếu excel sẽ đồng bộ vào trong dữ liệu kho với số lượng hao hụt trong excel bạn chắc chứ?")) {
                                          return;
                                        }

                                        try {
                                          const records = (item.items || []).map((it: any) => ({
                                            ingredient_id: Number(it.ingredientId),
                                            actual_stock: Number(it.actualStock ?? it.stock ?? 0)
                                          }));

                                          if (records.length > 0) {
                                            await submitStockCheckApi(records);
                                          }

                                          // Move draft to history
                                          const drafts = JSON.parse(localStorage.getItem("inventory_drafts") || "[]");
                                          localStorage.setItem("inventory_drafts", JSON.stringify(drafts.filter((d: any) => d.id !== item.id)));

                                          const completed = {
                                            ...item,
                                            status: "completed",
                                            completedAt: new Date().toISOString()
                                          };
                                          const history = JSON.parse(localStorage.getItem("inventory_history") || "[]");
                                          localStorage.setItem("inventory_history", JSON.stringify([completed, ...history]));

                                          toast.success("Đã đồng bộ dữ liệu kho và cân bằng kho thành công!");
                                          getIngredientsApi().then(setReduxIngredients).catch(console.error);

                                          // Show print modal with exact columns as Image 3
                                          setPrintStocktakeData({
                                            ticketCode,
                                            createdDate: dateStr !== "(Chưa có)" ? dateStr : new Date().toLocaleString("vi-VN"),
                                            approvedDate: new Date().toLocaleString("vi-VN"),
                                            creator: creatorStr !== "(Chưa có)" ? creatorStr : "Bếp trưởng",
                                            approver: "Quản lý kho",
                                            note: item.note || "Đã đồng bộ cân bằng kho từ phiếu kiểm kê",
                                            items: item.items || []
                                          });
                                          setShowStocktakePrintModal(true);
                                        } catch (err: any) {
                                          console.error("Lỗi cân bằng kho:", err);
                                          toast.error(err?.response?.data?.message || "Có lỗi xảy ra khi đồng bộ cân bằng kho");
                                        }
                                      }}
                                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                                      title="Đồng bộ file Excel / Dữ liệu kiểm kê vào kho"
                                    >
                                      <CheckCircle size={12} /> Đồng bộ / Cân bằng kho
                                    </button>

                                    <button
                                      onClick={() => {
                                        if (window.confirm("Xóa phiếu kiểm kê này?")) {
                                          const existing = JSON.parse(localStorage.getItem("inventory_drafts") || "[]");
                                          localStorage.setItem("inventory_drafts", JSON.stringify(existing.filter((d: any) => d.id !== item.id)));
                                          toast.success("Đã xóa phiếu nháp");
                                          window.dispatchEvent(new Event('storage'));
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                                      title="Xóa phiếu"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                                <button
                                  onClick={() => {
                                    setPrintStocktakeData({
                                      ticketCode,
                                      createdDate: dateStr !== "(Chưa có)" ? dateStr : new Date().toLocaleString("vi-VN"),
                                      approvedDate: new Date().toLocaleString("vi-VN"),
                                      creator: creatorStr !== "(Chưa có)" ? creatorStr : "Toàn Bảo",
                                      approver: "Toàn Bảo",
                                      note: item.note || "Không có ghi chú",
                                      items: item.items && item.items.length > 0 ? item.items : reduxIngredients.slice(0, 14).map((ing, i) => ({
                                        ingredientId: ing.id,
                                        code: `SP${ing.id.toString().padStart(6, '0')}`,
                                        ingredientName: ing.name,
                                        systemStock: ing.stock,
                                        actualStock: i === 0 ? Math.max(0, ing.stock - 9) : ing.stock,
                                      })),
                                    });
                                    setShowStocktakePrintModal(true);
                                  }}
                                  className="p-1 text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
                                  title="In phiếu"
                                >
                                  <Printer size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
          </div>
        )}

        {/* Tab 5: Hạn sử dụng */}
        {activeTab === "expiry" && (
          <div className="flex flex-col gap-4">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-black text-slate-650 uppercase tracking-wider flex items-center gap-1.5">
                <CalendarRange size={14} className="text-admin-primary" /> Thao tác Quản lý hạn sử dụng
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setNewExpiryForm({
                      ingredientName: reduxIngredients[0]?.name || "Trứng cá tầm",
                      quantity: 10,
                      unit: reduxIngredients[0]?.unit || "kg",
                      batchNo: `LOT-${(reduxIngredients[0]?.name || "TCT").slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
                      expiryDate: new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0]
                    });
                    setShowAddExpiryModal(true);
                  }}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm hover:shadow hover:bg-blue-700"
                >
                  <Plus size={12} /> Thêm lô hàng mới
                </button>

                <button
                  onClick={handleWasteExpiredBatches}
                  className="px-3 py-1.5 bg-white text-rose-600 border border-rose-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm hover:shadow hover:bg-rose-50"
                >
                  <Trash2 size={12} /> Tiêu hủy tất cả lô hết hạn
                </button>
                <button
                  onClick={() => {
                    const expired = expiryBatches.filter(b => getExpiryLabel(b.expiryDate).status === "expired");
                    if (expired.length === 0) {
                      toast.success("Không có lô hàng nào hết hạn cần nhập thêm.");
                      return;
                    }
                    const ingsToImport = expired.map(b => reduxIngredients.find(i => i.name === b.ingredientName)).filter(Boolean);
                    const uniqueIngs = Array.from(new Set(ingsToImport.map((i: any) => i.id))).map(id => ingsToImport.find((i: any) => i.id === id));
                    setInitialImportData(uniqueIngs);
                    setCurrentView("importGoods");
                  }}
                  className="px-3 py-1.5 bg-white text-blue-600 border border-blue-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm hover:shadow hover:bg-blue-50"
                >
                  <Search size={12} /> Nhập hàng bù lô hết hạn
                </button>
                <button
                  onClick={() => {
                    setImportFileTarget("expiry");
                    setImportFile(null);
                    setImportFileError(null);
                    setShowImportFileModal(true);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer hover:bg-slate-50 shadow-2xs"
                >
                  <UploadCloud size={12} className="text-blue-600" /> Nhập từ file
                </button>
              </div>
            </div>

            <div className="pb-2 border-b border-slate-100 flex flex-col md:flex-row justify-between md:items-end gap-3">
              <div>
                <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Danh sách Lô hàng & Theo dõi Hạn sử dụng</span>
                <p className="text-[10px] text-slate-600 font-semibold mt-1">Cảnh báo nguyên liệu đã hết hạn hoặc sắp hết hạn cần ưu tiên tiêu thụ.</p>
              </div>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide print-hide">
                {[
                  { id: "all", label: "Tất cả (Cận & Hết hạn)" },
                  { id: "near", label: "Cận hạn" },
                  { id: "expired", label: "Đã hết hạn" },
                  { id: "waste_history", label: "Lịch sử tiêu hủy" }
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setExpiryFilter(f.id)}
                    className={`shrink-0 px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                      expiryFilter === f.id
                        ? "bg-slate-800 text-white shadow-md"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:border-slate-300 cursor-pointer"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {expiryFilter === "waste_history" ? (
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-rose-50/60 text-[10px] font-black text-rose-900 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-5 py-3 text-left">Mã phiếu / Lô</th>
                      <th scope="col" className="px-5 py-3 text-left">Nguyên liệu</th>
                      <th scope="col" className="px-5 py-3 text-center">Số lượng tiêu hủy</th>
                      <th scope="col" className="px-5 py-3 text-right">Giá nhập gần nhất</th>
                      <th scope="col" className="px-5 py-3 text-right">Tổng thiệt hại (VND)</th>
                      <th scope="col" className="px-5 py-3 text-left">Lý do & Ghi chú</th>
                      <th scope="col" className="px-5 py-3 text-left">Thời gian tiêu hủy</th>
                      <th scope="col" className="px-5 py-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 text-xs font-semibold text-slate-700">
                    {(() => {
                      const wasteList = transactions.filter((t: any) => {
                        const reasonStr = (t.reasonOrSupplier || t.note || t.reasonType || "").toLowerCase();
                        return (
                          t.type === "export" &&
                          (t.reasonType === "waste" ||
                            t.reasonType === "expired" ||
                            reasonStr.includes("xuất hủy") ||
                            reasonStr.includes("tiêu hủy") ||
                            reasonStr.includes("hao hụt") ||
                            reasonStr.includes("hỏng") ||
                            reasonStr.includes("thiu"))
                        );
                      });

                      if (wasteList.length === 0) {
                        return (
                          <tr>
                            <td colSpan={8} className="px-5 py-12 text-center text-slate-500 font-medium">
                              <div className="flex flex-col items-center justify-center gap-2 py-4">
                                <Trash2 size={32} className="text-slate-300" />
                                <span className="font-bold text-slate-700">Chưa có lịch sử tiêu hủy nào</span>
                                <span className="text-xs text-slate-400">
                                  Các giao dịch xuất hủy hàng hỏng, mốc, hết hạn sẽ hiển thị tại đây.
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return wasteList.map((t: any) => {
                        const ingObj = reduxIngredients.find(
                          (i: any) => Number(i.id) === Number(t.ingredientId) || i.name === t.ingredientName
                        );
                        const qty = Math.abs(Number(t.quantity) || 0);

                        // Find most recent unit_cost for this ingredient
                        const recentImport = transactions.find(
                          (it: any) =>
                            (Number(it.ingredientId) === Number(t.ingredientId) ||
                              (it.ingredientName &&
                                t.ingredientName &&
                                it.ingredientName.trim().toLowerCase() === t.ingredientName.trim().toLowerCase())) &&
                            it.type === "import" &&
                            Number(it.unit_cost || (it as any).unitCost || 0) > 0
                        );
                        const unitPrice = Number(
                          t.unit_cost || (t as any).unitCost || recentImport?.unit_cost || (recentImport as any)?.unitCost || ingObj?.unitCost || ingObj?.cost || 0
                        );
                        const totalLoss = qty * unitPrice;
                        const slipCode =
                          (t.reasonOrSupplier || t.note || "").match(/\[SLIP:([^\]]+)\]/)?.[1] ||
                          t.batchNo ||
                          `EX-${String(t.id).slice(-6)}`;

                        let cleanReason = (t.reasonOrSupplier || t.note || "Xuất hủy kho")
                          .replace(/\[SLIP:[^\]]+\]\s*/g, "")
                          .replace("[XUẤT HỦY HỎNG] ", "")
                          .replace("Xuất hủy: ", "")
                          .trim();

                        return (
                          <tr key={t.id} className="hover:bg-rose-50/20">
                            <td className="px-5 py-3 font-mono font-bold text-rose-700">{slipCode}</td>
                            <td className="px-5 py-3 font-extrabold text-slate-800">{t.ingredientName}</td>
                            <td className="px-5 py-3 text-center font-bold text-rose-600">
                              {qty} {t.unit || ingObj?.unit || "kg"}
                            </td>
                            <td className="px-5 py-3 text-right font-medium text-slate-600">
                              {unitPrice > 0 ? `${unitPrice.toLocaleString("vi-VN")} đ` : "N/A"}
                            </td>
                            <td className="px-5 py-3 text-right font-black text-rose-600">
                              {totalLoss > 0 ? `${totalLoss.toLocaleString("vi-VN")} đ` : "0 đ"}
                            </td>
                            <td className="px-5 py-3 text-slate-600 max-w-xs truncate" title={cleanReason}>
                              {cleanReason}
                            </td>
                            <td className="px-5 py-3 text-slate-500 whitespace-nowrap">
                              {t.timestamp ? new Date(t.timestamp).toLocaleString("vi-VN") : "Gần đây"}
                            </td>
                            <td className="px-5 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteWasteTransaction(t.id)}
                                className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer"
                                title="Xóa bản ghi tiêu hủy này"
                              >
                                <Trash2 size={11} /> Xóa
                              </button>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
                <table className="min-w-full divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-[10px] font-black text-slate-700 uppercase tracking-wider">
                    <tr>
                      <th scope="col" className="px-5 py-3 text-left">Mã Lô hàng (Batch No)</th>
                      <th scope="col" className="px-5 py-3 text-left">Nguyên liệu</th>
                      <th scope="col" className="px-5 py-3 text-center">Số lượng nhập</th>
                      <th scope="col" className="px-5 py-3 text-left">Ngày hết hạn</th>
                      <th scope="col" className="px-5 py-3 text-left">Tình trạng hạn</th>
                      <th scope="col" className="px-5 py-3 text-right">Thao tác tiêu hủy</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-slate-200 text-xs font-semibold text-slate-700">
                    {(() => {
                      const alertBatches = expiryBatches.filter((b) => {
                        const st = getExpiryLabel(b.expiryDate).status;
                        if (st === "good") return false; // Exclude safe items from Expiry Tracking tab
                        if (expiryFilter === "all") return st === "near" || st === "expired";
                        return st === expiryFilter;
                      });

                      if (alertBatches.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="px-5 py-12 text-center text-slate-500 font-medium">
                              <div className="flex flex-col items-center justify-center gap-2 py-4">
                                <CheckCircle size={32} className="text-emerald-500" />
                                <span className="font-bold text-slate-700">Không có lô hàng nào cần xử lý</span>
                                <span className="text-xs text-slate-400">Tất cả các lô nguyên liệu trong kho hiện tại đều an toàn.</span>
                              </div>
                            </td>
                          </tr>
                        );
                      }

                      return alertBatches.map((b) => {
                        const expiryInfo = getExpiryLabel(b.expiryDate);
                        return (
                          <tr key={b.id} className="hover:bg-slate-50/50">
                            <td className="px-5 py-3 font-mono font-bold text-slate-700">{b.batchNo}</td>
                            <td className="px-5 py-3 font-extrabold text-slate-800">{b.ingredientName}</td>
                            <td className="px-5 py-3 text-center font-bold">{b.quantity} {b.unit}</td>
                            <td className="px-5 py-3 whitespace-nowrap text-slate-600">{b.expiryDate}</td>
                            <td className="px-5 py-3">
                              {expiryInfo.status === "expired" && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-250 animate-pulse">
                                  <AlertTriangle size={10} /> ĐÃ HẾT HẠN
                                </span>
                              )}
                              {expiryInfo.status === "near" && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-250">
                                  <AlertTriangle size={10} /> CẬN HẠN
                                </span>
                              )}
                              {expiryInfo.status === "good" && (
                                <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250">
                                  <Check size={10} /> AN TOÀN
                                </span>
                              )}
                            </td>
                            <td className="px-5 py-3 text-right">
                              <div className="flex justify-end gap-1.5 items-center">
                                <button
                                  onClick={() => {
                                    const ing = reduxIngredients.find(i => i.name === b.ingredientName);
                                    if (ing) {
                                      setInitialImportData([ing]);
                                      setCurrentView("importGoods");
                                    } else {
                                      toast.error("Không tìm thấy nguyên liệu này trong danh sách để nhập.");
                                    }
                                  }}
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded text-[10px] font-bold cursor-pointer transition-colors border border-blue-200"
                                >
                                  Nhập hàng
                                </button>
                                {(expiryInfo.status === "expired" || expiryInfo.status === "near") && (
                                  <button
                                    onClick={async () => {
                                      if (window.confirm(`Bạn có muốn tiêu hủy ${b.quantity} ${b.unit} của lô ${b.batchNo}?`)) {
                                        try {
                                          const ing = reduxIngredients.find(i => i.name === b.ingredientName);
                                          if (ing) {
                                            await updateInventoryQuantityApi(ing.id as string, {
                                              quantity: Number(b.quantity),
                                              type: "waste",
                                              batchNo: b.batchNo,
                                              reasonType: "expired",
                                              reasonOrSupplier: `Tiêu hủy lô hàng (${b.batchNo})`,
                                              isCredit: false
                                            });
                                            toast.success("Tiêu hủy thành công!");
                                            setExpiryBatches(prev => prev.filter(item => item.id !== b.id));
                                            fetchAllBatchesData();
                                            getIngredientsApi().then((data) => setReduxIngredients(data));
                                            getInventoryTransactionsApi().then((data) => setTransactions(data));
                                          } else {
                                            toast.error("Không tìm thấy nguyên liệu trong danh sách!");
                                          }
                                        } catch (err: any) {
                                          console.error("Waste batch error:", err);
                                          toast.error(err?.response?.data?.message || "Lỗi khi tiêu hủy lô hàng!");
                                        }
                                      }
                                    }}
                                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded text-[10px] font-bold cursor-pointer transition-colors border border-rose-200/50"
                                  >
                                    Tiêu hủy
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Báo cáo */}
        {
          activeTab === "reports" && (
            <div className="flex flex-col gap-5">
              {/* Header chuyên nghiệp khi in ấn */}
              <div className="print-only text-center pb-6 border-b-2 border-slate-800 mb-6">
                <h1 className="text-2xl font-black uppercase tracking-wide text-slate-900">Báo Cáo Phân Tích Tồn Kho</h1>
                <p className="text-xs text-slate-700 mt-1.5 font-bold">Hệ thống Quản lý ResManager Bistro</p>
                <p className="text-[10px] text-slate-600 mt-0.5">Ngày lập báo cáo: {new Date().toLocaleDateString("vi-VN")} | Thời gian: {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</p>
              </div>

              <div className="pb-2 border-b border-slate-100 flex justify-between items-center print-hide">
                <div>
                  <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Báo cáo phân tích tồn kho nhanh</span>
                  <p className="text-[10px] text-slate-600 font-semibold mt-1">Tổng quan về số lượng nguyên liệu, tỷ lệ cảnh báo và cơ cấu chủng loại.</p>
                </div>
                <button
                  onClick={() => window.print()}
                  className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-[10px] font-extrabold tracking-wide flex items-center gap-1 shadow-2xs cursor-pointer print-hide"
                >
                  <FileSpreadsheet size={12} /> Xuất Báo cáo (Print)
                </button>
              </div>

              {/* Quick stats grids */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print-avoid-break">
                <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-slate-600 uppercase tracking-wider block">Tổng số mặt hàng</span>
                  <span className="text-2xl font-black text-slate-800 block mt-1">{reportsStats.totalIngredients}</span>
                  <span className="text-[10px] text-slate-600 font-semibold mt-0.5 block">Nguyên liệu trong danh mục</span>
                </div>
                <div className="bg-rose-50/50 border border-rose-200 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-rose-500 uppercase tracking-wider block">Nguyên liệu tồn thấp</span>
                  <span className="text-2xl font-black text-rose-600 block mt-1">{reportsStats.lowStockCount}</span>
                  <span className="text-[10px] text-rose-400 font-semibold mt-0.5 block">Dưới ngưỡng an toàn</span>
                </div>
                <div className="bg-amber-50/50 border border-amber-250 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider block">Lô hàng cận hạn</span>
                  <span className="text-2xl font-black text-amber-700 block mt-1">{reportsStats.nearExpiryCount}</span>
                  <span className="text-[10px] text-amber-400 font-semibold mt-0.5 block">Hạn dưới 3 ngày</span>
                </div>
                <div className="bg-rose-50/70 border border-rose-200 p-4 rounded-2xl">
                  <span className="text-[9px] font-black text-rose-650 uppercase tracking-wider block">Lô hàng hết hạn</span>
                  <span className="text-2xl font-black text-rose-700 block mt-1">{reportsStats.expiredCount}</span>
                  <span className="text-[10px] text-rose-400 font-semibold mt-0.5 block">Cần tiêu hủy gấp</span>
                </div>
              </div>

              {/* Chart visualizations */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2 print-avoid-break">

                {/* Category distribution chart */}
                <div className="border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Cơ cấu chủng loại nguyên liệu</span>
                  <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-full">
                    {/* Mock SVG Pie/Donut Chart */}
                    <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                      {categoryDistribution.map((item, idx) => (
                        <circle
                          key={idx}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="transparent"
                          stroke={item.color}
                          strokeWidth="20"
                          strokeDasharray={item.strokeDasharray}
                          strokeDashoffset={item.strokeDashoffset}
                        />
                      ))}
                      <circle cx="50" cy="50" r="22" fill="white" />
                    </svg>

                    <div className="flex flex-col gap-2.5 text-[11px] font-bold text-slate-600">
                      {categoryDistribution.map((item, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-md" style={{ backgroundColor: item.color }} />
                          <span>{item.name} ({item.percentage}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Transactions trend report */}
                <div className="border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
                  <span className="text-xs font-black uppercase text-slate-700 tracking-wider">Hao hụt & Biến động tuần qua</span>
                  <div className="flex flex-col justify-between gap-3 h-full">
                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-450 font-bold">Hao hụt kiểm định</span>
                        <span className="font-extrabold text-rose-600">-{dynamicMovementStats.adjustedPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-rose-500 h-full rounded-full" style={{ width: `${dynamicMovementStats.adjustedPercent}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-450 font-bold">Lượng nguyên liệu chế biến</span>
                        <span className="font-extrabold text-blue-600">{dynamicMovementStats.processedPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${dynamicMovementStats.processedPercent}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-450 font-bold">Lượng nguyên liệu hủy (quá hạn)</span>
                        <span className="font-extrabold text-amber-600">{dynamicMovementStats.destroyedPercent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-amber-500 h-full rounded-full" style={{ width: `${dynamicMovementStats.destroyedPercent}%` }} />
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-[10px] text-slate-600 font-semibold leading-relaxed">
                      💡 Báo cáo trên được trích xuất dữ liệu tổng hợp dựa trên nhật ký nhập, xuất sử dụng từ khu vực bếp và ghi nhận hao hụt thực tế từ các lần cân đối tồn kho.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

      {/* MODALS */}

      {/* Modal E: Nhập từ File chung (Import File Modal) */}
      {
        showImportFileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowImportFileModal(false)}
                className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">
                Nhập dữ liệu bằng File (Excel / PDF)
              </h3>
              <form onSubmit={handlePostImportFile} className="flex flex-col gap-4 text-xs">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] font-semibold text-blue-700 leading-relaxed">
                  ℹ️ Bạn đang tải dữ liệu lên danh mục: <strong className="uppercase">{
                    importFileTarget === "ingredients" ? "Nguyên liệu" :
                      importFileTarget === "categories" ? "Danh mục" :
                        importFileTarget === "suppliers" ? "Nhà cung cấp" :
                          importFileTarget === "transactions" ? "Lịch sử Nhập/Xuất" :
                            importFileTarget === "stocktake" ? "Dữ liệu kiểm kê" : "Theo dõi hạn dùng"
                  }</strong>.
                </div>

                <div className="flex flex-col gap-2">
                  <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-100/50 hover:border-slate-400 cursor-pointer transition-all gap-1.5 text-center">
                    <UploadCloud size={24} className="text-slate-400" />
                    <span className="font-extrabold text-slate-700">
                      {importFile ? importFile.name : "Chọn file tài liệu từ thiết bị"}
                    </span>
                    <span className="text-[9px] text-slate-450 font-semibold">Chấp nhận .pdf, .xlsx, .xls</span>
                    <input
                      type="file"
                      accept=".pdf,.xlsx,.xls"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const ext = file.name.split('.').pop()?.toLowerCase();
                          if (!ext || !["pdf", "xlsx", "xls"].includes(ext)) {
                            setImportFileError("Định dạng file không hợp lệ! Vui lòng chọn file .pdf hoặc excel (.xlsx, .xls)");
                            setImportFile(null);
                          } else {
                            setImportFileError(null);
                            setImportFile(file);
                          }
                        }
                      }}
                    />
                  </label>
                </div>

                {importFileError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-600 font-extrabold rounded-xl flex items-center gap-1.5">
                    <span>⚠️ Lỗi:</span>
                    <span>{importFileError}</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2 border-t border-slate-100 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowImportFileModal(false)}
                    className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={!importFile || !!importFileError}
                    className="px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold cursor-pointer"
                  >
                    Tiến hành Nhập kho
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal F: Thêm Lô hàng mới (Add Expiry Batch Modal) */}
      {
        showAddExpiryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowAddExpiryModal(false)}
                className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">Thêm Lô hàng Hạn sử dụng mới</h3>
              <form onSubmit={handlePostExpiryBatch} className="flex flex-col gap-4 text-xs">

                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-slate-700">Tên nguyên liệu</label>
                  <select
                    value={newExpiryForm.ingredientName}
                    onChange={(e) => {
                      const ing = reduxIngredients.find(i => i.name === e.target.value);
                      setNewExpiryForm({
                        ...newExpiryForm,
                        ingredientName: e.target.value,
                        unit: ing?.unit || "kg"
                      });
                    }}
                    className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold bg-white"
                  >
                    {reduxIngredients.map((i) => (
                      <option key={i.id} value={i.name}>{i.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Mã Lô hàng (Batch No)</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: LOT-RAU-01"
                      value={newExpiryForm.batchNo}
                      onChange={(e) => setNewExpiryForm({ ...newExpiryForm, batchNo: e.target.value.toUpperCase() })}
                      className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Số lượng nhập</label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        required
                        value={newExpiryForm.quantity}
                        onChange={(e) => setNewExpiryForm({ ...newExpiryForm, quantity: Number(e.target.value) })}
                        className="px-3 py-2 w-full border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                      />
                      <span className="text-[10px] font-black text-slate-400">{newExpiryForm.unit}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-slate-700">Ngày hết hạn</label>
                  <input
                    type="date"
                    required
                    value={newExpiryForm.expiryDate}
                    onChange={(e) => setNewExpiryForm({ ...newExpiryForm, expiryDate: e.target.value })}
                    className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddExpiryModal(false)}
                    className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Xác nhận
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }


      {/* Modal G: Ghi nhận Xuất hủy lô hàng / hàng hỏng */}
      {showWasteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setShowWasteModal(false);
                setWasteForm({ ingredientId: "", batchNo: "", quantity: 1, reason: "Ôi thiu / Mốc", note: "" });
              }}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 bg-rose-100 text-rose-600 rounded-lg shrink-0">
                <Trash2 size={18} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">Xuất hủy lô hàng hỏng</h3>
                <p className="text-slate-500 text-[10px] font-semibold mt-0.5">
                  {wasteForm.batchNo ? (
                    <>Mã lô: <span className="font-bold text-rose-600">{wasteForm.batchNo}</span></>
                  ) : (
                    "Ghi nhận tiêu hủy nguyên liệu bị hỏng, mốc, ôi thiu"
                  )}
                </p>
              </div>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleWasteSubmit(); }} className="flex flex-col gap-4 text-xs">
              <div className="flex flex-col gap-1.5">
                <label className="font-extrabold text-slate-700 flex items-center justify-between">
                  <span>Nguyên liệu <span className="text-rose-500">*</span></span>
                  {wasteForm.batchNo && (
                    <span className="text-[10px] text-amber-600 font-bold flex items-center gap-1">
                      <Lock size={11} /> Cố định theo lô
                    </span>
                  )}
                </label>
                <select
                  required
                  disabled={!!wasteForm.batchNo}
                  value={wasteForm.ingredientId}
                  onChange={(e) => setWasteForm({ ...wasteForm, ingredientId: e.target.value })}
                  className={`px-3 py-2 border rounded-xl focus:outline-none font-semibold ${
                    wasteForm.batchNo
                      ? "border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed"
                      : "border-slate-300 bg-white focus:border-rose-500"
                  }`}
                >
                  <option value="">-- Chọn nguyên liệu --</option>
                  {reduxIngredients.map((i: any) => (
                    <option key={i.id} value={i.id}>
                      {i.name} (Tồn kho: {i.stock} {i.unit})
                    </option>
                  ))}
                </select>
              </div>

              {wasteForm.batchNo && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Mã lô xuất hủy</label>
                    <input
                      type="text"
                      disabled
                      value={wasteForm.batchNo}
                      className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-100 font-bold text-slate-600 cursor-not-allowed"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700 flex items-center justify-between">
                      <span>Số lượng hiện tại của lô</span>
                      <span className="text-[10px] text-slate-400 font-semibold">(Không thể sửa)</span>
                    </label>
                    <input
                      type="text"
                      disabled
                      readOnly
                      value={`${(() => {
                        const batchObjInModal = expiryBatches.find(b => b.batchNo === wasteForm.batchNo);
                        return batchObjInModal ? Number(batchObjInModal.quantity) : (wasteForm.batchStock || 0);
                      })()} ${reduxIngredients.find((i: any) => String(i.id) === String(wasteForm.ingredientId))?.unit || "kg"}`}
                      className="px-3 py-2 border border-slate-250 rounded-xl bg-slate-100 font-extrabold text-emerald-700 cursor-not-allowed"
                    />
                  </div>
                </>
              )}

              <div className="flex flex-col gap-1.5">
                {(() => {
                  const currentSelectedIng = reduxIngredients.find((i: any) => String(i.id) === String(wasteForm.ingredientId));
                  const baseUnit = currentSelectedIng?.unit || "kg";
                  const conv = getUnitConversion(baseUnit, wasteForm.wasteUnit);

                  const batchObjInModal = expiryBatches.find(b => b.batchNo === wasteForm.batchNo);
                  const currentBatchStock = wasteForm.batchNo
                    ? (batchObjInModal ? Number(batchObjInModal.quantity) : (wasteForm.batchStock || 0))
                    : (currentSelectedIng ? Number(currentSelectedIng.stock) : 0);

                  const baseQuantity = Number(wasteForm.quantity || 0) * conv.factor;
                  const isInvalidOverQty = currentBatchStock > 0 && baseQuantity > currentBatchStock;

                  const displayBatchStock = conv.factor !== 1 && conv.factor > 0
                    ? `${(currentBatchStock / conv.factor).toLocaleString("vi-VN")} ${conv.activeUnit} (${currentBatchStock} ${conv.baseUnitName})`
                    : `${currentBatchStock} ${conv.baseUnitName}`;

                  return (
                    <>
                      <label className="font-extrabold text-slate-700 flex items-center justify-between">
                        <span>Số lượng xuất hủy <span className="text-rose-500">*</span></span>
                        {conv.activeUnit !== conv.baseUnitName && baseQuantity > 0 && (
                          <span className="text-[10px] text-sky-700 font-bold bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                            = {baseQuantity.toFixed(3).replace(/\.?0+$/, "")} {conv.baseUnitName}
                          </span>
                        )}
                      </label>

                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <input
                            type="number"
                            required
                            min={conv.activeUnit === "g" || conv.activeUnit === "ml" ? "1" : "0.001"}
                            step={conv.activeUnit === "g" || conv.activeUnit === "ml" ? "1" : "0.01"}
                            value={wasteForm.quantity}
                            onChange={(e) => setWasteForm({ ...wasteForm, quantity: Number(e.target.value) })}
                            className={`w-full px-3 py-2 border rounded-xl focus:outline-none font-bold text-rose-600 transition-all ${
                              isInvalidOverQty
                                ? "border-rose-500 bg-rose-50/60 focus:border-rose-600 focus:ring-2 focus:ring-rose-200"
                                : "border-slate-300 focus:border-rose-500"
                            }`}
                            placeholder="Nhập số lượng..."
                          />
                        </div>

                        {conv.unitOptions.length > 1 ? (
                          <select
                            value={conv.activeUnit}
                            onChange={(e) => {
                              const newUnit = e.target.value;
                              let newQty = wasteForm.quantity;
                              if (newUnit === "g" && conv.activeUnit === "kg") {
                                newQty = Math.round(wasteForm.quantity * 1000);
                              } else if (newUnit === "kg" && conv.activeUnit === "g") {
                                newQty = Number((wasteForm.quantity / 1000).toFixed(3));
                              } else if (newUnit === "ml" && conv.activeUnit === "lit") {
                                newQty = Math.round(wasteForm.quantity * 1000);
                              } else if (newUnit === "lit" && conv.activeUnit === "ml") {
                                newQty = Number((wasteForm.quantity / 1000).toFixed(3));
                              }
                              setWasteForm({ ...wasteForm, wasteUnit: newUnit, quantity: newQty });
                            }}
                            className="px-3 py-2 border border-slate-300 rounded-xl font-black text-slate-700 bg-slate-50 focus:outline-none focus:border-rose-500 cursor-pointer text-xs shrink-0 hover:bg-slate-100 transition-colors"
                          >
                            {conv.unitOptions.map((u) => (
                              <option key={u.key} value={u.key}>{u.label}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="px-3 py-2 border border-slate-200 rounded-xl font-bold text-slate-500 bg-slate-100 flex items-center justify-center shrink-0 text-xs">
                            {currentSelectedIng?.unit || "kg"}
                          </div>
                        )}
                      </div>

                      {isInvalidOverQty && (
                        <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-xl text-[11px] font-extrabold text-rose-600 flex items-start gap-1.5 animate-in fade-in duration-150">
                          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                          <span>
                            Số lượng xuất hủy ({wasteForm.quantity} {conv.activeUnit} = {baseQuantity} {conv.baseUnitName}) lớn hơn số lượng tồn hiện tại ({displayBatchStock}). Vui lòng điều chỉnh lại!
                          </span>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="font-extrabold text-slate-700">Lý do tiêu hủy <span className="text-rose-500">*</span></label>
                <select
                  value={wasteForm.reason}
                  onChange={(e) => {
                    const newReason = e.target.value;
                    setWasteForm({
                      ...wasteForm,
                      reason: newReason,
                      note: newReason === "Khác" ? wasteForm.note : ""
                    });
                  }}
                  className="px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-rose-500 font-semibold bg-white cursor-pointer"
                >
                  <option value="Ôi thiu / Mốc">Ôi thiu / Mốc</option>
                  <option value="Hết hạn sử dụng">Hết hạn sử dụng</option>
                  <option value="Hao hụt kho / Rách vỡ">Hao hụt kho / Rách vỡ</option>
                  <option value="Hỏng thiết bị bảo quản">Hỏng thiết bị bảo quản / Tủ lạnh</option>
                  <option value="Sơ chế hỏng / Rơi vãi">Sơ chế hỏng / Rơi vãi</option>
                  <option value="Khác">Lý do khác</option>
                </select>
              </div>

              {wasteForm.reason === "Khác" && (
                <div className="flex flex-col gap-1.5 animate-in fade-in duration-150">
                  <label className="font-extrabold text-slate-700">Mô tả lý do cụ thể <span className="text-rose-500">*</span></label>
                  <textarea
                    required
                    value={wasteForm.note}
                    onChange={(e) => setWasteForm({ ...wasteForm, note: e.target.value })}
                    placeholder="Mô tả lý do xuất hủy chi tiết..."
                    rows={2}
                    className="px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-rose-500 font-semibold text-xs bg-white"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowWasteModal(false);
                    setWasteForm({ ingredientId: "", batchNo: "", quantity: 1, reason: "Ôi thiu / Mốc", note: "" });
                  }}
                  className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-extrabold cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-200"
                >
                  <Trash2 size={14} /> Xác nhận xuất hủy
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Xác nhận trả hàng theo lô */}
      {returnBatchData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => {
                setReturnBatchData(null);
                setReturnQty("");
                setReturnNote("");
              }}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>

            <div className="flex items-center gap-2.5 mb-5">
              <div className="p-2 bg-purple-100 text-purple-600 rounded-lg shrink-0">
                <ArrowUpRight size={18} />
              </div>
              <div>
                <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide">Trả hàng nhà cung cấp</h3>
                <p className="text-slate-500 text-[10px] font-semibold mt-0.5">Lô: <span className="font-bold text-purple-600">{returnBatchData.batchNo}</span></p>
              </div>
            </div>

            <form onSubmit={handleReturnBatch} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Nguyên liệu</label>
                <input
                  type="text"
                  disabled
                  value={returnBatchData.name}
                  className="px-3 py-2 border border-slate-200 rounded-xl bg-slate-50 font-semibold text-slate-500 text-sm"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">
                  Số lượng trả <span className="text-rose-500">*</span> <span className="text-[10px] font-normal text-slate-500">(Tối đa: {returnBatchData.maxQty} {returnBatchData.unit})</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    min="0.1"
                    step="0.1"
                    max={returnBatchData.maxQty}
                    value={returnQty}
                    onChange={(e) => setReturnQty(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-500 font-bold text-admin-primary pr-12"
                    placeholder="VD: 5"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-black text-slate-400">{returnBatchData.unit}</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-700">Ghi chú (Bắt buộc) <span className="text-rose-500">*</span></label>
                <textarea
                  required
                  value={returnNote}
                  onChange={(e) => setReturnNote(e.target.value)}
                  placeholder="Lý do trả hàng (Hỏng, sai loại, ...)"
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:outline-none focus:border-purple-500 font-semibold text-sm min-h-[80px]"
                />
              </div>

              <div className="flex justify-end gap-3 mt-4">
                <button
                  type="button"
                  onClick={() => {
                    setReturnBatchData(null);
                    setReturnQty("");
                    setReturnNote("");
                  }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm shadow-purple-200 flex gap-2 items-center"
                >
                  Xác nhận trả hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



      {/* Modal A: Thêm nguyên liệu mới */}
      {
        showAddIngModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowAddIngModal(false)}
                className="absolute right-4 top-4 p-1 rounded-lg text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">Thêm nguyên liệu mới</h3>
              <form onSubmit={handleAddIngredient} className="flex flex-col gap-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-slate-700">Tên nguyên liệu</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Thịt gà ta, Hành tây..."
                    value={newIngForm.name}
                    onChange={(e) => setNewIngForm({ ...newIngForm, name: e.target.value })}
                    className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Danh mục</label>
                    <select
                      value={newIngForm.category}
                      onChange={(e) => setNewIngForm({ ...newIngForm, category: e.target.value })}
                      className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold bg-white"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Đơn vị tính</label>
                    <select
                      value={newIngForm.unit}
                      onChange={(e) => setNewIngForm({ ...newIngForm, unit: e.target.value })}
                      className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold bg-white"
                    >
                      <option value="kg">kg (Kilôgam)</option>
                      <option value="g">g (Gam)</option>
                      <option value="l">l (Lít)</option>
                      <option value="chai">chai (Chai)</option>
                      <option value="hộp">hộp (Hộp)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Tồn kho ban đầu</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={newIngForm.stock}
                      onChange={(e) => setNewIngForm({ ...newIngForm, stock: Number(e.target.value) })}
                      className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Tồn kho tối thiểu</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      required
                      value={newIngForm.threshold}
                      onChange={(e) => setNewIngForm({ ...newIngForm, threshold: Number(e.target.value) })}
                      className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddIngModal(false)}
                    className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Xác nhận
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal B: Nhập / Xuất kho nhanh */}
      {
        showImportExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowImportExportModal(false)}
                className="absolute right-4 top-4 p-1 rounded-lg text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">Ghi nhận Nhập / Xuất kho mới</h3>

              {/* Tab Header inside Modal */}
              <div className="flex border-b border-slate-200 mb-4 text-xs font-black">
                <button
                  type="button"
                  onClick={() => setImportExportMode("manual")}
                  className={`flex-1 pb-2 text-center border-b-2 cursor-pointer transition-all ${importExportMode === "manual"
                    ? "text-admin-primary border-admin-primary"
                    : "text-slate-600 border-transparent hover:text-slate-600"
                    }`}
                >
                  Ghi nhận thủ công
                </button>
                <button
                  type="button"
                  onClick={() => setImportExportMode("file")}
                  className={`flex-1 pb-2 text-center border-b-2 cursor-pointer transition-all ${importExportMode === "file"
                    ? "text-admin-primary border-admin-primary"
                    : "text-slate-600 border-transparent hover:text-slate-600"
                    }`}
                >
                  Nhập / Xuất bằng File
                </button>
              </div>

              {importExportMode === "manual" ? (
                <form onSubmit={handlePostTransaction} className="flex flex-col gap-4 text-xs">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Loại giao dịch</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setTransactionForm({ ...transactionForm, type: "import" })}
                        className={`py-2 rounded-xl font-extrabold text-center cursor-pointer transition-all border ${transactionForm.type === "import"
                          ? "bg-blue-50 text-blue-700 border-blue-400 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                      >
                        Nhập kho
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionForm({ ...transactionForm, type: "export" })}
                        className={`py-2 rounded-xl font-extrabold text-center cursor-pointer transition-all border ${transactionForm.type === "export"
                          ? "bg-amber-50 text-amber-700 border-amber-400 shadow-2xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
                          }`}
                      >
                        Xuất kho
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Chọn nguyên liệu</label>
                    <select
                      value={transactionForm.ingredientId}
                      onChange={(e) => setTransactionForm({ ...transactionForm, ingredientId: e.target.value })}
                      className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold bg-white"
                    >
                      {reduxIngredients.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name} (Tồn hiện tại: {i.stock} {i.unit})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Số lượng</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0.1"
                      required
                      value={transactionForm.quantity}
                      onChange={(e) => setTransactionForm({ ...transactionForm, quantity: Number(e.target.value) })}
                      className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">
                      {transactionForm.type === "import" ? "Nhà cung cấp hàng" : "Lý do xuất kho"}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={transactionForm.type === "import" ? "Ví dụ: NCC Hải Sản Đại Dương" : "Ví dụ: Chế biến món chiên xào"}
                      value={transactionForm.reasonOrSupplier}
                      onChange={(e) => setTransactionForm({ ...transactionForm, reasonOrSupplier: e.target.value })}
                      className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowImportExportModal(false)}
                      className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                    >
                      Hủy
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                    >
                      Ghi nhận
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-5 text-xs">
                  {/* PHẦN NHẬP KHO QUA FILE */}
                  <div className="flex flex-col gap-2.5 p-4 bg-slate-55/20 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider block">Nhập kho bằng file (.pdf, excel)</span>
                    <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">Tải lên phiếu nhập kho định dạng PDF hoặc Excel (.xlsx, .xls) để hệ thống tự động cập nhật số lượng.</p>

                    <div className="mt-1">
                      <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 rounded-xl hover:bg-slate-100/50 hover:border-slate-400 cursor-pointer transition-all gap-1.5 text-center">
                        <UploadCloud size={20} className="text-slate-600" />
                        <span className="font-extrabold text-slate-700">
                          {selectedFile ? selectedFile.name : "Chọn file tài liệu từ thiết bị"}
                        </span>
                        <span className="text-[9px] text-slate-450 font-semibold">Chấp nhận .pdf, .xlsx, .xls</span>
                        <input
                          type="file"
                          accept=".pdf,.xlsx,.xls"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const ext = file.name.split('.').pop()?.toLowerCase();
                              if (!ext || !["pdf", "xlsx", "xls"].includes(ext)) {
                                setFileError("Định dạng file không hợp lệ! Vui lòng chọn file .pdf hoặc excel (.xlsx, .xls)");
                                setSelectedFile(null);
                              } else {
                                setFileError(null);
                                setSelectedFile(file);

                                if (ext === "xlsx" || ext === "xls") {
                                  const loadingToast = toast.loading("Đang xử lý file Excel...");
                                  try {
                                    await uploadInventoryExcelApi(file);
                                    toast.success("Tải file và cập nhật kho thành công!", { id: loadingToast });

                                    // Reload data
                                    getIngredientsApi()
                                      .then((data) => setReduxIngredients(data))
                                      .catch((err) => console.error("Failed to load ingredients", err));
                                    getInventoryTransactionsApi()
                                      .then((data) => setTransactions(data))
                                      .catch((err) => console.error("Failed to load transactions", err));

                                    getSuppliersApi()
                                      .then((data) => setSuppliers(data))
                                      .catch((err) => console.error("Failed to load suppliers", err));

                                    setShowImportExportModal(false);
                                    setSelectedFile(null);
                                    setImportExportMode("manual");
                                  } catch (error: any) {
                                    toast.error(error.response?.data?.message || "Có lỗi xảy ra khi tải file", { id: loadingToast });
                                  }
                                }
                              }
                            }
                          }}
                        />
                      </label>
                    </div>

                    {fileError && (
                      <div className="mt-1.5 p-3 bg-red-50 border border-red-200 text-red-600 font-extrabold rounded-xl flex items-center gap-1.5 shadow-2xs">
                        <span>⚠️ Lỗi định dạng:</span>
                        <span>{fileError}</span>
                      </div>
                    )}

                    {selectedFile && !fileError && (
                      <button
                        type="button"
                        onClick={() => {
                          toast.success(`Nhập kho thành công từ file: ${selectedFile.name}`);
                          if (reduxIngredients.length > 0) {
                            const ing = reduxIngredients[0];
                            handleModifyStockDirect(ing.id as string, ing.stock + 100);
                            setTransactions([
                              {
                                id: `t_${Date.now()}`,
                                type: "import",
                                ingredientName: ing.name,
                                quantity: 100,
                                unit: ing.unit,
                                reasonOrSupplier: `Nhập tự động từ file ${selectedFile.name}`,
                                timestamp: new Date().toISOString().replace("T", " ").slice(0, 16)
                              },
                              ...transactions
                            ]);
                          }
                          setShowImportExportModal(false);
                        }}
                        className="mt-1.5 w-full py-2 bg-linear-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold rounded-xl text-center active:scale-95 shadow-sm transition-all cursor-pointer"
                      >
                        Tiến hành Nhập kho
                      </button>
                    )}
                  </div>

                  {/* PHẦN XUẤT KHO QUA FILE */}
                  <div className="flex flex-col gap-2.5 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                    <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider block">Xuất dữ liệu kho hàng (.pdf, excel)</span>
                    <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">Tải xuống báo cáo tồn kho hiện tại hoặc phiếu xuất kho chi tiết dưới định dạng PDF hoặc Excel.</p>

                    <div className="grid grid-cols-2 gap-3 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          toast.success("Đang xuất dữ liệu PDF...");
                          try {
                            const doc = new jsPDF();

                            // Set document properties
                            doc.setProperties({
                              title: "Bao Cao Ton Kho",
                              subject: "ResManager Bistro Inventory Report",
                              author: "ResManager Bistro"
                            });

                            // Header Title
                            doc.setFont("helvetica", "bold");
                            doc.setFontSize(18);
                            doc.text("BAO CAO PHAN TICH TON KHO NGUYEN LIEU", 105, 20, { align: "center" });

                            // Sub-header
                            doc.setFont("helvetica", "normal");
                            doc.setFontSize(10);
                            doc.text(`Nha hang: ResManager Bistro  |  Ngay lap: ${new Date().toLocaleDateString("vi-VN")} ${new Date().toLocaleTimeString("vi-VN")}`, 105, 28, { align: "center" });

                            // Divider line
                            doc.setDrawColor(200, 200, 200);
                            doc.line(15, 32, 195, 32);

                            // Section 1: Overview
                            doc.setFont("helvetica", "bold");
                            doc.setFontSize(12);
                            doc.text("1. CHI SO TONG QUAN", 15, 42);

                            // Quick Stats
                            const stats = [
                              { label: "Tong mat hang", val: reportsStats.totalIngredients.toString() },
                              { label: "Ton kho thap", val: reportsStats.lowStockCount.toString() },
                              { label: "Lo can han", val: reportsStats.nearExpiryCount.toString() },
                              { label: "Lo het han", val: reportsStats.expiredCount.toString() }
                            ];

                            stats.forEach((s, idx) => {
                              const x = 15 + idx * 45;
                              // Box border & fill
                              doc.setDrawColor(226, 232, 240); // border-slate-200
                              doc.setFillColor(248, 250, 252); // bg-slate-50
                              doc.rect(x, 47, 40, 20, "FD");

                              // Stat label
                              doc.setFont("helvetica", "bold");
                              doc.setFontSize(8);
                              doc.setTextColor(71, 85, 105); // text-slate-700
                              doc.text(removeVietnameseAccents(s.label), x + 3, 53);

                              // Stat value
                              doc.setFontSize(16);
                              if (idx === 1 || idx === 3) {
                                doc.setTextColor(220, 38, 38); // text-rose-600 (warnings)
                              } else {
                                doc.setTextColor(15, 98, 254); // text-blue-600 (totals)
                              }
                              doc.text(s.val, x + 3, 63);
                            });

                            // Section 2: Table List
                            doc.setTextColor(15, 23, 42); // text-slate-900
                            doc.setFont("helvetica", "bold");
                            doc.setFontSize(12);
                            doc.text("2. DANH SACH CHI TIET NGUYEN LIEU KHO", 15, 78);

                            // Table Headers
                            const headers = ["Ma so", "Ten nguyen lieu", "Danh muc", "Ton kho", "Don vi", "Nguong an toan", "Tinh trang"];
                            const colX = [15, 30, 85, 120, 140, 155, 180];

                            doc.setFillColor(30, 58, 138); // background-color: #1e3a8a
                            doc.rect(15, 83, 180, 8, "F");

                            doc.setFontSize(8);
                            doc.setTextColor(255, 255, 255);
                            headers.forEach((h, idx) => {
                              doc.text(h, colX[idx], 88);
                            });

                            // Table Rows
                            doc.setTextColor(15, 23, 42);
                            let y = 96;
                            reduxIngredients.forEach((i, idx) => {
                              // Check for page break (A4 is 297mm high)
                              if (y > 275) {
                                doc.addPage();
                                // Redraw headers on new page
                                doc.setFillColor(30, 58, 138);
                                doc.rect(15, 15, 180, 8, "F");
                                doc.setFontSize(8);
                                doc.setTextColor(255, 255, 255);
                                headers.forEach((h, hidx) => {
                                  doc.text(h, colX[hidx], 20);
                                });
                                y = 28;
                              }

                              // Alternating zebra striping
                              if (idx % 2 === 1) {
                                doc.setFillColor(248, 250, 252);
                                doc.rect(15, y - 4, 180, 6, "F");
                              }

                              // Row divider line
                              doc.setDrawColor(241, 245, 249);
                              doc.line(15, y + 2, 195, y + 2);

                              const isLow = i.stock <= i.threshold;
                              const statusText = isLow ? "TON THAP" : "AN TOAN";
                              const categoryText = getIngredientCategory(i.name);

                              // Draw cells
                              doc.setFont("helvetica", "normal");
                              doc.setTextColor(71, 85, 105);
                              doc.text(i.id, colX[0], y);

                              doc.setFont("helvetica", "bold");
                              doc.setTextColor(15, 23, 42);
                              doc.text(removeVietnameseAccents(i.name), colX[1], y);

                              doc.setFont("helvetica", "normal");
                              doc.setTextColor(71, 85, 105);
                              doc.text(removeVietnameseAccents(categoryText), colX[2], y);

                              // Align right for numeric columns
                              doc.setFont("helvetica", "bold");
                              if (isLow) {
                                doc.setTextColor(220, 38, 38); // red
                              } else {
                                doc.setTextColor(15, 98, 254); // blue
                              }
                              doc.text(i.stock.toString(), colX[3] + 10, y, { align: "right" });

                              doc.setFont("helvetica", "normal");
                              doc.setTextColor(71, 85, 105);
                              doc.text(removeVietnameseAccents(i.unit), colX[4], y);
                              doc.text(i.threshold.toString(), colX[5] + 10, y, { align: "right" });

                              // Draw status text
                              if (isLow) {
                                doc.setTextColor(220, 38, 38);
                                doc.setFont("helvetica", "bold");
                              } else {
                                doc.setTextColor(22, 163, 74); // green
                                doc.setFont("helvetica", "bold");
                              }
                              doc.text(statusText, colX[6], y);

                              y += 8;
                            });

                            // Save PDF file
                            doc.save(`Bao_Cao_Ton_Kho_${Date.now()}.pdf`);
                            toast.success("Tải file PDF thành công!");
                            setShowImportExportModal(false);
                          } catch (err) {
                            console.error("PDF generation failed: ", err);
                            toast.error("Có lỗi xảy ra khi tạo file PDF!");
                          }
                        }}
                        className="py-2 bg-white hover:bg-red-50 border border-red-200 text-red-600 rounded-xl font-bold tracking-wide flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer text-[10px]"
                      >
                        <FileText size={12} /> Xuất file .PDF
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          toast.success("Đang xuất dữ liệu...");
                          const htmlContent = `
                          <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
                          <head>
                            <meta charset="utf-8"/>
                            <style>
                              body {
                                font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                              }
                              table {
                                border-collapse: collapse;
                                width: 100%;
                              }
                              th {
                                color: #ffffff;
                                font-weight: bold;
                                font-size: 11pt;
                                padding: 8px 12px;
                                border: 1px solid #cbd5e1;
                                text-align: left;
                              }
                              td {
                                font-size: 10pt;
                                padding: 8px 12px;
                                border: 1px solid #e2e8f0;
                              }
                              .row-even {
                                background-color: #f8fafc;
                              }
                              .status-warning {
                                color: #dc2626;
                                font-weight: bold;
                                background-color: #fef2f2;
                              }
                              .status-safe {
                                color: #16a34a;
                                font-weight: bold;
                                background-color: #f0fdf4;
                              }
                              .title-cell {
                                font-size: 16pt;
                                font-weight: bold;
                                color: #0f172a;
                              }
                              .meta-cell {
                                font-size: 9pt;
                                color: #475569;
                              }
                            </style>
                          </head>
                          <body>
                            <!-- Title / Metadata Header -->
                            <table>
                              <tr>
                                <td colspan="7" class="title-cell" style="border: none; padding-bottom: 2px;">BÁO CÁO TỒN KHO NGUYÊN LIỆU</td>
                              </tr>
                              <tr>
                                <td colspan="7" class="meta-cell" style="border: none; padding-bottom: 10px;">
                                  Nhà hàng: <strong>ResManager Bistro</strong> | Ngày lập: ${new Date().toLocaleDateString("vi-VN")} ${new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                </td>
                              </tr>
                              <tr>
                                <td colspan="7" style="border: none; height: 10px;"></td>
                              </tr>
                            </table>

                            <!-- Main Table -->
                            <table>
                              <thead>
                                <tr>
                                  <th style="background-color: #1e3a8a; color: white;">Mã số</th>
                                  <th style="background-color: #1e3a8a; color: white;">Tên nguyên liệu</th>
                                  <th style="background-color: #1e3a8a; color: white;">Danh mục</th>
                                  <th style="background-color: #1e3a8a; color: white; text-align: right;">Tồn kho</th>
                                  <th style="background-color: #1e3a8a; color: white;">Đơn vị</th>
                                  <th style="background-color: #1e3a8a; color: white; text-align: right;">Ngưỡng an toàn</th>
                                  <th style="background-color: #1e3a8a; color: white; text-align: center;">Tình trạng</th>
                                </tr>
                              </thead>
                              <tbody>
                                ${reduxIngredients.map((i, idx) => {
                            const isLow = i.stock <= i.threshold;
                            const rowClass = idx % 2 === 0 ? "" : "row-even";
                            const statusClass = isLow ? "status-warning" : "status-safe";
                            const statusText = isLow ? "TỒN THẤP" : "AN TOÀN";
                            const categoryText = getIngredientCategory(i.name);
                            return `
                                    <tr class="${rowClass}">
                                      <td style="font-weight: bold; color: #64748b;">${i.id}</td>
                                      <td style="font-weight: bold; color: #0f172a;">${i.name}</td>
                                      <td>${categoryText}</td>
                                      <td style="text-align: right; font-weight: bold; color: ${isLow ? '#dc2626' : '#0f62fe'};">${i.stock}</td>
                                      <td>${i.unit}</td>
                                      <td style="text-align: right; color: #64748b;">${i.threshold}</td>
                                      <td class="${statusClass}" style="text-align: center;">${statusText}</td>
                                    </tr>
                                  `;
                          }).join("")}
                              </tbody>
                            </table>
                          </body>
                          </html>
                        `;
                          const blob = new Blob([htmlContent], { type: "application/vnd.ms-excel" });
                          const url = URL.createObjectURL(blob);
                          const link = document.createElement("a");
                          link.href = url;
                          link.setAttribute("download", `Bao_Cao_Ton_Kho_${Date.now()}.xls`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(url);
                          toast.success("Tải file Excel (.xls) thành công!");
                        }}
                        className="py-2 bg-white hover:bg-emerald-50 border border-emerald-250 text-emerald-600 rounded-xl font-bold tracking-wide flex items-center justify-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer text-[10px]"
                      >
                        <FileSpreadsheet size={12} /> Xuất file Excel
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-slate-100 justify-end">
                    <button
                      type="button"
                      onClick={() => setShowImportExportModal(false)}
                      className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                    >
                      Đóng
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* Modal C: Thêm Nhà cung cấp mới */}
      {
        showEditSupplierModal && editingSupplier && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => {
                  setShowEditSupplierModal(false);
                  setEditingSupplier(null);
                }}
                className="absolute right-4 top-4 p-1 rounded-lg text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
              <h3 className="font-extrabold text-lg text-slate-800 mb-6">Sửa Nhà cung cấp</h3>
              <form onSubmit={handleUpdateSupplier} className="flex flex-col gap-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-slate-700">Tên nhà cung cấp</label>
                  <input
                    required
                    type="text"
                    value={editingSupplier.name}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, name: e.target.value })}
                    className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-slate-700">Người liên hệ</label>
                  <input
                    type="text"
                    value={editingSupplier.contact || ""}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, contact: e.target.value })}
                    className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-slate-700">Số điện thoại</label>
                  <input
                    type="text"
                    value={editingSupplier.phone || ""}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, phone: e.target.value })}
                    className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-slate-700">Địa chỉ</label>
                  <input
                    type="text"
                    value={editingSupplier.address || ""}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, address: e.target.value })}
                    className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-slate-700">Nguyên liệu cung cấp (cách nhau dấu phẩy)</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Thịt bò Mỹ, Sườn heo"
                    value={editingSupplier.mainIngredients || ""}
                    onChange={(e) => setEditingSupplier({ ...editingSupplier, mainIngredients: e.target.value })}
                    className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditSupplierModal(false);
                      setEditingSupplier(null);
                    }}
                    className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                  >
                    Hủy bỏ
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md shadow-blue-600/20 cursor-pointer"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {
        showAddSupplierModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowAddSupplierModal(false)}
                className="absolute right-4 top-4 p-1 rounded-lg text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">Thêm Nhà cung cấp mới</h3>
              <form onSubmit={handleSaveSupplier} className="flex flex-col gap-4 text-xs">
                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-slate-700">Tên nhà cung cấp</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Công ty Nông sản sạch..."
                    value={newSupplierForm.name}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, name: e.target.value })}
                    className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Người liên hệ</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: A. Bình"
                      value={newSupplierForm.contact}
                      onChange={(e) => setNewSupplierForm({ ...newSupplierForm, contact: e.target.value })}
                      className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Số điện thoại</label>
                    <input
                      type="text"
                      required
                      placeholder="SĐT liên hệ"
                      value={newSupplierForm.phone}
                      onChange={(e) => setNewSupplierForm({ ...newSupplierForm, phone: e.target.value })}
                      className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-slate-700">Địa chỉ</label>
                  <input
                    type="text"
                    required
                    placeholder="Địa chỉ văn phòng / kho bãi"
                    value={newSupplierForm.address}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, address: e.target.value })}
                    className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-slate-700">Nguyên liệu chính cung cấp</label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Rau củ, Nấm tươi (phân cách bằng dấu phẩy)"
                    value={newSupplierForm.mainIngredients}
                    onChange={(e) => setNewSupplierForm({ ...newSupplierForm, mainIngredients: e.target.value })}
                    className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddSupplierModal(false)}
                    className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Xác nhận
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal D: Thêm Danh mục mới */}
      {
        showAddCategoryModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
              <button
                onClick={() => setShowAddCategoryModal(false)}
                className="absolute right-4 top-4 p-1 rounded-lg text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
              <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">Thêm Danh mục mới</h3>
              <form onSubmit={handleSaveCategory} className="flex flex-col gap-4 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Tên danh mục</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Đồ uống đóng chai"
                      value={newCategoryForm.name}
                      onChange={(e) => setNewCategoryForm({ ...newCategoryForm, name: e.target.value })}
                      className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <label className="font-extrabold text-slate-700">Mã danh mục</label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: DOUONG"
                      value={newCategoryForm.code}
                      onChange={(e) => setNewCategoryForm({ ...newCategoryForm, code: e.target.value.toUpperCase() })}
                      className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="font-extrabold text-slate-700">Mô tả chi tiết</label>
                  <textarea
                    placeholder="Mô tả nhóm nguyên liệu..."
                    value={newCategoryForm.description}
                    onChange={(e) => setNewCategoryForm({ ...newCategoryForm, description: e.target.value })}
                    rows={3}
                    className="px-3 py-2 border border-slate-250 rounded-xl focus:outline-none focus:border-blue-500 font-semibold bg-white"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100 justify-end">
                  <button
                    type="button"
                    onClick={() => setShowAddCategoryModal(false)}
                    className="px-4 py-2 border border-slate-250 hover:bg-slate-50 rounded-xl font-bold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-linear-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                  >
                    Xác nhận
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Modal E: Pay Supplier Debt */}
      {showPayDebtModal && payingSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowPayDebtModal(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-600 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
              <Truck className="text-blue-600" size={18} />
              Thanh toán công nợ nhà cung cấp
            </h3>
            <div className="flex flex-col gap-4 text-xs">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div className="text-slate-500 font-bold mb-1">Nhà cung cấp</div>
                <div className="text-sm font-black text-slate-800">{payingSupplier?.name}</div>
                <div className="mt-2 text-slate-500 font-bold">Nợ hiện tại</div>
                <div className="text-base font-black text-rose-600">
                  {Number(payingSupplier?.total_debt || 0).toLocaleString("vi-VN")} ₫
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Số tiền thanh toán (₫)</label>
                <div className="relative">
                  <input
                    type="number"
                    value={debtAmount}
                    onChange={(e) => setDebtAmount(e.target.value === "" ? "" : Number(e.target.value))}
                    placeholder="Nhập số tiền..."
                    className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none font-black text-lg text-admin-primary pr-8"
                  />
                  <span className="absolute right-3 top-2.5 font-bold text-slate-400">₫</span>
                </div>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Phương thức thanh toán</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-semibold cursor-pointer"
                >
                  <option value="cash">Tiền mặt</option>
                  <option value="bank_transfer">Chuyển khoản</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Ghi chú</label>
                <textarea
                  rows={2}
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm"
                  placeholder="Nhập ghi chú thanh toán..."
                ></textarea>
              </div>
              <div className="flex justify-end gap-2 mt-2">
                <button onClick={() => setShowPayDebtModal(false)} className="px-4 py-2 text-slate-600 font-bold rounded-lg hover:bg-slate-100 text-sm cursor-pointer">
                  Hủy
                </button>
                <button onClick={handlePayDebt} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2 cursor-pointer shadow-sm">
                  <CheckCircle size={16} /> Xác nhận thanh toán
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {renderPrintModal()}
      {renderPrintStocktakeModal()}
      {renderReturnReceiptModal()}
    </div>
  );
};

export default InventoryControl;

