import React, { useState, useEffect, useRef } from "react";
import { Plus, Search, Trash2, ArrowLeft, UploadCloud, X, Check, Printer } from "lucide-react";
import toast from "react-hot-toast";
import { getIngredientsApi, getSuppliersApi, updateInventoryQuantityApi } from "../../../services/api";
import * as XLSX from "xlsx";

interface ImportItem {
  ingredientId: string;
  ingredientName: string;
  code: string;
  quantity: number;
  unitCost: number;
  batchNo: string;
  expiryDate: string;
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
  const [paymentStatus, setPaymentStatus] = useState("credit"); // "paid" or "credit"

  const [showExcelModal, setShowExcelModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    getIngredientsApi().then(data => {
      setIngredients(data);
      // Auto-populate initialData or low stock items
      let itemsToPopulate = [];
      if (initialData && initialData.length > 0) {
        itemsToPopulate = initialData;
      } else {
        itemsToPopulate = data.filter((ing: any) => Number(ing.stock) <= Number(ing.threshold));
      }
      
      if (itemsToPopulate.length > 0) {
        setImportItems(itemsToPopulate.map((ing: any) => ({
          ingredientId: ing.id,
          ingredientName: ing.name,
          code: `SP${ing.id.toString().padStart(6, '0')}`,
          quantity: 1,
          unitCost: 0,
          batchNo: `LOT-${ing.id}-${Date.now().toString().slice(-6)}`,
          expiryDate: ""
        })));
      }
    }).catch(console.error);
    getSuppliersApi().then(setSuppliers).catch(console.error);
  }, []);

  const handleAddItem = (ing: any) => {
    // Check if ingredient is already in list
    if (importItems.some(item => item.ingredientId === ing.id)) {
      toast.error("Mặt hàng này đã có trong danh sách nhập!");
      setSearchTerm("");
      return;
    }

    setImportItems(prev => [
      ...prev,
      {
        ingredientId: ing.id,
        ingredientName: ing.name,
        code: `SP${ing.id.toString().padStart(6, '0')}`,
        quantity: 1,
        unitCost: 0,
        batchNo: `LOT-${ing.id}-${Date.now().toString().slice(-6)}`,
        expiryDate: ""
      }
    ]);
    
    // Auto-select supplier
    const matchingSupplier = suppliers.find(s => 
      s.mainIngredients && s.mainIngredients.toLowerCase().includes(ing.name.toLowerCase())
    );

    if (matchingSupplier) {
      setSelectedSupplier(matchingSupplier.id);
      toast.success(`Đã tự động chọn nhà cung cấp: ${matchingSupplier.name}`);
    } else {
      window.confirm(`Hiện tại chưa có nhà cung cấp nào được lưu trong danh sách mà có món này. Bạn có muốn thêm hoặc chọn nhà cung cấp khác không?`);
    }

    setSearchTerm("");
  };

  const handleUpdateItem = (index: number, field: keyof ImportItem, value: any) => {
    const updated = [...importItems];
    updated[index] = { ...updated[index], [field]: value };
    setImportItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setImportItems(prev => prev.filter((_, i) => i !== index));
  };

  const totalAmount = importItems.reduce((sum, item) => sum + (item.quantity * item.unitCost), 0);

  const handleSave = async (mode: "draft" | "completed" | "save_print" = "completed") => {
    if (importItems.length === 0) {
      toast.error("Vui lòng chọn ít nhất một mặt hàng để nhập");
      return;
    }
    
    try {
      const supplierName = suppliers.find(s => s.id == selectedSupplier)?.name || "NCC khác";
      const reasonOrSupplier = note ? `Nhập hàng từ ${supplierName} - Ghi chú: ${note}` : `Nhập hàng từ ${supplierName}`;
      
      await Promise.all(importItems.map(item => 
        updateInventoryQuantityApi(item.ingredientId, {
          type: "import",
          reasonType: "import",
          status: mode === "draft" ? "draft" : "completed",
          quantity: item.quantity,
          unitCost: item.unitCost,
          supplierId: selectedSupplier || undefined,
          isCredit: paymentStatus === "credit",
          expiryDate: item.expiryDate || undefined,
          batchNo: item.batchNo,
          reasonOrSupplier: reasonOrSupplier
        })
      ));

      if (mode === "draft") {
        toast.success("Đã lưu tạm phiếu nhập hàng!");
      } else {
        toast.success("Tạo phiếu nhập hàng thành công!");
      }

      if (mode === "save_print" && onPrintReceipt) {
        onPrintReceipt({
          title: "PHIẾU NHẬP HÀNG",
          ticketCode: `PN${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}${String(new Date().getDate()).padStart(2,'0')}-${Date.now().toString().slice(-4)}`,
          supplierName,
          dateStr: importDate,
          userName: "Nhân viên kho",
          items: importItems.map(i => ({
            name: i.ingredientName,
            quantity: i.quantity,
            price: i.unitCost,
            total: i.quantity * i.unitCost
          })),
          totalAmount,
          paidAmount: paymentStatus === "paid" ? totalAmount : 0,
          debtAmount: paymentStatus === "credit" ? totalAmount : 0,
          note
        });
      }

      onBack();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Có lỗi xảy ra khi lưu phiếu nhập");
    }
  };

  const filteredIngredients = ingredients.filter(ing => 
    ing.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    `SP${ing.id.toString().padStart(6, '0')}`.includes(searchTerm)
  );

  return (
    <div className="flex flex-col gap-6 animate-in fade-in duration-300 text-slate-800">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-slate-100 rounded-full transition-colors cursor-pointer">
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight">Tạo phiếu nhập hàng</h2>
            <p className="text-xs text-slate-600 font-medium">Nhập nguyên liệu từ nhà cung cấp vào kho</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowExcelModal(true)} className="px-3 py-2 bg-white border border-slate-300 text-slate-700 font-bold rounded-lg hover:bg-slate-50 text-xs flex items-center gap-1.5 cursor-pointer shadow-xs mr-2">
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
        <div className="lg:col-span-2 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 min-h-[400px]">
            <div className="relative w-full mb-4">
              <Search className="absolute left-3 top-3 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Tìm kiếm mặt hàng theo tên hoặc mã..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold text-sm"
              />
              {searchTerm && filteredIngredients.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-lg shadow-lg z-50 max-h-60 overflow-y-auto">
                  {filteredIngredients.map(ing => (
                    <div 
                      key={ing.id} 
                      onClick={() => handleAddItem(ing)}
                      className="p-3 hover:bg-slate-50 border-b border-slate-100 cursor-pointer flex justify-between items-center"
                    >
                      <div>
                        <div className="font-bold text-slate-800">{ing.name}</div>
                        <div className="text-xs text-slate-500">Mã: SP{ing.id.toString().padStart(6, '0')}</div>
                      </div>
                      <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        Tồn: {ing.stock} {ing.unit}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-slate-50 text-slate-600 font-bold text-xs uppercase border-y border-slate-200">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Hàng hoá</th>
                    <th className="px-4 py-3 w-24">Số lượng</th>
                    <th className="px-4 py-3 w-32">Giá nhập</th>
                    <th className="px-4 py-3 w-32">Thành tiền</th>
                    <th className="px-4 py-3 w-32">Số lô</th>
                    <th className="px-4 py-3 w-32">Hạn sử dụng</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {importItems.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-500 font-medium">
                        Chưa có mặt hàng nào. Vui lòng tìm và chọn mặt hàng để nhập.
                      </td>
                    </tr>
                  ) : importItems.map((item, idx) => (
                    <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-4 font-medium">{idx + 1}</td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800">{item.ingredientName}</div>
                        <div className="text-[10px] text-slate-500 font-normal">Mã: {item.code}</div>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => handleUpdateItem(idx, 'quantity', Number(e.target.value))}
                          className="w-16 p-1.5 border rounded text-center font-semibold focus:border-blue-500 outline-none" 
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" 
                          value={item.unitCost} 
                          onChange={(e) => handleUpdateItem(idx, 'unitCost', Number(e.target.value))}
                          className="w-24 p-1.5 border rounded text-right font-semibold focus:border-blue-500 outline-none" 
                        />
                      </td>
                      <td className="px-4 py-3 font-bold text-right text-admin-primary">
                        {(item.quantity * item.unitCost).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text" 
                          value={item.batchNo}
                          onChange={(e) => handleUpdateItem(idx, 'batchNo', e.target.value)}
                          placeholder="LOT-..." 
                          className="w-24 p-1.5 border rounded font-semibold focus:border-blue-500 outline-none text-xs" 
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="date" 
                          value={item.expiryDate}
                          onChange={(e) => handleUpdateItem(idx, 'expiryDate', e.target.value)}
                          className="w-32 p-1.5 border rounded font-semibold focus:border-blue-500 outline-none text-xs" 
                        />
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleRemoveItem(idx)} className="text-rose-500 hover:bg-rose-50 p-1.5 rounded cursor-pointer"><Trash2 size={16}/></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="lg:col-span-1 flex flex-col gap-4">
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-5">
            <h3 className="font-black text-slate-800 mb-4 border-b pb-2">Thông tin nhập hàng</h3>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Nhà cung cấp</label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1">
                    <select 
                      value={selectedSupplier}
                      onChange={(e) => setSelectedSupplier(e.target.value)}
                      className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-semibold cursor-pointer"
                    >
                      <option value="">Chọn nhà cung cấp...</option>
                      {suppliers.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    {selectedSupplier && (
                      <div className="mt-2 text-[11px] bg-slate-50 p-2 rounded border border-slate-200">
                        <span className="font-bold text-slate-600 block mb-1">Nguyên liệu của NCC này:</span>
                        <div className="flex flex-wrap gap-1">
                          {(suppliers.find(s => s.id == selectedSupplier)?.mainIngredients || "").split(",").map((ing: string, i: number) => 
                            ing.trim() ? <span key={i} className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold border border-blue-200">{ing.trim()}</span> : null
                          )}
                          {!(suppliers.find(s => s.id == selectedSupplier)?.mainIngredients) && (
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
              
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Ngày nhập</label>
                <input 
                  type="datetime-local" 
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm font-semibold cursor-pointer" 
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Ghi chú</label>
                <textarea 
                  rows={3} 
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-blue-500 outline-none text-sm" 
                  placeholder="Ghi chú (tùy chọn)"
                ></textarea>
              </div>
            </div>

            <h3 className="font-black text-slate-800 mt-6 mb-4 border-b pb-2">Thông tin thanh toán</h3>
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-center text-sm font-bold">
                <span className="text-slate-600">Tổng cộng</span>
                <span className="text-admin-primary text-lg">{totalAmount.toLocaleString()} ₫</span>
              </div>
              <div>
                <label className="text-xs font-bold text-slate-600 block mb-1">Trạng thái thanh toán</label>
                <select 
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value)}
                  className={`w-full p-2 border rounded outline-none text-sm font-semibold cursor-pointer ${
                    paymentStatus === 'paid' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : 'bg-rose-50 text-rose-700 border-rose-200'
                  }`}
                >
                  <option value="paid">Đã thanh toán (Tiền mặt / Chuyển khoản)</option>
                  <option value="credit">Công nợ (Ghi nợ NCC)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL NHẬP EXCEL */}
      {showExcelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-slate-200">
              <h3 className="text-lg font-black text-slate-800">Nhập Excel</h3>
              <button 
                onClick={() => setShowExcelModal(false)}
                className="p-2 bg-slate-100 hover:bg-rose-100 text-slate-500 hover:text-rose-600 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 shadow-sm">
                <h4 className="text-sm font-black text-rose-600 mb-2 underline">Lưu ý:</h4>
                <ul className="text-xs text-rose-700 font-medium space-y-2 list-none">
                  <li>- Hệ thống chỉ hỗ trợ tối đa <span className="font-bold">500</span> hàng hóa cho mỗi lần nhập dữ liệu từ file excel.</li>
                  <li>- Trong trường hợp file Excel có hàng hóa chưa hợp lệ. Bạn vui lòng điều chỉnh các dòng bị lỗi theo các hướng dẫn sửa lỗi sau đây và thực hiện lại.</li>
                  <li className="pl-4">- Đối với hàng hóa không quản lý Serial thì số lượng phải lớn hơn 0, đối với hàng hóa quản lý Serial thì phải khai báo danh sách Serial và các Serial phải có định dạng cho phép (a-z, 0-9, "-", " ").</li>
                  <li className="pl-4">- Giá nhập, giá bán đều phải lớn hơn hoặc bằng 0.</li>
                  <li className="pl-4">- Mỗi hàng hóa chỉ được liệt kê ở 1 dòng duy nhất, đối với Serial thì mỗi Serial phải là duy nhất, không được trùng và chưa tồn tại trong hệ thống.</li>
                  <li className="pl-4 font-bold">- Để nhập kho cho hàng sản xuất định lượng. Vui lòng vào menu Sản xuất -&gt; tạo phiếu sản xuất, để hệ thống ghi nhận tồn kho chính xác hơn.</li>
                </ul>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (evt) => {
                    try {
                      const bstr = evt.target?.result;
                      const wb = XLSX.read(bstr, { type: 'binary' });
                      const wsname = wb.SheetNames[0];
                      const ws = wb.Sheets[wsname];
                      const data = XLSX.utils.sheet_to_json(ws);
                      
                      const newItems = data.map((row: any) => {
                        const name = row["Tên hàng"] || row["Tên nguyên liệu"] || row["Tên"] || row.Name || row.name || "";
                        const ing = ingredients.find(i => i.name.toLowerCase() === name.toLowerCase());
                        const id = ing ? ing.id : `TEMP_${Math.floor(Math.random() * 10000)}`;
                        return {
                          ingredientId: id,
                          ingredientName: name || "Mặt hàng chưa xác định",
                          code: `SP${id.toString().padStart(6, '0')}`,
                          quantity: Number(row["Số lượng"] || row.Quantity || row.quantity || 1),
                          unitCost: Number(row["Đơn giá"] || row.Price || row.price || 0),
                          batchNo: row["Số lô"] || row.Batch || `LOT-${id}-${Date.now().toString().slice(-6)}`,
                          expiryDate: row["Ngày hết hạn"] || row.Expiry || ""
                        };
                      });

                      setImportItems([...importItems, ...newItems]);
                      toast.success(`Đã tải và thêm thành công ${newItems.length} mặt hàng từ file Excel!`);
                      setShowExcelModal(false);
                    } catch (error) {
                      toast.error("Lỗi khi đọc file Excel. Vui lòng kiểm tra lại định dạng.");
                      console.error(error);
                    }
                  };
                  reader.readAsBinaryString(file);
                }} 
              />
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 rounded-xl p-12 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 hover:border-blue-400 transition-colors"
              >
                <UploadCloud size={48} className="text-slate-400 mb-4" />
                <p className="text-lg font-bold text-slate-600">Kéo thả hoặc click vào để chọn file excel</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
