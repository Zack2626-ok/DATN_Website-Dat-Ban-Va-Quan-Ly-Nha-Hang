import React, { useState, useMemo, useEffect } from "react";
import { useAppDispatch, useAppSelector } from "../../../store/hooks";
import { setIngredientStockDirect } from "../../../store/inventorySlice";
import { syncMenuWithIngredients } from "../../../store/menuSlice";
import { getIngredientsApi, getInventoryTransactionsApi, createIngredientApi, updateInventoryQuantityApi, uploadInventoryExcelApi, getSuppliersApi, addSupplierApi, updateSupplierApi, deleteSupplierApi } from "../../../services/api";
import { toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
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
  FileSpreadsheet,
  X,
  Check,
  RefreshCw,
  Info,
  UploadCloud,
  FileText,
  Pencil
} from "lucide-react";

// Types for local interactive states
interface Category {
  id: string;
  name: string;
  code: string;
  description: string;
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
  const globalSearchQuery = useAppSelector((state) => state.ui.searchQuery);

  const [reduxIngredients, setReduxIngredients] = useState<any[]>([]);

  useEffect(() => {
    getIngredientsApi()
      .then((data) => setReduxIngredients(data))
      .catch((err) => console.error("Failed to load ingredients", err));
  }, []);

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

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showEditSupplierModal, setShowEditSupplierModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<any>(null);

  const [expiryBatches, setExpiryBatches] = useState<ExpiryBatch[]>([
    { id: "b1", ingredientName: "Trứng cá tầm", quantity: 150, unit: "g", batchNo: "LOT-TCT-0701", expiryDate: "2026-07-12" }, // 3 days left
    { id: "b2", ingredientName: "Thịt bò Mỹ", quantity: 5.0, unit: "kg", batchNo: "LOT-BOM-0705", expiryDate: "2026-07-10" }, // 1 day left
    { id: "b3", ingredientName: "Cá hồi", quantity: 6.0, unit: "kg", batchNo: "LOT-CAH-0708", expiryDate: "2026-07-16" }, // safe
    { id: "b4", ingredientName: "Tôm sú", quantity: 2.0, unit: "kg", batchNo: "LOT-TOM-0702", expiryDate: "2026-07-08" }, // Expired
    { id: "b5", ingredientName: "Nấm tươi", quantity: 100, unit: "g", batchNo: "LOT-NAM-0708", expiryDate: "2026-07-11" } // 2 days left
  ]);

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

  const [showImportExportModal, setShowImportExportModal] = useState(false);

