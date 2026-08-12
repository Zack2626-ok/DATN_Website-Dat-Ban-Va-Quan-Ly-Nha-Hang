import React, { useState, useEffect, useRef } from "react";
import { Search, ArrowLeft, Save, UploadCloud, ClipboardCheck, Zap, Trash2, CheckSquare, X, PackageSearch } from "lucide-react";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";
import { getIngredientsApi } from "../../../services/api";

interface InventoryCheckProps {
  onBack: () => void;
  draftData?: any; // To load an existing draft
}

interface CheckItem {
  ingredientId: string;
  ingredientName: string;
  code: string;
  unit: string;
  systemStock: number;
  actualStock: number;
  category?: string;
}

export const InventoryCheck: React.FC<InventoryCheckProps> = ({ onBack, draftData }) => {
  const [allIngredients, setAllIngredients] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [ticketName, setTicketName] = useState(draftData?.ticketName || `KK-${Date.now().toString().slice(-6)}`);
  const [note, setNote] = useState(draftData?.note || "");

  // Quick Select Modal State
  const [showQuickSelectModal, setShowQuickSelectModal] = useState(false);
  const [modalCategory, setModalCategory] = useState("all");
  const [modalSearch, setModalSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    getIngredientsApi().then(data => {
      setAllIngredients(data);
      if (draftData && draftData.items) {
        setCheckItems(draftData.items);
      } else {
        // Start EMPTY when creating a new audit sheet
        setCheckItems([]);
      }
    }).catch(console.error);
  }, [draftData]);

  // Click outside search dropdown listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // When opening Quick Select Modal, sync selectedIds with current checkItems
  const handleOpenQuickSelect = () => {
    const existing = new Set(checkItems.map(i => String(i.ingredientId)));
    setSelectedIds(existing);
    setModalSearch("");
    setModalCategory("all");
    setShowQuickSelectModal(true);
  };

  const handleToggleSelectId = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleSelectAllInModal = (filteredList: any[]) => {
    const next = new Set(selectedIds);
    filteredList.forEach(ing => next.add(String(ing.id)));
    setSelectedIds(next);
  };

  const handleDeselectAllInModal = () => {
    setSelectedIds(new Set());
  };

  const handleConfirmQuickSelect = () => {
    const newItems: CheckItem[] = [];
    allIngredients.forEach(ing => {
      const ingIdStr = String(ing.id);
      if (selectedIds.has(ingIdStr)) {
        const existingItem = checkItems.find(i => String(i.ingredientId) === ingIdStr);
        newItems.push({
          ingredientId: ing.id,
          ingredientName: ing.name,
          code: `SP${ing.id.toString().padStart(6, '0')}`,
          unit: ing.unit,
          systemStock: ing.stock,
          actualStock: existingItem ? existingItem.actualStock : ing.stock,
          category: ing.category
        });
      }
    });
    setCheckItems(newItems);
    setShowQuickSelectModal(false);
    toast.success(`Đã cập nhật ${newItems.length} mặt hàng vào phiếu kiểm kê!`);
  };

  const handleAddSingleItem = (ing: any) => {
    const ingIdStr = String(ing.id);
    if (checkItems.some(i => String(i.ingredientId) === ingIdStr)) {
      toast.error(`Mặt hàng "${ing.name}" đã có trong danh sách!`);
      return;
    }
    setCheckItems(prev => [
      ...prev,
      {
        ingredientId: ing.id,
        ingredientName: ing.name,
        code: `SP${ing.id.toString().padStart(6, '0')}`,
        unit: ing.unit,
        systemStock: ing.stock,
        actualStock: ing.stock,
        category: ing.category
      }
    ]);
    setSearchTerm("");
    setShowSearchDropdown(false);
  };

  const handleRemoveItem = (ingredientId: string | number) => {
    setCheckItems(prev => prev.filter(i => String(i.ingredientId) !== String(ingredientId)));
  };

  const handleUpdateItem = (index: number, actualStock: number) => {
    const updated = [...checkItems];
    updated[index].actualStock = isNaN(actualStock) ? 0 : actualStock;
    setCheckItems(updated);
  };

  // Unit conversion helper for Excel upload
  const convertUnit = (val: number, inputUnit: string, systemUnit: string): { converted: number; warning?: string } => {
    const inU = (inputUnit || "").trim().toLowerCase();
    const sysU = (systemUnit || "").trim().toLowerCase();

    if (!inU || inU === sysU) return { converted: val };

    const isSysKg = sysU === "kg" || sysU === "kilogram" || sysU === "kilo";
    const isSysG = sysU === "g" || sysU === "gram" || sysU === "gr";
    const isInG = inU === "g" || inU === "gram" || inU === "gr";
    const isInKg = inU === "kg" || inU === "kilogram" || inU === "kilo";

    if (isSysKg && isInG) return { converted: val / 1000 };
    if (isSysG && isInKg) return { converted: val * 1000 };
    if (isSysKg && inU === "yến") return { converted: val * 10 };
    if (isSysKg && inU === "tạ") return { converted: val * 100 };
    if (isSysKg && inU === "tấn") return { converted: val * 1000 };

    const isSysLit = sysU === "lit" || sysU === "l" || sysU === "lít";
    const isSysMl = sysU === "ml" || sysU === "millilit" || sysU === "milit";
    const isInMl = inU === "ml" || inU === "millilit" || inU === "milit";
    const isInLit = inU === "lit" || inU === "l" || inU === "lít";

    if (isSysLit && isInMl) return { converted: val / 1000 };
    if (isSysMl && isInLit) return { converted: val * 1000 };

    return { converted: val, warning: `Đơn vị '${inputUnit}' khác đơn vị hệ thống '${systemUnit}'` };
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const rows: any[] = XLSX.utils.sheet_to_json(ws, { header: 1 });

        if (!rows || rows.length === 0) {
          toast.error("File Excel trống hoặc không đúng định dạng!");
          return;
        }

        let headerRowIndex = -1;
        for (let i = 0; i < Math.min(10, rows.length); i++) {
          const rowStr = (rows[i] || []).join(" ").toLowerCase();
          if (rowStr.includes("tên nguyên liệu") || rowStr.includes("mã nl") || rowStr.includes("nguyên liệu")) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          toast.error("Không tìm thấy cột tiêu đề 'Tên nguyên liệu' hoặc 'Mã NL' trong file Excel!");
          return;
        }

        const headers = rows[headerRowIndex].map((h: any) => String(h || "").trim().toLowerCase());
        const nameIdx = headers.findIndex((h: string) => h.includes("tên nguyên liệu") || h.includes("hàng hóa") || h.includes("nguyên liệu"));
        const codeIdx = headers.findIndex((h: string) => h.includes("mã nl") || h.includes("mã nguyên liệu") || h.includes("mã"));
        const actualIdx = headers.findIndex((h: string) => h.includes("thực tế") || h.includes("thực tế kiểm đếm") || h.includes("thực tế kiểm"));
        const unitIdx = headers.findIndex((h: string) => h.includes("đơn vị") || h.includes("dvt") || h.includes("unit"));

        if (actualIdx === -1) {
          toast.error("File Excel thiếu cột 'Thực tế kiểm đếm'! Vui lòng dùng file mẫu từ hệ thống.");
          return;
        }

        let updatedCount = 0;
        let errors: string[] = [];

        const newItemsMap = new Map<string, CheckItem>();
        checkItems.forEach(item => newItemsMap.set(String(item.ingredientId), { ...item }));

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const nameVal = nameIdx !== -1 ? String(row[nameIdx] || "").trim() : "";
          const codeVal = codeIdx !== -1 ? String(row[codeIdx] || "").trim() : "";
          const unitVal = unitIdx !== -1 ? String(row[unitIdx] || "").trim() : "";
          const rawActual = row[actualIdx];

          if (!nameVal && !codeVal) continue;

          if (rawActual === undefined || rawActual === null || String(rawActual).trim() === "") {
            continue;
          }

          const parsedActual = parseFloat(String(rawActual).replace(",", "."));
          if (isNaN(parsedActual) || parsedActual < 0) {
            errors.push(`Dòng ${i + 1} (${nameVal || codeVal}): Số lượng thực tế '${rawActual}' không hợp lệ.`);
            continue;
          }

          const matchIng = allIngredients.find(ing => {
            const ingCode = `SP${ing.id.toString().padStart(6, '0')}`;
            if (codeVal && (ingCode.toLowerCase() === codeVal.toLowerCase() || String(ing.id) === codeVal.replace(/\D/g, ""))) return true;
            if (nameVal && ing.name.toLowerCase() === nameVal.toLowerCase()) return true;
            return false;
          });

          if (matchIng) {
            const ingIdStr = String(matchIng.id);
            const { converted, warning } = convertUnit(parsedActual, unitVal, matchIng.unit);
            if (warning) {
              errors.push(`Dòng ${i + 1} (${matchIng.name}): ${warning}`);
            }

            newItemsMap.set(ingIdStr, {
              ingredientId: matchIng.id,
              ingredientName: matchIng.name,
              code: `SP${matchIng.id.toString().padStart(6, '0')}`,
              unit: matchIng.unit,
              systemStock: matchIng.stock,
              actualStock: Number(converted.toFixed(3)),
              category: matchIng.category
            });
            updatedCount++;
          }
        }

        if (errors.length > 0) {
          toast.error(errors.slice(0, 3).join("\n"), { duration: 5000 });
        }

        if (updatedCount > 0) {
          setCheckItems(Array.from(newItemsMap.values()));
          toast.success(`Đã tự động nạp ${updatedCount} mặt hàng từ file Excel!`);
        } else if (errors.length === 0) {
          toast.error("Không tìm thấy nguyên liệu trùng khớp hoặc cột Thực tế đang trống!");
        }
      } catch (err: any) {
        console.error("Lỗi đọc file Excel:", err);
        toast.error("Lỗi đọc file Excel: " + (err?.message || "File không đúng định dạng"));
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleSaveDraft = () => {
    if (checkItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất 1 mặt hàng trước khi lưu phiếu kiểm kê!");
      return;
    }

    const draft = {
      id: draftData?.id || Date.now().toString(),
      ticketName,
      note,
      status: "draft",
      date: new Date().toISOString(),
      items: checkItems
    };
    
    const existingDrafts = JSON.parse(localStorage.getItem("inventory_drafts") || "[]");
    const updatedDrafts = draftData 
      ? existingDrafts.map((d: any) => d.id === draft.id ? draft : d)
      : [...existingDrafts, draft];
      
    localStorage.setItem("inventory_drafts", JSON.stringify(updatedDrafts));
    toast.success("Lưu phiếu kiểm kê tạm (Đang kiểm) thành công!");
    onBack();
  };

  // Search dropdown results
  const searchResults = searchTerm.trim() 
    ? allIngredients.filter(ing => 
        ing.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        `SP${ing.id.toString().padStart(6, '0')}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  const isCompleted = draftData?.status === "completed";

  // Categories list for Quick Select Modal
  const categories = Array.from(new Set(allIngredients.map(i => i.category || "Khác").filter(Boolean)));

  // Filtered ingredients inside Quick Select Modal
  const modalIngredients = allIngredients.filter(ing => {
    const matchCat = modalCategory === "all" || ing.category === modalCategory;
    const matchKw = !modalSearch.trim() || 
      ing.name.toLowerCase().includes(modalSearch.toLowerCase()) || 
      `SP${ing.id.toString().padStart(6, '0')}`.toLowerCase().includes(modalSearch.toLowerCase());
    return matchCat && matchKw;
  });

  return (
    <>
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 text-slate-800 print:hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Phiếu Kiểm kê Kho</h2>
            <p className="text-xs text-slate-600 font-medium">{isCompleted ? "Xem lại lịch sử phiếu kiểm kê" : "Kiểm đếm và cân đối tồn kho thực tế"}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {isCompleted ? (
            <button onClick={() => window.print()} className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 text-sm flex items-center gap-2 cursor-pointer shadow-sm">
              <ClipboardCheck size={16} /> In phiếu
            </button>
          ) : (
            <>
              <input
                type="file"
                id="excel-check-input"
                accept=".xlsx, .xls"
                className="hidden"
                onChange={handleExcelUpload}
              />
              <button 
                onClick={() => document.getElementById("excel-check-input")?.click()}
                className="px-4 py-2 bg-white border border-blue-600 text-blue-600 font-bold rounded-lg hover:bg-blue-50 text-sm flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <UploadCloud size={16} /> Nhập từ Excel
              </button>
              <button onClick={handleSaveDraft} className="px-4 py-2 bg-amber-500 text-white font-bold rounded-lg hover:bg-amber-600 text-sm flex items-center gap-2 cursor-pointer shadow-sm">
                <Save size={16} /> Lưu (Đang kiểm)
              </button>
            </>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 min-h-[400px]">
            
            {/* Top Toolbar: Search Bar + Quick Select Button */}
            {!isCompleted && (
              <div className="flex flex-col sm:flex-row gap-3 mb-4 items-stretch sm:items-center">
                <div ref={searchRef} className="relative flex-1">
                  <Search className="absolute left-3 top-3 text-slate-400" size={16} />
                  <input 
                    type="text" 
                    placeholder="Tìm kiếm mặt hàng theo tên hoặc mã để thêm vào kiểm kê..." 
                    value={searchTerm}
                    onFocus={() => setShowSearchDropdown(true)}
                    onChange={e => {
                      setSearchTerm(e.target.value);
                      setShowSearchDropdown(true);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm shadow-xs"
                  />

                  {/* Dropdown search results */}
                  {showSearchDropdown && searchResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 max-h-64 overflow-y-auto divide-y divide-slate-100">
                      {searchResults.map(ing => {
                        const isAdded = checkItems.some(i => String(i.ingredientId) === String(ing.id));
                        return (
                          <div
                            key={ing.id}
                            onClick={() => handleAddSingleItem(ing)}
                            className={`p-3 flex items-center justify-between hover:bg-blue-50 transition-colors cursor-pointer ${isAdded ? 'opacity-50 bg-slate-50' : ''}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-400">SP{ing.id.toString().padStart(6, '0')}</span>
                              <span className="font-bold text-slate-800 text-sm">{ing.name}</span>
                              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{ing.category || "Hàng hóa"}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-semibold text-slate-600">Tồn: <strong>{ing.stock} {ing.unit}</strong></span>
                              {isAdded ? (
                                <span className="text-[10px] font-bold text-slate-400 bg-slate-200 px-2 py-0.5 rounded">Đã chọn</span>
                              ) : (
                                <span className="text-xs font-bold text-blue-600 flex items-center gap-1">+ Thêm</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {showSearchDropdown && searchTerm.trim() !== "" && searchResults.length === 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-30 p-4 text-center text-slate-500 text-xs font-semibold">
                      Không tìm thấy mặt hàng nào phù hợp với từ khóa "{searchTerm}"
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleOpenQuickSelect}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer active:scale-95 shrink-0"
                >
                  <Zap size={16} /> ⚡ Chọn nhanh mặt hàng
                </button>
              </div>
            )}
            
            {/* Main Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3 w-10 text-center">#</th>
                    <th className="px-4 py-3">Hàng hoá</th>
                    <th className="px-4 py-3 text-center">Tồn hệ thống</th>
                    <th className="px-4 py-3 text-center">Thực tế kiểm đếm</th>
                    <th className="px-4 py-3 text-center">Chênh lệch</th>
                    {!isCompleted && <th className="px-4 py-3 text-center w-12">Thao tác</th>}
                  </tr>
                </thead>
                <tbody>
                  {checkItems.length === 0 ? (
                    <tr>
                      <td colSpan={isCompleted ? 5 : 6} className="text-center py-16 text-slate-400">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <PackageSearch size={44} className="text-slate-300 stroke-[1.5]" />
                          <p className="font-bold text-slate-600 text-base">Chưa có mặt hàng nào trong phiếu kiểm kê</p>
                          <p className="text-xs text-slate-400 max-w-md">Vui lòng tìm kiếm mặt hàng ở ô phía trên hoặc bấm <strong>"Chọn nhanh mặt hàng"</strong> để thêm nguyên liệu cần kiểm đếm.</p>
                          {!isCompleted && (
                            <button
                              type="button"
                              onClick={handleOpenQuickSelect}
                              className="mt-3 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer"
                            >
                              <Zap size={16} /> ⚡ Chọn nhanh tất cả mặt hàng
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    checkItems.map((item, idx) => {
                      const rawDiff = item.actualStock - item.systemStock;
                      const diff = Number(rawDiff.toFixed(3));
                      const absDiff = Math.abs(diff);

                      return (
                        <tr key={item.ingredientId} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-4 font-medium text-center text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-4">
                            <div className="font-bold text-slate-800">{item.ingredientName}</div>
                            <div className="text-[10px] font-mono text-slate-400">{item.code}</div>
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-600">
                            {item.systemStock} {item.unit}
                          </td>
                          <td className="px-4 py-3 flex justify-center">
                            <div className="flex items-center gap-2">
                              {isCompleted ? (
                                <div className="w-24 p-2 text-center font-black text-admin-primary">
                                  {item.actualStock}
                                </div>
                              ) : (
                                <input 
                                  type="number" 
                                  step="any"
                                  value={item.actualStock === 0 ? "" : item.actualStock} 
                                  placeholder="0"
                                  onFocus={(e) => e.target.select()}
                                  onChange={(e) => {
                                    const valStr = e.target.value;
                                    const valNum = valStr === "" ? 0 : parseFloat(valStr);
                                    handleUpdateItem(idx, valNum);
                                  }}
                                  className="w-24 p-2 border border-slate-300 rounded-xl text-center font-black text-blue-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none shadow-2xs" 
                                />
                              )}
                              <span className="text-xs font-bold text-slate-500">{item.unit}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {diff === 0 ? (
                              <span className="text-slate-500 font-bold">Khớp</span>
                            ) : diff > 0 ? (
                              <span className="text-emerald-600 font-extrabold bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
                                Thừa +{absDiff} {item.unit}
                              </span>
                            ) : (
                              <span className="text-rose-600 font-extrabold bg-rose-50 px-2 py-1 rounded border border-rose-200">
                                Hụt {absDiff} {item.unit}
                              </span>
                            )}
                          </td>
                          {!isCompleted && (
                            <td className="px-4 py-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(item.ingredientId)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Xóa khỏi phiếu"
                              >
                                <Trash2 size={16} />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Info Sidebar */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5 sticky top-4">
            <h3 className="font-black text-slate-800 mb-4 border-b pb-2">Thông tin phiếu kiểm</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Mã phiếu</label>
                <input 
                  type="text" 
                  value={ticketName}
                  onChange={(e) => setTicketName(e.target.value)}
                  readOnly={isCompleted}
                  className={`w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-bold ${isCompleted ? 'bg-slate-100 text-slate-600' : 'bg-slate-50'}`}
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Người lập</label>
                <input 
                  type="text" 
                  defaultValue="Bếp Trưởng (Mặc định)"
                  readOnly
                  className="w-full p-2 border border-slate-200 rounded outline-none text-sm font-semibold bg-slate-100 text-slate-500" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Số mặt hàng đã chọn</label>
                <div className="p-2 bg-slate-50 border border-slate-200 rounded text-sm font-extrabold text-blue-600">
                  {checkItems.length} mặt hàng
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Ghi chú</label>
                <textarea 
                  rows={4} 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  readOnly={isCompleted}
                  className={`w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm ${isCompleted ? 'bg-slate-100 text-slate-600' : ''}`}
                  placeholder="Kiểm kê định kỳ tháng..."
                ></textarea>
              </div>

              {!isCompleted && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="text-[10px] font-black text-blue-800 uppercase mb-1">Hướng dẫn</h4>
                  <ul className="text-[11px] text-blue-700 font-medium list-disc pl-4 space-y-1">
                    <li><strong>Lưu (Đang kiểm):</strong> Lưu nháp tiến độ kiểm kê, kho chưa bị ảnh hưởng.</li>
                    <li><strong>Cân bằng kho:</strong> Chốt số liệu. Hệ thống sẽ cộng/trừ vào tồn kho thực tế lập tức.</li>
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* MODAL CHỌN NHANH HÀNG LOẠT NGUYÊN LIỆU */}
    {showQuickSelectModal && (
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
          
          {/* Modal Header */}
          <div className="p-5 border-b border-slate-200 flex justify-between items-center bg-slate-50/80">
            <div>
              <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                <Zap size={20} className="text-blue-600" /> Chọn nhanh mặt hàng kiểm kê
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-0.5">Tích chọn các nguyên liệu hoặc nhấp chọn tất cả để đưa vào danh sách kiểm kê</p>
            </div>
            <button
              onClick={() => setShowQuickSelectModal(false)}
              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* Modal Toolbar: Search & Category Tabs */}
          <div className="p-4 border-b border-slate-100 flex flex-col gap-3 bg-white">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="Tìm kiếm nguyên liệu trong popup..."
                  value={modalSearch}
                  onChange={(e) => setModalSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="button"
                onClick={() => handleSelectAllInModal(modalIngredients)}
                className="px-3 py-2 bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Chọn tất cả ({modalIngredients.length})
              </button>
              <button
                type="button"
                onClick={handleDeselectAllInModal}
                className="px-3 py-2 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                type="button"
                onClick={() => setModalCategory("all")}
                className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${modalCategory === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              >
                Tất cả ({allIngredients.length})
              </button>
              {categories.map(cat => {
                const count = allIngredients.filter(i => i.category === cat).length;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setModalCategory(cat)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-all shrink-0 cursor-pointer ${modalCategory === cat ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
                  >
                    {cat} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* Modal Content Grid */}
          <div className="p-4 overflow-y-auto max-h-[50vh] divide-y divide-slate-100">
            {modalIngredients.length === 0 ? (
              <div className="py-12 text-center text-slate-400 font-semibold text-xs">
                Không tìm thấy nguyên liệu nào phù hợp với bộ lọc
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {modalIngredients.map(ing => {
                  const ingIdStr = String(ing.id);
                  const isChecked = selectedIds.has(ingIdStr);
                  const code = `SP${ing.id.toString().padStart(6, '0')}`;

                  return (
                    <div
                      key={ing.id}
                      onClick={() => handleToggleSelectId(ingIdStr)}
                      className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                        isChecked 
                          ? "bg-blue-50/80 border-blue-400 shadow-2xs" 
                          : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${isChecked ? 'bg-blue-600 text-white' : 'border border-slate-300 bg-white'}`}>
                          {isChecked && <CheckSquare size={14} />}
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-xs">{ing.name}</div>
                          <div className="text-[10px] font-mono text-slate-400">{code} • {ing.category || "Hàng hóa"}</div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-xs font-black text-slate-700">{ing.stock} {ing.unit}</div>
                        <div className="text-[9px] text-slate-400 font-semibold">Tồn hệ thống</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="text-xs font-bold text-slate-600">
              Đã chọn: <span className="text-blue-600 font-black">{selectedIds.size}</span> / {allIngredients.length} mặt hàng
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowQuickSelectModal(false)}
                className="px-4 py-2 border border-slate-300 text-slate-600 font-bold rounded-xl text-xs hover:bg-slate-100 transition-all cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmQuickSelect}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold rounded-xl text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
              >
                Xác nhận ({selectedIds.size} mặt hàng)
              </button>
            </div>
          </div>

        </div>
      </div>
    )}

    {/* GIAO DIỆN IN */}
    <div className="hidden print:block bg-white text-black p-0 font-sans w-full max-w-[210mm] mx-auto text-[13px]">
      <div className="flex justify-between items-start mb-2 border-b-2 border-black pb-2">
        <div>
          <h1 className="text-lg font-black uppercase">NHÀ HÀNG DATN</h1>
          <p>Chi nhánh: Cơ sở 1</p>
          <p>Điện thoại: 0386636706</p>
        </div>
        <div className="text-right">
          <p className="text-slate-500 italic">Phần mềm quản lý bán hàng SUNO.vn</p>
        </div>
      </div>

      <div className="text-center mb-6 mt-4">
        <h2 className="text-2xl font-black uppercase tracking-wider">PHIẾU KIỂM KÊ</h2>
        <p className="font-bold">{ticketName}</p>
      </div>

      <div className="flex justify-between mb-2">
        <div>
          <p><span className="font-bold">Ngày tạo:</span> {draftData?.date ? new Date(draftData.date).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN")}</p>
          <p><span className="font-bold">Người lập:</span> Quản lý kho</p>
        </div>
        <div>
          <p><span className="font-bold">Ngày duyệt:</span> {isCompleted ? (draftData?.date ? new Date(draftData.date).toLocaleString("vi-VN") : new Date().toLocaleString("vi-VN")) : ""}</p>
          <p><span className="font-bold">Người duyệt:</span> {isCompleted ? "Bếp Trưởng" : ""}</p>
        </div>
      </div>

      <table className="w-full border-collapse border-2 border-black mb-2">
        <thead>
          <tr>
            <th className="border border-black p-1.5 font-bold w-12 text-center">STT</th>
            <th className="border border-black p-1.5 font-bold w-24 text-center">Mã hàng</th>
            <th className="border border-black p-1.5 font-bold text-left">Hàng hóa</th>
            <th className="border border-black p-1.5 font-bold w-16 text-center leading-tight">SL<br/>sổ</th>
            <th className="border border-black p-1.5 font-bold w-16 text-center leading-tight">SL<br/>thực</th>
            <th className="border border-black p-1.5 font-bold w-20 text-center leading-tight">Chênh<br/>lệch</th>
          </tr>
        </thead>
        <tbody>
          {checkItems.map((item, idx) => {
            const diff = Number((Number(item.actualStock) - Number(item.systemStock)).toFixed(3));
            return (
              <tr key={item.ingredientId}>
                <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                <td className="border border-black p-1.5 text-center">{item.code}</td>
                <td className="border border-black p-1.5">{item.ingredientName}</td>
                <td className="border border-black p-1.5 text-right">{item.systemStock}</td>
                <td className="border border-black p-1.5 text-right font-bold">{item.actualStock}</td>
                <td className="border border-black p-1.5 text-right">{diff > 0 ? `+${diff}` : diff}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="text-right font-bold mb-8">
        <p>Tổng số lượng: <span className="text-base">{checkItems.reduce((acc, item) => acc + Number(item.actualStock), 0)}</span></p>
      </div>

      <div className="">
        <span className="font-bold">Ghi chú:</span> {note}
      </div>
    </div>
    </>
  );
};
