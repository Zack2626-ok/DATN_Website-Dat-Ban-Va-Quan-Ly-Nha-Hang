import React, { useState, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setIngredientStockDirect } from "../../../store/inventorySlice";
import { syncMenuWithIngredients } from "../../../store/menuSlice";
import {
  AlertTriangle,
  Plus,
  Minus,
  Search,
  Trash2,
  Layers,
  Truck,
  History,
  ClipboardCheck,
  CalendarRange,
  PieChart,
  ArrowDownLeft,
  ArrowUpRight,
  PlusCircle,
  FileSpreadsheet,
  X,
  Check,
  RefreshCw,
  Info
} from "lucide-react";

// Types for local interactive states
interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
}

interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  mainIngredients: string;
}

interface ExpiryBatch {
  id: string;
  ingredientName: string;
  quantity: number;
  unit: string;
  batchNo: string;
  expiryDate: string; // YYYY-MM-DD
}

interface StockTransaction {
  id: string;
  type: "import" | "export" | "adjust";
  ingredientName: string;
  quantity: number;
  unit: string;
  reasonOrSupplier: string;
  timestamp: string;
}

export const InventoryControl: React.FC = () => {
  const dispatch = useAppDispatch();
  const reduxIngredients = useAppSelector((state) => state.inventory.ingredients);
  const globalSearchQuery = useAppSelector((state) => state.ui.searchQuery);

  // Active Tab
  const [activeTab, setActiveTab] = useState<"ingredients" | "categories_suppliers" | "import_export" | "stocktake" | "expiry" | "reports">("ingredients");

  // Local Search & Category filters for Ingredient Tab
  const [ingSearch, setIngSearch] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("all");
  const [stockStatusFilter, setStockStatusFilter] = useState("all"); // all, low, normal

  // Local Mock Data States (so users can add/delete/update for rich demo)
  const [categories, setCategories] = useState<Category[]>([
    { id: "c1", name: "Hải sản tươi sống", code: "HAISAN", description: "Các loại cua, cá, tôm, sò biển tươi" },
    { id: "c2", name: "Thịt & Gia cầm", code: "THIT", description: "Thịt heo, bò, gà sạch nhập trong ngày" },
    { id: "c3", name: "Nấm & Rau củ", code: "RAUNAM", description: "Rau sạch Đà Lạt và các loại nấm đùi gà, nấm linh chi" },
    { id: "c4", name: "Gia vị & Hàng khô", code: "GIAVI", description: "Các loại nước xốt, muối tiêu, dầu ăn" }
  ]);

  const [suppliers, setSuppliers] = useState<Supplier[]>([
    { id: "s1", name: "NCC Hải Sản Đại Dương", contact: "A. Nam", phone: "0901 234 567", address: "Cảng cá Vũng Tàu", mainIngredients: "Cá hồi, Tôm sú, Cua hoàng đế" },
    { id: "s2", name: "NCC Meat Deli Việt Nam", contact: "C. Hoa", phone: "0912 345 678", address: "KCN Đồng Văn, Hà Nam", mainIngredients: "Thịt bò Mỹ, Sườn heo" },
    { id: "s3", name: "Nông Sản Sạch Đà Lạt", contact: "A. Lâm", phone: "0983 987 654", address: "Đường Hùng Vương, Đà Lạt", mainIngredients: "Nấm tươi, Xà lách, Cà chua" },
    { id: "s4", name: "Gia vị Hào Gia", contact: "C. Linh", phone: "0934 555 888", address: "Chợ Đồng Xuân, Hà Nội", mainIngredients: "Nước xốt, Dầu mè, Tiêu đen" }
  ]);

  const [expiryBatches, setExpiryBatches] = useState<ExpiryBatch[]>([
    { id: "b1", ingredientName: "Trứng cá tầm", quantity: 150, unit: "g", batchNo: "LOT-TCT-0701", expiryDate: "2026-07-12" }, // 3 days left
    { id: "b2", ingredientName: "Thịt bò Mỹ", quantity: 5.0, unit: "kg", batchNo: "LOT-BOM-0705", expiryDate: "2026-07-10" }, // 1 day left
    { id: "b3", ingredientName: "Cá hồi", quantity: 6.0, unit: "kg", batchNo: "LOT-CAH-0708", expiryDate: "2026-07-16" }, // safe
    { id: "b4", ingredientName: "Tôm sú", quantity: 2.0, unit: "kg", batchNo: "LOT-TOM-0702", expiryDate: "2026-07-08" }, // Expired
    { id: "b5", ingredientName: "Nấm tươi", quantity: 100, unit: "g", batchNo: "LOT-NAM-0708", expiryDate: "2026-07-11" } // 2 days left
  ]);

  const [transactions, setTransactions] = useState<StockTransaction[]>([
    { id: "t1", type: "import", ingredientName: "Trứng cá tầm", quantity: 300, unit: "g", reasonOrSupplier: "NCC Hải Sản Đại Dương", timestamp: "2026-07-09 10:15" },
    { id: "t2", type: "import", ingredientName: "Thịt bò Mỹ", quantity: 10, unit: "kg", reasonOrSupplier: "NCC Meat Deli Việt Nam", timestamp: "2026-07-09 09:30" },
    { id: "t3", type: "export", ingredientName: "Thịt bò Mỹ", quantity: 1.5, unit: "kg", reasonOrSupplier: "Chế biến món Bò lúc lắc", timestamp: "2026-07-09 18:20" },
    { id: "t4", type: "adjust", ingredientName: "Cá hồi", quantity: -0.5, unit: "kg", reasonOrSupplier: "Hao hụt kiểm kho thực tế", timestamp: "2026-07-08 22:00" }
  ]);

  // Modals / Input States
  const [showAddIngModal, setShowAddIngModal] = useState(false);
  const [newIngForm, setNewIngForm] = useState({ name: "", category: "Thịt & Gia cầm", stock: 10, unit: "kg", threshold: 2.0 });

  const [showImportExportModal, setShowImportExportModal] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    type: "import" as "import" | "export",
    ingredientId: reduxIngredients[0]?.id || "",
    quantity: 1,
    reasonOrSupplier: ""
  });

  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierForm, setNewSupplierForm] = useState({ name: "", contact: "", phone: "", address: "", mainIngredients: "" });

  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [newCategoryForm, setNewCategoryForm] = useState({ name: "", code: "", description: "" });

  // State for Stocktake input quantities
  const [stocktakeValues, setStocktakeValues] = useState<{ [id: string]: string }>({});

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
  const handleAddIngredient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIngForm.name) return;

    // Simulate addition to Redux by directly setting stock
    // Since redux is initialized from constants, we generate a mock ID and set stock.
    // For DATN full save, it would call an API, here we just dispatch a setting action.
    const newId = `i_${Date.now()}`;
    dispatch(setIngredientStockDirect({ id: newId, stock: Number(newIngForm.stock) }));
    
    // We add to state locally (normally Redux holds all, but we mock the state update for visual demonstration)
    // Redux slice does not have "addIngredient" reducer, so we sync menu
    reduxIngredients.push({
      id: newId,
      name: newIngForm.name,
      stock: Number(newIngForm.stock),
      unit: newIngForm.unit,
      threshold: Number(newIngForm.threshold)
    });

    // Add expiry batch automatically for the new ingredient
    const expiryDateStr = new Date();
    expiryDateStr.setDate(expiryDateStr.getDate() + 7); // 7 days expiry mock
    setExpiryBatches([
      ...expiryBatches,
      {
        id: `b_${Date.now()}`,
        ingredientName: newIngForm.name,
        quantity: Number(newIngForm.stock),
        unit: newIngForm.unit,
        batchNo: `LOT-${newIngForm.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
        expiryDate: expiryDateStr.toISOString().split("T")[0]
      }
    ]);

    // Log transaction
    setTransactions([
      {
        id: `t_${Date.now()}`,
        type: "import",
        ingredientName: newIngForm.name,
        quantity: Number(newIngForm.stock),
        unit: newIngForm.unit,
        reasonOrSupplier: "Nhập hàng khởi tạo ban đầu",
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 16)
      },
      ...transactions
    ]);

    triggerInventoryMenuSync();
    setShowAddIngModal(false);
    setNewIngForm({ name: "", category: "Thịt & Gia cầm", stock: 10, unit: "kg", threshold: 2.0 });
  };

  const handlePostTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    const ing = reduxIngredients.find((i) => i.id === transactionForm.ingredientId);
    if (!ing) return;

    const qty = Number(transactionForm.quantity);
    const multiplier = transactionForm.type === "import" ? 1 : -1;
    const nextStock = Math.max(0, ing.stock + (qty * multiplier));

    handleModifyStockDirect(ing.id as string, nextStock);

    // Log transaction
    setTransactions([
      {
        id: `t_${Date.now()}`,
        type: transactionForm.type,
        ingredientName: ing.name,
        quantity: qty,
        unit: ing.unit,
        reasonOrSupplier: transactionForm.reasonOrSupplier || (transactionForm.type === "import" ? "Nhập kho bổ sung" : "Xuất kho sử dụng"),
        timestamp: new Date().toISOString().replace("T", " ").slice(0, 16)
      },
      ...transactions
    ]);

    // Log expiry batch if import
    if (transactionForm.type === "import") {
      const expDate = new Date();
      expDate.setDate(expDate.getDate() + 5); // Mock 5 days
      setExpiryBatches([
        ...expiryBatches,
        {
          id: `b_${Date.now()}`,
          ingredientName: ing.name,
          quantity: qty,
          unit: ing.unit,
          batchNo: `LOT-${ing.name.slice(0, 3).toUpperCase()}-${Date.now().toString().slice(-4)}`,
          expiryDate: expDate.toISOString().split("T")[0]
        }
      ]);
    }

    setShowImportExportModal(false);
    setTransactionForm({
      type: "import",
      ingredientId: reduxIngredients[0]?.id || "",
      quantity: 1,
      reasonOrSupplier: ""
    });
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierForm.name) return;
    setSuppliers([
      ...suppliers,
      {
        id: `s_${Date.now()}`,
        ...newSupplierForm
      }
    ]);
    setShowAddSupplierModal(false);
    setNewSupplierForm({ name: "", contact: "", phone: "", address: "", mainIngredients: "" });
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

  // Perform Stocktake adjustment
  const handleApplyStocktake = () => {
    let changed = false;
    const newTxList = [...transactions];

    reduxIngredients.forEach((ing) => {
      const val = stocktakeValues[ing.id];
      if (val !== undefined && val.trim() !== "") {
        const actualQty = Number(val);
        const discrepancy = actualQty - ing.stock;

        if (discrepancy !== 0) {
          handleModifyStockDirect(ing.id as string, actualQty);
          changed = true;

          // Log discrepancy transaction
          newTxList.unshift({
            id: `t_${Date.now()}_${ing.id}`,
            type: "adjust",
            ingredientName: ing.name,
            quantity: Math.abs(discrepancy),
            unit: ing.unit,
            reasonOrSupplier: `Cân đối kiểm kê thực tế (${discrepancy > 0 ? "+" : ""}${discrepancy.toFixed(1)} ${ing.unit})`,
            timestamp: new Date().toISOString().replace("T", " ").slice(0, 16)
          });
        }
      }
    });

    if (changed) {
      setTransactions(newTxList);
      setStocktakeValues({});
      alert("✅ Cân đối kho thành công! Số lượng thực tế đã được cập nhật.");
    } else {
      alert("Chưa có số lượng kiểm kê thực tế nào được nhập hoặc không có chênh lệch.");
    }
  };

  // Check how many days until expiry
  const getExpiryLabel = (expiryDateStr: string) => {
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

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-300 text-slate-800">
      
      {/* 1. Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-5 border-b border-slate-200 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Layers className="text-[#0f62fe]" size={24} />
            Hệ thống Quản lý Kho Nguyên liệu
          </h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Quản lý nguyên liệu, nhà cung cấp, nhập xuất kho, kiểm kê và theo dõi hạn sử dụng thời gian thực.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowImportExportModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold tracking-wide flex items-center gap-1.5 shadow-sm hover:shadow active:scale-95 transition-all cursor-pointer"
          >
            <PlusCircle size={14} /> Nhập / Xuất kho
          </button>
          <button
            onClick={() => setShowAddIngModal(true)}
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs rounded-xl text-xs font-bold tracking-wide flex items-center gap-1.5 active:scale-95 transition-all cursor-pointer"
          >
            <Plus size={14} /> Thêm nguyên liệu
          </button>
        </div>
      </div>

      {/* 2. Top-level Alert Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {reduxIngredients.some((ing) => ing.stock <= ing.threshold) && (
          <div className="bg-rose-50 border border-rose-200/80 text-rose-800 rounded-xl p-4 flex items-center gap-3 text-xs font-semibold shadow-2xs animate-pulse">
            <AlertTriangle size={18} className="text-rose-500 shrink-0" />
            <div>
              <p className="font-extrabold text-rose-900">CẢNH BÁO TỒN KHO THẤP!</p>
              <p className="text-[11px] text-rose-700 font-medium mt-0.5">
                Có {reduxIngredients.filter((ing) => ing.stock <= ing.threshold).length} nguyên liệu sắp hết hàng. Vui lòng kiểm tra và lên đơn nhập.
              </p>
            </div>
          </div>
        )}

        {expiryBatches.some((b) => getExpiryLabel(b.expiryDate).status !== "good") && (
          <div className="bg-amber-50 border border-amber-250 text-amber-800 rounded-xl p-4 flex items-center gap-3 text-xs font-semibold shadow-2xs">
            <CalendarRange size={18} className="text-amber-500 shrink-0" />
            <div>
              <p className="font-extrabold text-amber-900">CẢNH BÁO HẠN SỬ DỤNG!</p>
              <p className="text-[11px] text-amber-700 font-medium mt-0.5">
                Phát hiện nguyên liệu đã hết hạn hoặc cận ngày hết hạn (trong vòng 3 ngày). Hãy ưu tiên sử dụng hoặc tiêu hủy.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-slate-50/70 p-1 rounded-xl gap-1">
        {[
          { id: "ingredients", label: "Nguyên liệu", icon: <Layers size={14} /> },
          { id: "categories_suppliers", label: "Danh mục & NCC", icon: <Truck size={14} /> },
          { id: "import_export", label: "Nhập / Xuất kho", icon: <History size={14} /> },
          { id: "stocktake", label: "Kiểm kê", icon: <ClipboardCheck size={14} /> },
          { id: "expiry", label: "Hạn sử dụng", icon: <CalendarRange size={14} /> },
          { id: "reports", label: "Báo cáo tồn kho", icon: <PieChart size={14} /> }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-extrabold cursor-pointer transition-all duration-200 ${
              activeTab === tab.id
                ? "bg-white text-blue-700 shadow-sm border border-slate-200/50"
                : "text-slate-500 hover:text-slate-800 hover:bg-white/40"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* 4. Tab Contents */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 min-h-[450px]">

        {/* Tab 1: Nguyên liệu */}
        {activeTab === "ingredients" && (
          <div className="flex flex-col gap-4">
            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Tìm kiếm nguyên liệu..."
                  value={ingSearch}
                  onChange={(e) => setIngSearch(e.target.value)}
                  className="pl-9 pr-4 py-2 w-full text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold"
                />
              </div>

              <div className="flex flex-wrap gap-2 w-full md:w-auto justify-end">
                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-extrabold cursor-pointer"
                >
                  <option value="all">Tất cả danh mục</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={stockStatusFilter}
                  onChange={(e) => setStockStatusFilter(e.target.value)}
                  className="px-2.5 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-extrabold cursor-pointer"
                >
                  <option value="all">Tất cả mức tồn</option>
                  <option value="low">Tồn kho thấp</option>
                  <option value="normal">Bình thường</option>
                </select>
              </div>
            </div>

            {/* Ingredients Table */}
            <div className="overflow-x-auto border border-slate-200/80 rounded-xl shadow-inner">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-wider">
                  <tr>
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
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-400 italic">
                        Không tìm thấy nguyên liệu nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    filteredIngredients.map((ing) => {
                      const isLow = ing.stock <= ing.threshold;
                      const percentage = Math.min(100, Math.max(0, (ing.stock / (ing.threshold * 3)) * 100));

                      return (
                        <tr key={ing.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-extrabold text-slate-900">{ing.name}</span>
                            <div className="text-[10px] text-slate-400 font-medium mt-0.5">Mã số: {ing.id}</div>
                          </td>
                          <td className="px-5 py-4">
                            <span className="px-2 py-0.5 bg-slate-100 border border-slate-200/60 rounded-md text-[9px] font-extrabold text-slate-600">
                              {getIngredientCategory(ing.name)}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <div className="flex flex-col gap-1 w-32 mx-auto md:mx-0">
                              <span className={`font-black text-center md:text-left ${isLow ? "text-rose-600" : "text-[#0f62fe]"}`}>
                                {ing.stock.toFixed(ing.unit === "kg" ? 1 : 0)} {ing.unit}
                              </span>
                              {/* Progress bar */}
                              <div className="w-full bg-slate-100 rounded-full h-1.5 border border-slate-200/50">
                                <div
                                  className={`h-full rounded-full ${isLow ? "bg-rose-500" : "bg-blue-600"}`}
                                  style={{ width: `${percentage}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {isLow ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-rose-700 bg-rose-100 px-2 py-0.5 rounded border border-rose-250 animate-pulse">
                                <AlertTriangle size={10} /> TỒN THẤP (Dưới {ing.threshold} {ing.unit})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250">
                                <Check size={10} /> AN TOÀN
                              </span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleModifyStockDirect(ing.id as string, ing.stock - (ing.unit === "kg" ? 0.5 : 50))}
                                disabled={ing.stock <= 0}
                                className="p-1 rounded bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                                title="Giảm kho"
                              >
                                <Minus size={11} />
                              </button>
                              <button
                                onClick={() => handleModifyStockDirect(ing.id as string, ing.stock + (ing.unit === "kg" ? 0.5 : 50))}
                                className="p-1 rounded bg-slate-100 border border-slate-200 text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
                                title="Tăng kho"
                              >
                                <Plus size={11} />
                              </button>
                              <button
                                onClick={() => handleModifyStockDirect(ing.id as string, 0)}
                                className="px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-600 hover:bg-rose-100 text-[10px] font-extrabold cursor-pointer transition-colors"
                                title="Giả lập hết hàng"
                              >
                                Hết hàng
                              </button>
                            </div>
                          </td>
                        </tr>
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
                  Hệ thống kiểm soát tồn kho được liên kết chặt chẽ với Thực đơn bán hàng. Ví dụ, khi bạn điều chỉnh lượng tồn kho của <strong>Cá hồi</strong> hoặc <strong>Trứng cá tầm</strong> về 0 (hoặc nhấn nút "Hết hàng"), hệ thống sẽ tự động cập nhật và ẩn/báo "Hết hàng" đối với các món <em>Cá hồi sốt chanh</em> hay <em>Gỏi hải sản</em> ngoài trang Gọi món của Nhân viên và Khách hàng ngay lập tức.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Danh mục & Nhà cung cấp */}
        {activeTab === "categories_suppliers" && (
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
                      <p className="text-[10px] text-slate-400 font-medium mt-1 leading-snug">{c.description}</p>
                    </div>
                    <button
                      onClick={() => setCategories(categories.filter((cat) => cat.id !== c.id))}
                      className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
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
                        <span className="font-extrabold text-xs text-slate-800">{s.name}</span>
                        <div className="text-[10px] text-slate-500 font-semibold mt-1">
                          Liên hệ: {s.contact} | SĐT: {s.phone}
                        </div>
                        <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                          Địa chỉ: {s.address}
                        </div>
                      </div>
                      <button
                        onClick={() => setSuppliers(suppliers.filter((sup) => sup.id !== s.id))}
                        className="p-1 hover:bg-rose-50 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                        title="Xóa nhà cung cấp"
                      >
                        <Trash2 size={11} />
                      </button>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-200/50 flex flex-wrap gap-1 items-center">
                      <span className="text-[9px] font-bold text-slate-400">Nguyên liệu chính:</span>
                      {s.mainIngredients.split(",").map((ing, index) => (
                        <span key={index} className="text-[8px] font-extrabold text-blue-600 bg-blue-50 px-1.5 py-0.2 rounded border border-blue-200/40">
                          {ing.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {/* Tab 3: Nhập / Xuất kho & Lịch sử */}
        {activeTab === "import_export" && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Lịch sử giao dịch nhập/xuất kho</span>
              <button
                onClick={() => setShowImportExportModal(true)}
                className="px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-[10px] font-black tracking-wide flex items-center gap-1 shadow-sm cursor-pointer"
              >
                <Plus size={10} /> Thực hiện Nhập/Xuất mới
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-left">Thời gian</th>
                    <th scope="col" className="px-5 py-3 text-center">Loại</th>
                    <th scope="col" className="px-5 py-3 text-left">Nguyên liệu</th>
                    <th scope="col" className="px-5 py-3 text-center">Số lượng</th>
                    <th scope="col" className="px-5 py-3 text-left">Chi tiết / Nhà cung cấp</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-xs font-semibold text-slate-700">
                  {transactions.map((tx) => {
                    const isImport = tx.type === "import";
                    const isExport = tx.type === "export";
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 text-slate-400 font-medium whitespace-nowrap">{tx.timestamp}</td>
                        <td className="px-5 py-3 text-center whitespace-nowrap">
                          {isImport && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-black uppercase">
                              <ArrowDownLeft size={8} /> NHẬP KHO
                            </span>
                          )}
                          {isExport && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-black uppercase">
                              <ArrowUpRight size={8} /> XUẤT KHO
                            </span>
                          )}
                          {tx.type === "adjust" && (
                            <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-350 text-[9px] font-black uppercase">
                              <RefreshCw size={8} /> ĐIỀU CHỈNH
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3 font-extrabold text-slate-800">{tx.ingredientName}</td>
                        <td className="px-5 py-3 text-center">
                          <span className={`font-black ${isImport ? "text-blue-600" : isExport ? "text-amber-600" : "text-slate-650"}`}>
                            {isImport ? "+" : isExport ? "-" : ""}{tx.quantity} {tx.unit}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-slate-500">{tx.reasonOrSupplier}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 4: Kiểm kê */}
        {activeTab === "stocktake" && (
          <div className="flex flex-col gap-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <div>
                <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Phiên Kiểm kê kho & Cân đối dữ liệu</span>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Nhập số lượng thực kiểm đếm được tại bếp để tính chênh lệch hao hụt thực tế.</p>
              </div>
              <button
                onClick={handleApplyStocktake}
                className="px-3.5 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-750 text-white rounded-xl text-xs font-black tracking-wide flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer transition-all"
              >
                <ClipboardCheck size={14} /> Áp dụng cân đối tồn kho
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-left">Nguyên liệu</th>
                    <th scope="col" className="px-5 py-3 text-center">Hệ thống ghi nhận (A)</th>
                    <th scope="col" className="px-5 py-3 text-center">Thực tế kiểm đếm (B)</th>
                    <th scope="col" className="px-5 py-3 text-center">Chênh lệch (B - A)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-xs font-semibold text-slate-700">
                  {reduxIngredients.map((ing) => {
                    const actualStr = stocktakeValues[ing.id];
                    const actualQty = actualStr !== undefined && actualStr.trim() !== "" ? Number(actualStr) : ing.stock;
                    const diff = actualQty - ing.stock;

                    return (
                      <tr key={ing.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-4 font-extrabold text-slate-900">{ing.name}</td>
                        <td className="px-5 py-4 text-center font-bold text-slate-500">
                          {ing.stock.toFixed(ing.unit === "kg" ? 1 : 0)} {ing.unit}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 w-32 mx-auto">
                            <input
                              type="number"
                              step={ing.unit === "kg" ? "0.1" : "1"}
                              placeholder={ing.stock.toFixed(0)}
                              value={stocktakeValues[ing.id] || ""}
                              onChange={(e) => setStocktakeValues({ ...stocktakeValues, [ing.id]: e.target.value })}
                              className="w-20 px-2 py-1 text-center font-black border border-slate-250 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-[10px] font-extrabold text-slate-400">{ing.unit}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {diff === 0 ? (
                            <span className="text-slate-400 font-bold">Khớp kho (0)</span>
                          ) : diff > 0 ? (
                            <span className="text-emerald-600 font-extrabold bg-emerald-50 px-2 py-0.5 rounded border border-emerald-250">
                              Thừa +{diff.toFixed(ing.unit === "kg" ? 1 : 0)} {ing.unit}
                            </span>
                          ) : (
                            <span className="text-rose-600 font-extrabold bg-rose-50 px-2 py-0.5 rounded border border-rose-250">
                              Hụt {diff.toFixed(ing.unit === "kg" ? 1 : 0)} {ing.unit}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 5: Hạn sử dụng */}
        {activeTab === "expiry" && (
          <div className="flex flex-col gap-4">
            <div className="pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Danh sách Lô hàng & Theo dõi Hạn sử dụng</span>
              <p className="text-[10px] text-slate-400 font-semibold mt-1">Cảnh báo nguyên liệu đã hết hạn hoặc sắp hết hạn cần ưu tiên tiêu thụ.</p>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-3 text-left">Số Lô hàng (Batch No)</th>
                    <th scope="col" className="px-5 py-3 text-left">Nguyên liệu</th>
                    <th scope="col" className="px-5 py-3 text-center">Số lượng nhập</th>
                    <th scope="col" className="px-5 py-3 text-left">Ngày hết hạn</th>
                    <th scope="col" className="px-5 py-3 text-left">Tình trạng hạn</th>
                    <th scope="col" className="px-5 py-3 text-right">Thao tác tiêu hủy</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200 text-xs font-semibold text-slate-700">
                  {expiryBatches.map((b) => {
                    const expiryInfo = getExpiryLabel(b.expiryDate);
                    return (
                      <tr key={b.id} className="hover:bg-slate-50/50">
                        <td className="px-5 py-3 font-mono font-bold text-slate-500">{b.batchNo}</td>
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
                          <button
                            onClick={() => {
                              // Filter out this batch
                              setExpiryBatches(expiryBatches.filter((batch) => batch.id !== b.id));
                              // Log transaction
                              setTransactions([
                                {
                                  id: `t_${Date.now()}`,
                                  type: "export",
                                  ingredientName: b.ingredientName,
                                  quantity: b.quantity,
                                  unit: b.unit,
                                  reasonOrSupplier: `Tiêu hủy lô hàng quá hạn / hỏng (${b.batchNo})`,
                                  timestamp: new Date().toISOString().replace("T", " ").slice(0, 16)
                                },
                                ...transactions
                              ]);
                              // Deduct stock if necessary
                              const ing = reduxIngredients.find(i => i.name === b.ingredientName);
                              if (ing) {
                                handleModifyStockDirect(ing.id as string, Math.max(0, ing.stock - b.quantity));
                              }
                            }}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg text-[10px] font-bold cursor-pointer transition-colors border border-rose-200/50"
                          >
                            Tiêu hủy
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 6: Báo cáo */}
        {activeTab === "reports" && (
          <div className="flex flex-col gap-5">
            <div className="pb-2 border-b border-slate-100 flex justify-between items-center">
              <div>
                <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Báo cáo phân tích tồn kho nhanh</span>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">Tổng quan về số lượng nguyên liệu, tỷ lệ cảnh báo và cơ cấu chủng loại.</p>
              </div>
              <button
                onClick={() => window.print()}
                className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 rounded-lg text-[10px] font-extrabold tracking-wide flex items-center gap-1 shadow-2xs cursor-pointer"
              >
                <FileSpreadsheet size={12} /> Xuất Báo cáo (Print)
              </button>
            </div>

            {/* Quick stats grids */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Tổng số mặt hàng</span>
                <span className="text-2xl font-black text-slate-800 block mt-1">{reportsStats.totalIngredients}</span>
                <span className="text-[10px] text-slate-400 font-semibold mt-0.5 block">Nguyên liệu trong danh mục</span>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              
              {/* Category distribution chart */}
              <div className="border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Cơ cấu chủng loại nguyên liệu</span>
                <div className="flex flex-col sm:flex-row items-center justify-around gap-4 h-full">
                  {/* Mock SVG Pie/Donut Chart */}
                  <svg className="w-36 h-36 transform -rotate-90" viewBox="0 0 100 100">
                    {/* Seafood: 40% */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#0f62fe" strokeWidth="20" strokeDasharray="100.5 150.7" />
                    {/* Meat: 30% */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#f59e0b" strokeWidth="20" strokeDasharray="75.4 175.8" strokeDashoffset="-100.5" />
                    {/* Vegetables: 20% */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#10b981" strokeWidth="20" strokeDasharray="50.2 201.0" strokeDashoffset="-175.9" />
                    {/* Spices: 10% */}
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="#6366f1" strokeWidth="20" strokeDasharray="25.1 226.1" strokeDashoffset="-226.1" />
                    <circle cx="50" cy="50" r="22" fill="white" />
                  </svg>

                  <div className="flex flex-col gap-2.5 text-[11px] font-bold text-slate-600">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-[#0f62fe]" />
                      <span>Hải sản tươi sống (40%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-[#f59e0b]" />
                      <span>Thịt & Gia cầm (30%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-[#10b981]" />
                      <span>Nấm & Rau củ (20%)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-md bg-[#6366f1]" />
                      <span>Gia vị & Hàng khô (10%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Transactions trend report */}
              <div className="border border-slate-200 p-5 rounded-2xl flex flex-col gap-4">
                <span className="text-xs font-black uppercase text-slate-500 tracking-wider">Hao hụt & Biến động tuần qua</span>
                <div className="flex flex-col justify-between gap-3 h-full">
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-bold">Hao hụt kiểm định</span>
                      <span className="font-extrabold text-rose-600">-2.5%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-rose-500 h-full rounded-full w-[25%]" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-bold">Lượng nguyên liệu chế biến</span>
                      <span className="font-extrabold text-blue-600">72.4%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-blue-600 h-full rounded-full w-[72%]" />
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-450 font-bold">Lượng nguyên liệu hủy (quá hạn)</span>
                      <span className="font-extrabold text-amber-600">4.1%</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-amber-50 h-full rounded-full w-[12%]" />
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200/50 rounded-xl text-[10px] text-slate-400 font-semibold leading-relaxed">
                    💡 Báo cáo trên được trích xuất dữ liệu tổng hợp dựa trên nhật ký nhập, xuất sử dụng từ khu vực bếp và ghi nhận hao hụt thực tế từ các lần cân đối tồn kho.
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

      </div>

      {/* 5. Simulating notification details */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-xs text-slate-500 font-semibold leading-relaxed text-center shadow-inner">
        💡 Giao diện trên là bản demo chức năng nâng cao quản lý kho nguyên liệu theo chuẩn Graduation Thesis (DATN).
      </div>

      {/* MODALS */}

      {/* Modal A: Thêm nguyên liệu mới */}
      {showAddIngModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddIngModal(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal B: Nhập / Xuất kho nhanh */}
      {showImportExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowImportExportModal(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X size={16} />
            </button>
            <h3 className="text-base font-black text-slate-800 border-b border-slate-100 pb-3 mb-4">Ghi nhận Nhập / Xuất kho mới</h3>
            <form onSubmit={handlePostTransaction} className="flex flex-col gap-4 text-xs">
              
              <div className="flex flex-col gap-1.5">
                <label className="font-extrabold text-slate-700">Loại giao dịch</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionForm({ ...transactionForm, type: "import" })}
                    className={`py-2 rounded-xl font-extrabold text-center cursor-pointer transition-all border ${
                      transactionForm.type === "import"
                        ? "bg-blue-50 text-blue-700 border-blue-400 shadow-2xs"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    Nhập kho
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionForm({ ...transactionForm, type: "export" })}
                    className={`py-2 rounded-xl font-extrabold text-center cursor-pointer transition-all border ${
                      transactionForm.type === "export"
                        ? "bg-amber-50 text-amber-700 border-amber-400 shadow-2xs"
                        : "bg-white text-slate-500 border-slate-200 hover:bg-slate-50"
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
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Ghi nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal C: Thêm Nhà cung cấp mới */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddSupplierModal(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Xác nhận
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal D: Thêm Danh mục mới */}
      {showAddCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddCategoryModal(false)}
              className="absolute right-4 top-4 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
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
                  className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl font-bold cursor-pointer"
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
