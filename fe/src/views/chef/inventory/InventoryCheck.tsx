import React, { useState, useEffect } from "react";
import { Search, ArrowLeft, Save, UploadCloud, ClipboardCheck } from "lucide-react";
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
}

export const InventoryCheck: React.FC<InventoryCheckProps> = ({ onBack, draftData }) => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const [checkItems, setCheckItems] = useState<CheckItem[]>([]);
  const [ticketName, setTicketName] = useState(draftData?.ticketName || `KK-${Date.now().toString().slice(-6)}`);
  const [note, setNote] = useState(draftData?.note || "");

  useEffect(() => {
    getIngredientsApi().then(data => {
      if (draftData && draftData.items) {
        setCheckItems(draftData.items);
      } else {
        // By default, load all ingredients into the check sheet
        const allItems = data.map((ing: any) => ({
          ingredientId: ing.id,
          ingredientName: ing.name,
          code: `SP${ing.id.toString().padStart(6, '0')}`,
          unit: ing.unit,
          systemStock: ing.stock,
          actualStock: ing.stock // default to system stock
        }));
        setCheckItems(allItems);
      }
    }).catch(console.error);
  }, [draftData]);

  const handleUpdateItem = (index: number, actualStock: number) => {
    const updated = [...checkItems];
    updated[index].actualStock = actualStock;
    setCheckItems(updated);
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

        // Tìm dòng header (chứa "Tên nguyên liệu" hoặc "Mã NL" hoặc "Mã nguyên liệu")
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

        if (actualIdx === -1) {
          toast.error("File Excel thiếu cột 'Thực tế kiểm đếm'! Vui lòng dùng file mẫu từ hệ thống.");
          return;
        }

        let updatedCount = 0;
        let errors: string[] = [];

        const newItems = [...checkItems];

        for (let i = headerRowIndex + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const nameVal = nameIdx !== -1 ? String(row[nameIdx] || "").trim() : "";
          const codeVal = codeIdx !== -1 ? String(row[codeIdx] || "").trim() : "";
          const rawActual = row[actualIdx];

          if (!nameVal && !codeVal) continue; // Dòng trống

          if (rawActual === undefined || rawActual === null || String(rawActual).trim() === "") {
            // Chưa điền thực tế ở dòng này
            continue;
          }

          const parsedActual = parseFloat(String(rawActual).replace(",", "."));
          if (isNaN(parsedActual) || parsedActual < 0) {
            errors.push(`Dòng ${i + 1} (${nameVal || codeVal}): Số lượng thực tế '${rawActual}' không hợp lệ.`);
            continue;
          }

          // Khớp mặt hàng trong danh sách checkItems
          const matchIdx = newItems.findIndex(item => {
            if (codeVal && item.code.toLowerCase() === codeVal.toLowerCase()) return true;
            if (codeVal && item.ingredientId.toString() === codeVal.replace(/\D/g, "")) return true;
            if (nameVal && item.ingredientName.toLowerCase() === nameVal.toLowerCase()) return true;
            return false;
          });

          if (matchIdx !== -1) {
            newItems[matchIdx].actualStock = parsedActual;
            updatedCount++;
          }
        }

        if (errors.length > 0) {
          toast.error(errors.slice(0, 3).join("\n"), { duration: 5000 });
        }

        if (updatedCount > 0) {
          setCheckItems(newItems);
          toast.success(`Đã đồng bộ số liệu từ Excel cho ${updatedCount} nguyên liệu!`);
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
    const draft = {
      id: draftData?.id || Date.now().toString(),
      ticketName,
      note,
      status: "draft",
      date: new Date().toISOString(),
      items: checkItems
    };
    
    // Save to localStorage for demo
    const existingDrafts = JSON.parse(localStorage.getItem("inventory_drafts") || "[]");
    const updatedDrafts = draftData 
      ? existingDrafts.map((d: any) => d.id === draft.id ? draft : d)
      : [...existingDrafts, draft];
      
    localStorage.setItem("inventory_drafts", JSON.stringify(updatedDrafts));
    toast.success("Lưu phiếu kiểm kê tạm (Đang kiểm) thành công!");
    onBack();
  };

  const filteredItems = checkItems.filter(item => 
    item.ingredientName.toLowerCase().includes(searchTerm.toLowerCase()) || 
    item.code.includes(searchTerm)
  );
  const isCompleted = draftData?.status === "completed";

  return (
    <>
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 text-slate-800 print:hidden">
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
            <div className="relative w-full mb-4">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Tìm kiếm mặt hàng cần kiểm kê..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm"
              />
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Hàng hoá</th>
                    <th className="px-4 py-3 text-center">Tồn hệ thống</th>
                    <th className="px-4 py-3 text-center">Thực tế kiểm đếm</th>
                    <th className="px-4 py-3 text-center">Chênh lệch</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.map((item, idx) => {
                    const diff = item.actualStock - item.systemStock;
                    return (
                      <tr key={item.ingredientId} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-4 font-medium">{idx + 1}</td>
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-800">{item.ingredientName}</div>
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
                                value={item.actualStock} 
                                onChange={(e) => handleUpdateItem(checkItems.findIndex(i => i.ingredientId === item.ingredientId), Number(e.target.value))}
                                className="w-24 p-2 border rounded-lg text-center font-black text-admin-primary focus:border-blue-500 outline-none shadow-inner" 
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
                              Thừa +{diff}
                            </span>
                          ) : (
                            <span className="text-rose-600 font-extrabold bg-rose-50 px-2 py-1 rounded border border-rose-200">
                              Hụt {diff}
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
        </div>

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
          {filteredItems.map((item, idx) => {
            const diff = Number(item.actualStock) - Number(item.systemStock);
            return (
              <tr key={item.ingredientId}>
                <td className="border border-black p-1.5 text-center">{idx + 1}</td>
                <td className="border border-black p-1.5 text-center">{item.code}</td>
                <td className="border border-black p-1.5">{item.ingredientName}</td>
                <td className="border border-black p-1.5 text-right">{item.systemStock}</td>
                <td className="border border-black p-1.5 text-right font-bold">{item.actualStock}</td>
                <td className="border border-black p-1.5 text-right">{diff}</td>
              </tr>
            )
          })}
        </tbody>
      </table>

      <div className="text-right font-bold mb-8">
        <p>Tổng số lượng: <span className="text-base">{filteredItems.reduce((acc, item) => acc + Number(item.actualStock), 0)}</span></p>
      </div>

      <div className="">
        <span className="font-bold">Ghi chú:</span> {note}
      </div>
    </div>
    </>
  );
};