  // Unified Import File Modal State
  const [showImportFileModal, setShowImportFileModal] = useState(false);
  const [importFileTarget, setImportFileTarget] = useState<"ingredients" | "categories" | "suppliers" | "transactions" | "stocktake" | "expiry">("ingredients");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFileError, setImportFileError] = useState<string | null>(null);

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
      await updateInventoryQuantityApi(
        ing.id,
        transactionForm.quantity,
        transactionForm.type,
        transactionForm.reasonOrSupplier
      );
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
        // Prefill actual quantities for stocktake values
        const updatedStocktake: { [id: string]: string } = {};
        reduxIngredients.forEach(ing => {
          // Add a small discrepancy for mock demo
          const randomDiscrepancy = Math.random() > 0.5 ? (Math.random() > 0.5 ? 1 : -1) * (ing.unit === "kg" ? 0.5 : 10) : 0;
          updatedStocktake[ing.id] = Math.max(0, ing.stock + randomDiscrepancy).toFixed(ing.unit === "kg" ? 1 : 0);
        });
        setStocktakeValues(updatedStocktake);
        toast.success(`Đã nhập dữ liệu thực tế kiểm kê từ file ${fileName}. Hãy nhấn Cân đối tồn kho để áp dụng.`);
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
  const handleApplyStocktake = async () => {
    let changed = false;

    for (const ing of reduxIngredients) {
      const val = stocktakeValues[ing.id];
      if (val !== undefined && val.trim() !== "") {
        const actualQty = Number(val);
        const discrepancy = actualQty - ing.stock;

        if (discrepancy !== 0) {
          try {
            await updateInventoryQuantityApi(
              ing.id,
              Math.abs(discrepancy),
              discrepancy > 0 ? "import" : "adjust",
              `Cân đối kiểm kê thực tế (${discrepancy > 0 ? "+" : ""}${discrepancy.toFixed(1)} ${ing.unit})`
            );
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

  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-6 animate-in fade-in duration-300 text-slate-800">

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
      </div>

      {/* 2. Top-level Alert Banners */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 print-hide">
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
      <div className="flex border-b border-slate-200 bg-slate-50/70 p-1 rounded-xl gap-1 print-hide">
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
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xs p-5 min-h-112.5">

        {/* Tab 1: Nguyên liệu */}
        {activeTab === "ingredients" && (
          <div className="flex flex-col gap-4">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-black text-slate-650 uppercase tracking-wider flex items-center gap-1.5">
                <Layers size={14} className="text-admin-primary" /> Thao tác dữ liệu nguyên liệu
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowAddIngModal(true)}
                  className="px-3 py-1.5 bg-linear-to-r from-blue-600 to-indigo-650 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  <Plus size={12} /> Nhập bằng tay
                </button>
                <button
                  onClick={() => {
                    setImportFileTarget("ingredients");
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
                    const headers = ["Mã số", "Tên nguyên liệu", "Danh mục", "Tồn kho", "Đơn vị", "Ngưỡng an toàn"];
                    const colX = [15, 30, 85, 120, 140, 155];
                    const rows = reduxIngredients.map(i => [
                      String(i.id),
                      i.name,
                      getIngredientCategory(i.name),
                      i.stock.toString(),
                      i.unit,
                      i.threshold.toString()
                    ]);
                    handleExportPdfShared("DANH SACH NGUYEN LIEU KHO HANG", headers, colX, rows, `Danh_Sach_Nguyen_Lieu_${Date.now()}`);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer hover:bg-slate-50 shadow-2xs"
                >
                  <FileText size={12} className="text-red-500" /> Xuất PDF
                </button>
                <button
                  onClick={() => {
                    const headers = ["Mã số", "Tên nguyên liệu", "Danh mục", "Tồn kho", "Đơn vị", "Ngưỡng an toàn"];
                    const rows = reduxIngredients.map(i => [
                      String(i.id),
                      i.name,
                      getIngredientCategory(i.name),
                      i.stock.toString(),
                      i.unit,
                      i.threshold.toString()
                    ]);
                    handleExportExcelShared("DANH SÁCH NGUYÊN LIỆU KHO HÀNG", headers, rows, `Danh_Sach_Nguyen_Lieu_${Date.now()}`);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer hover:bg-slate-50 shadow-2xs"
                >
                  <FileSpreadsheet size={12} className="text-emerald-600" /> Xuất Excel
                </button>
              </div>
            </div>
            {/* Search & Filters */}
            <div className="flex flex-col md:flex-row gap-3 items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200/60">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-2.5 text-slate-600" size={14} />
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
                <thead className="bg-slate-50 text-slate-700 text-[10px] font-black uppercase tracking-wider">
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
                      <td colSpan={5} className="px-5 py-12 text-center text-slate-600 italic">
                        Không tìm thấy nguyên liệu nào phù hợp với bộ lọc
                      </td>
                    </tr>
                  ) : (
                    filteredIngredients.map((ing) => {
                      const isLow = Number(ing.stock) <= Number(ing.threshold);
                      const percentage = Math.min(100, Math.max(0, (Number(ing.stock) / (Number(ing.threshold) * 3)) * 100));

                      return (
                        <tr key={ing.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4">
                            <span className="font-extrabold text-slate-900">{ing.name}</span>
                            <div className="text-[10px] text-slate-600 font-medium mt-0.5">Mã số: {ing.id}</div>
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
                        </div>
                        <div className="flex items-center gap-1">
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
                        {(s.mainIngredients || "").split(",").map((ing: string, index: number) => {
                          if (!ing.trim()) return null;
                          return (
                            <span key={index} className="text-[9px] font-black text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200/40">
                              {ing.trim()}
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

        {/* Tab 3: Nhập / Xuất kho & Lịch sử */}
        {activeTab === "import_export" && (
          <div className="flex flex-col gap-4">
            {/* Action Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-black text-slate-650 uppercase tracking-wider flex items-center gap-1.5">
                <History size={14} className="text-admin-primary" /> Thao tác Nhập / Xuất kho
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setImportExportMode("manual");
                    setFileError(null);
                    setSelectedFile(null);
                    setShowImportExportModal(true);
                  }}
                  className="px-3 py-1.5 bg-linear-to-r from-blue-600 to-indigo-650 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  <Plus size={12} /> Thực hiện Nhập/Xuất mới
                </button>
                <button
                  onClick={() => {
                    setImportFileTarget("transactions");
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
                    const headers = ["Thoi gian", "Loai", "Nguyen lieu", "So luong", "Don vi", "Chi tiet / NCC"];
                    const colX = [15, 50, 75, 110, 130, 145];
                    const rows = transactions.map(t => [
                      t.timestamp,
                      t.type === "import" ? "NHAP KHO" : t.type === "export" ? "XUAT KHO" : "DIEU CHINH",
                      t.ingredientName,
                      t.quantity.toString(),
                      t.unit,
                      t.reasonOrSupplier
                    ]);
                    handleExportPdfShared("LICH SU GIAO DICH NHAP XUAT KHO", headers, colX, rows, `Lich_Su_Nhap_Xuat_Kho_${Date.now()}`);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer hover:bg-slate-50 shadow-2xs"
                >
                  <FileText size={12} className="text-red-500" /> Xuất PDF
                </button>
                <button
                  onClick={() => {
                    const headers = ["Thời gian", "Loại", "Nguyên liệu", "Số lượng", "Đơn vị", "Chi tiết / Nhà cung cấp"];
                    const rows = transactions.map(t => [
                      t.timestamp,
                      t.type === "import" ? "NHẬP KHO" : t.type === "export" ? "XUẤT KHO" : "ĐIỀU CHỈNH",
                      t.ingredientName,
                      t.quantity.toString(),
                      t.unit,
                      t.reasonOrSupplier
                    ]);
                    handleExportExcelShared("LỊCH SỬ GIAO DỊCH NHẬP XUẤT KHO", headers, rows, `Lich_Su_Nhap_Xuat_Kho_${Date.now()}`);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer hover:bg-slate-50 shadow-2xs"
                >
                  <FileSpreadsheet size={12} className="text-emerald-600" /> Xuất Excel
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-700 uppercase tracking-wider">
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
                        <td className="px-5 py-3 text-slate-600 font-medium whitespace-nowrap">
                          {new Date(tx.timestamp).toLocaleString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
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
                        <td className="px-5 py-3 text-slate-700">{tx.reasonOrSupplier}</td>
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
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
              <div className="text-xs font-black text-slate-650 uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardCheck size={14} className="text-admin-primary" /> Thao tác Kiểm kê kho
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={handleApplyStocktake}
                  className="px-3 py-1.5 bg-linear-to-r from-emerald-500 to-green-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  <ClipboardCheck size={12} /> Áp dụng cân đối tồn kho
                </button>
                <button
                  onClick={() => {
                    setImportFileTarget("stocktake");
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
                    const headers = ["Ten nguyen lieu", "Ton he thong", "Thuc te kiem dem", "Don vi", "Chenh lech"];
                    const colX = [15, 60, 100, 135, 150];
                    const rows = reduxIngredients.map((ing) => {
                      const actualStr = stocktakeValues[ing.id];
                      const actualQty = actualStr !== undefined && actualStr.trim() !== "" ? Number(actualStr) : ing.stock;
                      const diff = actualQty - ing.stock;
                      const diffText = diff === 0 ? "Khop kho" : `${diff > 0 ? "+" : ""}${diff} ${ing.unit}`;
                      return [ing.name, ing.stock.toString(), actualQty.toString(), ing.unit, diffText];
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
                    const rows = reduxIngredients.map((ing) => {
                      const actualStr = stocktakeValues[ing.id];
                      const actualQty = actualStr !== undefined && actualStr.trim() !== "" ? Number(actualStr) : ing.stock;
                      const diff = actualQty - ing.stock;
                      const diffText = diff === 0 ? "Khớp kho" : `${diff > 0 ? "+" : ""}${diff} ${ing.unit}`;
                      return [ing.name, ing.stock.toString(), actualQty.toString(), ing.unit, diffText];
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

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-700 uppercase tracking-wider">
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
                        <td className="px-5 py-4 text-center font-bold text-slate-700">
                          {Number(ing.stock).toFixed(ing.unit === "kg" ? 1 : 0)} {ing.unit}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <div className="flex items-center justify-center gap-1 w-32 mx-auto">
                            <input
                              type="number"
                              step={ing.unit === "kg" ? "0.1" : "1"}
                              placeholder={Number(ing.stock).toFixed(0)}
                              value={stocktakeValues[ing.id] || ""}
                              onChange={(e) => setStocktakeValues({ ...stocktakeValues, [ing.id]: e.target.value })}
                              className="w-20 px-2 py-1 text-center font-black border border-slate-250 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                            <span className="text-[10px] font-extrabold text-slate-600">{ing.unit}</span>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-center">
                          {diff === 0 ? (
                            <span className="text-slate-600 font-bold">Khớp kho (0)</span>
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
                  className="px-3 py-1.5 bg-linear-to-r from-blue-600 to-indigo-650 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer shadow-sm hover:shadow"
                >
                  <Plus size={12} /> Thêm lô hàng mới
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
                <button
                  onClick={() => {
                    const headers = ["So lo (Batch No)", "Ten nguyen lieu", "So luong", "Don vi", "Ngay het han", "Tinh trang"];
                    const colX = [15, 60, 105, 125, 140, 170];
                    const rows = expiryBatches.map((b) => [
                      b.batchNo,
                      b.ingredientName,
                      b.quantity.toString(),
                      b.unit,
                      b.expiryDate,
                      getExpiryLabel(b.expiryDate).text
                    ]);
                    handleExportPdfShared("DANH SACH LO HANG - THEO DOI HAN SU DUNG", headers, colX, rows, `Theo_Doi_Han_Su_Dung_${Date.now()}`);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer hover:bg-slate-50 shadow-2xs"
                >
                  <FileText size={12} className="text-red-500" /> Xuất PDF
                </button>
                <button
                  onClick={() => {
                    const headers = ["Số lô (Batch No)", "Tên nguyên liệu", "Số lượng", "Đơn vị", "Ngày hết hạn", "Tình trạng hạn"];
                    const rows = expiryBatches.map((b) => [
                      b.batchNo,
                      b.ingredientName,
                      b.quantity.toString(),
                      b.unit,
                      b.expiryDate,
                      getExpiryLabel(b.expiryDate).text
                    ]);
                    handleExportExcelShared("DANH SÁCH LÔ HÀNG - THEO DÕI HẠN SỬ DỤNG", headers, rows, `Theo_Doi_Han_Su_Dung_${Date.now()}`);
                  }}
                  className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all cursor-pointer hover:bg-slate-50 shadow-2xs"
                >
                  <FileSpreadsheet size={12} className="text-emerald-600" /> Xuất Excel
                </button>
              </div>
            </div>

            <div className="pb-2 border-b border-slate-100">
              <span className="text-xs font-black uppercase text-slate-600 tracking-wider">Danh sách Lô hàng & Theo dõi Hạn sử dụng</span>
              <p className="text-[10px] text-slate-600 font-semibold mt-1">Cảnh báo nguyên liệu đã hết hạn hoặc sắp hết hạn cần ưu tiên tiêu thụ.</p>
            </div>

            <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-700 uppercase tracking-wider">
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
          )
        }

      </div >

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

    </div >
  );
};
