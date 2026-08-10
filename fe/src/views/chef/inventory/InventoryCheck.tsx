import React, { useState, useEffect, useRef } from "react";
import { Search, ArrowLeft, Save, UploadCloud, ClipboardCheck, FileSpreadsheet } from "lucide-react";
import toast from "react-hot-toast";
import { getIngredientsApi } from "../../../services/api";
import * as XLSX from "xlsx";

const normalizeUnit = (unitStr: string): string => {
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

const parseExcelNumber = (val: any): number => {
  if (val === undefined || val === null) return 0;
  if (typeof val === "number") return val;
  const str = String(val).replace(/[^0-9.,-]/g, "").replace(",", ".");
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
};

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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

  // const handleBalance = async () => {
  //   if (!window.confirm("Cân bằng kho sẽ ghi đè tồn kho hệ thống bằng số lượng kiểm đếm thực tế. Bạn có chắc chắn?")) {
  //     return;
  //   }
  // 
  //   try {
  //     // Gửi toàn bộ danh sách kiểm kê lên API stock-check
  //     // API này chỉ ghi vào stock_inventory + cập nhật current_stock
  //     // KHÔNG tạo stock_in → không xuất hiện ở tab Nhập hàng
  //     const records = checkItems.map(item => ({
  //       ingredient_id: Number(item.ingredientId),
  //       actual_stock: Number(item.actualStock),
  //     }));
  // 
  //     await submitStockCheckApi(records);
  // 
  //     // Remove draft if it was one
  //     if (draftData?.id) {
  //       const existingDrafts = JSON.parse(localStorage.getItem("inventory_drafts") || "[]");
  //       localStorage.setItem("inventory_drafts", JSON.stringify(existingDrafts.filter((d: any) => d.id !== draftData.id)));
  //     }
  // 
  //     // Add to completed history in localStorage for UI
  //     const completed = {
  //       id: draftData?.id || Date.now().toString(),
  //       ticketName,
  //       note,
  //       status: "completed",
  //       date: new Date().toISOString(),
  //       items: checkItems
  //     };
  //     const history = JSON.parse(localStorage.getItem("inventory_history") || "[]");
  //     localStorage.setItem("inventory_history", JSON.stringify([completed, ...history]));
  // 
  //     toast.success("Cân bằng kho thành công!");
  //     onBack();
  //   } catch (error: any) {
  //     toast.error(error?.response?.data?.message || "Có lỗi xảy ra khi cân bằng kho");
  //   }
  // };

  const handleExportExcel = () => {
    const rows = checkItems.map(item => ({
      "Mã nguyên liệu": item.code,
      "Tên nguyên liệu": item.ingredientName,
      "Tồn hệ thống": `${item.systemStock} ${item.unit}`,
      "Thực tế kiểm đếm": `${item.actualStock} ${item.unit}`,
      "Đơn vị": item.unit
    }));

    const ws = XLSX.utils.json_to_sheet(rows);

    // Auto-fit columns dynamically based on content length
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
    XLSX.utils.book_append_sheet(wb, ws, "KiemKeKho");
    XLSX.writeFile(wb, `Phieu_Kiem_Ke_${ticketName}.xlsx`);
    toast.success("Tải biểu mẫu kiểm kê Excel thành công!");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
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

        let updatedCount = 0;
        const updatedItems = [...checkItems];

        for (const row of data) {
          const codeVal = String(row["Mã nguyên liệu"] || row["Mã NL"] || row["Mã"] || row["code"] || "").trim().toLowerCase();
          const nameVal = String(row["Tên nguyên liệu"] || row["Tên hàng"] || row["Tên"] || row["name"] || "").trim().toLowerCase();
          
          if (!codeVal && !nameVal) continue;

          const targetIndex = updatedItems.findIndex(item => {
            if (codeVal && item.code.toLowerCase() === codeVal) return true;
            if (nameVal && item.ingredientName.toLowerCase() === nameVal) return true;
            return false;
          });

          if (targetIndex !== -1) {
            const item = updatedItems[targetIndex];
            const rawExcelUnit = String(row["Đơn vị"] || row["Đơn vị tính"] || row["unit"] || "").trim();
            const excelUnit = normalizeUnit(rawExcelUnit);
            const actualQty = parseExcelNumber(row["Thực tế kiểm đếm"] || row["Thực tế"] || row["actual"] || row["Số lượng thực tế"] || 0);

            let multiplier = 1;
            const sysUnit = item.unit.toLowerCase().trim();
            if (excelUnit && excelUnit !== sysUnit) {
              if (excelUnit === "g" && sysUnit === "kg") multiplier = 0.001;
              else if (excelUnit === "kg" && sysUnit === "g") multiplier = 1000;
              else if (excelUnit === "ml" && sysUnit === "lít") multiplier = 0.001;
              else if (excelUnit === "lít" && sysUnit === "ml") multiplier = 1000;
            }

            updatedItems[targetIndex] = {
              ...item,
              actualStock: Math.round(actualQty * multiplier * 1e6) / 1e6
            };
            updatedCount++;
          }
        }

        setCheckItems(updatedItems);
        toast.success(`Đã cập nhật ${updatedCount} mặt hàng kiểm kê từ Excel thành công!`);
        if (fileInputRef.current) fileInputRef.current.value = "";
      } catch (err) {
        console.error(err);
        toast.error("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
      }
    };
    reader.readAsBinaryString(file);
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
                ref={fileInputRef}
                className="hidden"
                accept=".xlsx, .xls, .csv"
                onChange={handleImportExcel}
              />
              <button
                onClick={handleExportExcel}
                className="px-4 py-2 bg-white border border-emerald-600 text-emerald-600 font-bold rounded-lg hover:bg-emerald-50 text-sm flex items-center gap-2 cursor-pointer shadow-sm"
              >
                <FileSpreadsheet size={16} /> Tải file mẫu Excel
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
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
